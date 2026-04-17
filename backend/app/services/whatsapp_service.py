import json
import os
import random
import re
import time
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


def _contains_devanagari(text: str) -> bool:
    return any("\u0900" <= ch <= "\u097F" for ch in (text or ""))


def _apply_env_defaults(cfg: RestaurantWhatsappConfig) -> bool:
    changed = False
    env_access_token = (os.getenv("WHATSAPP_ACCESS_TOKEN") or "").strip()
    env_verify_token = (os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN") or "").strip()
    env_business_phone = (os.getenv("WHATSAPP_BUSINESS_PHONE") or "").strip()

    # Keep DB config synced with .env token to avoid stale/expired token usage.
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

    # Normalize incoming values to avoid hidden whitespace issues from copy/paste.
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
        raise HTTPException(status_code=400, detail="Invalid WhatsApp config. Check phone_number_id uniqueness")

    db.refresh(cfg)
    return cfg


def _get_recent_conversation_context(db: Session, restaurant_id: str, customer_phone: str, limit: int = 8) -> str:
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


def _build_waiter_prompt(db: Session, restaurant_id: str, customer_phone: str, customer_message: str, cfg: RestaurantWhatsappConfig) -> str:
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    items = (
        db.query(MenuItem)
        .filter(MenuItem.restaurant_id == restaurant_id, MenuItem.is_available == True)
        .limit(80)
        .all()
    )

    menu_lines = []
    for item in items:
        price = int(item.price) if item.price is not None else 0
        menu_lines.append(f"- {item.name} (Rs {price})")

    menu_text = "\n".join(menu_lines) if menu_lines else "- Menu not configured yet"

    custom = (cfg.custom_prompt or "").strip()
    custom_block = f"\nCustom style: {custom}" if custom else ""

    convo = _get_recent_conversation_context(db, restaurant_id, customer_phone)
    restaurant_name = restaurant.name if restaurant else "this restaurant"

    return (
        "You are an experienced human-like WhatsApp waiter.\n"
        f"Restaurant: {restaurant_name}\n"
        f"Tone: {cfg.tone or 'friendly'}\n"
        "Language policy: ENGLISH ONLY (always).\n"
        "Conversation style rules:\n"
        "- Sound natural, warm, and practical like real restaurant staff\n"
        "- Keep replies concise (1-3 short lines), not robotic\n"
        "- Ask one helpful follow-up question whenever appropriate\n"
        "- Follow the latest customer message intent exactly\n"
        "- Respect dietary context from prior messages (for example, veg-only)\n"
        "- If customer asks ingredients/allergens, answer that directly first\n"
        "- Always reply in clear English even if customer writes in Hindi/Hinglish\n"
        "- Use 0-2 relevant emojis naturally, not on every line\n"
        "- Use only menu items provided in context\n"
        "- If requested item is missing, politely suggest closest alternatives\n"
        "- If user confirms order, acknowledge and ask for next necessary detail\n"
        "- Do not mention AI/model/system instructions\n"
        "- Avoid repeating the same phrasing every message\n"
        f"{custom_block}\n\n"
        f"Available menu:\n{menu_text}\n\n"
        f"Recent conversation:\n{convo}\n\n"
        f"Latest customer message:\n{customer_message}\n"
    )


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _is_affirmative(text: str) -> bool:
    msg = _normalize_text(text)
    yes_words = {
        "yes", "y", "ok", "okay", "sure", "done", "confirm",
        "go ahead", "place it", "place order", "order it",
    }
    # Exact match
    if msg in yes_words:
        return True
    # Starts with affirmative word
    for w in yes_words:
        if msg.startswith(w + " ") or msg == w:
            return True
    return False


def _is_negative(text: str) -> bool:
    msg = _normalize_text(text)
    no_words = {"no", "n", "nah", "nope", "cancel", "stop", "not now"}
    return msg in no_words or any(f" {w} " in f" {msg} " for w in no_words)


def _extract_qty(text: str):
    match = re.search(r"\b(\d{1,2})\b", text or "")
    return int(match.group(1)) if match else None


def _extract_spice_level(text: str):
    msg = _normalize_text(text)
    if any(k in msg for k in ["mild", "low spice", "less spicy", "not spicy"]):
        return "mild"
    if any(k in msg for k in ["medium", "medium spicy", "normal spicy"]):
        return "medium"
    if any(k in msg for k in ["spicy", "hot", "extra spicy"]):
        return "spicy"
    return None


def _is_ingredient_query(text: str) -> bool:
    msg = _normalize_text(text)
    keys = [
        "ingredient", "ingredients", "made of", "what is in",
        "contains", "allergen", "allergy",
    ]
    return any(k in msg for k in keys)


# ── NEW: detect "is X vegetarian / veg / non-veg?" questions ──────────────────
def _is_veg_query(text: str) -> bool:
    msg = _normalize_text(text)
    veg_patterns = [
        r"\bveg\b", r"\bvegetarian\b", r"\bnon.?veg\b",
        r"\bmeat\b", r"\bcontain meat\b", r"\bis it veg\b",
        r"\bis .* veg", r"\bveg or not\b", r"\bpaneer\b.*\bveg\b",
    ]
    return any(re.search(p, msg) for p in veg_patterns)


def _veg_status_reply(item: MenuItem) -> str:
    """
    Return a natural answer about whether an item is vegetarian.
    Heuristic: checks name keywords. If description is available, also scans it.
    """
    name_lower = _normalize_text(item.name or "")
    desc_lower = _normalize_text(item.description or "")

    non_veg_keys = ["chicken", "fish", "mutton", "lamb", "prawn", "egg", "meat", "beef", "pork", "seafood"]
    veg_keys = ["paneer", "cottage cheese", "mushroom", "vegetable", "veg", "tofu", "soya", "dal", "gobi", "aloo", "chana"]

    is_non_veg = any(k in name_lower or k in desc_lower for k in non_veg_keys)
    is_veg = any(k in name_lower or k in desc_lower for k in veg_keys)

    if is_non_veg:
        return (
            f"{item.name} is a non-vegetarian dish 🍖. "
            "Would you like me to suggest a vegetarian alternative, or shall I go ahead with this?"
        )
    elif is_veg:
        return (
            f"Yes, {item.name} is a vegetarian dish 🌿. "
            f"It's available for Rs {int(item.price or 0)}. Would you like to order it?"
        )
    else:
        return (
            f"I don't have a confirmed veg/non-veg tag for {item.name} right now 🙏. "
            "I'd recommend checking with our kitchen staff to be safe. "
            "Would you still like to place this order, or can I suggest something else?"
        )
# ─────────────────────────────────────────────────────────────────────────────


def _ingredient_reply_for_item(item: MenuItem) -> str:
    description = (item.description or "").strip()
    if description:
        return f"Here are the listed ingredients for {item.name} 🧾: {description}"
    return (
        f"I don't have the exact kitchen ingredient sheet for {item.name} yet 🧾. "
        "If you have allergy concerns, tell me what to avoid and I'll suggest a safer option."
    )


def _is_veg_name(name: str) -> bool:
    n = _normalize_text(name)
    veg_keys = ["veg", "vegetable", "paneer", "dal", "mushroom", "aloo", "gobi", "mix veg", "chana", "soya", "cottage cheese"]
    non_veg_keys = ["chicken", "fish", "mutton", "lamb", "prawn", "egg"]
    return any(k in n for k in veg_keys) and not any(k in n for k in non_veg_keys)


def _is_nonveg_name(name: str) -> bool:
    n = _normalize_text(name)
    non_veg_keys = ["chicken", "fish", "mutton", "lamb", "prawn", "egg", "seafood", "meat", "beef", "pork"]
    return any(k in n for k in non_veg_keys)


def _format_price(price) -> str:
    return f"₹{int(price or 0)}"


def _section_for_item(item: MenuItem):
    cat_name = _normalize_text(item.category.name if getattr(item, "category", None) and item.category else "")
    name = _normalize_text(item.name or "")
    blob = f"{cat_name} {name}"

    if any(k in blob for k in ["starter", "appetizer", "snack", "tikka", "roll"]):
        return ("🥗", "Starters")
    if any(k in blob for k in ["rice", "noodle", "fried rice", "hakka"]):
        return ("🍜", "Rice & Noodles")
    if any(k in blob for k in ["curry", "gravy", "thai"]):
        return ("🍛", "Curries")
    return ("🍛", "Main Course")


def _filter_items_for_pref(items, dietary_pref: str, starters_only: bool = False):
    filtered = []
    for item in items:
        if dietary_pref == "veg" and not _is_veg_name(item.name or ""):
            continue
        if dietary_pref == "nonveg" and not _is_nonveg_name(item.name or ""):
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
            return "I couldn't find starter options for this preference right now."
        return "I couldn't find menu items for this preference right now."

    grouped = {
        "Starters": [],
        "Main Course": [],
        "Rice & Noodles": [],
        "Curries": [],
    }
    emoji_for = {
        "Starters": "🥗",
        "Main Course": "🍛",
        "Rice & Noodles": "🍜",
        "Curries": "🍛",
    }

    for item in filtered:
        _, section = _section_for_item(item)
        grouped.setdefault(section, [])
        grouped[section].append(item)

    header = "📋 *Full Menu*" if not starters_only else "🥗 *Starter Options*"
    lines = [header, ""]
    for section in ["Starters", "Main Course", "Rice & Noodles", "Curries"]:
        section_items = grouped.get(section, [])
        if not section_items:
            continue
        lines.append(f"{emoji_for.get(section, '🍽️')} *{section}*")
        for it in section_items:
            lines.append(f"• {it.name} – {_format_price(it.price)}")
        lines.append("")

    return "\n".join(lines).strip()


def _format_top_picks(items, dietary_pref: str = "all") -> str:
    filtered = _filter_items_for_pref(items, dietary_pref)
    if not filtered:
        return "I couldn't find recommendations for this preference right now."

    top = filtered[:4]
    reason_by_section = {
        "Starters": "Great starter with balanced flavors",
        "Main Course": "Rich and satisfying main dish",
        "Rice & Noodles": "Comforting and filling choice",
        "Curries": "Aromatic and flavorful curry",
    }

    lines = ["⭐ *Top Picks for You*", ""]
    for idx, it in enumerate(top, start=1):
        _, section = _section_for_item(it)
        reason = reason_by_section.get(section, "Popular among our regulars")
        lines.append(f"{idx}. {it.name} – {reason}")
    return "\n".join(lines)


def _is_show_full_menu_intent(msg: str) -> bool:
    return any(k in msg for k in ["full menu", "complete menu", "entire menu", "provide menu", "all menu", "fullmenu"])


def _is_starter_intent(msg: str) -> bool:
    return any(k in msg for k in ["starter", "starters", "appetizer", "snacks", "starter options"])


def _is_best_dish_intent(msg: str) -> bool:
    return any(k in msg for k in ["best dish", "best item", "top dish", "what's best", "best among", "top picks", "special", "what is special"])


def _is_veg_menu_intent(msg: str) -> bool:
    return any(k in msg for k in ["veg options", "vegetarian options", "veg menu", "vegetarian menu", "show veg", "show vegetarian", "veg items", "vegetarian items"])


def _is_order_intent(msg: str) -> bool:
    return any(k in msg for k in ["i want to order", "order this", "place order", "i will take", "i'll take", "book this"])


def _is_modify_order_intent(msg: str) -> bool:
    return any(k in msg for k in ["modify order", "change order", "replace", "remove", "instead"])


def _is_add_more_intent(msg: str) -> bool:
    return any(
        k in msg
        for k in [
            "order more",
            "add more",
            "add another",
            "another order",
            "more items",
            "i want to order more",
            "i want more",
            "add item",
            "i want to add",
            "also add",
            "add this also",
            "add that also",
            "also want to add",
        ]
    )


def _has_strong_intent(msg: str, stage: str) -> bool:
    m = _normalize_text(msg)
    return (
        stage in {"awaiting_confirmation", "awaiting_name", "awaiting_contact", "awaiting_address", "confirmed"}
        or _is_show_full_menu_intent(m)
        or _is_starter_intent(m)
        or _is_best_dish_intent(m)
        or _is_order_intent(m)
        or _is_modify_order_intent(m)
        or _is_ingredient_query(m)
        or _is_veg_query(m)
        or any(k in m for k in ["veg", "vegetarian", "non veg", "nonveg"])
    )


def _extract_contact_number(text: str):
    digits = re.sub(r"\D", "", text or "")
    if len(digits) >= 10:
        return digits[-10:]
    return None


def _is_valid_name(text: str) -> bool:
    t = (text or "").strip()
    if len(t) < 2:
        return False
    lowered = _normalize_text(t)
    if any(k in lowered for k in ["order", "more", "confirm", "menu", "address", "contact", "number", "item"]):
        return False
    return bool(re.fullmatch(r"[A-Za-z ]+", t))


def _format_order_summary(ctx: dict) -> str:
    order_lines = ctx.get("order_lines") or []
    if not order_lines:
        return "I could not build your order summary because no items were captured."

    name = ctx.get("customer_name", "Not provided")
    contact = ctx.get("customer_contact", "Not provided")
    address = ctx.get("customer_address", "Not provided")
    subtotal = sum(int(line.get("line_total", 0)) for line in order_lines)

    lines = [
        "✅ *Order Confirmed*",
        "",
        "🧾 *Order Summary*",
        f"• Name: {name}",
        f"• Contact: {contact}",
        f"• Address: {address}",
        "",
        "🍽️ *Items*",
    ]

    for line in order_lines:
        item_name = line.get("name", "Item")
        qty = int(line.get("qty", 1))
        unit_price = int(line.get("unit_price", 0))
        line_total = int(line.get("line_total", unit_price * qty))
        lines.append(f"• {item_name} x {qty} — {_format_price(unit_price)} = {_format_price(line_total)}")

    lines.extend(["", f"💵 *Total Bill:* {_format_price(subtotal)}", "⏱️ Estimated delivery: 30 mins"])
    return "\n".join(lines)


def _format_order_snapshot(order_lines: list) -> str:
    if not order_lines:
        return ""

    subtotal = sum(int(line.get("line_total", 0)) for line in order_lines)
    lines = ["🧾 *Order so far*"]
    for line in order_lines:
        item_name = line.get("name", "Item")
        qty = int(line.get("qty", 1))
        line_total = int(line.get("line_total", 0))
        lines.append(f"• {item_name} x {qty} — {_format_price(line_total)}")
    lines.append(f"💵 *Subtotal:* {_format_price(subtotal)}")
    return "\n".join(lines)


def _append_order_line(ctx: dict, item_name: str, qty: int, unit_price: int) -> list:
    order_lines = list(ctx.get("order_lines") or [])
    item_key = _normalize_text(item_name)

    for line in order_lines:
        if _normalize_text(line.get("name", "")) == item_key:
            prev_qty = int(line.get("qty", 0))
            new_qty = prev_qty + int(qty)
            line["qty"] = new_qty
            line["unit_price"] = int(unit_price)
            line["line_total"] = int(unit_price) * new_qty
            ctx["order_lines"] = order_lines
            return order_lines

    order_lines.append(
        {
            "name": item_name,
            "qty": int(qty),
            "unit_price": int(unit_price),
            "line_total": int(unit_price) * int(qty),
        }
    )
    ctx["order_lines"] = order_lines
    return order_lines


def _next_details_prompt(stage: str) -> str:
    if stage == "awaiting_name":
        return "Please share your *name* for this order."
    if stage == "awaiting_contact":
        return "Please share your *contact number* for this order."
    if stage == "awaiting_address":
        return "Please share your *delivery address* now."
    return ""


def _build_item_confirmation(item_name: str, price: int, qty: int) -> str:
    variants = [
        f"Great choice 👍 {item_name} ({_format_price(price)} each)\nI have noted *{qty}* for this item. Shall I confirm your order?",
        f"Nice pick 👌 {item_name} ({_format_price(price)} each)\nYou want *{qty}* plate(s). Would you like me to confirm it?",
        f"Perfect, {item_name} sounds good 😄 ({_format_price(price)} each)\nQuantity set to *{qty}*. Should I go ahead and confirm?",
    ]
    return random.choice(variants)


def _is_same_pending_selection(ctx: dict, item_name: str, qty: int) -> bool:
    pending_item = _normalize_text(ctx.get("pending_item") or "")
    pending_qty = int(ctx.get("pending_qty") or 1)
    return pending_item == _normalize_text(item_name) and pending_qty == int(qty)


def _recent_confirmation_prompt(ctx: dict, within_seconds: int = 120) -> bool:
    ts = ctx.get("last_confirmation_prompt_at")
    if not ts:
        return False
    try:
        return (time.time() - float(ts)) <= within_seconds
    except (TypeError, ValueError):
        return False


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


def _find_best_item_match(message: str, items):
    msg = _normalize_text(message)
    if not msg:
        return None

    exact = []
    scored = []
    msg_tokens = {t for t in re.findall(r"[a-zA-Z]+", msg) if len(t) > 2}

    for item in items:
        name = _normalize_text(item.name or "")
        if not name:
            continue
        if name in msg or msg in name:
            exact.append(item)
            continue
        name_tokens = {t for t in re.findall(r"[a-zA-Z]+", name) if len(t) > 2}
        overlap = len(msg_tokens & name_tokens)
        if overlap > 0:
            scored.append((overlap, len(name_tokens), item))

    if exact:
        return exact[0]
    if scored:
        scored.sort(key=lambda x: (x[0], -x[1]), reverse=True)
        # Require at least 2 overlapping tokens to avoid weak matches
        # (e.g. "yes i want to order this" matching any item with "this")
        best_overlap, _, best_item = scored[0]
        if best_overlap >= 2:
            return best_item
    return None


def _suggest_items(items, *, veg_only: bool = False, limit: int = 4):
    pool = [i for i in items if _is_veg_name(i.name or "")] if veg_only else list(items)
    return pool[:limit]


# ── INTENT CLASSIFICATION ─────────────────────────────────────────────────────
_GREETING_WORDS = {"hi", "hello", "hey", "good morning", "good evening", "good afternoon", "namaste", "hii", "helo"}

def _is_greeting(msg: str) -> bool:
    """Only match pure greetings, not messages that happen to contain a greeting word."""
    m = _normalize_text(msg)
    # Exact match or very short phrase (≤ 3 words) that is purely a greeting
    if m in _GREETING_WORDS:
        return True
    words = m.split()
    if len(words) <= 3 and all(w in _GREETING_WORDS for w in words):
        return True
    return False
# ─────────────────────────────────────────────────────────────────────────────


def _fallback_reply(db: Session, restaurant_id: str, customer_phone: str, message: str) -> str:
    items = (
        db.query(MenuItem)
        .filter(MenuItem.restaurant_id == restaurant_id, MenuItem.is_available == True)
        .order_by(MenuItem.created_at.desc())
        .limit(500)
        .all()
    )
    conv = _get_or_create_conversation(db, restaurant_id, customer_phone)
    ctx = dict(conv.context_json or {})
    msg = _normalize_text(message)

    if not items:
        return "Our menu is being updated right now. Please check back in a bit, and I'll help you place your order."

    pending_item = ctx.get("pending_item")
    stage = ctx.get("stage")
    dietary_pref = ctx.get("dietary_pref", "all")
    incoming_qty = _extract_qty(message)

    # 1) Greeting (only first interaction gets welcome style)
    if _is_greeting(message):
        if ctx.get("welcomed"):
            return "Hi again 👋 How can I help you with your order today?"
        ctx["welcomed"] = True
        conv.context_json = ctx
        picks = _filter_items_for_pref(items, dietary_pref)[:3]
        top = ", ".join(f"{i.name} ({_format_price(i.price)})" for i in picks)
        return f"Welcome 👋 I'm here to help with your order. Today's popular dishes are {top}. What are you in the mood for?"

    # 2) Full menu intent (structured, complete, WhatsApp-friendly)
    if _is_show_full_menu_intent(msg):
        if "veg" in msg or "vegetarian" in msg:
            dietary_pref = "veg"
        elif "nonveg" in msg or "non veg" in msg:
            dietary_pref = "nonveg"
        ctx["dietary_pref"] = dietary_pref
        text = _format_menu(items, dietary_pref=dietary_pref, starters_only=False)
        conv.context_json = ctx
        return text

    # 3) Starter options intent
    if _is_starter_intent(msg):
        if "veg" in msg or "vegetarian" in msg:
            dietary_pref = "veg"
        elif "nonveg" in msg or "non veg" in msg:
            dietary_pref = "nonveg"
        ctx["dietary_pref"] = dietary_pref
        text = _format_menu(items, dietary_pref=dietary_pref, starters_only=True)
        conv.context_json = ctx
        return text

    # 4) Recommendations / best dish intent
    if _is_best_dish_intent(msg) or any(k in msg for k in ["recommend", "suggest"]):
        if "veg" in msg or "vegetarian" in msg:
            dietary_pref = "veg"
        elif "nonveg" in msg or "non veg" in msg:
            dietary_pref = "nonveg"
        ctx["dietary_pref"] = dietary_pref
        text = _format_top_picks(items, dietary_pref=dietary_pref)
        conv.context_json = ctx
        return text

    # 5) Apply dietary filter intent
    if any(k in msg for k in ["veg", "vegetarian"]) and not _is_veg_query(msg):
        ctx["dietary_pref"] = "veg"
        conv.context_json = ctx
        return _format_menu(items, dietary_pref="veg", starters_only=False)
    if any(k in msg for k in ["nonveg", "non veg"]):
        ctx["dietary_pref"] = "nonveg"
        conv.context_json = ctx
        return _format_menu(items, dietary_pref="nonveg", starters_only=False)

    if _is_veg_menu_intent(msg):
        ctx["dietary_pref"] = "veg"
        conv.context_json = ctx
        return _format_menu(items, dietary_pref="veg", starters_only=False)

    # 5.1) If user asks options explicitly, return aligned structured menu for current preference.
    if any(k in msg for k in ["options", "what are the options", "show options"]):
        return _format_menu(items, dietary_pref=dietary_pref, starters_only=False)

    # 6) Modify order flow
    if _is_modify_order_intent(msg) and pending_item:
        ctx["pending_item"] = None
        ctx["pending_price"] = None
        ctx["stage"] = None
        conv.context_json = ctx
        return "Sure, I can modify that 👍 Please tell me the item you want instead."

    # 6.1) Let the customer add more items instead of treating that text as a name/contact/address.
    if stage in {"awaiting_name", "awaiting_contact", "awaiting_address", "confirmed"} and _is_add_more_intent(msg):
        selected = _find_best_item_match(message, items)
        if not selected and pending_item:
            selected = next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)

        if not selected:
            return "Sure 🙂 Tell me the next dish you want to add."

        price = int(selected.price or 0)
        qty = incoming_qty or 1
        order_lines = _append_order_line(ctx, selected.name, qty, price)
        prior_stage = stage
        ctx["pending_item"] = None
        ctx["pending_price"] = None
        ctx["pending_qty"] = None
        ctx["last_confirmation_prompt_at"] = None
        ctx["stage"] = prior_stage
        conv.context_json = ctx
        snapshot = _format_order_snapshot(order_lines)
        if prior_stage == "confirmed":
            return (
                f"Done 👍 Added *{qty} x {selected.name}* to your order.\n"
                f"{snapshot}\n\n"
                "Anything else you'd like to add?"
            )
        return (
            f"Done 👍 Added *{qty} x {selected.name}* to your order.\n"
            f"{snapshot}\n\n"
            f"{_next_details_prompt(prior_stage)}"
        )

    # 7) Confirm selected item, then ask customer details
    if stage == "awaiting_confirmation" and _is_affirmative(message):
        price = int(ctx.get("pending_price") or 0)
        item_name = pending_item or "Selected item"
        qty = incoming_qty or int(ctx.get("pending_qty") or 1)
        order_lines = _append_order_line(ctx, item_name, qty, price)
        ctx["pending_qty"] = None
        ctx["last_confirmation_prompt_at"] = None
        ctx["stage"] = "awaiting_name"
        conv.context_json = ctx
        snapshot = _format_order_snapshot(order_lines)
        return (
            f"Awesome, your order is confirmed for now ✅\n"
            f"{snapshot}\n\n"
            "Please share your *name* for this order."
        )

    # 7.1) Collect customer name
    if stage == "awaiting_name":
        if not _is_valid_name(message):
            return "Please share a valid name (letters only), for example: Rohit"
        ctx["customer_name"] = (message or "").strip().title()
        ctx["stage"] = "awaiting_contact"
        conv.context_json = ctx
        return "Thanks 😊 Please share your *contact number* for this order."

    # 7.2) Collect contact
    if stage == "awaiting_contact":
        contact = _extract_contact_number(message)
        if not contact:
            return "Please share a valid 10-digit contact number."
        ctx["customer_contact"] = contact
        ctx["stage"] = "awaiting_address"
        conv.context_json = ctx
        return "Got it 👍 Please share your *delivery address* now."

    # 7.3) Collect address and send final bill summary
    if stage == "awaiting_address":
        addr = (message or "").strip()
        if len(addr) < 8:
            return "Please share a complete delivery address (at least 8 characters)."
        ctx["customer_address"] = addr
        ctx["stage"] = "confirmed"
        conv.context_json = ctx
        return _format_order_summary(ctx)

    # 8) Negative reply while waiting confirmation
    if _is_negative(msg) and stage == "awaiting_confirmation":
        ctx["stage"] = None
        ctx["pending_qty"] = None
        ctx["last_confirmation_prompt_at"] = None
        conv.context_json = ctx
        return "No problem 🙂 Would you like to see more options?"

    # 9) Ingredient query
    ingredient_query = _is_ingredient_query(message)
    if ingredient_query:
        best_for_ingredients = _find_best_item_match(message, items)
        if not best_for_ingredients and pending_item:
            best_for_ingredients = next(
                (i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)),
                None,
            )
        if best_for_ingredients:
            return _ingredient_reply_for_item(best_for_ingredients)

    # 10) Veg / non-veg item query
    if _is_veg_query(message):
        best_for_veg = _find_best_item_match(message, items)
        if not best_for_veg and pending_item:
            best_for_veg = next(
                (i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)),
                None,
            )
        if best_for_veg:
            ctx["pending_item"] = best_for_veg.name
            ctx["pending_price"] = int(best_for_veg.price or 0)
            ctx["stage"] = "awaiting_confirmation"
            conv.context_json = ctx
            return _veg_status_reply(best_for_veg)

        veg_items = _filter_items_for_pref(items, "veg")
        if veg_items:
            return _format_menu(veg_items, dietary_pref="all", starters_only=False)
        return "I'll check the veg options for you. Could you tell me which dish you're asking about?"

    # 11) Explicit order intent ("I want to order this")
    if _is_order_intent(msg):
        selected = _find_best_item_match(message, items)
        if not selected and pending_item:
            selected = next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)
        if not selected:
            return "Sure 👍 Please tell me the exact dish name you want to order."

        price = int(selected.price or 0)
        qty = incoming_qty or 1
        if (
            stage == "awaiting_confirmation"
            and _is_same_pending_selection(ctx, selected.name, qty)
            and _recent_confirmation_prompt(ctx)
        ):
            return (
                f"You're all set with *{qty} x {selected.name}* 👍\n"
                "Just reply *confirm* to place it, or tell me what you want to change."
            )
        ctx["pending_item"] = selected.name
        ctx["pending_price"] = price
        ctx["pending_qty"] = qty
        ctx["last_confirmation_prompt_at"] = time.time()
        ctx["stage"] = "awaiting_confirmation"
        conv.context_json = ctx
        return _build_item_confirmation(selected.name, price, qty)

    # 12) Item match fallback
    best_item = _find_best_item_match(message, items)
    if best_item:
        price = int(best_item.price) if best_item.price is not None else 0
        qty = incoming_qty or 1
        if (
            stage == "awaiting_confirmation"
            and _is_same_pending_selection(ctx, best_item.name, qty)
            and _recent_confirmation_prompt(ctx)
        ):
            return (
                f"I still have *{qty} x {best_item.name}* pending 👍\n"
                "Reply *confirm* to continue, or share updates if you want to change the order."
            )
        ctx["pending_item"] = best_item.name
        ctx["pending_price"] = price
        ctx["pending_qty"] = qty
        ctx["last_confirmation_prompt_at"] = time.time()
        ctx["stage"] = "awaiting_confirmation"
        conv.context_json = ctx
        return _build_item_confirmation(best_item.name, price, qty)

    # 13) Generic menu helper
    if any(k in msg for k in ["menu", "what do you have", "show", "options", "available"]):
        return _format_menu(items, dietary_pref=dietary_pref, starters_only=False)

    # 14) Generic fallback
    return (
        "I can help you with menu, recommendations, ingredients, and placing orders 🙂\n"
        "Try asking:\n"
        "• show full menu\n"
        "• recommend a veg starter\n"
        "• ingredients of <dish name>\n"
        "• I want to order 2 <dish name>"
    )


