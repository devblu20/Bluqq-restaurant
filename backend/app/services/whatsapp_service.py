import json
import os
import random
import re
import time
from difflib import SequenceMatcher
from urllib import request as urlrequest
from urllib.error import HTTPError

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.restaurant import Restaurant
from app.models.menu import MenuItem
from app.models.whatsapp import (
    RestaurantWhatsappConfig,
    WhatsAppConversation,
    WhatsAppMessage,
)

# ═════════════════════════════════════════════════════════════════════════════
#  WAITER SYSTEM PROMPT — injected into every AI call
# ═════════════════════════════════════════════════════════════════════════════
_WAITER_SYSTEM_PROMPT = """You are a real WhatsApp restaurant ordering assistant — friendly, sharp, and stateful.

CORE RULES (never break these):

1. CART MEMORY
   - Always remember every item already added to cart in this conversation.
   - NEVER forget or reset previous orders.
   - Example: if user ordered "27 large cheesy fries" then says "add 30 veg burgers"
     → ADD burgers to the EXISTING cart, do NOT restart.

2. INTENT DETECTION
   - "add", "also add", "include", "increase", "i want", "i'll take" → ADD TO CART
   - "remove", "delete", "cancel [item]" → REMOVE FROM CART
   - "show options", "what else", "suggest" → SUGGEST items
   - "menu" / "full menu" / "what do you have" → ONLY then show menu
   - "confirm", "place order", "yes" during checkout → PROCEED checkout

3. NEVER SHOW MENU UNLESS ASKED
   - If user asks to add/order an item → confirm it directly, show updated cart.
   - Do NOT respond with the full menu unless the user explicitly asks for it.

4. RESPONSE FORMAT
   Always reply in this structure when adding/updating cart:
   ✅ [Action done]
   🛒 Your Cart:
   • [item] x [qty] — ₹[total]
   • ...
   💵 Subtotal: ₹[X]
   [One helpful follow-up line]

5. SMART SUGGESTIONS (only after cart action)
   - Offer one relevant upsell — drinks, dessert, or a side — not a full menu dump.

6. ERROR HANDLING
   - NEVER say "I couldn't find that item".
   - If item name is unclear → ask "Did you mean [closest item]?"
   - NEVER hallucinate errors or reset cart.

7. CHECKOUT FLOW
   - Once user confirms order → ask for Name, then Contact, then Address — one at a time.
   - After all 3 collected → show final order summary with total.

8. LANGUAGE
   - ALWAYS reply in English only, even if user writes in Hindi/Hinglish.
   - Use 0–2 emojis naturally. Not on every line.

GOAL: Act like a real smooth waiter — take continuous orders without ever restarting the conversation."""


# ═════════════════════════════════════════════════════════════════════════════
#  ENV / CONFIG HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _contains_devanagari(text: str) -> bool:
    return any("\u0900" <= ch <= "\u097F" for ch in (text or ""))


