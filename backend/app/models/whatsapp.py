from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class RestaurantWhatsappConfig(Base):
    __tablename__ = "restaurant_whatsapp_configs"

    id = Column(String, primary_key=True, default=gen_uuid)
    restaurant_id = Column(String, ForeignKey("restaurants.id"), unique=True, nullable=False)

    # Meta WhatsApp Cloud API settings
    phone_number_id = Column(String, unique=True)
    access_token = Column(Text)
    verify_token = Column(String)
    business_phone = Column(String)
    is_active = Column(Boolean, default=False)

    # AI waiter behavior
    tone = Column(String, default="friendly")
    language = Column(String, default="hinglish")
    custom_prompt = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    restaurant = relationship("Restaurant", back_populates="whatsapp_config")


class WhatsAppConversation(Base):
    __tablename__ = "whatsapp_conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    restaurant_id = Column(String, ForeignKey("restaurants.id"), nullable=False)
    customer_phone = Column(String, nullable=False)
    last_message = Column(Text)
    context_json = Column(JSON, default={})

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    restaurant = relationship("Restaurant", back_populates="whatsapp_conversations")


class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    restaurant_id = Column(String, ForeignKey("restaurants.id"), nullable=False)
    customer_phone = Column(String, nullable=False)
    direction = Column(String, nullable=False)  # incoming | outgoing
    message = Column(Text, nullable=False)
    wa_message_id = Column(String)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    restaurant = relationship("Restaurant", back_populates="whatsapp_messages")
