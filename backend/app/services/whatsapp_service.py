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


def _build_waiter_prompt(
    db: Session,
    restaurant_id: str,
    customer_phone: str,
    customer_message: str,
    cfg: RestaurantWhatsappConfig,
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


# ── PARTY / CATERING ──────────────────────────────────────────────────────────
def _is_party_catering_intent(text: str) -> bool:
    msg = _normalize_text(text)
    return any(k in msg for k in [
        "party", "catering", "event", "organize", "organise",
        "arrange", "bulk order", "large order", "group order",
    ])


def _handle_party_intent(db: Session, restaurant_id: str, message: str, items) -> str:
    people_count = _extract_people_count(message)
    people_str = f"*{people_count} people*" if people_count else "your group"
    top_names = ", ".join(i.name for i in items[:4]) if items else "our popular dishes"

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


def _is_quantity_suggestion_intent(text: str) -> bool:
    msg = _normalize_text(text)
    keys = [
        "how much quantity", "what quantity", "how much should i order",
        "how many should i order", "quantity should i order", "how much",
        "how many", "enough for", "for party", "for people", "for guests",
        "for persons", "for person",
    ]
    if any(k in msg for k in keys):
        return True
    return bool(re.search(r"\b(\d{1,4})\s*(people|persons|guests|pax|person)\b", msg))


def _is_ingredient_query(text: str) -> bool:
    msg = _normalize_text(text)
    return any(k in msg for k in [
        "ingredient", "ingredients", "made of", "what is in",
        "contains", "allergen", "allergy",
    ])


def _is_veg_query(text: str) -> bool:
    msg = _normalize_text(text)
    return any(re.search(p, msg) for p in [
        r"\bveg\b", r"\bvegetarian\b", r"\bnon.?veg\b",
        r"\bmeat\b", r"\bcontain meat\b", r"\bis it veg\b",
        r"\bis .* veg", r"\bveg or not\b", r"\bpaneer\b.*\bveg\b",
    ])


def _veg_status_reply(item: MenuItem) -> str:
    name_lower = _normalize_text(item.name or "")
    desc_lower = _normalize_text(item.description or "")
    non_veg_keys = ["chicken", "fish", "mutton", "lamb", "prawn", "egg", "meat", "beef", "pork", "seafood"]
    veg_keys = ["paneer", "cottage cheese", "mushroom", "vegetable", "veg", "tofu", "soya", "dal", "gobi", "aloo", "chana"]

    is_non_veg = any(k in name_lower or k in desc_lower for k in non_veg_keys)
    is_veg = any(k in name_lower or k in desc_lower for k in veg_keys)

    if is_non_veg:
        return (
            f"{item.name} is non-veg 🍖. "
            "Want me to suggest a vegetarian alternative, or shall I go ahead with this?"
        )
    if is_veg:
        return (
            f"Yes, {item.name} is vegetarian 🌿 — available at {_format_price(item.price)}. "
            "Would you like to order it?"
        )
    return (
        f"I don't have a confirmed veg/non-veg tag for {item.name} right now 🙏. "
        "Best to check with our kitchen if you have dietary restrictions. "
        "Want to go ahead anyway?"
    )


def _ingredient_reply_for_item(item: MenuItem) -> str:
    description = (item.description or "").strip()
    if description:
        return f"Here's what goes into {item.name} 🧾: {description}"
    return (
        f"I don't have the full ingredient list for {item.name} right now 🧾. "
        "If you have specific allergens to avoid, tell me and I'll suggest something safer."
    )


def _is_veg_name(name: str) -> bool:
    n = _normalize_text(name)
    veg_keys = ["veg", "vegetable", "paneer", "dal", "mushroom", "aloo", "gobi", "mix veg", "chana", "soya", "cottage cheese"]
    non_veg_keys = ["chicken", "fish", "mutton", "lamb", "prawn", "egg"]
    return any(k in n for k in veg_keys) and not any(k in n for k in non_veg_keys)


def _is_nonveg_name(name: str) -> bool:
    n = _normalize_text(name)
    return any(k in n for k in ["chicken", "fish", "mutton", "lamb", "prawn", "egg", "seafood", "meat", "beef", "pork"])


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
        return "No items found for this preference right now." if not starters_only else "No starters found for this preference."

    grouped: dict = {}
    emoji_for = {"Starters": "🥗", "Main Course": "🍛", "Rice & Noodles": "🍜", "Curries": "🍛"}
    order = ["Starters", "Main Course", "Rice & Noodles", "Curries"]

    for item in filtered:
        _, section = _section_for_item(item)
        grouped.setdefault(section, []).append(item)

    header = "📋 *Full Menu*" if not starters_only else "🥗 *Starter Options*"
    lines = [header, ""]
    for section in order:
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
        return "Couldn't find recommendations for this preference right now."

    reason_by_section = {
        "Starters": "Great starter with balanced flavors",
        "Main Course": "Rich and satisfying main dish",
        "Rice & Noodles": "Comforting and filling choice",
        "Curries": "Aromatic and flavorful curry",
    }
    lines = ["⭐ *Top Picks for You*", ""]
    for idx, it in enumerate(filtered[:4], start=1):
        _, section = _section_for_item(it)
        lines.append(f"{idx}. {it.name} – {reason_by_section.get(section, 'Popular among regulars')}")
    return "\n".join(lines)


def _is_show_full_menu_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "full menu", "complete menu", "entire menu", "provide menu",
        "all menu", "fullmenu", "share me your menu", "show me menu", "show menu", "your menu",
    ])


