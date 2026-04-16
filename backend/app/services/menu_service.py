from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import base64
import json
import os
from typing import List, Optional

app = FastAPI(title="MenuScanner API - Global Multi-Image Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MIME_MAP = {
    "image/jpeg": "image/jpeg",
    "image/png":  "image/png",
    "image/webp": "image/webp",
    "image/gif":  "image/gif",
}

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

SYSTEM_PROMPT = """You are a precise menu digitization expert. Your ONLY job is to extract items that are LITERALLY PRINTED on the menu image.

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
  "detected_cuisine": "string — be SPECIFIC",
  "cuisine_region": "string — one of: South Asia, East Asia, Southeast Asia, Middle East, Mediterranean, European, American, African, Fusion",
  "restaurant_name": "string or null",
  "language_detected": "string",
  "menu_currency_symbol": "string — e.g. ₹ $ € £ AED",
  "menu_currency_code": "string — ISO 4217 e.g. INR USD EUR GBP AED",
  "items": [
    {
      "name": "string — exact item name as printed",
      "name_original": "string or null",
      "description": "string or null",
      "price": "string — exact price with symbol e.g. ₹150 or null",
      "price_value": "number or null",
      "currency_symbol": "string",
      "currency_code": "string",
      "category": "string — EXACT category heading from menu",
      "tags": ["array from: vegetarian, non-vegetarian, vegan, spicy, chef-special, gluten-free, jain, bestseller, halal, contains-pork, contains-alcohol, dairy-free, nut-free, signature, raw"],
      "cuisine_type": "string — e.g. Indian, Chinese, Italian, Arabic",
      "image_link": null,
      "page": "number — page number as specified in the prompt"
    }
  ]
}

CUISINE DETECTION:
SOUTH ASIA: North Indian, South Indian, Mughlai, Rajasthani, Bengali, Gujarati, Maharashtrian, Indo-Chinese, Pakistani, Sri Lankan, Nepalese
EAST ASIA: Chinese-Cantonese, Chinese-Szechuan, Japanese-Sushi, Japanese-Ramen, Korean, Taiwanese, Hong Kong Style, Dim Sum
SOUTHEAST ASIA: Thai, Vietnamese, Indonesian, Malaysian, Filipino, Singaporean
MIDDLE EAST: Emirati, Lebanese, Turkish, Persian, Saudi Arabian, Jordanian, Egyptian, Moroccan
MEDITERRANEAN/EUROPEAN: Italian, Spanish-Tapas, Greek, French, German, British, Portuguese
AMERICAN: American-Diner, Mexican, Tex-Mex, Brazilian, Caribbean, Peruvian
AFRICAN: Ethiopian, Nigerian, South African
FUSION: Pan-Asian, Modern European, Contemporary, Cafe, Fast Food, Street Food

VEG/NON-VEG:
INDIAN: Green dot/square = vegetarian, Red dot/square = non-vegetarian, (J) = jain+vegetarian
ARABIC/GULF: Meat = halal by default
JAPANESE/CHINESE: Infer from ingredients
WESTERN: (V)/leaf = vegetarian, (VE)/(VG) = vegan, (GF) = gluten-free
SPICY: Chili/flame icons, "spicy", "hot", "szechuan", "fiery" → tag "spicy"

CURRENCY:
India=₹ INR | UAE=AED | Saudi=SAR | Qatar=QAR | Kuwait=KWD | USA=$ USD | UK=£ GBP | EU=€ EUR
Japan=¥ JPY | Korea=₩ KRW | Thailand=฿ THB | Malaysia=RM MYR | Singapore=S$ SGD | HK=HK$ HKD"""


class ScanResponse(BaseModel):
    items: list[dict]
    total: int
    detected_cuisine: str
    cuisine_region: Optional[str]
    restaurant_name: Optional[str]
    language_detected: Optional[str]
    menu_currency_symbol: Optional[str]
    menu_currency_code: Optional[str]
    total_pages: int
    images_processed: int


def strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    if raw.endswith("```"):
        raw = raw[:-3].strip()
    return raw


def scan_one_page(client: anthropic.Anthropic, b64: str, mime: str, page_num: int) -> dict:
    """Scan a single menu page image and return parsed dict."""
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=16000,
        system=SYSTEM_PROMPT,
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
    raw = strip_fences(response.content[0].text)
    return json.loads(raw)


@app.get("/")
def root():
    return {"status": "ok", "service": "MenuScanner API - Global Multi-Image Edition"}


@app.post("/scan", response_model=ScanResponse)
async def scan_menu(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(400, "No files uploaded.")
    if len(files) > 10:
        raise HTTPException(400, "Maximum 10 images allowed per scan.")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY not set in .env")

    client = anthropic.Anthropic(api_key=api_key)

    # ── Read all uploaded files into memory ──────────────────────────────────
    pages_data = []
    for i, file in enumerate(files):
        mime = file.content_type
        if mime not in MIME_MAP:
            raise HTTPException(400, f"'{file.filename}' unsupported type. Use JPEG/PNG/WebP.")
        img_bytes = await file.read()
        if len(img_bytes) > 20 * 1024 * 1024:
            raise HTTPException(400, f"'{file.filename}' too large. Max 20 MB.")
        b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
        pages_data.append((b64, mime))

    print(f"[SCAN] {len(pages_data)} page(s) received — scanning each separately")

    # ── Scan EACH PAGE with its own independent Claude API call ─────────────
    # This is the key fix: one call per page guarantees full extraction
    all_items = []
    first_meta = None

    for i, (b64, mime) in enumerate(pages_data):
        page_num = i + 1
        try:
            print(f"[SCAN] → Page {page_num} scanning...")
            parsed = scan_one_page(client, b64, mime, page_num)

            page_items = parsed.get("items", [])
            # Force correct page number on every item
            for item in page_items:
                item["page"] = page_num

            print(f"[SCAN] → Page {page_num}: {len(page_items)} items found")
            all_items.extend(page_items)

            if first_meta is None:
                first_meta = parsed

        except json.JSONDecodeError as e:
            raise HTTPException(500, f"Parse error on page {page_num}: {e}")
        except anthropic.APIError as e:
            raise HTTPException(502, f"Claude API error on page {page_num}: {e}")

    if not first_meta:
        raise HTTPException(500, "No pages processed.")

    # ── Deduplicate across pages (same name + category) ──────────────────────
    seen = set()
    deduped = []
    for item in all_items:
        key = (item.get("name", "").lower().strip(), item.get("category", "").lower().strip())
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    print(f"[SCAN] Final: {len(deduped)} items ({len(all_items)} before dedup)")

    # ── Currency fallback ────────────────────────────────────────────────────
    cuisine_lower = first_meta.get("detected_cuisine", "").lower()
    fallback = CUISINE_CURRENCY_MAP.get(cuisine_lower, ("$", "USD"))
    sym = first_meta.get("menu_currency_symbol") or fallback[0]
    code = first_meta.get("menu_currency_code") or fallback[1]

    # ── Post-process every item ──────────────────────────────────────────────
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

    return ScanResponse(
        items=deduped,
        total=len(deduped),
        detected_cuisine=first_meta.get("detected_cuisine", "Unknown"),
        cuisine_region=first_meta.get("cuisine_region"),
        restaurant_name=first_meta.get("restaurant_name"),
        language_detected=first_meta.get("language_detected"),
        menu_currency_symbol=sym,
        menu_currency_code=code,
        total_pages=len(pages_data),
        images_processed=len(pages_data),
    )