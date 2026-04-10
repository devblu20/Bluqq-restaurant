from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from app.models.menu import MenuCategory, MenuItem, MenuUpload, ParseStatus
from app.models.restaurant import Restaurant, OnboardingStatus
from app.schemas.menu import ScanImportRequest
from app.schemas.menu import (
    CategoryCreate, MenuItemCreate, MenuItemUpdate,
    GoLiveCheckResponse,
)
import uuid
import os
import shutil

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/restaurant_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# app/services/menu_service.py mein add karo (existing file ke end mein)



def import_from_scan(restaurant_id: str, data: "ScanImportRequest", db: Session):
    """
    MenuScanner se aaya hua JSON leke DB mein save karta hai.
    Categories auto-create hoti hain, items bhi.
    """
    created_categories = {}  # name -> id mapping
    created_items = []

    for item in data.items:
        cat_name = item.get("category") or "General"

        # Category pehle se exist karti hai? Nahi to banao
        if cat_name not in created_categories:
            existing_cat = (
                db.query(MenuCategory)
                .filter_by(restaurant_id=restaurant_id, name=cat_name)
                .first()
            )
            if existing_cat:
                created_categories[cat_name] = existing_cat.id
            else:
                new_cat = MenuCategory(
                    restaurant_id=restaurant_id,
                    name=cat_name,
                    is_active=True
                )
                db.add(new_cat)
                db.flush()  # id generate karne ke liye
                created_categories[cat_name] = new_cat.id

        # Price extract karo
        price_value = item.get("price_value") or 0.0

        # MenuItem banao
        menu_item = MenuItem(
            restaurant_id=restaurant_id,
            category_id=created_categories[cat_name],
            name=item.get("name", "Unnamed Item"),
            description=item.get("description"),
            price=float(price_value),
            is_available=True,
        )
        db.add(menu_item)
        created_items.append(menu_item)

    # Menu step complete mark karo
    from app.models.restaurant import Restaurant
    r = db.query(Restaurant).filter_by(id=restaurant_id).first()
    if r:
        r.onboarding_status = "menu_completed"

    db.commit()

    return {
        "imported_items": len(created_items),
        "imported_categories": len(created_categories),
        "category_names": list(created_categories.keys()),
        "message": f"{len(created_items)} items successfully imported"
    }

# --- Categories ---
def create_category(db: Session, restaurant_id: str, data: CategoryCreate) -> MenuCategory:
    cat = MenuCategory(restaurant_id=restaurant_id, **data.dict())
    db.add(cat)
    _advance_menu_status(db, restaurant_id)
    db.commit()
    db.refresh(cat)
    return cat


def get_categories(db: Session, restaurant_id: str):
    return db.query(MenuCategory).filter(MenuCategory.restaurant_id == restaurant_id).all()


# --- Items ---
def create_menu_item(db: Session, restaurant_id: str, data: MenuItemCreate) -> MenuItem:
    item_data = data.dict()

    # Convert empty string category_id to None (foreign key can't be empty string)
    if not item_data.get("category_id"):
        item_data["category_id"] = None

    # Convert empty string description to None
    if not item_data.get("description"):
        item_data["description"] = None

    item = MenuItem(restaurant_id=restaurant_id, **item_data)
    db.add(item)
    _advance_menu_status(db, restaurant_id)
    db.commit()
    db.refresh(item)
    return item


def update_menu_item(db: Session, restaurant_id: str, item_id: str, data: MenuItemUpdate) -> MenuItem:
    item = db.query(MenuItem).filter(
        MenuItem.id == item_id, MenuItem.restaurant_id == restaurant_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    update_data = data.dict(exclude_unset=True)

    # Convert empty string category_id to None
    if "category_id" in update_data and not update_data["category_id"]:
        update_data["category_id"] = None

    # Convert empty string description to None
    if "description" in update_data and not update_data["description"]:
        update_data["description"] = None

    for field, value in update_data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def get_menu_items(db: Session, restaurant_id: str):
    return db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).all()


# --- Uploads ---
def upload_menu_file(db: Session, restaurant_id: str, file: UploadFile) -> MenuUpload:
    file_ext = file.filename.split(".")[-1].lower()
    file_type = "pdf" if file_ext == "pdf" else "image"
    filename = f"{uuid.uuid4()}.{file_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    upload = MenuUpload(
        restaurant_id=restaurant_id,
        file_url=filepath,
        file_type=file_type,
        parse_status=ParseStatus.pending,
    )
    db.add(upload)
    _advance_menu_status(db, restaurant_id)
    db.commit()
    db.refresh(upload)
    return upload


# --- Go Live Check ---
def go_live_check(db: Session, restaurant_id: str) -> GoLiveCheckResponse:
    from app.models.restaurant import Restaurant
    from app.models.menu import RestaurantProfile, RestaurantOrderSettings

    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    profile = db.query(RestaurantProfile).filter(
        RestaurantProfile.restaurant_id == restaurant_id
    ).first()
    settings = db.query(RestaurantOrderSettings).filter(
        RestaurantOrderSettings.restaurant_id == restaurant_id
    ).first()
    has_items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).count() > 0
    has_upload = db.query(MenuUpload).filter(MenuUpload.restaurant_id == restaurant_id).count() > 0

    basic_ok = r.onboarding_status != OnboardingStatus.started
    ops_ok = profile is not None
    menu_ok = has_items or has_upload
    settings_ok = settings is not None

    missing = []
    if not basic_ok:
        missing.append("Basic restaurant info")
    if not ops_ok:
        missing.append("Operational settings")
    if not menu_ok:
        missing.append("At least one menu item or menu upload")
    if not settings_ok:
        missing.append("Order settings")

    ready = basic_ok and menu_ok and settings_ok

    return GoLiveCheckResponse(
        restaurant_id=restaurant_id,
        basic_info=basic_ok,
        operations=ops_ok,
        menu=menu_ok,
        order_settings=settings_ok,
        ready_for_launch=ready,
        missing=missing,
    )


def _advance_menu_status(db: Session, restaurant_id: str):
    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if r and r.onboarding_status in [
        OnboardingStatus.started,
        OnboardingStatus.basic_info_completed,
        OnboardingStatus.operations_completed,
    ]:
        r.onboarding_status = OnboardingStatus.menu_completed