def _is_starter_intent(msg: str) -> bool:
    return any(k in msg for k in ["starter", "starters", "appetizer", "snacks", "starter options"])


def _is_best_dish_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "best dish", "best item", "top dish", "what's best", "best among",
        "top picks", "special", "what is special",
    ])


def _is_veg_menu_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "veg options", "vegetarian options", "veg menu", "vegetarian menu",
        "show veg", "show vegetarian", "veg items", "vegetarian items",
    ])


def _is_order_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "i want to order", "order this", "place order", "i will take", "i'll take", "book this",
    ])


def _is_modify_order_intent(msg: str) -> bool:
    return any(k in msg for k in ["modify order", "change order", "replace", "remove", "instead"])


def _is_add_more_intent(msg: str) -> bool:
    return any(k in msg for k in [
        "order more", "add more", "add another", "another order", "more items",
        "i want to order more", "i want more", "add item", "i want to add",
        "also add", "add this also", "add that also", "also want to add",
        "or bhi", "aur bhi", "bhi order", "bhi lena", "also order",
        "want to order more", "more order", "want to add", "like to add",
        "add some more", "add few more", "something else", "anything else to add",
        "and i want to order more", "and want to order more",
        "and also want", "and i also want",
    ])


# ── KEY FIX: Parse "Name + add more" in a single message ─────────────────────
def _parse_name_and_add_more(message: str):
    """
    Returns (name_str_or_None, has_add_more_bool).

    Handles messages like:
      "Rohit and i want to order more"  → ("Rohit", True)
      "Rohit"                           → ("Rohit", False)
      "and i want to order more"        → (None,    True)
    """
    msg_lower = _normalize_text(message)

    add_more_triggers = [
        "and i want to order more", "and want to order more",
        "and i want more", "and also want", "and i also want",
        "and add more", "and order more", "i want to order more",
        "want to order more", "and more",
    ]

    for trigger in add_more_triggers:
        if trigger in msg_lower:
            idx = msg_lower.index(trigger)
            candidate = message[:idx].strip().rstrip(",.!? ")
            if candidate and _is_valid_name(candidate):
                return candidate, True
            return None, True

    # No add-more keyword — just a plain name?
    stripped = message.strip()
    if _is_valid_name(stripped):
        return stripped, False

    return None, False


