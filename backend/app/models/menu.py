from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Text, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class RestaurantProfile(Base):
    __tablename__ = "restaurant_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    restaurant_id = Column(String, ForeignKey("restaurants.id"), unique=True, nullable=False)
    address = Column(Text)
    opening_hours = Column(JSON)  # {"mon": "9am-10pm", ...}
    delivery_enabled = Column(Boolean, default=False)
    takeaway_enabled = Column(Boolean, default=False)
    avg_prep_time_minutes = Column(Integer, default=30)
    delivery_radius_km = Column(Float, default=5.0)
    whatsapp_number = Column(String)
    logo_url = Column(String)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    restaurant = relationship("Restaurant", back_populates="profile")


class RestaurantOrderSettings(Base):
    __tablename__ = "restaurant_order_settings"

    id = Column(String, primary_key=True, default=gen_uuid)
    restaurant_id = Column(String, ForeignKey("restaurants.id"), unique=True, nullable=False)
    cash_on_delivery_enabled = Column(Boolean, default=True)
    upi_enabled = Column(Boolean, default=False)
    tax_included = Column(Boolean, default=False)
    minimum_order_amount = Column(Float, default=0)
    delivery_fee = Column(Float, default=0)
    currency = Column(String, default="INR")

    restaurant = relationship("Restaurant", back_populates="order_settings")


class MenuCategory(Base):
    __tablename__ = "menu_categories"

    id = Column(String, primary_key=True, default=gen_uuid)
    restaurant_id = Column(String, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    restaurant = relationship("Restaurant", back_populates="menu_categories")
    items = relationship("MenuItem", back_populates="category")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(String, primary_key=True, default=gen_uuid)
    restaurant_id = Column(String, ForeignKey("restaurants.id"), nullable=False)
    category_id = Column(String, ForeignKey("menu_categories.id"))
    name = Column(String, nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    image_url = Column(String)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    restaurant = relationship("Restaurant", back_populates="menu_items")
    category = relationship("MenuCategory", back_populates="items")


class ParseStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    done = "done"
    failed = "failed"


class MenuUpload(Base):
    __tablename__ = "menu_uploads"

    id = Column(String, primary_key=True, default=gen_uuid)
    restaurant_id = Column(String, ForeignKey("restaurants.id"), nullable=False)
    file_url = Column(String, nullable=False)
    file_type = Column(String)  # pdf, image
    parse_status = Column(Enum(ParseStatus), default=ParseStatus.pending)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    restaurant = relationship("Restaurant", back_populates="menu_uploads")


class OnboardingEvent(Base):
    __tablename__ = "onboarding_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    restaurant_id = Column(String, ForeignKey("restaurants.id"), nullable=False)
    step_key = Column(String, nullable=False)
    event_type = Column(String)
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    restaurant = relationship("Restaurant", back_populates="onboarding_events")
