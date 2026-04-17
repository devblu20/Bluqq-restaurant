from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ─────────────────────────────────────────────
# 🔹 Scanner Item Schema
# ─────────────────────────────────────────────

class ScanItem(BaseModel):
    name: str
    name_original: Optional[str] = None
    description: Optional[str] = None

    price: Optional[str] = None
    price_value: Optional[float] = None

    currency_symbol: Optional[str] = "₹"
    currency_code: Optional[str] = "INR"

    category: Optional[str] = "General"

    tags: Optional[List[str]] = []
    cuisine_type: Optional[str] = None

    image_link: Optional[str] = None
    page: Optional[int] = None


# ─────────────────────────────────────────────
# 🔹 Scan Import
# ─────────────────────────────────────────────

class ScanImportRequest(BaseModel):
    """
    MenuScanner API se aaya hua structured data
    """
    items: List[ScanItem]

    detected_cuisine: Optional[str] = None
    cuisine_region: Optional[str] = None
    restaurant_name: Optional[str] = None
    language_detected: Optional[str] = None

    menu_currency_symbol: Optional[str] = "₹"
    menu_currency_code: Optional[str] = "INR"


class ScanImportResponse(BaseModel):
    imported_items: int
    imported_categories: int
    category_names: List[str]

    detected_cuisine: Optional[str] = None
    restaurant_name: Optional[str] = None

    message: str


# ─────────────────────────────────────────────
# 🔹 Category
# ─────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    sort_order: Optional[int] = 0
    is_active: Optional[bool] = True


class CategoryResponse(CategoryCreate):
    id: str
    restaurant_id: str

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# 🔹 Menu Item
# ─────────────────────────────────────────────

class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float

    category_id: Optional[str] = None

    image_url: Optional[str] = None
    is_available: Optional[bool] = True

    # 🔥 Scanner + Advanced Fields
    tags: Optional[List[str]] = []
    cuisine_type: Optional[str] = None

    currency_symbol: Optional[str] = "₹"
    currency_code: Optional[str] = "INR"

    source_page: Optional[int] = None


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None

    category_id: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None

    tags: Optional[List[str]] = None
    cuisine_type: Optional[str] = None

    currency_symbol: Optional[str] = None
    currency_code: Optional[str] = None

    source_page: Optional[int] = None


class MenuItemResponse(MenuItemCreate):
    id: str
    restaurant_id: str

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# 🔹 Menu Upload
# ─────────────────────────────────────────────

class MenuUploadResponse(BaseModel):
    id: str
    restaurant_id: str

    file_url: str
    file_type: str
    parse_status: str

    uploaded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# 🔹 Go Live Check
# ─────────────────────────────────────────────

class GoLiveCheckResponse(BaseModel):
    restaurant_id: str

    basic_info: bool
    operations: bool
    menu: bool
    order_settings: bool

    ready_for_launch: bool
    missing: List[str]

