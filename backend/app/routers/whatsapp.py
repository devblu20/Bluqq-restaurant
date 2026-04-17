import os

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.auth import get_current
from app.schemas.whatsapp import (
    WhatsAppConfigResponse,
    WhatsAppConfigUpdate,
    WhatsAppSimulateRequest,
    WhatsAppSimulateResponse,
    WhatsAppMessageItem,
)
from app.services import whatsapp_service

router = APIRouter()


@router.get("/restaurants/{restaurant_id}/whatsapp/config", response_model=WhatsAppConfigResponse)
def get_whatsapp_config(restaurant_id: str, db: Session = Depends(get_db), current=Depends(get_current)):
    return whatsapp_service.get_or_create_config(db, restaurant_id)


@router.patch("/restaurants/{restaurant_id}/whatsapp/config", response_model=WhatsAppConfigResponse)
def update_whatsapp_config(
    restaurant_id: str,
    data: WhatsAppConfigUpdate,
    db: Session = Depends(get_db),
    current=Depends(get_current),
):
    payload = data.model_dump(exclude_unset=True)
    return whatsapp_service.update_config(db, restaurant_id, payload)


@router.post("/restaurants/{restaurant_id}/whatsapp/simulate", response_model=WhatsAppSimulateResponse)
def simulate_whatsapp_chat(
    restaurant_id: str,
    data: WhatsAppSimulateRequest,
    db: Session = Depends(get_db),
    current=Depends(get_current),
):
    if not data.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    reply, sent, meta_error = whatsapp_service.simulate_chat(
        db,
        restaurant_id,
        data.customer_phone,
        data.message.strip(),
        bool(data.send_to_whatsapp),
    )
    recent = whatsapp_service.get_recent_messages(db, restaurant_id, data.customer_phone, limit=30)

    return WhatsAppSimulateResponse(
        restaurant_id=restaurant_id,
        customer_phone=data.customer_phone,
        ai_reply=reply,
        sent_to_whatsapp=sent,
        meta_error=meta_error,
        recent_messages=[WhatsAppMessageItem.model_validate(m) for m in recent],
    )


@router.get("/whatsapp/webhook")
def verify_whatsapp_webhook(
    mode: str = Query(None, alias="hub.mode"),
    token: str = Query(None, alias="hub.verify_token"),
    challenge: str = Query(None, alias="hub.challenge"),
):
    expected_token = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "restaurant_webhook_verify")

    if mode == "subscribe" and token == expected_token and challenge:
        return int(challenge)

    raise HTTPException(status_code=403, detail="Webhook verification failed")


@router.post("/whatsapp/webhook")
async def receive_whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    whatsapp_service.process_meta_webhook_payload(db, payload)
    return {"ok": True}
