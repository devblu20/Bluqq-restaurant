import anthropic
import base64
import json
import os
import uuid
import re
from sqlalchemy.orm import Session
from app.models.menu import MenuCategory, MenuItem

SYSTEM_PROMPT = """You are a precise menu digitization expert. Extract items from the image. 
Respond ONLY with a valid JSON object. 
Format: {"items": [{"name": "Dish Name", "price_value": 150.0, "category": "Starter", "description": ""}]}"""

def scan_and_save(db: Session, restaurant_id: str, img_bytes: bytes, mime: str):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY not found"}

    client = anthropic.Anthropic(api_key=api_key)
    b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
    
    try:
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64}},
                {"type": "text", "text": "Extract all menu items into the specified JSON format."}
            ]}],
        )
        
        # --- Behtar JSON Cleaning ---
        res_text = response.content[0].text.strip()
        json_match = re.search(r'\{.*\}', res_text, re.DOTALL)
        if json_match:
            res_text = json_match.group(0)
        
        parsed = json.loads(res_text)
        items = parsed.get("items", [])
        
        if not items:
            print(f"⚠️ No items found by AI for restaurant {restaurant_id}")
            return {"status": "warning", "message": "AI could not find any items."}

        items_saved = 0
        for item in items:
            # 1. Category Clean & Handle
            raw_cat = (item.get("category") or "General").strip()
            # DB mein category check karein
            category = db.query(MenuCategory).filter(
                MenuCategory.restaurant_id == restaurant_id,
                MenuCategory.name.ilike(raw_cat) # Case-insensitive check
            ).first()
            
            if not category:
                category = MenuCategory(id=str(uuid.uuid4()), restaurant_id=restaurant_id, name=raw_cat)
                db.add(category)
                db.flush() 

            # 2. Price Parsing (Safe Float)
            price_raw = item.get("price_value")
            try:
                if isinstance(price_raw, str):
                    # Sirf numbers aur dot nikaalein (e.g., "₹150.50" -> "150.50")
                    price_val = float(re.sub(r'[^\d.]', '', price_raw))
                else:
                    price_val = float(price_raw or 0)
            except:
                price_val = 0.0

            # 3. Duplicate Check (Case-insensitive)
            item_name = item.get("name", "").strip()
            exists = db.query(MenuItem).filter(
                MenuItem.restaurant_id == restaurant_id,
                MenuItem.name.ilike(item_name),
                MenuItem.category_id == category.id
            ).first()
            
            if not exists and item_name:
                new_item = MenuItem(
                    id=str(uuid.uuid4()),
                    restaurant_id=restaurant_id,
                    category_id=category.id,
                    name=item_name,
                    price=price_val,
                    description=item.get("description", ""),
                    is_available=True
                )
                db.add(new_item)
                items_saved += 1
        
        db.commit() 
        print(f"✅ Success: Scanned {len(items)} items, Saved {items_saved} new items.")
        return {"status": "success", "items_saved": items_saved, "total_scanned": len(items)}

    except Exception as e:
        db.rollback()
        print(f"❌ Error in scan_and_save: {str(e)}")
        return {"error": str(e)}