from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.restaurant import Restaurant, OnboardingStatus
from app.models.menu import RestaurantProfile, RestaurantOrderSettings
from app.schemas.restaurant import (
    RestaurantUpdate, ProfileCreate, ProfileUpdate,
    OrderSettingsCreate, OrderSettingsUpdate,
    OnboardingStatusResponse, StepStatus,
)


def get_restaurant(db: Session, restaurant_id: str) -> Restaurant:
    r = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return r


def update_restaurant(db: Session, restaurant_id: str, data: RestaurantUpdate) -> Restaurant:
    r = get_restaurant(db, restaurant_id)
    for field, value in data.dict(exclude_unset=True).items():
        setattr(r, field, value)
    
    if r.onboarding_status == OnboardingStatus.started:
        r.onboarding_status = OnboardingStatus.basic_info_completed
        
    db.commit()
    db.refresh(r)
    return r


def create_or_update_profile(db: Session, restaurant_id: str, data: ProfileCreate) -> RestaurantProfile:
    get_restaurant(db, restaurant_id)
    profile = db.query(RestaurantProfile).filter(RestaurantProfile.restaurant_id == restaurant_id).first()
    if profile:
        for field, value in data.dict(exclude_unset=True).items():
            setattr(profile, field, value)
    else:
        profile = RestaurantProfile(restaurant_id=restaurant_id, **data.dict())
        db.add(profile)

    r = get_restaurant(db, restaurant_id)
    if r.onboarding_status in [OnboardingStatus.started, OnboardingStatus.basic_info_completed]:
        r.onboarding_status = OnboardingStatus.operations_completed

    db.commit()
    db.refresh(profile)
    return profile

# --- Order Settings Services ---

def get_order_settings(db: Session, restaurant_id: str) -> RestaurantOrderSettings:
    """Is function ki wajah se error aa raha tha (AttributeError)"""
    settings = db.query(RestaurantOrderSettings).filter(
        RestaurantOrderSettings.restaurant_id == restaurant_id
    ).first()
    
    if not settings:
        # Agar settings nahi hai, toh empty object bhejte hain taaki frontend crash na ho
        # Note: Frontend default values use kar lega
        return None
    return settings


def create_or_update_order_settings(db: Session, restaurant_id: str, data: OrderSettingsCreate) -> RestaurantOrderSettings:
    get_restaurant(db, restaurant_id)
    settings = db.query(RestaurantOrderSettings).filter(RestaurantOrderSettings.restaurant_id == restaurant_id).first()
    
    if settings:
        for field, value in data.dict(exclude_unset=True).items():
            setattr(settings, field, value)
    else:
        settings = RestaurantOrderSettings(restaurant_id=restaurant_id, **data.dict())
        db.add(settings)

    r = get_restaurant(db, restaurant_id)
    statuses_before_launch = [
        OnboardingStatus.started,
        OnboardingStatus.basic_info_completed,
        OnboardingStatus.operations_completed,
        OnboardingStatus.menu_completed,
    ]
    if r.onboarding_status in statuses_before_launch:
        r.onboarding_status = OnboardingStatus.ordering_settings_completed

    db.commit()
    db.refresh(settings)
    return settings


def get_onboarding_status(db: Session, restaurant_id: str) -> OnboardingStatusResponse:
    r = get_restaurant(db, restaurant_id)
    profile = db.query(RestaurantProfile).filter(RestaurantProfile.restaurant_id == restaurant_id).first()
    settings = db.query(RestaurantOrderSettings).filter(RestaurantOrderSettings.restaurant_id == restaurant_id).first()

    from app.models.menu import MenuItem, MenuUpload
    has_menu_items = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id).count() > 0
    has_menu_upload = db.query(MenuUpload).filter(MenuUpload.restaurant_id == restaurant_id).count() > 0

    basic_done = r.onboarding_status not in [OnboardingStatus.started]
    ops_done = profile is not None
    menu_done = has_menu_items or has_menu_upload
    settings_done = settings is not None

    steps = [
        StepStatus(key="basic_info", completed=basic_done),
        StepStatus(key="operations", completed=ops_done),
        StepStatus(key="menu_setup", completed=menu_done),
        StepStatus(key="ordering_settings", completed=settings_done),
    ]

    completed_count = sum(1 for s in steps if s.completed)
    completion_percent = int((completed_count / len(steps)) * 100)
    
    # Ready tabhi hoga jab 3 main cheezein ho jayein
    ready = basic_done and menu_done and settings_done

    if ready and r.onboarding_status != OnboardingStatus.ready_for_launch:
        r.onboarding_status = OnboardingStatus.ready_for_launch
        db.commit()

    current_step = "basic_info"
    for s in steps:
        if not s.completed:
            current_step = s.key
            break

    return OnboardingStatusResponse(
        restaurant_id=restaurant_id,
        completion_percent=completion_percent,
        current_step=current_step,
        steps=steps,
        ready_for_launch=ready,
    )