def generate_ai_reply(db: Session, restaurant_id: str, customer_phone: str, customer_message: str, cfg: RestaurantWhatsappConfig) -> str:
    conv = _get_or_create_conversation(db, restaurant_id, customer_phone)
    ctx = dict(conv.context_json or {})
    if _has_strong_intent(customer_message, ctx.get("stage")):
        return _fallback_reply(db, restaurant_id, customer_phone, customer_message)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _fallback_reply(db, restaurant_id, customer_phone, customer_message)

    try:
        from openai import OpenAI

        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        client = OpenAI(api_key=api_key)
        prompt = _build_waiter_prompt(db, restaurant_id, customer_phone, customer_message, cfg)
        response = client.chat.completions.create(
            model=model,
            temperature=0.5,
            max_tokens=220,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a realistic restaurant waiter chatting on WhatsApp. "
                        "You must ALWAYS respond in English only. "
                        "Do not use Hindi or Hinglish in replies."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )
        text = (response.choices[0].message.content or "").strip()

        normalized_user = _normalize_text(customer_message)
        # Guardrail: for explicit menu intents, enforce structured deterministic output.
        if _is_show_full_menu_intent(normalized_user) and "*Full Menu*" not in text:
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if _is_starter_intent(normalized_user) and "Starter" not in text:
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if _is_ingredient_query(normalized_user) and "ingredient" not in _normalize_text(text):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)
        if ctx.get("stage") == "awaiting_confirmation" and _is_affirmative(customer_message):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)

        if text and _contains_devanagari(text):
            rewrite = client.chat.completions.create(
                model=model,
                temperature=0.2,
                max_tokens=220,
                messages=[
                    {
                        "role": "system",
                        "content": "Rewrite the text in natural simple English only. Keep meaning same.",
                    },
                    {
                        "role": "user",
                        "content": text,
                    },
                ],
            )
            text = (rewrite.choices[0].message.content or text).strip()

        return text or _fallback_reply(db, restaurant_id, customer_phone, customer_message)
    except Exception as exc:
        print(f"[whatsapp_service] OpenAI reply failed: {exc}")
        return _fallback_reply(db, restaurant_id, customer_phone, customer_message)