def _apply_env_defaults(cfg: RestaurantWhatsappConfig) -> bool:
    changed = False
    env_access_token = (os.getenv("WHATSAPP_ACCESS_TOKEN") or "").strip()
    env_verify_token  = (os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN") or "").strip()
    env_business_phone = (os.getenv("WHATSAPP_BUSINESS_PHONE") or "").strip()

    if env_access_token and cfg.access_token != env_access_token:
        cfg.access_token = env_access_token
        changed = True
    if env_verify_token and cfg.verify_token != env_verify_token:
        cfg.verify_token = env_verify_token
        changed = True
    if env_business_phone and cfg.business_phone != env_business_phone:
        cfg.business_phone = env_business_phone
        changed = True
    if cfg.language != "english":
        cfg.language = "english"
        changed = True
    return changed


def get_or_create_config(db: Session, restaurant_id: str) -> RestaurantWhatsappConfig:
    cfg = (
        db.query(RestaurantWhatsappConfig)
        .filter(RestaurantWhatsappConfig.restaurant_id == restaurant_id)
        .first()
    )
    if not cfg:
        cfg = RestaurantWhatsappConfig(restaurant_id=restaurant_id)
        _apply_env_defaults(cfg)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    else:
        changed = _apply_env_defaults(cfg)
        if changed:
            db.commit()
            db.refresh(cfg)
    return cfg


def update_config(db: Session, restaurant_id: str, payload: dict) -> RestaurantWhatsappConfig:
    cfg = get_or_create_config(db, restaurant_id)
    payload["language"] = "english"

    for key in ["access_token", "verify_token", "business_phone", "phone_number_id"]:
        if key in payload and isinstance(payload[key], str):
            payload[key] = payload[key].strip()

    incoming_phone_id = payload.get("phone_number_id")
    if incoming_phone_id:
        existing = (
            db.query(RestaurantWhatsappConfig)
            .filter(
                RestaurantWhatsappConfig.phone_number_id == incoming_phone_id,
                RestaurantWhatsappConfig.restaurant_id != restaurant_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail="This phone_number_id is already connected to another restaurant",
            )

    for field, value in payload.items():
        setattr(cfg, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Invalid WhatsApp config. Check phone_number_id uniqueness",
        )
    db.refresh(cfg)
    return cfg


# ═════════════════════════════════════════════════════════════════════════════
#  TEXT HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _normalize_text(text: str) -> str:
    # FIX 1: Strip punctuation so "fries?" → "fries", "okay!" → "okay"
    cleaned = re.sub(r"[^\w\s]", " ", (text or "").lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def _format_price(price) -> str:
    return f"₹{int(price or 0)}"


# ═════════════════════════════════════════════════════════════════════════════
#  VEG / NON-VEG DETECTION  (tags column first, name heuristic fallback)
# ═════════════════════════════════════════════════════════════════════════════

def _item_is_veg(item: MenuItem) -> bool:
    tags = item.tags
    if tags:
        if isinstance(tags, list):
            tags_lower = [str(t).lower() for t in tags]
        elif isinstance(tags, str):
            try:
                parsed = json.loads(tags)
                tags_lower = [str(t).lower() for t in parsed]
            except Exception:
                tags_lower = [tags.lower()]
        else:
            tags_lower = []

        if any("non" in t for t in tags_lower):
            return False
        if any("veg" in t for t in tags_lower):
            return True

    # Fallback: name heuristic
    name_lower = _normalize_text(item.name or "")
    non_veg_keys = [
        "chicken", "fish", "mutton", "lamb", "prawn",
        "egg", "meat", "beef", "pork", "seafood",
    ]
    return not any(k in name_lower for k in non_veg_keys)


def _item_is_nonveg(item: MenuItem) -> bool:
    return not _item_is_veg(item)


# ═════════════════════════════════════════════════════════════════════════════
#  SECTION / CATEGORY HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _section_for_item(item: MenuItem):
    cat_name = _normalize_text(
        item.category.name
        if getattr(item, "category", None) and item.category
        else ""
    )
    name = _normalize_text(item.name or "")
    blob = f"{cat_name} {name}"

    if any(k in blob for k in ["starter", "appetizer", "snack", "tikka", "roll"]):
        return ("🥗", "Starters")
    if any(k in blob for k in ["rice", "noodle", "fried rice", "hakka"]):
        return ("🍜", "Rice & Noodles")
    if any(k in blob for k in ["curry", "gravy", "thai"]):
        return ("🍛", "Curries")
    return ("🍛", "Main Course")


# ═════════════════════════════════════════════════════════════════════════════
#  MENU FORMATTERS
# ═════════════════════════════════════════════════════════════════════════════

def _filter_items_for_pref(items, dietary_pref: str, starters_only: bool = False):
    filtered = []
    for item in items:
        if dietary_pref == "veg" and not _item_is_veg(item):
            continue
        if dietary_pref == "nonveg" and not _item_is_nonveg(item):
            continue
        if starters_only:
            _, section = _section_for_item(item)
            if section != "Starters":
                continue
        filtered.append(item)
    return filtered


def _format_menu(items, dietary_pref: str = "all", starters_only: bool = False) -> str:
    filtered = _filter_items_for_pref(items, dietary_pref, starters_only=starters_only)
    if not filtered:
        if starters_only:
            return "No starters found for this preference."
        return "No items found for this preference right now."

    grouped: dict = {}
    emoji_for  = {"Starters": "🥗", "Main Course": "🍛", "Rice & Noodles": "🍜", "Curries": "🍛"}
    order      = ["Starters", "Main Course", "Rice & Noodles", "Curries"]

    for item in filtered:
        _, section = _section_for_item(item)
        grouped.setdefault(section, []).append(item)

    if dietary_pref == "veg":
        header = "📋 *Veg Menu*"
    elif dietary_pref == "nonveg":
        header = "📋 *Non-Veg Menu*"
    elif starters_only:
        header = "🥗 *Starter Options*"
    else:
        header = "📋 *Full Menu*"

    lines = [header, ""]
    for section in order:
        section_items = grouped.get(section, [])
        if not section_items:
            continue
        lines.append(f"{emoji_for.get(section, '🍽️')} *{section}*")
        for it in section_items:
            tag_icon = "🌿" if _item_is_veg(it) else "🍖"
            lines.append(f"• {tag_icon} {it.name} – {_format_price(it.price)}")
        lines.append("")

    return "\n".join(lines).strip()


def _format_item_options(items, keyword: str) -> str | None:
    """Return all items whose name contains *keyword*."""
    kw = _normalize_text(keyword)
    matched = [i for i in items if kw in _normalize_text(i.name or "")]
    if not matched:
        return None
    lines = [f"🍽️ *Options with '{keyword.title()}'*", ""]
    for it in matched:
        tag_label = "🌿 Veg" if _item_is_veg(it) else "🍖 Non-Veg"
        lines.append(f"• {it.name} – {_format_price(it.price)} ({tag_label})")
    lines.append("\nWould you like to order any of these? 😊")
    return "\n".join(lines)


def _format_top_picks(items, dietary_pref: str = "all") -> str:
    filtered = _filter_items_for_pref(items, dietary_pref)
    if not filtered:
        return "Couldn't find recommendations for this preference right now."
    reason_by_section = {
        "Starters":       "Great starter with balanced flavors",
        "Main Course":    "Rich and satisfying main dish",
        "Rice & Noodles": "Comforting and filling choice",
        "Curries":        "Aromatic and flavorful curry",
    }
    lines = ["⭐ *Top Picks for You*", ""]
    for idx, it in enumerate(filtered[:4], start=1):
        _, section = _section_for_item(it)
        lines.append(f"{idx}. {it.name} – {reason_by_section.get(section, 'Popular among regulars')}")
    return "\n".join(lines)


# ═════════════════════════════════════════════════════════════════════════════
#  CART HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _append_order_line(ctx: dict, item_name: str, qty: int, unit_price: int) -> list:
    """Add or increment an item in the cart. Always merges duplicates."""
    order_lines = list(ctx.get("order_lines") or [])
    item_key = _normalize_text(item_name)

    for line in order_lines:
        if _normalize_text(line.get("name", "")) == item_key:
            new_qty = int(line.get("qty", 0)) + int(qty)
            line["qty"]        = new_qty
            line["unit_price"] = int(unit_price)
            line["line_total"] = int(unit_price) * new_qty
            ctx["order_lines"] = order_lines
            return order_lines

    order_lines.append({
        "name":       item_name,
        "qty":        int(qty),
        "unit_price": int(unit_price),
        "line_total": int(unit_price) * int(qty),
    })
    ctx["order_lines"] = order_lines
    return order_lines


def _remove_order_line(ctx: dict, item_name: str) -> tuple[list, bool]:
    """Remove an item from the cart. Returns (updated_lines, was_found)."""
    order_lines = list(ctx.get("order_lines") or [])
    item_key    = _normalize_text(item_name)
    new_lines   = [l for l in order_lines if _normalize_text(l.get("name", "")) != item_key]
    found       = len(new_lines) < len(order_lines)
    ctx["order_lines"] = new_lines
    return new_lines, found


def _format_cart(order_lines: list) -> str:
    """Render the current cart as a WhatsApp-friendly string."""
    if not order_lines:
        return "🛒 Your cart is empty."
    lines    = ["🛒 *Your Cart:*"]
    for l in order_lines:
        qty        = int(l.get("qty", 1))
        lines.append(f"• {l.get('name','Item')} x {qty}")
    return "\n".join(lines)


def _format_order_summary(ctx: dict) -> str:
    order_lines = ctx.get("order_lines") or []
    if not order_lines:
        return "I couldn't build your order summary — no items were captured."

    name     = ctx.get("customer_name",    "Not provided")
    contact  = ctx.get("customer_contact", "Not provided")
    address  = ctx.get("customer_address", "Not provided")
    subtotal = sum(int(l.get("line_total", 0)) for l in order_lines)

    lines = [
        "✅ *Order Confirmed!*", "",
        "🧾 *Order Summary*",
        f"• Name: {name}",
        f"• Contact: {contact}",
        f"• Address: {address}",
        "", "🍽️ *Items*",
    ]
    for l in order_lines:
        qty        = int(l.get("qty", 1))
        unit_price = int(l.get("unit_price", 0))
        line_total = int(l.get("line_total", unit_price * qty))
        lines.append(
            f"• {l.get('name','Item')} x {qty} — {_format_price(unit_price)} = {_format_price(line_total)}"
        )
    lines += ["", f"💵 *Total Bill: {_format_price(subtotal)}*", "⏱️ Estimated delivery: 30 mins"]
    return "\n".join(lines)


# ═════════════════════════════════════════════════════════════════════════════
#  INTENT DETECTORS
# ═════════════════════════════════════════════════════════════════════════════

def _is_affirmative(text: str) -> bool:
    msg = _normalize_text(text)
    yes_phrases = {
        "yes", "y", "ok", "okay", "sure", "done", "confirm",
        "go ahead", "place it", "place order", "order it",
        "add this to cart", "add to cart", "add it to cart",
        "okay let's add this to cart", "ok let's add this to cart",
        "let's add", "lets add", "add it", "add this",
        "yeah", "yep", "yup", "absolutely", "definitely",
        "sounds good", "that's fine", "that's correct",
        "correct", "right", "perfect", "great",
        "haan", "ha", "bilkul",
    }
    if msg in yes_phrases:
        return True
    for phrase in yes_phrases:
        if msg.startswith(phrase + " ") or msg == phrase:
            return True
    if re.search(r"\b(ok|okay|yes|sure|yeah)\b.*\b(add|confirm|go|place|order)\b", msg):
        return True
    if re.search(r"\badd\b.*(cart|order)", msg):
        return True
    return False


def _is_negative(text: str) -> bool:
    msg = _normalize_text(text)
    no_words = {"no", "n", "nah", "nope", "cancel", "stop", "not now"}
    return msg in no_words or any(f" {w} " in f" {msg} " for w in no_words)


def _is_greeting(msg: str) -> bool:
    _GREETING_WORDS = {
        "hi", "hello", "hey", "good morning", "good evening",
        "good afternoon", "namaste", "hii", "helo",
    }
    m = _normalize_text(msg)
    if m in _GREETING_WORDS:
        return True
    words = m.split()
    return len(words) <= 3 and all(w in _GREETING_WORDS for w in words)


def _is_show_full_menu_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "full menu", "complete menu", "entire menu", "provide menu",
        "all menu", "fullmenu", "share me your menu", "show me menu",
        "show menu", "your menu", "what do you have",
    ])


def _is_starter_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "starter", "starters", "appetizer", "snacks", "starter options",
    ])