def _has_strong_intent(msg: str, stage: str) -> bool:
    m = _normalize_text(msg)
    return (
        stage in {"awaiting_confirmation", "awaiting_name", "awaiting_contact", "awaiting_address", "confirmed"}
        or _is_show_full_menu_intent(m)
        or _is_starter_intent(m)
        or _is_best_dish_intent(m)
        or _is_order_intent(m)
        or _is_quantity_suggestion_intent(m)
        or _is_modify_order_intent(m)
        or _is_ingredient_query(m)
        or _is_veg_query(m)
        or _is_party_catering_intent(m)
        or _is_add_more_intent(m)
        or _is_affirmative(m)
        or any(k in m for k in ["veg", "vegetarian", "non veg", "nonveg"])
    )


def _extract_contact_number(text: str):
    digits = re.sub(r"\D", "", text or "")
    return digits[-10:] if len(digits) >= 10 else None


def _is_valid_name(text: str) -> bool:
    t = (text or "").strip()
    if len(t) < 2:
        return False
    if any(k in _normalize_text(t) for k in [
        "order", "more", "confirm", "menu", "address", "contact",
        "number", "item", "add", "cart",
    ]):
        return False
    return bool(re.fullmatch(r"[A-Za-z ]+", t))


def _format_order_summary(ctx: dict) -> str:
    order_lines = ctx.get("order_lines") or []
    if not order_lines:
        return "I couldn't build your order summary — no items were captured."

    name = ctx.get("customer_name", "Not provided")
    contact = ctx.get("customer_contact", "Not provided")
    address = ctx.get("customer_address", "Not provided")
    subtotal = sum(int(line.get("line_total", 0)) for line in order_lines)

    lines = [
        "✅ *Order Confirmed!*",
        "",
        "🧾 *Order Summary*",
        f"• Name: {name}",
        f"• Contact: {contact}",
        f"• Address: {address}",
        "",
        "🍽️ *Items*",
    ]
    for line in order_lines:
        qty = int(line.get("qty", 1))
        unit_price = int(line.get("unit_price", 0))
        line_total = int(line.get("line_total", unit_price * qty))
        lines.append(f"• {line.get('name', 'Item')} x {qty} — {_format_price(unit_price)} = {_format_price(line_total)}")

    lines += ["", f"💵 *Total Bill:* {_format_price(subtotal)}", "⏱️ Estimated delivery: 30 mins"]
    return "\n".join(lines)


def _format_order_snapshot(order_lines: list) -> str:
    if not order_lines:
        return ""
    subtotal = sum(int(line.get("line_total", 0)) for line in order_lines)
    lines = ["🧾 *Order so far*"]
    for line in order_lines:
        qty = int(line.get("qty", 1))
        line_total = int(line.get("line_total", 0))
        lines.append(f"• {line.get('name', 'Item')} x {qty} — {_format_price(line_total)}")
    lines.append(f"💵 *Subtotal:* {_format_price(subtotal)}")
    return "\n".join(lines)


def _append_order_line(ctx: dict, item_name: str, qty: int, unit_price: int) -> list:
    order_lines = list(ctx.get("order_lines") or [])
    item_key = _normalize_text(item_name)

    for line in order_lines:
        if _normalize_text(line.get("name", "")) == item_key:
            new_qty = int(line.get("qty", 0)) + int(qty)
            line["qty"] = new_qty
            line["unit_price"] = int(unit_price)
            line["line_total"] = int(unit_price) * new_qty
            ctx["order_lines"] = order_lines
            return order_lines

    order_lines.append({
        "name": item_name,
        "qty": int(qty),
        "unit_price": int(unit_price),
        "line_total": int(unit_price) * int(qty),
    })
    ctx["order_lines"] = order_lines
    return order_lines


def _next_details_prompt(stage: str) -> str:
    if stage == "awaiting_name":
        return "What's your name for the order? 😊"
    if stage == "awaiting_contact":
        return "And your contact number?"
    if stage == "awaiting_address":
        return "Last thing — what's your delivery address?"
    return ""


