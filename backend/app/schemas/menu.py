from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# app/schemas/menu.py ke end mein add karo

from typing import Any

class ScanImportRequest(BaseModel):
    """
    MenuScanner API se aaya hua data yahan aata hai.
    items[] mein har item ka name, price, category hota hai.
    """
    items: list[dict[str, Any]]
    detected_cuisine: Optional[str] = None
    restaurant_name: Optional[str] = None
    menu_currency_symbol: Optional[str] = "₹"
    menu_currency_code: Optional[str] = "INR"


class ScanImportResponse(BaseModel):
    imported_items: int
    imported_categories: int
    category_names: list[str]
    message: str
# --- Category ---
class CategoryCreate(BaseModel):
    name: str
    sort_order: Optional[int] = 0
    is_active: Optional[bool] = True


class CategoryResponse(CategoryCreate):
    id: str
    restaurant_id: str

    class Config:
        from_attributes = True


# --- Menu Item ---
class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = True


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None


class MenuItemResponse(MenuItemCreate):
    id: str
    restaurant_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Menu Upload ---
class MenuUploadResponse(BaseModel):
    id: str
    restaurant_id: str
    file_url: str
    file_type: str
    parse_status: str
    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Go Live Check ---
class GoLiveCheckResponse(BaseModel):
    restaurant_id: str
    basic_info: bool
    operations: bool
    menu: bool
    order_settings: bool
    ready_for_launch: bool
    missing: List[str]