def _is_best_dish_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "best dish", "best item", "top dish", "what's best", "best among",
        "top picks", "special", "what is special",
    ])


def _is_veg_menu_intent(msg: str) -> bool:
    if re.search(r"\bnon[-\s]?veg\b", msg):
        return False
    return any(k in msg for k in [
        "veg options", "vegetarian options", "veg menu", "vegetarian menu",
        "show veg", "show vegetarian", "veg items", "vegetarian items",
        "only veg", "all veg",
    ]) or (
        any(k in msg for k in ["veg", "vegetarian"]) and
        any(k in msg for k in ["option", "menu", "item", "show", "list", "all", "what"])
        and "non" not in msg
    )


def _is_nonveg_menu_intent(msg: str) -> bool:
    return bool(re.search(r"\bnon[-\s]?veg\b", msg)) or any(k in msg for k in [
        "non veg options", "nonveg options", "non-veg options",
        "non veg menu", "nonveg menu", "non-veg menu",
        "show non veg", "non veg items", "nonveg items",
    ])


def _is_party_catering_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "party", "catering", "event", "organize", "organise",
        "arrange", "bulk order", "large order", "group order",
    ])


def _is_order_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "i want to order", "order this", "place order",
        "i will take", "i'll take", "book this",
    ])


def _is_add_intent(msg: str) -> bool:
    """Detect ADD TO CART intent — the most common ordering action."""
    # Estimation-style asks should not auto-add to cart.
    if _is_quantity_suggestion_intent(msg) or any(
        k in msg for k in ["estimate", "estimation", "quantity", "how many", "how much"]
    ):
        return False

    if any(k in msg for k in [
        "add ", "also add", "include", "increase",
        "i want ", "i'll take", "i will take",
        "give me", "get me", "order more", "add more",
        "add another", "more items", "i want to add",
        "also want", "want to add", "like to add",
        "aur bhi", "or bhi", "bhi order", "bhi lena",
        "also order", "and also", "and i want",
    ]):
        return True
    # Pattern: "<qty> <item>" — e.g. "30 veg burgers"
    if re.match(r"^\d+\s+[a-z]", msg):
        return True
    return False


def _is_remove_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "remove", "delete", "cancel ", "take off", "drop ", "don't want",
        "dont want", "remove this", "remove that",
    ])


def _is_quantity_suggestion_intent(msg: str) -> bool:
    msg = _normalize_text(msg)
    keys = [
        "how much quantity", "what quantity", "how much should i order",
        "how many should i order", "quantity should i order",
        "enough for", "for party", "for people", "for guests",
        "for persons", "for person",
    ]
    if any(k in msg for k in keys):
        return True
    return bool(re.search(r"\b(\d{1,4})\s*(people|persons|guests|pax|person)\b", msg))


def _is_ingredient_query(msg: str) -> bool:
    msg = _normalize_text(msg)
    return any(k in msg for k in [
        "ingredient", "ingredients", "made of", "what is in",
        "contains", "allergen", "allergy",
    ])


def _is_veg_query(msg: str) -> bool:
    msg = _normalize_text(msg)
    if _is_veg_menu_intent(msg) or _is_nonveg_menu_intent(msg):
        return False
    if any(k in msg for k in ["menu", "options", "items", "list", "show"]):
        return False
    return any(re.search(p, msg) for p in [
        r"\bveg\b", r"\bvegetarian\b", r"\bnon.?veg\b",
        r"\bmeat\b", r"\bcontain meat\b", r"\bis it veg\b",
        r"\bis .* veg", r"\bveg or not\b", r"\bpaneer\b.*\bveg\b",
    ])


def _is_modify_order_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "modify order", "change order", "replace", "instead",
    ])


def _extract_item_keyword_from_options_query(msg: str) -> str | None:
    patterns = [
        r"(?:options?|choices?|varieties?|types?)\s+(?:in|of|for|with)?\s*([a-z ]{2,30})",
        r"([a-z ]{2,30})\s+(?:options?|choices?|varieties?|types?)",
        r"(?:what|which|any)\s+([a-z ]{2,20})\s+(?:do you have|available|options?)",
        r"(?:get|have|give me)\s+(?:some|any)?\s*(?:option|choice)?\s*(?:in|of|for)?\s*([a-z ]{2,30})",
    ]
    skip = {"menu", "food", "dish", "item", "option", "choice", "veg", "non", "full", "complete"}
    for pat in patterns:
        m = re.search(pat, msg)
        if m:
            kw = m.group(1).strip().rstrip("s ")
            if kw and kw not in skip and len(kw) >= 3:
                return kw
    return None


def _extract_qty(text: str):
    match = re.search(r"\b(\d{1,4})\b", text or "")
    return int(match.group(1)) if match else None


def _extract_people_count(text: str):
    msg = _normalize_text(text)
    patterns = [
        r"\bfor\s+(\d{1,4})\s*(people|persons|guests|pax)\b",
        r"\b(\d{1,4})\s*(people|persons|guests|pax)\b",
        r"\bparty\s+of\s+(\d{1,4})\b",
        r"\bfor\s+(\d{1,4})\b",
        r"\b(\d{1,4})\s+person\b",
    ]
    for p in patterns:
        m = re.search(p, msg)
        if m:
            try:
                return int(m.group(1))
            except (TypeError, ValueError):
                return None
    return None


def _extract_contact_number(text: str):
    digits = re.sub(r"\D", "", text or "")
    return digits[-10:] if len(digits) >= 10 else None


def _is_valid_name(text: str) -> bool:
    t = (text or "").strip()
    if len(t) < 2:
        return False
    if any(k in _normalize_text(t) for k in [
        "order", "more", "confirm", "menu", "address",
        "contact", "number", "item", "add", "cart",
    ]):
        return False
    return bool(re.fullmatch(r"[A-Za-z ]+", t))


# ═════════════════════════════════════════════════════════════════════════════
#  ITEM MATCHING
# ═════════════════════════════════════════════════════════════════════════════

