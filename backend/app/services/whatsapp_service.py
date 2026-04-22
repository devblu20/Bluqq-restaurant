import json
import os
import re
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
#  HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _contains_devanagari(text: str) -> bool:
    return any("\u0900" <= ch <= "\u097F" for ch in (text or ""))


def _normalize_text(text: str) -> str:
    cleaned = re.sub(r"[^\w\s]", " ", (text or "").lower())
    return re.sub(r"\s+", " ", cleaned).strip()


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
    name_lower = _normalize_text(item.name or "")
    non_veg_keys = ["chicken", "fish", "mutton", "lamb", "prawn", "egg", "meat", "beef", "pork", "seafood"]
    return not any(k in name_lower for k in non_veg_keys)


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


def _remove_order_line(ctx: dict, item_name: str) -> list:
    order_lines = list(ctx.get("order_lines") or [])
    item_key = _normalize_text(item_name)
    new_lines = [l for l in order_lines if _normalize_text(l.get("name", "")) != item_key]
    ctx["order_lines"] = new_lines
    return new_lines


def _format_order_summary(ctx: dict) -> str:
    order_lines = ctx.get("order_lines") or []
    name = ctx.get("customer_name", "Not provided")
    contact = ctx.get("customer_contact", "Not provided")
    address = ctx.get("customer_address", "Not provided")
    subtotal = sum(int(l.get("unit_price", 0)) * int(l.get("qty", 1)) for l in order_lines)
    lines = [
        "\u2705 *Order Confirmed!*", "",
        "\U0001f9fe *Order Summary*",
        f"\u2022 Name: {name}",
        f"\u2022 Contact: {contact}",
        f"\u2022 Address: {address}",
        "", "\U0001f37d\ufe0f *Items:*",
    ]
    for l in order_lines:
        qty = int(l.get("qty", 1))
        price = int(l.get("unit_price", 0))
        lines.append(f"\u2022 {l.get('name')} x {qty} \u2014 \u20b9{price * qty}")
    lines += [
        "",
        f"\U0001f4b5 *Total: \u20b9{subtotal}*",
        "\u23f1\ufe0f Estimated delivery: 30 mins",
        "",
        "Thank you! \U0001f64f",
    ]
    return "\n".join(lines)


# ═════════════════════════════════════════════════════════════════════════════
#  MENU BUILDER  — called directly, never via AI JSON
#  (avoids the "Unterminated string" JSON crash when menu text is long)
# ═════════════════════════════════════════════════════════════════════════════

_MENU_KEYWORDS = [
    "full menu", "your menu", "show menu", "share menu", "send menu",
    "menu please", "menu bejo", "menu bhejo", "menu dikhao", "menu dikha",
    "can you share", "what do you have", "whats available", "what is available",
    "all items", "complete menu", "entire menu", "show all", "list items",
    "menu share", "menu de", "menu dena",
]


def _is_menu_intent(msg: str) -> bool:
    m = _normalize_text(msg)
    if "menu" in m:
        return True
    return any(k in m for k in _MENU_KEYWORDS)


def _is_veg_filter(msg: str) -> bool:
    m = _normalize_text(msg)
    return any(k in m for k in ["veg menu", "veg only", "vegetarian menu", "veg items", "only veg"])


def _is_nonveg_filter(msg: str) -> bool:
    m = _normalize_text(msg)
    return any(k in m for k in [
        "non veg menu", "nonveg menu", "non veg only", "only non veg", "non veg items",
    ])