def _log_message(db: Session, restaurant_id: str, customer_phone: str, direction: str, message: str, wa_message_id: str = None):
    db.add(
        WhatsAppMessage(
            restaurant_id=restaurant_id,
            customer_phone=customer_phone,
            direction=direction,
            message=message,
            wa_message_id=wa_message_id,
        )
    )


def _upsert_conversation(db: Session, restaurant_id: str, customer_phone: str, last_message: str):
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


def get_recent_messages(db: Session, restaurant_id: str, customer_phone: str, limit: int = 30):
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


def simulate_chat(db: Session, restaurant_id: str, customer_phone: str, message: str, send_to_whatsapp: bool = False):
    cfg = get_or_create_config(db, restaurant_id)

    _log_message(db, restaurant_id, customer_phone, "incoming", message)
    _upsert_conversation(db, restaurant_id, customer_phone, message)

    reply = generate_ai_reply(db, restaurant_id, customer_phone, message, cfg)
    _log_message(db, restaurant_id, customer_phone, "outgoing", reply)
    _upsert_conversation(db, restaurant_id, customer_phone, reply)

    sent = False
    meta_error = None
    if send_to_whatsapp:
        sent, meta_error = send_whatsapp_message(cfg, customer_phone, reply)

    db.commit()
    return reply, sent, meta_error


