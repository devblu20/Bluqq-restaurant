from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os
# BusinessType ko yahan se hata diya hai kyunki model ab String use kar raha hai
from app.models.restaurant import Restaurant, OnboardingStatus, RestaurantStatus
from app.schemas.restaurant import SignupRequest, LoginRequest, AuthResponse
from fastapi import HTTPException, status

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def signup(db: Session, data: SignupRequest) -> AuthResponse:
    existing = db.query(Restaurant).filter(Restaurant.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # business_type ab seedha data.business_type se string lega
    restaurant = Restaurant(
        name=data.name,
        owner_name=data.owner_name,
        email=data.email,
        phone=data.phone,
        city=data.city,
        business_type=data.business_type,
        password_hash=hash_password(data.password),
        status=RestaurantStatus.inactive,
        onboarding_status=OnboardingStatus.started,
    )
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)

    token = create_access_token({"sub": restaurant.id, "email": restaurant.email})
    return AuthResponse(access_token=token, restaurant_id=restaurant.id)


def login(db: Session, data: LoginRequest) -> AuthResponse:
    restaurant = db.query(Restaurant).filter(Restaurant.email == data.email).first()
    
    if not restaurant or not verify_password(data.password, restaurant.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": restaurant.id, "email": restaurant.email})
    return AuthResponse(access_token=token, restaurant_id=restaurant.id)


def get_current_restaurant(db: Session, token: str) -> Restaurant:
    payload = decode_token(token)
    restaurant_id = payload.get("sub")
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant