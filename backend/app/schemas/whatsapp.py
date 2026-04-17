from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class WhatsAppConfigUpdate(BaseModel):
    phone_number_id: Optional[str] = None
    access_token: Optional[str] = None
    verify_token: Optional[str] = None
    business_phone: Optional[str] = None
    is_active: Optional[bool] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    custom_prompt: Optional[str] = None


class WhatsAppConfigResponse(BaseModel):
    id: str
    restaurant_id: str
    phone_number_id: Optional[str] = None
    verify_token: Optional[str] = None
    business_phone: Optional[str] = None
    is_active: bool
    tone: str
    language: str
    custom_prompt: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WhatsAppSimulateRequest(BaseModel):
    customer_phone: str
    message: str
    send_to_whatsapp: Optional[bool] = False


class WhatsAppMessageItem(BaseModel):
    direction: str
    customer_phone: str
    message: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WhatsAppSimulateResponse(BaseModel):
    restaurant_id: str
    customer_phone: str
    ai_reply: str
    sent_to_whatsapp: bool
    meta_error: Optional[str] = None
    recent_messages: List[WhatsAppMessageItem]
