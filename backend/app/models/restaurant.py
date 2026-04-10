from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class OnboardingStatus(str, enum.Enum):
    started = "started"
    basic_info_completed = "basic_info_completed"
    operations_completed = "operations_completed"
    menu_completed = "menu_completed"
    ordering_settings_completed = "ordering_settings_completed"
    ready_for_launch = "ready_for_launch"

class RestaurantStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    owner_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=False)
    city = Column(String, nullable=False)
    # String for multi-select support (e.g., "dine_in,delivery")
    business_type = Column(String, nullable=False)
    
    status = Column(Enum(RestaurantStatus), default=RestaurantStatus.inactive)
    onboarding_status = Column(Enum(OnboardingStatus), default=OnboardingStatus.started)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    profile = relationship("RestaurantProfile", back_populates="restaurant", uselist=False)
    order_settings = relationship("RestaurantOrderSettings", back_populates="restaurant", uselist=False)
    menu_categories = relationship("MenuCategory", back_populates="restaurant")
    menu_items = relationship("MenuItem", back_populates="restaurant")
    onboarding_events = relationship("OnboardingEvent", back_populates="restaurant")
    menu_uploads = relationship("MenuUpload", back_populates="restaurant")