def _find_best_item_match(message: str, items):
    msg = _normalize_text(message)
    if not msg:
        return None

    exact, scored = [], []
    msg_tokens = {t for t in re.findall(r"[a-zA-Z]+", msg) if len(t) > 2}

    for item in items:
        name = _normalize_text(item.name or "")
        if not name:
            continue
        if name in msg or msg in name:
            exact.append(item)
            continue
        name_tokens  = {t for t in re.findall(r"[a-zA-Z]+", name) if len(t) > 2}
        overlap      = len(msg_tokens & name_tokens)
        fuzzy_overlap = 0
        for mt in msg_tokens:
            best_ratio = max(
                (SequenceMatcher(None, mt, nt).ratio() for nt in name_tokens),
                default=0.0,
            )
            if best_ratio >= 0.78:
                fuzzy_overlap += 1
        phrase_ratio = SequenceMatcher(None, msg, name).ratio()
        combined = max(overlap, fuzzy_overlap)
        if combined > 0 or phrase_ratio >= 0.72:
            scored.append((combined, phrase_ratio, -len(name_tokens), item))

    if exact:
        return exact[0]
    if scored:
        scored.sort(key=lambda x: (x[0], x[1], x[2]), reverse=True)
        best_overlap, best_phrase_ratio, _, best_item = scored[0]
        if best_overlap >= 2 or (best_overlap >= 1 and best_phrase_ratio >= 0.72):
            return best_item
    return None


# ═════════════════════════════════════════════════════════════════════════════
#  CONVERSATION HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _get_or_create_conversation(db: Session, restaurant_id: str, customer_phone: str) -> WhatsAppConversation:
    conv = (
        db.query(WhatsAppConversation)
        .filter(
            WhatsAppConversation.restaurant_id == restaurant_id,
            WhatsAppConversation.customer_phone == customer_phone,
        )
        .first()
    )
    if not conv:
        conv = WhatsAppConversation(
            restaurant_id=restaurant_id,
            customer_phone=customer_phone,
            last_message="",
            context_json={},
        )
        db.add(conv)
    if conv.context_json is None:
        conv.context_json = {}
    return conv


def _get_recent_conversation_context(
    db: Session, restaurant_id: str, customer_phone: str, limit: int = 8
) -> str:
    rows = (
        db.query(WhatsAppMessage)
        .filter(
            WhatsAppMessage.restaurant_id == restaurant_id,
            WhatsAppMessage.customer_phone == customer_phone,
        )
        .order_by(WhatsAppMessage.created_at.desc())
        .limit(limit)
        .all()[::-1]
    )
    if not rows:
        return "No prior conversation"
    lines = []
    for row in rows:
        role = "Customer" if row.direction == "incoming" else "Waiter"
        lines.append(f"{role}: {row.message}")
    return "\n".join(lines)


def _next_details_prompt(stage: str) -> str:
    if stage == "awaiting_name":
        return "What's your name for the order? 😊"
    if stage == "awaiting_contact":
        return "And your contact number?"
    if stage == "awaiting_address":
        return "Last thing — what's your delivery address?"
    return ""


def _compose_greeting_only(db: Session, restaurant_id: str) -> str:
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    rname = (restaurant.name if restaurant else "our restaurant").strip()
    return random.choice([
        f"Hey! Welcome to *{rname}* 👋 Great to have you here!\nWhat can I get you today? Ask for the menu, recommendations, or just tell me what you're craving 😄",
        f"Hi there! Welcome to *{rname}* 😊\nFeel free to browse the menu or tell me what you'd like — I'm here to help!",
        f"Hello! Welcome to *{rname}* 👋\nLooking for the menu, today's specials, or ready to order? Just say the word!",
    ])


def _compose_first_turn_greeting(db: Session, restaurant_id: str) -> str:
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    rname = (restaurant.name if restaurant else "our restaurant").strip()
    return f"Welcome to *{rname}* 👋"


# ═════════════════════════════════════════════════════════════════════════════
#  PARTY / CATERING
# ═════════════════════════════════════════════════════════════════════════════

def _handle_party_intent(db: Session, restaurant_id: str, message: str, items) -> str:
    people_count = _extract_people_count(message)
    people_str   = f"*{people_count} people*" if people_count else "your group"
    top_names    = ", ".join(i.name for i in items[:4]) if items else "our popular dishes"
    if people_count:
        return (
            f"🎉 Love it! We'd be happy to arrange for {people_str}.\n"
            f"Popular choices: {top_names}.\n"
            "Tell me which dishes you'd like and I'll suggest the right quantities!"
        )
    return (
        f"🎉 Happy to help plan something for {people_str}!\n"
        f"Popular choices: {top_names}.\n"
        "How many people are attending? I'll figure out quantities once you pick dishes."
    )


# ═════════════════════════════════════════════════════════════════════════════
#  QUANTITY ESTIMATION
# ═════════════════════════════════════════════════════════════════════════════

def _estimate_qty_for_people(item: MenuItem, people_count: int):
    people = max(1, int(people_count or 1))
    name   = _normalize_text(item.name or "")
    _, section = _section_for_item(item)

    if any(k in name for k in ["shake", "juice", "lassi", "mocktail", "soda", "tea", "coffee"]):
        low_f, high_f, note = 0.8, 1.1, "for beverage servings"
    elif any(k in name for k in ["fries", "salad", "snack", "starter", "tikka", "burger"]):
        low_f, high_f, note = 0.45, 0.65, "as a snack/side"
    elif section == "Starters":
        low_f, high_f, note = 0.5, 0.75, "for starter portions"
    elif section in {"Rice & Noodles", "Curries", "Main Course"}:
        low_f, high_f, note = 0.35, 0.55, "when served with multiple dishes"
    else:
        low_f, high_f, note = 0.45, 0.65, "as an average estimate"

    low      = max(1, int(round(people * low_f)))
    high     = max(low, int(round(people * high_f)))
    suggested = int(round((low + high) / 2))
    return low, high, suggested, note


def _build_quantity_suggestion_reply(item: MenuItem, people_count: int) -> str:
    low, high, suggested, note = _estimate_qty_for_people(item, people_count)
    return (
        f"For *{people_count} people*, I'd suggest *{low}–{high}* portions of *{item.name}* ({note}) 🍽️\n"
        f"*{suggested}* is a safe starting point.\n"
        f"Want me to add *{suggested} × {item.name}* to your order?"
    )


# ═════════════════════════════════════════════════════════════════════════════
#  VEG STATUS REPLY / INGREDIENT REPLY
# ═════════════════════════════════════════════════════════════════════════════

def _veg_status_reply(item: MenuItem) -> str:
    is_veg    = _item_is_veg(item)
    price_str = _format_price(item.price)
    if not is_veg:
        return (
            f"{item.name} is non-veg 🍖. "
            "Want me to suggest a vegetarian alternative, or shall I go ahead with this?"
        )
    return (
        f"Yes, {item.name} is vegetarian 🌿 — available at {price_str}. "
        "Would you like to order it?"
    )


def _ingredient_reply_for_item(item: MenuItem) -> str:
    description = (item.description or "").strip()
    if description:
        return f"Here's what goes into {item.name} 🧾: {description}"
    return (
        f"I don't have the full ingredient list for {item.name} right now 🧾. "
        "If you have specific allergens to avoid, tell me and I'll suggest something safer."
    )


# ═════════════════════════════════════════════════════════════════════════════
#  ADD ITEM REPLY — central action for cart operations
# ═════════════════════════════════════════════════════════════════════════════

def _build_add_reply(ctx: dict, item: MenuItem, qty: int) -> str:
    price      = int(item.price or 0)
    order_lines = _append_order_line(ctx, item.name, qty, price)
    ctx["last_added_item"] = item.name
    cart_text  = _format_cart(order_lines)
    suggestions = [
        "Anything else you'd like?",
        "Would you like me to add anything more?",
        "Want to add another item?",
        "Shall I add anything else for you?",
    ]
    return (
        f"Added *{qty} {item.name}* 👍\n\n"
        f"{cart_text}\n\n"
        f"{random.choice(suggestions)}"
    )