def _build_item_confirmation(item_name: str, price: int, qty: int) -> str:
    total = _format_price(price * qty)
    variants = [
        f"Nice choice! *{item_name}* at {_format_price(price)} each — *{qty}* for you 👍\nWant to confirm this, or add something else?",
        f"Got it — *{qty} × {item_name}* = {total} 🙌\nShall I go ahead, or would you like to add more?",
        f"Sure thing — *{qty} × {item_name}* at {_format_price(price)} each 😊\nReady to confirm, or anything else to add?",
    ]
    return random.choice(variants)


# ── GREETING ──────────────────────────────────────────────────────────────────
def _compose_greeting_only(db: Session, restaurant_id: str) -> str:
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    rname = (restaurant.name if restaurant else "our restaurant").strip()
    return random.choice([
        f"Hey! Welcome to *{rname}* 👋 Great to have you here!\nWhat can I get you today? Ask for the menu, recommendations, or just tell me what you're craving 😄",
        f"Hi there! Welcome to *{rname}* 😊\nFeel free to browse the menu or tell me what you'd like — I'm here to help!",
        f"Hello! Welcome to *{rname}* 👋\nLooking for the menu, today's specials, or ready to order? Just say the word!",
    ])


def _compose_first_turn_greeting(db: Session, restaurant_id: str, dietary_pref: str = "all") -> str:
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    rname = (restaurant.name if restaurant else "our restaurant").strip()
    return f"Welcome to *{rname}* 👋"
# ─────────────────────────────────────────────────────────────────────────────


def _estimate_qty_for_people(item: MenuItem, people_count: int):
    people = max(1, int(people_count or 1))
    name = _normalize_text(item.name or "")
    _, section = _section_for_item(item)

    if any(k in name for k in ["fries", "salad", "snack", "starter", "tikka", "burger"]):
        low_f, high_f, note = 0.45, 0.65, "as a snack/side"
    elif section == "Starters":
        low_f, high_f, note = 0.5, 0.75, "for starter portions"
    elif section in {"Rice & Noodles", "Curries", "Main Course"}:
        low_f, high_f, note = 0.35, 0.55, "when served with multiple dishes"
    else:
        low_f, high_f, note = 0.45, 0.65, "as an average estimate"

    low = max(1, int(round(people * low_f)))
    high = max(low, int(round(people * high_f)))
    suggested = int(round((low + high) / 2))
    return low, high, suggested, note


def _build_quantity_suggestion_reply(item: MenuItem, people_count: int) -> str:
    low, high, suggested, note = _estimate_qty_for_people(item, people_count)
    return (
        f"For *{people_count} people*, I'd suggest *{low}–{high}* portions of *{item.name}* ({note}) 🍽️\n"
        f"*{suggested}* is a safe starting point.\n"
        f"Want me to add *{suggested} × {item.name}* to your order?"
    )


def _is_same_pending_selection(ctx: dict, item_name: str, qty: int) -> bool:
    return (
        _normalize_text(ctx.get("pending_item") or "") == _normalize_text(item_name)
        and int(ctx.get("pending_qty") or 1) == int(qty)
    )


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

    exact, scored = [], []
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
        best_overlap, _, best_item = scored[0]
        if best_overlap >= 2:
            return best_item
    return None


_GREETING_WORDS = {
    "hi", "hello", "hey", "good morning", "good evening",
    "good afternoon", "namaste", "hii", "helo",
}


def _is_greeting(msg: str) -> bool:
    m = _normalize_text(msg)
    if m in _GREETING_WORDS:
        return True
    words = m.split()
    return len(words) <= 3 and all(w in _GREETING_WORDS for w in words)