def send_whatsapp_message(cfg: RestaurantWhatsappConfig, to_phone: str, message: str):
    phone_number_id = (cfg.phone_number_id or "").strip()
    access_token = (cfg.access_token or "").strip() or (os.getenv("WHATSAPP_ACCESS_TOKEN") or "").strip()

    if not phone_number_id or not access_token:
        return False, "Missing phone_number_id or access_token"

    api_version = os.getenv("WHATSAPP_API_VERSION", "v18.0")
    url = f"https://graph.facebook.com/{api_version}/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": message},
    }

    req = urlrequest.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=15):
            return True, None
    except HTTPError as exc:
        try:
            body = exc.read().decode("utf-8")
            return False, body
        except Exception:
            return False, str(exc)
    except Exception as exc:
        return False, str(exc)


def process_meta_webhook_payload(db: Session, payload: dict):
    entries = payload.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            metadata = value.get("metadata", {})
            messages = value.get("messages", [])

            phone_number_id = metadata.get("phone_number_id")
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

            for msg in messages:
                if msg.get("type") != "text":
                    continue

                customer_phone = msg.get("from")
                text = (msg.get("text") or {}).get("body", "").strip()
                wa_message_id = msg.get("id")
                if not customer_phone or not text:
                    continue

                _log_message(db, cfg.restaurant_id, customer_phone, "incoming", text, wa_message_id)
                _upsert_conversation(db, cfg.restaurant_id, customer_phone, text)

                reply = generate_ai_reply(db, cfg.restaurant_id, customer_phone, text, cfg)
                _log_message(db, cfg.restaurant_id, customer_phone, "outgoing", reply)
                _upsert_conversation(db, cfg.restaurant_id, customer_phone, reply)

                send_whatsapp_message(cfg, customer_phone, reply)

    db.commit()