def _is_start_over_intent(msg: str) -> bool:
    m = _normalize_text(msg)
    return m in {
        "start over", "restart", "reset", "clear cart", "new order", "start again"
    }


def _closest_item_hint(message: str, items) -> str:
    best = _find_best_item_match(message, items)
    if best:
        return f"Did you mean *{best.name}*?"
    return "Could you tell me the dish name once more?"


# ═════════════════════════════════════════════════════════════════════════════
#  HAS STRONG INTENT — decides whether to bypass OpenAI
# ═════════════════════════════════════════════════════════════════════════════

def _has_strong_intent(msg: str, stage: str) -> bool:
    m = _normalize_text(msg)
    return (
        _is_start_over_intent(m)
        or
        stage in {
            "awaiting_confirmation", "awaiting_name",
            "awaiting_contact", "awaiting_address", "confirmed",
        }
        or _is_show_full_menu_intent(m)
        or _is_starter_intent(m)
        or _is_best_dish_intent(m)
        or _is_order_intent(m)
        or _is_add_intent(m)
        or _is_remove_intent(m)
        or _is_quantity_suggestion_intent(m)
        or _is_modify_order_intent(m)
        or _is_ingredient_query(m)
        or _is_veg_query(m)
        or _is_party_catering_intent(m)
        or _is_affirmative(m)
        or _is_veg_menu_intent(m)
        or _is_nonveg_menu_intent(m)
        or _extract_item_keyword_from_options_query(m) is not None
        or any(k in m for k in ["veg", "vegetarian", "non veg", "nonveg"])
    )


# ═════════════════════════════════════════════════════════════════════════════
#  PARSE NAME + "AND I WANT TO ORDER MORE"
# ═════════════════════════════════════════════════════════════════════════════

def _parse_name_and_add_more(message: str):
    msg_lower = _normalize_text(message)
    add_more_triggers = [
        "and i want to order more", "and want to order more",
        "and i want more", "and also want", "and i also want",
        "and add more", "and order more", "i want to order more",
        "want to order more", "and more",
    ]
    for trigger in add_more_triggers:
        if trigger in msg_lower:
            idx       = msg_lower.index(trigger)
            candidate = message[:idx].strip().rstrip(",.!? ")
            if candidate and _is_valid_name(candidate):
                return candidate, True
            return None, True
    stripped = message.strip()
    if _is_valid_name(stripped):
        return stripped, False
    return None, False


# ═════════════════════════════════════════════════════════════════════════════
#  MAIN FALLBACK HANDLER  (rule-based, always correct)
# ═════════════════════════════════════════════════════════════════════════════