def _build_menu_reply(items, veg_only: bool = False, nonveg_only: bool = False) -> str:
    """
    Builds the menu string in pure Python.
    Never passed through JSON, so special chars (emojis, Rs sign, asterisks,
    newlines) cannot break JSON parsing.
    """
    if not items:
        return "Our menu is being updated \U0001f64f Please check back soon!"

    grouped: dict = {}
    section_order = ["Starters", "Main Course", "Rice & Noodles", "Curries", "Desserts", "Drinks", "Other"]

    for item in items:
        if veg_only and not _item_is_veg(item):
            continue
        if nonveg_only and _item_is_veg(item):
            continue

        cat = ""
        if getattr(item, "category", None) and item.category:
            cat = _normalize_text(item.category.name)
        blob = f"{cat} {_normalize_text(item.name or '')}"

        if any(k in blob for k in ["starter", "appetizer", "snack", "tikka"]):
            section = "Starters"
        elif any(k in blob for k in ["rice", "noodle", "biryani", "hakka", "fried rice"]):
            section = "Rice & Noodles"
        elif any(k in blob for k in ["curry", "gravy", "masala", "dal", "paneer"]):
            section = "Curries"
        elif any(k in blob for k in ["dessert", "sweet", "ice cream", "kulfi", "gulab"]):
            section = "Desserts"
        elif any(k in blob for k in ["drink", "juice", "lassi", "chai", "coffee", "water", "soda"]):
            section = "Drinks"
        else:
            section = "Main Course"

        grouped.setdefault(section, []).append(item)

    if not grouped:
        return "No items found for that filter right now."

    header = "\U0001f4cb *Full Menu*"
    if veg_only:
        header = "\U0001f33f *Veg Menu*"
    elif nonveg_only:
        header = "\U0001f356 *Non-Veg Menu*"

    emoji_map = {
        "Starters":      "\U0001f957",
        "Main Course":   "\U0001f35b",
        "Rice & Noodles": "\U0001f35c",
        "Curries":       "\U0001f35b",
        "Desserts":      "\U0001f36e",
        "Drinks":        "\U0001f964",
        "Other":         "\U0001f37d\ufe0f",
    }

    lines = [header, ""]
    for section in section_order:
        items_in_section = grouped.get(section, [])
        if not items_in_section:
            continue
        lines.append(f"{emoji_map.get(section, chr(127869))} *{section}*")
        for it in items_in_section:
            price = int(it.price or 0)
            tag = "\U0001f33f" if _item_is_veg(it) else "\U0001f356"
            lines.append(f"  {tag} {it.name} \u2014 \u20b9{price}")
        lines.append("")

    lines.append("Just reply with a dish name to order! \U0001f60a")
    return "\n".join(lines).strip()


# ═════════════════════════════════════════════════════════════════════════════
#  ROBUST JSON PARSER
#  Handles the "Unterminated string" error by falling back to regex extraction
# ═════════════════════════════════════════════════════════════════════════════

def _safe_parse_json(raw: str) -> dict:
    # 1. Direct parse
    try:
        return json.loads(raw)
    except Exception:
        pass

    # 2. Strip markdown fences
    try:
        clean = re.sub(r"```json|```", "", raw).strip()
        return json.loads(clean)
    except Exception:
        pass

    # 3. Find first {...} block
    try:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            return json.loads(m.group())
    except Exception:
        pass

    # 4. Field-by-field regex rescue (handles truncated/unterminated strings)
    result: dict = {}
    try:
        # reply — match properly escaped JSON string content
        rm = re.search(r'"reply"\s*:\s*"((?:[^"\\]|\\.)*)"', raw, re.DOTALL)
        if rm:
            result["reply"] = rm.group(1).replace("\\n", "\n").replace('\\"', '"')

        for field in ("cart_action", "item_name", "checkout_field", "checkout_value"):
            fm = re.search(rf'"{field}"\s*:\s*"([^"]*)"', raw)
            if fm:
                result[field] = fm.group(1)

        qm = re.search(r'"qty"\s*:\s*(\d+)', raw)
        if qm:
            result["qty"] = int(qm.group(1))

        sm = re.search(r'"start_checkout"\s*:\s*(true|false)', raw)
        if sm:
            result["start_checkout"] = sm.group(1) == "true"
    except Exception:
        pass

    return result


# ═════════════════════════════════════════════════════════════════════════════
#  CONFIG HELPERS
# ═════════════════════════════════════════════════════════════════════════════

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