# ═════════════════════════════════════════════════════════════════════════════
#  MAIN FALLBACK HANDLER
# ═════════════════════════════════════════════════════════════════════════════
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
        return "Our menu is being updated right now. Please check back soon!"

    pending_item = ctx.get("pending_item")
    stage = ctx.get("stage")
    dietary_pref = ctx.get("dietary_pref", "all")
    first_turn = not bool(ctx.get("welcomed"))

    # ── FIRST TURN ────────────────────────────────────────────────────────────
    if first_turn:
        ctx["welcomed"] = True
        conv.context_json = ctx
        db.commit()

        if _is_greeting(message):
            return _compose_greeting_only(db, restaurant_id)

        if _is_party_catering_intent(msg):
            welcome = _compose_first_turn_greeting(db, restaurant_id)
            return f"{welcome}\n\n{_handle_party_intent(db, restaurant_id, message, items)}"

        welcome = _compose_first_turn_greeting(db, restaurant_id, dietary_pref=dietary_pref)
        core = _fallback_reply(db, restaurant_id, customer_phone, message)
        if _normalize_text(core).startswith("welcome"):
            return core
        return f"{welcome}\n\n{core}"

    # ── REPEATED GREETING ─────────────────────────────────────────────────────
    if _is_greeting(message):
        return random.choice([
            "Hey again! 👋 What can I get for you?",
            "Hi! Still here to help 😊 What would you like?",
            "Hello! What would you like today? 🙂",
        ])

    # ── PARTY INTENT ──────────────────────────────────────────────────────────
    if _is_party_catering_intent(msg):
        return _handle_party_intent(db, restaurant_id, message, items)

    # ── MENU INTENTS ──────────────────────────────────────────────────────────
    if _is_show_full_menu_intent(msg):
        pref = "veg" if ("veg" in msg or "vegetarian" in msg) else ("nonveg" if ("nonveg" in msg or "non veg" in msg) else dietary_pref)
        ctx["dietary_pref"] = pref
        conv.context_json = ctx
        return _format_menu(items, dietary_pref=pref)

    if _is_starter_intent(msg):
        pref = "veg" if ("veg" in msg or "vegetarian" in msg) else ("nonveg" if ("nonveg" in msg or "non veg" in msg) else dietary_pref)
        ctx["dietary_pref"] = pref
        conv.context_json = ctx
        return _format_menu(items, dietary_pref=pref, starters_only=True)

    if _is_best_dish_intent(msg) or any(k in msg for k in ["recommend", "suggest"]):
        pref = "veg" if ("veg" in msg or "vegetarian" in msg) else ("nonveg" if ("nonveg" in msg or "non veg" in msg) else dietary_pref)
        ctx["dietary_pref"] = pref
        conv.context_json = ctx
        return _format_top_picks(items, dietary_pref=pref)

    if any(k in msg for k in ["veg", "vegetarian"]) and not _is_veg_query(msg):
        ctx["dietary_pref"] = "veg"
        conv.context_json = ctx
        return _format_menu(items, dietary_pref="veg")

    if any(k in msg for k in ["nonveg", "non veg"]):
        ctx["dietary_pref"] = "nonveg"
        conv.context_json = ctx
        return _format_menu(items, dietary_pref="nonveg")

    if _is_veg_menu_intent(msg):
        ctx["dietary_pref"] = "veg"
        conv.context_json = ctx
        return _format_menu(items, dietary_pref="veg")

    if any(k in msg for k in ["options", "what are the options", "show options"]):
        return _format_menu(items, dietary_pref=dietary_pref)

    # ── MODIFY ORDER ──────────────────────────────────────────────────────────
    if _is_modify_order_intent(msg) and pending_item:
        ctx.update({"pending_item": None, "pending_price": None, "stage": None})
        conv.context_json = ctx
        return "Sure, let's fix that 👍 Which item would you like instead?"

    # ── ADD MORE — checked BEFORE all stage handlers ───────────────────────────
    if _is_add_more_intent(msg):
        selected = _find_best_item_match(message, items)
        if not selected and pending_item:
            selected = next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)

        prior_stage = stage

        if not selected:
            conv.context_json = ctx
            hint = "\n_(After adding, I'll continue with your order details)_" if prior_stage in {"awaiting_name", "awaiting_contact", "awaiting_address"} else ""
            return f"Of course! 😊 Which dish would you like to add?{hint}"

        price = int(selected.price or 0)
        qty_raw = _extract_qty(message)
        people = _extract_people_count(message)
        qty = 1 if (people and qty_raw == people) else (qty_raw or 1)

        order_lines = _append_order_line(ctx, selected.name, qty, price)
        ctx.update({
            "pending_item": None, "pending_price": None,
            "pending_qty": None, "last_confirmation_prompt_at": None,
            "stage": prior_stage,
        })
        conv.context_json = ctx

        snapshot = _format_order_snapshot(order_lines)
        if prior_stage == "confirmed":
            return f"Done! Added *{qty} × {selected.name}* ✅\n{snapshot}\n\nAnything else you'd like?"
        if prior_stage in {"awaiting_name", "awaiting_contact", "awaiting_address"}:
            return f"Done! Added *{qty} × {selected.name}* ✅\n{snapshot}\n\n{_next_details_prompt(prior_stage)}"
        return (
            f"Added *{qty} × {selected.name}* ({_format_price(price)}) 🙌\n"
            f"{snapshot}\n\nWant to add more, or shall I confirm?"
        )

    # ── AWAITING NAME ─────────────────────────────────────────────────────────
    # KEY FIX: handle "Rohit and i want to order more" gracefully
    if stage == "awaiting_name":
        extracted_name, wants_more = _parse_name_and_add_more(message)

        if wants_more:
            if extracted_name:
                # Save name but don't advance stage yet — let them add first
                ctx["customer_name"] = extracted_name.title()
                conv.context_json = ctx
                return (
                    f"Got it, *{extracted_name.title()}* 😊 No problem!\n"
                    "Tell me what you'd like to add and I'll include it."
                )
            else:
                conv.context_json = ctx
                return "Sure! 😊 Tell me what you'd like to add.\n_(Once done, just share your name to continue)_"

        # Pure name
        if not _is_valid_name(message):
            return "Could you share just your name? (letters only, e.g. Rohit)"
        ctx["customer_name"] = (message or "").strip().title()
        ctx["stage"] = "awaiting_contact"
        conv.context_json = ctx
        return f"Thanks, *{ctx['customer_name']}* 😊 And your contact number?"

    # ── AWAITING CONTACT ──────────────────────────────────────────────────────
    if stage == "awaiting_contact":
        contact = _extract_contact_number(message)
        if not contact:
            return "Hmm, that doesn't look right 🙈 Could you share a valid 10-digit number?"
        ctx["customer_contact"] = contact
        ctx["stage"] = "awaiting_address"
        conv.context_json = ctx
        return "Got it 👍 Last thing — what's your delivery address?"

    # ── AWAITING ADDRESS ──────────────────────────────────────────────────────
    if stage == "awaiting_address":
        addr = (message or "").strip()
        if len(addr) < 8:
            return "Could you share a more complete address? (at least a street or area name)"
        ctx["customer_address"] = addr
        ctx["stage"] = "confirmed"
        conv.context_json = ctx
        return _format_order_summary(ctx)

    # ── CONFIRM ITEM → BEGIN DETAILS FLOW ─────────────────────────────────────
    if stage == "awaiting_confirmation" and _is_affirmative(message):
        price = int(ctx.get("pending_price") or 0)
        item_name = pending_item or "Selected item"
        qty = int(ctx.get("pending_qty") or 1)
        order_lines = _append_order_line(ctx, item_name, qty, price)
        ctx.update({"pending_qty": None, "last_confirmation_prompt_at": None, "stage": "awaiting_name"})
        conv.context_json = ctx
        snapshot = _format_order_snapshot(order_lines)
        return f"Awesome, noted ✅\n{snapshot}\n\n{_next_details_prompt('awaiting_name')}"

    # ── NEGATIVE DURING CONFIRMATION ──────────────────────────────────────────
    if _is_negative(msg) and stage == "awaiting_confirmation":
        ctx.update({"stage": None, "pending_qty": None, "last_confirmation_prompt_at": None})
        conv.context_json = ctx
        return "No worries 🙂 Want to see more options or pick a different dish?"

    # ── INGREDIENT QUERY ──────────────────────────────────────────────────────
    if _is_ingredient_query(message):
        best = _find_best_item_match(message, items) or (
            next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)
            if pending_item else None
        )
        if best:
            return _ingredient_reply_for_item(best)

    # ── VEG QUERY ─────────────────────────────────────────────────────────────
    if _is_veg_query(message):
        best = _find_best_item_match(message, items) or (
            next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)
            if pending_item else None
        )
        if best:
            ctx.update({"pending_item": best.name, "pending_price": int(best.price or 0), "stage": "awaiting_confirmation"})
            conv.context_json = ctx
            return _veg_status_reply(best)
        veg_items = _filter_items_for_pref(items, "veg")
        if veg_items:
            return _format_menu(veg_items)
        return "Which dish were you asking about? I'll check if it's vegetarian 🌿"

    # ── QUANTITY SUGGESTION ────────────────────────────────────────────────────
    if _is_quantity_suggestion_intent(message):
        people_count = _extract_people_count(message)
        selected = _find_best_item_match(message, items) or (
            next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)
            if pending_item else None
        )
        if selected and people_count:
            low, high, suggested, _ = _estimate_qty_for_people(selected, people_count)
            ctx.update({
                "pending_item": selected.name, "pending_price": int(selected.price or 0),
                "pending_qty": suggested,
                "last_quantity_range": {"low": low, "high": high, "people": people_count},
                "last_confirmation_prompt_at": time.time(), "stage": "awaiting_confirmation",
            })
            conv.context_json = ctx
            return _build_quantity_suggestion_reply(selected, people_count)
        if people_count and not selected:
            return f"For {people_count} people, I can suggest quantities once you pick the dish 😊 What would you like?"
        if selected and not people_count:
            ctx.update({"pending_item": selected.name, "pending_price": int(selected.price or 0)})
            conv.context_json = ctx
            return f"How many people are you ordering *{selected.name}* for? I'll suggest the right quantity 🍽️"

    # ── EXPLICIT ORDER INTENT ─────────────────────────────────────────────────
    if _is_order_intent(msg):
        people_count = _extract_people_count(message)
        selected = _find_best_item_match(message, items) or (
            next((i for i in items if _normalize_text(i.name or "") == _normalize_text(pending_item)), None)
            if pending_item else None
        )
        if not selected:
            return "Sure! Which dish would you like to order? 😊"

        if people_count:
            low, high, suggested, _ = _estimate_qty_for_people(selected, people_count)
            ctx.update({
                "pending_item": selected.name, "pending_price": int(selected.price or 0),
                "pending_qty": suggested, "last_confirmation_prompt_at": time.time(),
                "stage": "awaiting_confirmation",
            })
            conv.context_json = ctx
            return _build_quantity_suggestion_reply(selected, people_count)

        price = int(selected.price or 0)
        qty = _extract_qty(message) or 1
        if (
            stage == "awaiting_confirmation"
            and _is_same_pending_selection(ctx, selected.name, qty)
            and _recent_confirmation_prompt(ctx)
        ):
            return (
                f"Still have *{qty} × {selected.name}* lined up 👍\n"
                "Reply *confirm* to place it, or let me know if you want to change anything."
            )
        ctx.update({
            "pending_item": selected.name, "pending_price": price,
            "pending_qty": qty, "last_confirmation_prompt_at": time.time(),
            "stage": "awaiting_confirmation",
        })
        conv.context_json = ctx
        return _build_item_confirmation(selected.name, price, qty)

    # ── ITEM NAME MATCH ───────────────────────────────────────────────────────
    best_item = _find_best_item_match(message, items)
    if best_item:
        people_count = _extract_people_count(message)
        price = int(best_item.price) if best_item.price is not None else 0

        if people_count:
            low, high, suggested, _ = _estimate_qty_for_people(best_item, people_count)
            ctx.update({
                "pending_item": best_item.name, "pending_price": price,
                "pending_qty": suggested, "last_confirmation_prompt_at": time.time(),
                "stage": "awaiting_confirmation",
            })
            conv.context_json = ctx
            return _build_quantity_suggestion_reply(best_item, people_count)

        qty = _extract_qty(message) or 1
        if (
            stage == "awaiting_confirmation"
            and _is_same_pending_selection(ctx, best_item.name, qty)
            and _recent_confirmation_prompt(ctx)
        ):
            return (
                f"Still got *{qty} × {best_item.name}* pending 👍\n"
                "Reply *confirm* to continue, or tell me if you want to update."
            )
        ctx.update({
            "pending_item": best_item.name, "pending_price": price,
            "pending_qty": qty, "last_confirmation_prompt_at": time.time(),
            "stage": "awaiting_confirmation",
        })
        conv.context_json = ctx
        return _build_item_confirmation(best_item.name, price, qty)

    # ── MENU KEYWORD ──────────────────────────────────────────────────────────
    if any(k in msg for k in ["menu", "what do you have", "show", "options", "available"]):
        return _format_menu(items, dietary_pref=dietary_pref)

    # ── LAST RESORT ───────────────────────────────────────────────────────────
    return (
        "I'm here to help! 🙂 You can:\n"
        "• Ask for the *full menu*\n"
        "• Say *recommend me something*\n"
        "• Ask about ingredients — e.g. _ingredients of Cheesy Fries_\n"
        "• Place an order — e.g. _I want 2 Cheesy Fries_"
    )