def _fallback_reply(
    db: Session, restaurant_id: str, customer_phone: str, message: str
) -> str:
    items = (
        db.query(MenuItem)
        .filter(MenuItem.restaurant_id == restaurant_id, MenuItem.is_available == True)
        .order_by(MenuItem.created_at.desc())
        .limit(500)
        .all()
    )
    conv = _get_or_create_conversation(db, restaurant_id, customer_phone)
    ctx  = dict(conv.context_json or {})
    msg  = _normalize_text(message)

    if not items:
        return "Our menu is being updated right now. Please check back soon!"

    pending_item  = ctx.get("pending_item")
    stage         = ctx.get("stage")
    dietary_pref  = ctx.get("dietary_pref", "all")
    first_turn    = not bool(ctx.get("welcomed"))

    def _save_ctx():
        conv.context_json = ctx
        db.commit()

    # ── FIRST TURN ────────────────────────────────────────────────────────────
    if first_turn:
        ctx["welcomed"] = True
        _save_ctx()
        if _is_greeting(message):
            return _compose_greeting_only(db, restaurant_id)
        if _is_party_catering_intent(msg):
            welcome = _compose_first_turn_greeting(db, restaurant_id)
            return f"{welcome}\n\n{_handle_party_intent(db, restaurant_id, message, items)}"
        welcome = _compose_first_turn_greeting(db, restaurant_id)
        core    = _fallback_reply(db, restaurant_id, customer_phone, message)
        if _normalize_text(core).startswith("welcome"):
            return core
        return f"{welcome}\n\n{core}"

    # ── REPEATED GREETING ─────────────────────────────────────────────────────
    if _is_greeting(message):
        cart_lines = ctx.get("order_lines") or []
        if cart_lines:
            return (
                f"Hey again! 👋\n\n{_format_cart(cart_lines)}\n\n"
                "Want to add more items or confirm your order?"
            )
        return random.choice([
            "Hey again! 👋 What can I get for you?",
            "Hi! Still here to help 😊 What would you like?",
            "Hello! What would you like today? 🙂",
        ])

    # ── START OVER / RESET FLOW ───────────────────────────────────────────────
    if _is_start_over_intent(message):
        ctx.update({
            "order_lines": [],
            "pending_item": None,
            "pending_price": None,
            "pending_qty": None,
            "stage": None,
            "customer_name": None,
            "customer_contact": None,
            "customer_address": None,
            "last_confirmation_prompt_at": None,
            "last_quantity_range": None,
            "last_added_item": None,
            "dietary_pref": "all",
            "welcomed": True,
        })
        _save_ctx()
        return "Done, I have cleared the current order. What would you like to order now?"

    # ── PARTY INTENT ──────────────────────────────────────────────────────────
    if _is_party_catering_intent(msg):
        return _handle_party_intent(db, restaurant_id, message, items)

    # ── FIX 2: CONFIRMED STAGE — send thank-you, don't fall through ───────────
    if stage == "confirmed":
        # User said okay/thanks after order placed
        if _is_affirmative(msg) or msg in {
            "okay", "ok", "thanks", "thank you", "noted", "great",
            "alright", "fine", "got it", "👍", "thx", "ty",
        }:
            return (
                "Thank you! 🙏 Your order is confirmed and will be delivered in ~30 mins.\n"
                "Feel free to reach out if you need anything else!"
            )
        # User wants to order more — reset stage and continue
        if _is_add_intent(msg) or _is_show_full_menu_intent(msg) or _is_starter_intent(msg):
            ctx["stage"] = None
            ctx["order_lines"] = []
            _save_ctx()
            return (
                "Sure! Let's start a fresh order 😊 What would you like?\n"
                "_(Your previous order has been placed.)_"
            )
        # Anything else after confirmed
        return (
            "Your order is already confirmed ✅ It'll be with you in ~30 mins.\n"
            "Want to place a new order?"
        )

    # ── CHECKOUT FLOW STAGES ──────────────────────────────────────────────────
    if stage == "awaiting_name":
        extracted_name, wants_more = _parse_name_and_add_more(message)
        if wants_more:
            if extracted_name:
                ctx["customer_name"] = extracted_name.title()
                _save_ctx()
                return (
                    f"Got it, *{extracted_name.title()}* 😊 No problem!\n"
                    "Tell me what you'd like to add and I'll include it."
                )
            _save_ctx()
            return "Sure! 😊 Tell me what you'd like to add.\n_(Once done, just share your name to continue)_"
        if not _is_valid_name(message):
            return "Could you share just your name? (letters only, e.g. Rohit)"
        ctx["customer_name"] = (message or "").strip().title()
        ctx["stage"] = "awaiting_contact"
        _save_ctx()
        return f"Thanks, *{ctx['customer_name']}* 😊 And your contact number?"

    if stage == "awaiting_contact":
        contact = _extract_contact_number(message)
        if not contact:
            return "Hmm, that doesn't look right 🙈 Could you share a valid 10-digit number?"
        ctx["customer_contact"] = contact
        ctx["stage"] = "awaiting_address"
        _save_ctx()
        return "Got it 👍 Last thing — what's your delivery address?"

    if stage == "awaiting_address":
        addr = (message or "").strip()
        if len(addr) < 8:
            return "Could you share a more complete address? (at least a street or area name)"
        ctx["customer_address"] = addr
        ctx["stage"] = "confirmed"
        _save_ctx()
        return _format_order_summary(ctx)

    # ── CONFIRM PENDING ITEM → ADD TO CART + BEGIN CHECKOUT ───────────────────
    if stage == "awaiting_confirmation" and _is_affirmative(message):
        price     = int(ctx.get("pending_price") or 0)
        item_name = pending_item
        qty       = int(ctx.get("pending_qty") or 1)

        # FIX 3: Guard against ghost "Selected item x 1 — ₹0" lines
        if not item_name or price <= 0:
            ctx.update({
                "pending_item": None, "pending_qty": None,
                "pending_price": None, "last_confirmation_prompt_at": None,
                "stage": None,
            })
            _save_ctx()
            return "Hmm, I lost track of that item 🙈 Could you tell me which dish you'd like to add?"

        _append_order_line(ctx, item_name, qty, price)
        ctx.update({
            "pending_item": None, "pending_qty": None,
            "pending_price": None, "last_confirmation_prompt_at": None,
            "stage": "awaiting_name",
        })
        _save_ctx()
        cart_text = _format_cart(ctx["order_lines"])
        return (
            f"Awesome, noted ✅\n\n{cart_text}\n\n"
            f"{_next_details_prompt('awaiting_name')}"
        )

    # ── NEGATIVE DURING CONFIRMATION ──────────────────────────────────────────
    if _is_negative(msg) and stage == "awaiting_confirmation":
        ctx.update({
            "stage": None, "pending_qty": None,
            "last_confirmation_prompt_at": None,
        })
        _save_ctx()
        return "No worries 🙂 Want to see more options or pick a different dish?"

    # ── INTENT PRIORITY 1: QUANTITY ESTIMATION ───────────────────────────────
    if _is_quantity_suggestion_intent(message):
        people_count = _extract_people_count(message)
        selected     = _find_best_item_match(message, items) or (
            next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)
            if pending_item else None
        )
        if selected and people_count:
            low, high, suggested, _ = _estimate_qty_for_people(selected, people_count)
            ctx.update({
                "pending_item": selected.name, "pending_price": int(selected.price or 0),
                "pending_qty": suggested,
                "last_quantity_range": {"low": low, "high": high, "people": people_count},
                "last_confirmation_prompt_at": time.time(),
                "stage": "awaiting_confirmation",
            })
            _save_ctx()
            return _build_quantity_suggestion_reply(selected, people_count)
        if people_count and not selected:
            return (
                f"For *{people_count} people*, I can suggest exact quantity once you tell me the dish 👍\n"
                "Which item should I estimate for?"
            )
        if selected and not people_count:
            ctx.update({"pending_item": selected.name, "pending_price": int(selected.price or 0)})
            _save_ctx()
            return f"How many people are you ordering *{selected.name}* for? I'll estimate the right quantity."

    # ── INTENT PRIORITY 2: ADD TO CART ───────────────────────────────────────
    if _is_add_intent(msg):
        selected = _find_best_item_match(message, items)
        if not selected and pending_item:
            selected = next(
                (i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)),
                None,
            )
        if not selected and (ctx.get("last_added_item") or ""):
            selected = next(
                (i for i in items if _normalize_text(i.name or "") == _normalize_text(ctx.get("last_added_item", ""))),
                None,
            )
        if not selected:
            _save_ctx()
            return f"Sure 👍 {_closest_item_hint(message, items)}"

        qty = _extract_qty(message) or 1
        # If qty equals a detected people count it's likely party size mention, not item qty.
        people = _extract_people_count(message)
        if people and qty == people:
            qty = 1

        prior_stage = stage
        reply = _build_add_reply(ctx, selected, qty)
        # Preserve checkout stage so we don't interrupt flow
        ctx["stage"] = prior_stage
        ctx.update({"pending_item": None, "pending_price": None, "pending_qty": None})
        _save_ctx()
        return reply

    # ── INTENT PRIORITY 2 (continued): EXPLICIT ORDER ────────────────────────
    if _is_order_intent(msg):
        people_count = _extract_people_count(message)
        selected     = _find_best_item_match(message, items) or (
            next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)
            if pending_item else None
        )
        if not selected:
            return f"Sure 👍 {_closest_item_hint(message, items)}"
        if people_count:
            low, high, suggested, _ = _estimate_qty_for_people(selected, people_count)
            ctx.update({
                "pending_item": selected.name, "pending_price": int(selected.price or 0),
                "pending_qty": suggested, "last_confirmation_prompt_at": time.time(),
                "stage": "awaiting_confirmation",
            })
            _save_ctx()
            return _build_quantity_suggestion_reply(selected, people_count)
        qty = _extract_qty(message) or 1
        reply = _build_add_reply(ctx, selected, qty)
        ctx.update({
            "pending_item": None, "pending_price": None, "pending_qty": None,
            "last_confirmation_prompt_at": None, "stage": stage,
        })
        _save_ctx()
        return reply

    # ── INTENT PRIORITY 3: REMOVE / UPDATE ───────────────────────────────────
    if _is_remove_intent(msg):
        best = _find_best_item_match(message, items)
        if best:
            order_lines, found = _remove_order_line(ctx, best.name)
            _save_ctx()
            if found:
                cart_text = _format_cart(order_lines)
                return f"Removed *{best.name}* from your cart 👍\n\n{cart_text}"
            return f"I can remove it right away once it's in cart. {_closest_item_hint(message, items)}"
        cart_lines = ctx.get("order_lines") or []
        if cart_lines:
            for line in cart_lines:
                if _normalize_text(line.get("name", "")) in msg:
                    order_lines, _ = _remove_order_line(ctx, line["name"])
                    _save_ctx()
                    return f"Removed *{line['name']}* 👍\n\n{_format_cart(order_lines)}"
        return f"Sure 👍 {_closest_item_hint(message, items)}"

    if _is_modify_order_intent(msg) and pending_item:
        ctx.update({"pending_item": None, "pending_price": None, "stage": None})
        _save_ctx()
        return "Sure, let's update that. Tell me which item you want instead."

    # ── INTENT PRIORITY 4: INGREDIENT QUERY ──────────────────────────────────
    if _is_ingredient_query(message):
        best = _find_best_item_match(message, items) or (
            next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)
            if pending_item else None
        )
        if best:
            return _ingredient_reply_for_item(best)
        return f"Sure, I can help with ingredients. {_closest_item_hint(message, items)}"

    # ── INTENT PRIORITY 5: VEG / NON-VEG QUERY ───────────────────────────────
    if _is_veg_query(message):
        best = _find_best_item_match(message, items) or (
            next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)
            if pending_item else None
        )
        if best:
            ctx.update({
                "pending_item": best.name,
                "pending_price": int(best.price or 0),
                "stage": "awaiting_confirmation",
            })
            _save_ctx()
            return _veg_status_reply(best)
        return f"Sure. {_closest_item_hint(message, items)}"

    # ── INTENT PRIORITY 6: SUGGESTIONS ───────────────────────────────────────
    if _is_starter_intent(msg):
        pref = (
            "veg" if ("veg" in msg and "non" not in msg)
            else ("nonveg" if ("nonveg" in msg or "non veg" in msg) else dietary_pref)
        )
        ctx["dietary_pref"] = pref
        _save_ctx()
        return _format_menu(items, dietary_pref=pref, starters_only=True)

    if _is_best_dish_intent(msg) or any(k in msg for k in ["recommend", "suggest"]):
        pref = (
            "veg" if ("veg" in msg and "non" not in msg)
            else ("nonveg" if ("nonveg" in msg or "non veg" in msg) else dietary_pref)
        )
        ctx["dietary_pref"] = pref
        _save_ctx()
        return _format_top_picks(items, dietary_pref=pref)

    kw = _extract_item_keyword_from_options_query(msg)
    if kw:
        result = _format_item_options(items, kw)
        if result:
            return result
        best = _find_best_item_match(kw, items)
        if best:
            tag_label = "🌿 Veg" if _item_is_veg(best) else "🍖 Non-Veg"
            return (
                f"We have *{best.name}* ({tag_label}) 😊\n"
                "Would you like me to add it to your cart?"
            )
        return f"Sure 👍 {_closest_item_hint(kw, items)}"

    # ── INTENT PRIORITY 7: MENU (ONLY WHEN EXPLICIT) ────────────────────────
    if _is_veg_menu_intent(msg):
        ctx["dietary_pref"] = "veg"
        _save_ctx()
        return _format_menu(items, dietary_pref="veg")

    if _is_nonveg_menu_intent(msg):
        ctx["dietary_pref"] = "nonveg"
        _save_ctx()
        return _format_menu(items, dietary_pref="nonveg")

    if _is_show_full_menu_intent(msg):
        return _format_menu(items, dietary_pref="all")

    # ── ITEM NAME MATCH ───────────────────────────────────────────────────────
    best_item = _find_best_item_match(message, items)
    if best_item:
        people_count = _extract_people_count(message)
        price        = int(best_item.price) if best_item.price is not None else 0

        if people_count:
            low, high, suggested, _ = _estimate_qty_for_people(best_item, people_count)
            ctx.update({
                "pending_item": best_item.name, "pending_price": price,
                "pending_qty": suggested, "last_confirmation_prompt_at": time.time(),
                "stage": "awaiting_confirmation",
            })
            _save_ctx()
            return _build_quantity_suggestion_reply(best_item, people_count)

        qty = _extract_qty(message) or 1
        # Present item confirmation (not auto-add) so user confirms
        ctx.update({
            "pending_item": best_item.name, "pending_price": price,
            "pending_qty": qty, "last_confirmation_prompt_at": time.time(),
            "stage": "awaiting_confirmation",
        })
        _save_ctx()
        tag_label = "🌿 Veg" if _item_is_veg(best_item) else "🍖 Non-Veg"
        return (
            f"*{qty} × {best_item.name}* ({tag_label}) — {_format_price(price * qty)} 😊\n"
            "Shall I add this to your cart?"
        )

    # ── GENERIC MENU KEYWORD ──────────────────────────────────────────────────
    if any(k in msg for k in ["menu", "what do you have", "available"]):
        return _format_menu(items, dietary_pref="all")

    # ── LAST RESORT ───────────────────────────────────────────────────────────
    cart_lines = ctx.get("order_lines") or []
    if cart_lines:
        # User said something unrecognised but has an active cart — show cart
        return (
            f"I'm not sure what you meant 🙂\n\n{_format_cart(cart_lines)}\n\n"
            "Want to add more items, remove something, or confirm your order?"
        )
    return (
        "I'm here to help! 🙂 You can:\n"
        "• Ask for the *full menu*\n"
        "• Say *recommend me something*\n"
        "• Ask about ingredients — e.g. _ingredients of Cheesy Fries_\n"
        "• Place an order — e.g. _I want 2 Cheesy Fries_"
    )


