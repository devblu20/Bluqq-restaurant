from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from app.models.menu import MenuCategory, MenuItem, MenuUpload, ParseStatus
from app.models.restaurant import Restaurant, OnboardingStatus
from app.schemas.menu import ScanImportRequest
from app.schemas.menu import (
    CategoryCreate, MenuItemCreate, MenuItemUpdate,
    GoLiveCheckResponse,
)
import anthropic
import base64
import json
import uuid
import os
import shutil

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/restaurant_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ─────────────────────────────────────────────
# Scanner Constants
# ─────────────────────────────────────────────

CUISINE_CURRENCY_MAP = {
    "north indian": ("₹", "INR"), "south indian": ("₹", "INR"),
    "mughlai": ("₹", "INR"), "rajasthani": ("₹", "INR"),
    "bengali": ("₹", "INR"), "gujarati": ("₹", "INR"),
    "maharashtrian": ("₹", "INR"), "indo-chinese": ("₹", "INR"),
    "pakistani": ("₨", "PKR"), "sri lankan": ("₨", "LKR"),
    "nepalese": ("₨", "NPR"),
    "chinese": ("¥", "CNY"), "chinese-cantonese": ("¥", "CNY"),
    "chinese-szechuan": ("¥", "CNY"), "dim sum": ("¥", "CNY"),
    "hong kong style": ("HK$", "HKD"), "taiwanese": ("NT$", "TWD"),
    "japanese": ("¥", "JPY"), "japanese-sushi": ("¥", "JPY"),
    "japanese-ramen": ("¥", "JPY"),
    "korean": ("₩", "KRW"),
    "thai": ("฿", "THB"), "vietnamese": ("₫", "VND"),
    "indonesian": ("Rp", "IDR"), "malaysian": ("RM", "MYR"),
    "filipino": ("₱", "PHP"), "singaporean": ("S$", "SGD"),
    "emirati": ("AED", "AED"), "saudi arabian": ("SAR", "SAR"),
    "lebanese": ("LBP", "LBP"), "turkish": ("₺", "TRY"),
    "persian": ("﷼", "IRR"), "moroccan": ("MAD", "MAD"),
    "jordanian": ("JOD", "JOD"), "egyptian": ("E£", "EGP"),
    "qatari": ("QAR", "QAR"), "kuwaiti": ("KWD", "KWD"),
    "bahraini": ("BHD", "BHD"), "omani": ("OMR", "OMR"),
    "italian": ("€", "EUR"), "spanish": ("€", "EUR"),
    "spanish-tapas": ("€", "EUR"), "greek": ("€", "EUR"),
    "french": ("€", "EUR"), "portuguese": ("€", "EUR"),
    "german": ("€", "EUR"),
    "british": ("£", "GBP"),
    "american": ("$", "USD"), "american-diner": ("$", "USD"),
    "mexican": ("$", "MXN"), "tex-mex": ("$", "MXN"),
    "brazilian": ("R$", "BRL"), "caribbean": ("$", "USD"),
    "peruvian": ("S/", "PEN"), "colombian": ("$", "COP"),
    "ethiopian": ("Br", "ETB"), "nigerian": ("₦", "NGN"),
    "south african": ("R", "ZAR"),
}

SCANNER_SYSTEM_PROMPT = """You are a precise menu digitization expert. Your ONLY job is to extract items that are LITERALLY PRINTED on the menu image.

════════════════════════════════════════════════
CRITICAL ANTI-HALLUCINATION RULES
════════════════════════════════════════════════

1. NEVER invent, guess, or assume items. If you cannot clearly read an item name, SKIP it.
2. DO NOT add items that "typically appear" in this cuisine but are not visible in this image.
3. DO NOT split one item into multiple items.
4. DO NOT add category header names as items unless they have no sub-items listed below them.
5. COUNT carefully — mentally re-check: "Did I extract this from the actual image or did I imagine it?"
6. PLAIN variants — only extract "Plain X" if those exact words are printed. Do NOT auto-generate variants.

════════════════════════════════════════════════
HOW TO HANDLE SECTION HEADERS WITH PRICES
════════════════════════════════════════════════

CASE A — Header has sub-items listed below it:
  "Veg Sizzler 250/-"
    Veg Chinese Sizzler
    Continental Veg Sizzler
→ Extract ONLY the sub-items with price ₹250. Do NOT extract "Veg Sizzler" as a separate item.

CASE B — Header has NO sub-items (it IS the item):
  "Steam Rice 60/-"
→ Extract "Steam Rice" with price ₹60.

CASE C — Category heading with price, sub-items below:
  "Chinese Starters 150/-"
    Hakka Noodles
    Chilli Paneer
→ Extract each sub-item with price ₹150. Do NOT add "Chinese Starters" as an item.

════════════════════════════════════════════════

Respond ONLY with a valid JSON object. No explanation, no markdown, no backticks.

Return this EXACT structure:
{
  "detected_cuisine": "string",
  "cuisine_region": "string",
  "restaurant_name": "string or null",
  "language_detected": "string",
  "menu_currency_symbol": "string",
  "menu_currency_code": "string",
  "items": [
    {
      "name": "string",
      "name_original": "string or null",
      "description": "string or null",
      "price": "string or null",
      "price_value": "number or null",
      "currency_symbol": "string",
      "currency_code": "string",
      "category": "string",
      "tags": [],
      "cuisine_type": "string",
      "image_link": null,
      "page": "number"
    }
  ]
}"""


