from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, List
from enum import Enum
from datetime import datetime


class BusinessType(str, Enum):
    dine_in = "dine_in"
    takeaway = "takeaway"
    delivery = "delivery"
    combination = "combination"


class OnboardingStatus(str, Enum):
    started = "started"
    basic_info_completed = "basic_info_completed"
    operations_completed = "operations_completed"
    menu_completed = "menu_completed"
    ordering_settings_completed = "ordering_settings_completed"
    ready_for_launch = "ready_for_launch"


# --- Auth ---
class SignupRequest(BaseModel):
    name: str
    owner_name: str
    email: EmailStr
    phone: str
    city: str
    business_type: Optional[str] = "dine_in" 
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    restaurant_id: str


# --- Restaurant ---
class RestaurantCreate(BaseModel):
    name: str
    owner_name: str
    email: EmailStr
    phone: str
    city: str
    business_type: str


class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None
    business_type: Optional[str] = None


class RestaurantResponse(BaseModel):
    id: str
    name: str
    owner_name: str
    email: str
    phone: str
    city: str
    business_type: str
    address: Optional[str] = None
    description: Optional[str] = None
    status: str
    onboarding_status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Profile ---
class ProfileCreate(BaseModel):
    address: Optional[str] = None
    opening_hours: Optional[Dict[str, str]] = None
    delivery_enabled: Optional[bool] = False
    takeaway_enabled: Optional[bool] = False
    avg_prep_time_minutes: Optional[int] = 30
    delivery_radius_km: Optional[float] = 5.0
    whatsapp_number: Optional[str] = None
    logo_url: Optional[str] = None


class ProfileUpdate(ProfileCreate):
    pass


class ProfileResponse(ProfileCreate):
    id: str
    restaurant_id: str

    class Config:
        from_attributes = True


# --- Order Settings ---
class OrderSettingsCreate(BaseModel):
    cash_on_delivery_enabled: Optional[bool] = True
    upi_enabled: Optional[bool] = False
    tax_included: Optional[bool] = False
    minimum_order_amount: Optional[float] = 0
    delivery_fee: Optional[float] = 0
    currency: Optional[str] = "INR"


class OrderSettingsUpdate(OrderSettingsCreate):
    pass


class OrderSettingsResponse(OrderSettingsCreate):
    id: str
    restaurant_id: str

    class Config:
        from_attributes = True


# --- Onboarding Status ---
class StepStatus(BaseModel):
    key: str
    completed: bool


class OnboardingStatusResponse(BaseModel):
    restaurant_id: str
    completion_percent: int
    current_step: str
    steps: List[StepStatus]
    ready_for_launch: bool