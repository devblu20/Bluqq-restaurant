# backend/app/routers/restaurants.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.routers.auth import get_current
from app.schemas.restaurant import (
    RestaurantResponse, RestaurantUpdate,
    ProfileCreate, ProfileResponse,
    OrderSettingsCreate, OrderSettingsResponse,
    OnboardingStatusResponse,
)
from app.services import restaurant_service

router = APIRouter()

# --- Existing Endpoints ---
@router.get("/{restaurant_id}", response_model=RestaurantResponse)
def get_restaurant(restaurant_id: str, db: Session = Depends(get_db), current=Depends(get_current)):
    return restaurant_service.get_restaurant(db, restaurant_id)

@router.patch("/{restaurant_id}", response_model=RestaurantResponse)
def update_restaurant(restaurant_id: str, data: RestaurantUpdate, db: Session = Depends(get_db), current=Depends(get_current)):
    return restaurant_service.update_restaurant(db, restaurant_id, data)

# --- Order Settings (FETCH/GET) ---
# YE WALA MISSING THA JISKI WAJAH SE REDIRECT HO RAHA THA
@router.get("/{restaurant_id}/order-settings", response_model=OrderSettingsResponse)
def get_order_settings(restaurant_id: str, db: Session = Depends(get_db), current=Depends(get_current)):
    return restaurant_service.get_order_settings(db, restaurant_id)

@router.post("/{restaurant_id}/order-settings", response_model=OrderSettingsResponse)
def create_order_settings(restaurant_id: str, data: OrderSettingsCreate, db: Session = Depends(get_db), current=Depends(get_current)):
    return restaurant_service.create_or_update_order_settings(db, restaurant_id, data)

@router.patch("/{restaurant_id}/order-settings", response_model=OrderSettingsResponse)
def update_order_settings(restaurant_id: str, data: OrderSettingsCreate, db: Session = Depends(get_db), current=Depends(get_current)):
    return restaurant_service.create_or_update_order_settings(db, restaurant_id, data)

# --- Profile ---
@router.post("/{restaurant_id}/profile", response_model=ProfileResponse)
def create_profile(restaurant_id: str, data: ProfileCreate, db: Session = Depends(get_db), current=Depends(get_current)):
    return restaurant_service.create_or_update_profile(db, restaurant_id, data)

@router.get("/{restaurant_id}/onboarding-status", response_model=OnboardingStatusResponse)
def onboarding_status(restaurant_id: str, db: Session = Depends(get_db), current=Depends(get_current)):
    return restaurant_service.get_onboarding_status(db, restaurant_id)