# ─────────────────────────────────────────────
# Scanner Private Helpers
# ─────────────────────────────────────────────

def _strip_fences(raw: str) -> str:
    """Remove markdown code fences from Claude response."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    if raw.endswith("```"):
        raw = raw[:-3].strip()
    return raw


def _scan_one_page(client: anthropic.Anthropic, b64: str, mime: str, page_num: int) -> dict:
    """Send one image to Claude and return parsed JSON dict."""
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=16000,
        system=SCANNER_SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"This is page {page_num} of the menu. Extract ALL items visible on this page only."
                },
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": mime, "data": b64}
                },
                {
                    "type": "text",
                    "text": (
                        f"Extract every item printed on this page. "
                        f"Set page={page_num} on ALL items. "
                        "Set image_link=null on ALL items. "
                        "Do NOT hallucinate items not visible here. "
                        "Return only the JSON object."
                    )
                }
            ]
        }],
    )
    raw = _strip_fences(response.content[0].text)
    return json.loads(raw)


# ─────────────────────────────────────────────
# Scanner Public Function
# ─────────────────────────────────────────────

def scan_menu_images(
    db: Session,
    restaurant_id: str,
    images: list[tuple[bytes, str]],  # list of (img_bytes, mime_type)
) -> dict:
    """
    Multiple menu images ko scan karke DB mein save karta hai.

    Args:
        db: Database session
        restaurant_id: Restaurant ka ID
        images: List of (image_bytes, mime_type) tuples

    Returns:
        Summary dict with counts and metadata
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    if not images:
        raise HTTPException(status_code=400, detail="No images provided")

    if len(images) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images allowed per scan")

    client = anthropic.Anthropic(api_key=api_key)

    # ── Scan each page independently ─────────────────────────────────────────
    all_items = []
    first_meta = None

    for i, (img_bytes, mime) in enumerate(images):
        page_num = i + 1
        b64 = base64.standard_b64encode(img_bytes).decode("utf-8")

        try:
            print(f"[SCAN] → Page {page_num} scanning...")
            parsed = _scan_one_page(client, b64, mime, page_num)

            page_items = parsed.get("items", [])
            for item in page_items:
                item["page"] = page_num

            print(f"[SCAN] → Page {page_num}: {len(page_items)} items found")
            all_items.extend(page_items)

            if first_meta is None:
                first_meta = parsed

        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Parse error on page {page_num}: {e}")
        except anthropic.APIError as e:
            raise HTTPException(status_code=502, detail=f"Claude API error on page {page_num}: {e}")

    if not first_meta:
        raise HTTPException(status_code=500, detail="No pages processed")

    # ── Deduplicate across pages ──────────────────────────────────────────────
    seen = set()
    deduped = []
    for item in all_items:
        key = (item.get("name", "").lower().strip(), item.get("category", "").lower().strip())
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    print(f"[SCAN] Dedup: {len(deduped)} items ({len(all_items)} before dedup)")

    # ── Currency fallback ─────────────────────────────────────────────────────
    cuisine_lower = first_meta.get("detected_cuisine", "").lower()
    fallback_sym, fallback_code = CUISINE_CURRENCY_MAP.get(cuisine_lower, ("$", "USD"))
    sym = first_meta.get("menu_currency_symbol") or fallback_sym
    code = first_meta.get("menu_currency_code") or fallback_code

    # ── Post-process items ────────────────────────────────────────────────────
    for item in deduped:
        item["image_link"] = None
        if not item.get("currency_symbol"):
            item["currency_symbol"] = sym
        if not item.get("currency_code"):
            item["currency_code"] = code
        if item.get("price") and item.get("price_value") is None:
            digits = "".join(c for c in str(item["price"]) if c.isdigit() or c == ".")
            try:
                item["price_value"] = float(digits) if digits else None
            except ValueError:
                item["price_value"] = None

    # ── Save to DB ────────────────────────────────────────────────────────────
    items_saved = 0
    category_cache: dict[str, str] = {}

    for item in deduped:
        cat_name = (item.get("category") or "General").strip()

        if cat_name not in category_cache:
            existing_cat = (
                db.query(MenuCategory)
                .filter(
                    MenuCategory.restaurant_id == restaurant_id,
                    MenuCategory.name.ilike(cat_name)
                )
                .first()
            )
            if existing_cat:
                category_cache[cat_name] = existing_cat.id
            else:
                new_cat = MenuCategory(
                    id=str(uuid.uuid4()),
                    restaurant_id=restaurant_id,
                    name=cat_name,
                    is_active=True,
                )
                db.add(new_cat)
                db.flush()
                category_cache[cat_name] = new_cat.id

        cat_id = category_cache[cat_name]
        item_name = (item.get("name") or "").strip()
        if not item_name:
            continue

        exists = (
            db.query(MenuItem)
            .filter(
                MenuItem.restaurant_id == restaurant_id,
                MenuItem.name.ilike(item_name),
                MenuItem.category_id == cat_id,
            )
            .first()
        )
        if exists:
            continue

        price_val = item.get("price_value") or 0.0

        new_item = MenuItem(
    id=str(uuid.uuid4()),
    restaurant_id=restaurant_id,
    category_id=cat_id,
    name=item_name,
    description=item.get("description") or None,
    price=float(price_val),

    # 🔥 ADD THIS (MUST)
    tags=item.get("tags", []),
    cuisine_type=item.get("cuisine_type"),
    currency_symbol=item.get("currency_symbol"),
    currency_code=item.get("currency_code"),
    source_page=item.get("page"),

    is_available=True,
)
        db.add(new_item)
        items_saved += 1

    # ── Mark onboarding complete ──────────────────────────────────────────────
    _advance_menu_status(db, restaurant_id)
    db.commit()

    print(f"[SCAN] ✅ Saved {items_saved} new items to DB")

    return {
        "status": "success",
        "items_saved": items_saved,
        "total_scanned": len(all_items),
        "after_dedup": len(deduped),
        "categories_created": len(category_cache),
        "detected_cuisine": first_meta.get("detected_cuisine", "Unknown"),
        "cuisine_region": first_meta.get("cuisine_region"),
        "restaurant_name": first_meta.get("restaurant_name"),
        "menu_currency_symbol": sym,
        "menu_currency_code": code,
        "total_pages": len(images),
    }