# ═════════════════════════════════════════════════════════════════════════════
#  AI PROMPT BUILDER — now includes system prompt + cart state
# ═════════════════════════════════════════════════════════════════════════════

def _build_waiter_prompt(
    db: Session,
    restaurant_id: str,
    customer_phone: str,
    customer_message: str,
    cfg: RestaurantWhatsappConfig,
    ctx: dict,
) -> str:
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    items = (
        db.query(MenuItem)
        .filter(MenuItem.restaurant_id == restaurant_id, MenuItem.is_available == True)
        .limit(80)
        .all()
    )

    menu_lines = []
    for item in items:
        price     = int(item.price) if item.price is not None else 0
        tag_icon  = "🌿" if _item_is_veg(item) else "🍖"
        menu_lines.append(f"- {tag_icon} {item.name} (₹{price})")

    menu_text = "\n".join(menu_lines) if menu_lines else "- Menu not configured yet"
    custom    = (cfg.custom_prompt or "").strip()
    custom_block = f"\nCustom style: {custom}" if custom else ""
    convo     = _get_recent_conversation_context(db, restaurant_id, customer_phone)
    restaurant_name = restaurant.name if restaurant else "this restaurant"

    # Inject current cart state so AI never "forgets" it
    order_lines = ctx.get("order_lines") or []
    if order_lines:
        cart_lines = []
        for l in order_lines:
            cart_lines.append(
                f"  • {l.get('name')} x {l.get('qty')} — ₹{l.get('line_total', 0)}"
            )
        cart_block = "Current cart:\n" + "\n".join(cart_lines)
    else:
        cart_block = "Current cart: empty"

    return (
        f"Restaurant: {restaurant_name}\n"
        f"Tone: {cfg.tone or 'friendly'}\n"
        f"{custom_block}\n\n"
        f"{cart_block}\n\n"
        f"Available menu:\n{menu_text}\n\n"
        f"Recent conversation:\n{convo}\n\n"
        f"Latest customer message:\n{customer_message}\n"
    )


# ═════════════════════════════════════════════════════════════════════════════
#  GENERATE AI REPLY
# ═════════════════════════════════════════════════════════════════════════════