def generate_ai_reply(
    db: Session,
    restaurant_id: str,
    customer_phone: str,
    customer_message: str,
    cfg: RestaurantWhatsappConfig,
) -> str:
    conv = _get_or_create_conversation(db, restaurant_id, customer_phone)
    ctx = dict(conv.context_json or {})
    first_turn = not bool(ctx.get("welcomed"))

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
                {"role": "user", "content": prompt},
            ],
        )
        text = (response.choices[0].message.content or "").strip()

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
        if _is_add_more_intent(normalized_user):
            return _fallback_reply(db, restaurant_id, customer_phone, customer_message)

        if text and _contains_devanagari(text):
            rewrite = client.chat.completions.create(
                model=model,
                temperature=0.2,
                max_tokens=220,
                messages=[
                    {"role": "system", "content": "Rewrite the text in natural simple English only. Keep meaning same."},
                    {"role": "user", "content": text},
                ],
            )
            text = (rewrite.choices[0].message.content or text).strip()

        final_text = text or _fallback_reply(db, restaurant_id, customer_phone, customer_message)

        if first_turn:
            ctx["welcomed"] = True
            conv.context_json = ctx
            if _is_greeting(customer_message):
                return _compose_greeting_only(db, restaurant_id)
            if not _normalize_text(final_text).startswith("welcome"):
                welcome = _compose_first_turn_greeting(db, restaurant_id, dietary_pref=ctx.get("dietary_pref", "all"))
                final_text = f"{welcome}\n\n{final_text}"

        return final_text
    except Exception as exc:
        print(f"[whatsapp_service] OpenAI reply failed: {exc}")
        return _fallback_reply(db, restaurant_id, customer_phone, customer_message)


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
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=15):
            return True, None
    except HTTPError as exc:
        try:
            return False, exc.read().decode("utf-8")
        except Exception:
            return False, str(exc)
    except Exception as exc:
        return False, str(exc)


def process_meta_webhook_payload(db: Session, payload: dict):
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
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