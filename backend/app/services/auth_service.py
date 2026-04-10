import hashlib
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os

from app.models.restaurant import Restaurant, OnboardingStatus, RestaurantStatus
from app.schemas.restaurant import SignupRequest, LoginRequest, AuthResponse
from fastapi import HTTPException

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ✅ STEP 1: SHA256 helper (IMPORTANT)
def hash_password_sha256(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ✅ STEP 2: Hash password (FIXED)
def get_password_hash(password):
    hashed = hash_password_sha256(password)
    return pwd_context.hash(hashed)


# ✅ STEP 3: Verify password (FIXED)
def verify_password(plain, hashed):
    hashed_plain = hash_password_sha256(plain)
    return pwd_context.verify(hashed_plain, hashed)


# ✅ JWT token create
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ✅ Decode token
def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ✅ SIGNUP
def signup(db: Session, data: SignupRequest) -> AuthResponse:
    existing = db.query(Restaurant).filter(Restaurant.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    restaurant = Restaurant(
        name=data.name,
        owner_name=data.owner_name,
        email=data.email,
        phone=data.phone,
        city=data.city,
        business_type=data.business_type,
        password_hash=get_password_hash(data.password),  # ✅ FIXED
        status=RestaurantStatus.inactive,
        onboarding_status=OnboardingStatus.started,
    )

    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)

    token = create_access_token({"sub": restaurant.id, "email": restaurant.email})
    return AuthResponse(access_token=token, restaurant_id=restaurant.id)


# ✅ LOGIN
def login(db: Session, data: LoginRequest) -> AuthResponse:
    restaurant = db.query(Restaurant).filter(Restaurant.email == data.email).first()

    if not restaurant or not verify_password(data.password, restaurant.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": restaurant.id, "email": restaurant.email})
    return AuthResponse(access_token=token, restaurant_id=restaurant.id)


# ✅ GET CURRENT USER
def get_current_restaurant(db: Session, token: str) -> Restaurant:
    payload = decode_token(token)
    restaurant_id = payload.get("sub")

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    return restaurant