def generate_ai_reply(
    db: Session,
    restaurant_id: str,
    customer_phone: str,
    customer_message: str,
    cfg: RestaurantWhatsappConfig,
) -> str:
    conv = _get_or_create_conversation(db, restaurant_id, customer_phone)
    ctx  = dict(conv.context_json or {})
    first_turn = not bool(ctx.get("welcomed"))

    # Always use rule-based handler for strong/known intents — guarantees correctness
    if _has_strong_intent(customer_message, ctx.get("stage")):
        return _fallback_reply(db, restaurant_id, customer_phone, customer_message)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _fallback_reply(db, restaurant_id, customer_phone, customer_message)

    try:
        from openai import OpenAI

        model  = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        client = OpenAI(api_key=api_key)
        prompt = _build_waiter_prompt(
            db, restaurant_id, customer_phone, customer_message, cfg, ctx
        )
        response = client.chat.completions.create(
            model=model,
            temperature=0.5,
            max_tokens=300,
            messages=[
                {"role": "system", "content": _WAITER_SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
        )
        text = (response.choices[0].message.content or "").strip()

        # Safety net — route back to rule-based if AI response is insufficient
        normalized_user = _normalize_text(customer_message)
        if _is_show_full_menu_intent(normalized_user) and "*Full Menu*" not in text:
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if _is_starter_intent(normalized_user) and "Starter" not in text:
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if _is_ingredient_query(normalized_user) and "ingredient" not in _normalize_text(text):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if ctx.get("stage") == "awaiting_confirmation" and _is_affirmative(customer_message):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if _is_party_catering_intent(normalized_user):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if _is_add_intent(normalized_user):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if _is_remove_intent(normalized_user):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if _is_veg_menu_intent(normalized_user):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if _is_nonveg_menu_intent(normalized_user):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if _extract_item_keyword_from_options_query(normalized_user):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)

        # Rewrite Devanagari replies to English
        if text and _contains_devanagari(text):
            rewrite = client.chat.completions.create(
                model=model,
                temperature=0.2,
                max_tokens=300,
                messages=[
                    {"role": "system", "content": "Rewrite the text in natural simple English only. Keep meaning same."},
                    {"role": "user",   "content": text},
                ],
            )
            text = (rewrite.choices[0].message.content or text).strip()

        final_text = text or _fallback_reply(db, restaurant_id, customer_phone, customer_message)

        if first_turn:
            ctx["welcomed"] = True
            conv.context_json = ctx
            db.commit()
            if _is_greeting(customer_message):
                return _compose_greeting_only(db, restaurant_id)
            if not _normalize_text(final_text).startswith("welcome"):
                welcome    = _compose_first_turn_greeting(db, restaurant_id)
                final_text = f"{welcome}\n\n{final_text}"

        return final_text

    except Exception as exc:
        print(f"[whatsapp_service] OpenAI reply failed: {exc}")
        return _fallback_reply(db, restaurant_id, customer_phone, customer_message)


# ═════════════════════════════════════════════════════════════════════════════
#  DB LOGGING / UPSERT
# ═════════════════════════════════════════════════════════════════════════════

def _log_message(
    db: Session,
    restaurant_id: str,
    customer_phone: str,
    direction: str,
    message: str,
    wa_message_id: str = None,
):
    db.add(WhatsAppMessage(
        restaurant_id=restaurant_id,
        customer_phone=customer_phone,
        direction=direction,
        message=message,
        wa_message_id=wa_message_id,
    ))


def _upsert_conversation(
    db: Session, restaurant_id: str, customer_phone: str, last_message: str
):
    conv = (
        db.query(WhatsAppConversation)
        .filter(
            WhatsAppConversation.restaurant_id == restaurant_id,
            WhatsAppConversation.customer_phone == customer_phone,
        )
        .first()
    )
    if not conv:
        conv = WhatsAppConversation(
            restaurant_id=restaurant_id,
            customer_phone=customer_phone,
            last_message=last_message,
            context_json={},
        )
        db.add(conv)
    else:
        conv.last_message = last_message


def get_recent_messages(
    db: Session, restaurant_id: str, customer_phone: str, limit: int = 30
):
    return (
        db.query(WhatsAppMessage)
        .filter(
            WhatsAppMessage.restaurant_id == restaurant_id,
            WhatsAppMessage.customer_phone == customer_phone,
        )
        .order_by(WhatsAppMessage.created_at.desc())
        .limit(limit)
        .all()[::-1]
    )


# ═════════════════════════════════════════════════════════════════════════════
#  SIMULATE CHAT (test endpoint)
# ═════════════════════════════════════════════════════════════════════════════

def simulate_chat(
    db: Session,
    restaurant_id: str,
    customer_phone: str,
    message: str,
    send_to_whatsapp: bool = False,
):
    cfg = get_or_create_config(db, restaurant_id)

    _log_message(db, restaurant_id, customer_phone, "incoming", message)
    _upsert_conversation(db, restaurant_id, customer_phone, message)

    reply = generate_ai_reply(db, restaurant_id, customer_phone, message, cfg)
    _log_message(db, restaurant_id, customer_phone, "outgoing", reply)
    _upsert_conversation(db, restaurant_id, customer_phone, reply)

    sent, meta_error = False, None
    if send_to_whatsapp:
        sent, meta_error = send_whatsapp_message(cfg, customer_phone, reply)

    db.commit()
    return reply, sent, meta_error


# ═════════════════════════════════════════════════════════════════════════════
#  SEND WHATSAPP MESSAGE (Meta Graph API)
# ═════════════════════════════════════════════════════════════════════════════

def send_whatsapp_message(cfg: RestaurantWhatsappConfig, to_phone: str, message: str):
    phone_number_id = (cfg.phone_number_id or "").strip().strip('"').strip("'")
    access_token    = (cfg.access_token or "").strip().strip('"').strip("'") or (os.getenv("WHATSAPP_ACCESS_TOKEN") or "").strip().strip('"').strip("'")

    if not phone_number_id or not access_token:
        return False, "Missing phone_number_id or access_token"

    api_version = os.getenv("WHATSAPP_API_VERSION", "v18.0")
    url         = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"
    payload     = {
        "messaging_product": "whatsapp",
        "to":   to_phone,
        "type": "text",
        "text": {"body": message},
    }
    req = urlrequest.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type":  "application/json",
        },
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=15):
            return True, None
    except HTTPError as exc:
        try:
            raw = exc.read().decode("utf-8")
            parsed = json.loads(raw)
            err = parsed.get("error") or {}
            code = err.get("code")
            msg = (err.get("message") or "").strip()
            details = (err.get("error_data") or {}).get("details")

            if code == 131005:
                return (
                    False,
                    "WhatsApp access denied (131005): token/permissions are invalid for this phone number. "
                    "Use a permanent System User token with whatsapp_business_messaging and whatsapp_business_management, "
                    "and ensure the phone_number_id belongs to the same WABA."
                )
            if code == 190:
                return False, "WhatsApp token expired or invalid (190). Generate a fresh permanent token and update config."

            concise = msg or "WhatsApp API request failed"
            if details:
                concise = f"{concise} ({details})"
            return False, concise
        except Exception:
            return False, str(exc)
    except Exception as exc:
        return False, str(exc)


# ═════════════════════════════════════════════════════════════════════════════
#  META WEBHOOK HANDLER
# ═════════════════════════════════════════════════════════════════════════════

def process_meta_webhook_payload(db: Session, payload: dict):
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value           = change.get("value", {})
            phone_number_id = value.get("metadata", {}).get("phone_number_id")
            if not phone_number_id:
                continue

            cfg = (
                db.query(RestaurantWhatsappConfig)
                .filter(
                    RestaurantWhatsappConfig.phone_number_id == phone_number_id,
                    RestaurantWhatsappConfig.is_active == True,
                )
                .first()
            )
            if not cfg:
                continue

            for msg in value.get("messages", []):
                if msg.get("type") != "text":
                    continue
                customer_phone = msg.get("from")
                text           = (msg.get("text") or {}).get("body", "").strip()
                wa_message_id  = msg.get("id")
                if not customer_phone or not text:
                    continue

                _log_message(db, cfg.restaurant_id, customer_phone, "incoming", text, wa_message_id)
                _upsert_conversation(db, cfg.restaurant_id, customer_phone, text)

                reply = generate_ai_reply(db, cfg.restaurant_id, customer_phone, text, cfg)
                _log_message(db, cfg.restaurant_id, customer_phone, "outgoing", reply)
                _upsert_conversation(db, cfg.restaurant_id, customer_phone, reply)

                send_whatsapp_message(cfg, customer_phone, reply)

    db.commit()