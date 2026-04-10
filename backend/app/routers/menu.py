from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import get_current
from app.schemas.menu import (
    CategoryCreate, CategoryResponse,
    MenuItemCreate, MenuItemUpdate, MenuItemResponse,
    MenuUploadResponse, GoLiveCheckResponse,
    ScanImportRequest, ScanImportResponse
)
from app.services import menu_service, menu_scan_service
from app.models.menu import MenuCategory, MenuItem
from typing import List, Optional
from pydantic import BaseModel
import anthropic
import base64
import json
import os
import uuid

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# AI Scanner Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ScannedItemResult(BaseModel):
    name: str
    category: str
    price: Optional[float] = None
    description: Optional[str] = None

class ScanMenuResponse(BaseModel):
    success: bool
    restaurant_id: str
    total_items_saved: int
    total_categories_created: int
    pages_processed: int
    detected_cuisine: Optional[str] = None
    restaurant_name_detected: Optional[str] = None
    items_saved: List[ScannedItemResult]

# ─────────────────────────────────────────────────────────────────────────────
# Existing Routes (CRUD)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{restaurant_id}/menu/categories", response_model=List[CategoryResponse])
def get_categories(restaurant_id: str, db: Session = Depends(get_db)):
    return menu_service.get_categories(db, restaurant_id)

@router.post("/{restaurant_id}/menu/categories", response_model=CategoryResponse)
def create_category(restaurant_id: str, data: CategoryCreate, db: Session = Depends(get_db)):
    return menu_service.create_category(db, restaurant_id, data)

@router.post("/{restaurant_id}/menu/items", response_model=MenuItemResponse)
def create_item(restaurant_id: str, data: MenuItemCreate, db: Session = Depends(get_db)):
    return menu_service.create_menu_item(db, restaurant_id, data)

@router.patch("/{restaurant_id}/menu/items/{item_id}", response_model=MenuItemResponse)
def update_item(restaurant_id: str, item_id: str, data: MenuItemUpdate, db: Session = Depends(get_db)):
    return menu_service.update_menu_item(db, restaurant_id, item_id, data)

@router.get("/{restaurant_id}/menu/items", response_model=List[MenuItemResponse])
def get_items(restaurant_id: str, db: Session = Depends(get_db)):
    return menu_service.get_menu_items(db, restaurant_id)

@router.get("/{restaurant_id}/go-live-check", response_model=GoLiveCheckResponse)
def go_live_check(restaurant_id: str, db: Session = Depends(get_db)):
    return menu_service.go_live_check(db, restaurant_id)


# backend/app/routers/menu.py mein niche add karein

@router.delete("/{restaurant_id}/menu/items/{item_id}")
def delete_menu_item(
    restaurant_id: str, 
    item_id: str, 
    db: Session = Depends(get_db), 
    current=Depends(get_current)
):
    from app.models.menu import MenuItem
    
    # Item dhoondo
    item = db.query(MenuItem).filter_by(id=item_id, restaurant_id=restaurant_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Dish not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Dish deleted successfully"}
# ─────────────────────────────────────────────────────────────────────────────
# AI SCANNER ENDPOINTS (Frontend Integrated)
# ─────────────────────────────────────────────────────────────────────────────

# 1. Frontend calls: uploadMenuImage / uploadMenu
@router.post("/{restaurant_id}/upload-menu", response_model=ScanMenuResponse)
async def upload_and_auto_scan(
    restaurant_id: str, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Frontend ke 'AI Scan' button ke liye:
    Image upload hoti hai aur Claude turant scan karke DB mein save kar deta hai.
    """
    img_bytes = await file.read()
    mime = file.content_type
    
    # Hamari menu_scan_service ko call karein
    result = menu_scan_service.scan_and_save(db, restaurant_id, img_bytes, mime)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
        
    # Is response format ko ScanMenuResponse se match kar rahe hain
    return ScanMenuResponse(
        success=True,
        restaurant_id=restaurant_id,
        total_items_saved=result.get("items_saved", 0),
        total_categories_created=len(result.get("categories", [])),
        pages_processed=1,
        items_saved=[] # Frontend refresh ke liye items_saved zaroori hai
    )

# 2. Frontend calls: scanMenuImages
@router.post("/{restaurant_id}/menu/scan-image", response_model=ScanMenuResponse)
async def scan_only(
    restaurant_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Alias for upload-menu to support multiple frontend components"""
    img_bytes = await file.read()
    mime = file.content_type
    result = menu_scan_service.scan_and_save(db, restaurant_id, img_bytes, mime)
    return ScanMenuResponse(
        success=True, restaurant_id=restaurant_id,
        total_items_saved=result.get("items_saved", 0),
        total_categories_created=len(result.get("categories", [])),
        pages_processed=1, items_saved=[]
    )

# 3. Frontend calls: importScan (Save JSON results)
@router.post("/{restaurant_id}/menu/import-scan", response_model=ScanImportResponse)
def import_scan_result(
    restaurant_id: str,
    data: ScanImportRequest,
    db: Session = Depends(get_db)
):
    return menu_service.import_from_scan(restaurant_id, data, db)