# ─────────────────────────────────────────────
# Import from Scan (existing function)
# ─────────────────────────────────────────────

def import_from_scan(restaurant_id: str, data: "ScanImportRequest", db: Session):
    """
    MenuScanner se aaya hua JSON leke DB mein save karta hai.
    """
    created_categories = {}
    created_items = []

    for item in data.items:
        cat_name = item.get("category") or "General"

        if cat_name not in created_categories:
            existing_cat = (
                db.query(MenuCategory)
                .filter_by(restaurant_id=restaurant_id, name=cat_name)
                .first()
            )
            if existing_cat:
                created_categories[cat_name] = existing_cat.id
            else:
                new_cat = MenuCategory(
                    restaurant_id=restaurant_id,
                    name=cat_name,
                    is_active=True
                )
                db.add(new_cat)
                db.flush()
                created_categories[cat_name] = new_cat.id

        price_value = item.get("price_value") or 0.0

        menu_item = MenuItem(
    restaurant_id=restaurant_id,
    category_id=created_categories[cat_name],
    name=item.get("name", "Unnamed Item"),
    description=item.get("description"),
    price=float(price_value),

    # 🔥 ADD THESE LINES
    tags=item.get("tags", []),
    cuisine_type=item.get("cuisine_type"),
    currency_symbol=item.get("currency_symbol"),
    currency_code=item.get("currency_code"),
    source_page=item.get("page"),

    is_available=True,
)
        db.add(menu_item)
        created_items.append(menu_item)

    r = db.query(Restaurant).filter_by(id=restaurant_id).first()
    if r:
        r.onboarding_status = "menu_completed"

    db.commit()

    return {
        "imported_items": len(created_items),
        "imported_categories": len(created_categories),
        "category_names": list(created_categories.keys()),
        "message": f"{len(created_items)} items successfully imported"
    }