# ═════════════════════════════════════════════════════════════════════════════
#  CONVERSATION / DB HELPERS
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
    ctx = dict(conv.context_json or {})

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    restaurant_name = restaurant.name if restaurant else "our restaurant"

    items = (
        db.query(MenuItem)
        .filter(MenuItem.restaurant_id == restaurant_id, MenuItem.is_available == True)
        .limit(100)
        .all()
    )

    # ── MENU INTENT: handle in pure Python, bypass AI entirely ────────────────
    # This is the root fix for "Unterminated string" JSON errors.
    # When the AI tries to put a long, emoji-heavy, multiline menu inside a JSON
    # string field, it often produces malformed JSON. We skip that entirely.
    if _is_menu_intent(customer_message):
        veg_only = _is_veg_filter(customer_message)
        nonveg_only = _is_nonveg_filter(customer_message)
        ctx["welcomed"] = True
        conv.context_json = ctx
        db.commit()
        return _build_menu_reply(items, veg_only=veg_only, nonveg_only=nonveg_only)

    # ── Build menu text for AI (kept short — no special chars that break JSON) ─
    menu_lines = []
    for item in items:
        price = int(item.price) if item.price is not None else 0
        tag = "VEG" if _item_is_veg(item) else "NON-VEG"
        desc = ""
        if getattr(item, "description", None) and item.description:
            # Truncate description to avoid bloating the prompt
            desc = " | " + item.description.strip()[:80]
        menu_lines.append(f"- {item.name} | Rs{price} | {tag}{desc}")
    menu_text = "\n".join(menu_lines) if menu_lines else "Menu not configured yet."

    # ── Cart block ─────────────────────────────────────────────────────────────
    order_lines = ctx.get("order_lines") or []
    if order_lines:
        subtotal = sum(int(l.get("unit_price", 0)) * int(l.get("qty", 1)) for l in order_lines)
        cart_lines = [
            f"  - {l['name']} x{l['qty']} @ Rs{l.get('unit_price', 0)} = Rs{int(l.get('unit_price', 0)) * int(l['qty'])}"
            for l in order_lines
        ]
        cart_block = "CART:\n" + "\n".join(cart_lines) + f"\nSubtotal: Rs{subtotal}"
    else:
        cart_block = "CART: empty"

    # ── Stage ──────────────────────────────────────────────────────────────────
    stage = ctx.get("stage") or ""
    stage_map = {
        "awaiting_name":    "CHECKOUT: Ask for customer NAME.",
        "awaiting_contact": "CHECKOUT: Ask for customer PHONE NUMBER.",
        "awaiting_address": "CHECKOUT: Ask for customer DELIVERY ADDRESS.",
        "confirmed":        "CHECKOUT: Order confirmed. Thank the customer.",
    }
    stage_block = stage_map.get(stage, "")

    info_parts = []
    if ctx.get("customer_name"):    info_parts.append(f"Name: {ctx['customer_name']}")
    if ctx.get("customer_contact"): info_parts.append(f"Phone: {ctx['customer_contact']}")
    if ctx.get("customer_address"): info_parts.append(f"Address: {ctx['customer_address']}")
    checkout_info = ("Collected: " + " | ".join(info_parts)) if info_parts else ""

    custom = (cfg.custom_prompt or "").strip()

    system_prompt = (
        f"You are Rohan, a friendly human waiter at {restaurant_name} on WhatsApp.\n\n"
        f"MENU (use ONLY these items, never invent):\n{menu_text}\n\n"
        f"STATE:\n{cart_block}\n{stage_block}\n{checkout_info}\n"
        + (f"Custom: {custom}\n" if custom else "")
        + """
Reply ONLY with valid JSON. No text outside JSON. No markdown fences.

{
  "reply": "your WhatsApp message",
  "cart_action": "none" | "add" | "remove" | "clear",
  "item_name": "exact item name from menu, or null",
  "qty": <number or null>,
  "checkout_field": null | "name" | "contact" | "address",
  "checkout_value": "value or null",
  "start_checkout": true | false
}

CART RULES:
- add: cart_action=add, item_name=exact name, qty=number
- remove: cart_action=remove, item_name=exact name
- clear/reset: cart_action=clear
- After cart change: show cart items + subtotal in reply
- Use EXACT item name from menu. Misspelling = match closest.

CHECKOUT:
- "confirm"/"place order"/"done"/"checkout" -> start_checkout=true
- Collect name then phone then address (one at a time)
- Name -> checkout_field=name
- Phone -> checkout_field=contact
- Address -> checkout_field=address

REPLY RULES:
- Short, warm, natural — like a real waiter texting
- Handle typos, Hinglish, spelling mistakes
- 0-2 emojis total
- Keep reply field SHORT and ASCII-safe — no fancy unicode in reply
- Do NOT include full menu in reply field
- If asked about menu say "Here's our menu:" and list only 3-4 top items

CRITICAL: reply ONLY with valid JSON."""
    )

    # ── Conversation history ───────────────────────────────────────────────────
    recent_msgs = (
        db.query(WhatsAppMessage)
        .filter(
            WhatsAppMessage.restaurant_id == restaurant_id,
            WhatsAppMessage.customer_phone == customer_phone,
        )
        .order_by(WhatsAppMessage.created_at.desc())
        .limit(14)
        .all()[::-1]
    )

    messages = [{"role": "system", "content": system_prompt}]
    for row in recent_msgs:
        role = "user" if row.direction == "incoming" else "assistant"
        messages.append({"role": role, "content": row.message})
    messages.append({"role": "user", "content": customer_message})

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return "Sorry, I'm having trouble right now. Please try again in a moment!"

    try:
        from openai import OpenAI
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        client = OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model=model,
            temperature=0.3,
            max_tokens=600,
            response_format={"type": "json_object"},
            messages=messages,
        )

        raw = (response.choices[0].message.content or "").strip()

        # ── Robust JSON parse ──────────────────────────────────────────────────
        data = _safe_parse_json(raw)
        if not data:
            print(f"[whatsapp_service] JSON parse failed. Raw={raw[:300]}")
            return "I didn't catch that — could you rephrase? \U0001f60a"

        reply = (data.get("reply") or "").strip()
        cart_action = data.get("cart_action", "none")
        item_name = data.get("item_name")
        qty = int(data.get("qty") or 1)
        checkout_field = data.get("checkout_field")
        checkout_value = data.get("checkout_value")
        start_checkout = bool(data.get("start_checkout", False))

        # ── Apply cart ─────────────────────────────────────────────────────────
        if cart_action == "add" and item_name:
            matched = next(
                (i for i in items if _normalize_text(i.name) == _normalize_text(item_name)),
                None,
            )
            if matched:
                _append_order_line(ctx, matched.name, qty, int(matched.price or 0))

        elif cart_action == "remove" and item_name:
            _remove_order_line(ctx, item_name)

        elif cart_action == "clear":
            ctx.update({
                "order_lines": [], "stage": None,
                "customer_name": None, "customer_contact": None, "customer_address": None,
            })

        # ── Apply checkout ─────────────────────────────────────────────────────
        if checkout_field == "name" and checkout_value:
            ctx["customer_name"] = str(checkout_value).strip().title()
            ctx["stage"] = "awaiting_contact"

        elif checkout_field == "contact" and checkout_value:
            digits = re.sub(r"\D", "", str(checkout_value))
            ctx["customer_contact"] = digits[-10:] if len(digits) >= 10 else digits
            ctx["stage"] = "awaiting_address"

        elif checkout_field == "address" and checkout_value:
            ctx["customer_address"] = str(checkout_value).strip()
            ctx["stage"] = "confirmed"
            reply = _format_order_summary(ctx)

        if start_checkout and not ctx.get("stage"):
            ctx["stage"] = "awaiting_name"

        ctx["welcomed"] = True
        conv.context_json = ctx
        db.commit()

        # ── Devanagari fix ─────────────────────────────────────────────────────
        if reply and _contains_devanagari(reply):
            rewrite = client.chat.completions.create(
                model=model,
                temperature=0.1,
                max_tokens=400,
                messages=[
                    {"role": "system", "content": "Rewrite in natural English only. Keep exact meaning."},
                    {"role": "user", "content": reply},
                ],
            )
            reply = (rewrite.choices[0].message.content or reply).strip()

        return reply or "I didn't catch that \u2014 could you say it again? \U0001f60a"

    except Exception as exc:
        print(f"[whatsapp_service] AI error: {exc}")
        return "Sorry, something went wrong. Please try again!"


# ═════════════════════════════════════════════════════════════════════════════
#  SIMULATE CHAT
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
#  SEND WHATSAPP MESSAGE
# ═════════════════════════════════════════════════════════════════════════════

def send_whatsapp_message(cfg: RestaurantWhatsappConfig, to_phone: str, message: str):
    phone_number_id = (cfg.phone_number_id or "").strip().strip('"').strip("'")
    access_token = (
        (cfg.access_token or "").strip().strip('"').strip("'")
        or (os.getenv("WHATSAPP_ACCESS_TOKEN") or "").strip().strip('"').strip("'")
    )
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
            raw = exc.read().decode("utf-8")
            parsed = json.loads(raw)
            err = parsed.get("error") or {}
            code = err.get("code")
            msg = (err.get("message") or "").strip()
            details = (err.get("error_data") or {}).get("details")
            if code == 131005:
                return False, "WhatsApp access denied (131005): token/permissions invalid."
            if code == 190:
                return False, "WhatsApp token expired (190). Generate a fresh permanent token."
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