# ─────────────────────────────────────────────
# Categories
# ─────────────────────────────────────────────

def create_category(db: Session, restaurant_id: str, data: CategoryCreate) -> MenuCategory:
    cat = MenuCategory(restaurant_id=restaurant_id, **data.dict())
    db.add(cat)
    _advance_menu_status(db, restaurant_id)
    db.commit()
    db.refresh(cat)
    return cat


def get_categories(db: Session, restaurant_id: str):
    return db.query(MenuCategory).filter(MenuCategory.restaurant_id == restaurant_id).all()


# ─────────────────────────────────────────────
# Menu Items
# ─────────────────────────────────────────────

def create_menu_item(db: Session, restaurant_id: str, data: MenuItemCreate) -> MenuItem:
    item_data = data.dict()

    if not item_data.get("category_id"):
        item_data["category_id"] = None

    if not item_data.get("description"):
        item_data["description"] = None

    item = MenuItem(restaurant_id=restaurant_id, **item_data)
    db.add(item)
    _advance_menu_status(db, restaurant_id)
    db.commit()
    db.refresh(item)
    return item


def update_menu_item(db: Session, restaurant_id: str, item_id: str, data: MenuItemUpdate) -> MenuItem:
    item = db.query(MenuItem).filter(
        MenuItem.id == item_id, MenuItem.restaurant_id == restaurant_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    update_data = data.dict(exclude_unset=True)

    if "category_id" in update_data and not update_data["category_id"]:
        update_data["category_id"] = None

    if "description" in update_data and not update_data["description"]:
        update_data["description"] = None

    for field, value in update_data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def get_menu_items(db: Session, restaurant_id: str):
    return db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()


# ─────────────────────────────────────────────
# Uploads
# ─────────────────────────────────────────────

def upload_menu_file(db: Session, restaurant_id: str, file: UploadFile) -> MenuUpload:
    file_ext = file.filename.split(".")[-1].lower()
    file_type = "pdf" if file_ext == "pdf" else "image"
    filename = f"{uuid.uuid4()}.{file_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    upload = MenuUpload(
        restaurant_id=restaurant_id,
        file_url=filepath,
        file_type=file_type,
        parse_status=ParseStatus.pending,
    )
    db.add(upload)
    _advance_menu_status(db, restaurant_id)
    db.commit()
    db.refresh(upload)
    return upload


# ─────────────────────────────────────────────
# Go Live Check
# ─────────────────────────────────────────────

def go_live_check(db: Session, restaurant_id: str) -> GoLiveCheckResponse:
    from app.models.menu import RestaurantProfile, RestaurantOrderSettings

    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    profile = db.query(RestaurantProfile).filter(
        RestaurantProfile.restaurant_id == restaurant_id
    ).first()
    settings = db.query(RestaurantOrderSettings).filter(
        RestaurantOrderSettings.restaurant_id == restaurant_id
    ).first()
    has_items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).count() > 0
    has_upload = db.query(MenuUpload).filter(MenuUpload.restaurant_id == restaurant_id).count() > 0

    basic_ok = r.onboarding_status != OnboardingStatus.started
    ops_ok = profile is not None
    menu_ok = has_items or has_upload
    settings_ok = settings is not None

    missing = []
    if not basic_ok:
        missing.append("Basic restaurant info")
    if not ops_ok:
        missing.append("Operational settings")
    if not menu_ok:
        missing.append("At least one menu item or menu upload")
    if not settings_ok:
        missing.append("Order settings")

    ready = basic_ok and menu_ok and settings_ok

    return GoLiveCheckResponse(
        restaurant_id=restaurant_id,
        basic_info=basic_ok,
        operations=ops_ok,
        menu=menu_ok,
        order_settings=settings_ok,
        ready_for_launch=ready,
        missing=missing,
    )


# ─────────────────────────────────────────────
# Private Helper
# ─────────────────────────────────────────────

def _advance_menu_status(db: Session, restaurant_id: str):
    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if r and r.onboarding_status in [
        OnboardingStatus.started,
        OnboardingStatus.basic_info_completed,
        OnboardingStatus.operations_completed,
    ]:
        r.onboarding_status = OnboardingStatus.menu_completed