import hashlib
import logging
import random
import string
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import os

import resend

from app.models.restaurant import Restaurant, OnboardingStatus, RestaurantStatus
from app.schemas.restaurant import SignupRequest, LoginRequest, AuthResponse
from fastapi import HTTPException

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@bluqq.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

resend.api_key = RESEND_API_KEY

# ✅ Suppress noisy passlib/bcrypt version warning
logging.getLogger("passlib").setLevel(logging.ERROR)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ✅ SHA256 pre-hash to keep password under 72 bytes for bcrypt
def hash_password_sha256(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ✅ Verify password
def verify_password(plain: str, hashed: str) -> bool:
    hashed_plain = hash_password_sha256(plain)[:72]
    return pwd_context.verify(hashed_plain, hashed)


# ✅ Hash password
def get_password_hash(password: str) -> str:
    hashed = hash_password_sha256(password)[:72]
    return pwd_context.hash(hashed)


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


# ✅ Generate 6-digit OTP
def generate_verification_code() -> str:
    return ''.join(random.choices(string.digits, k=6))


# ✅ Send verification email via Resend
def send_verification_email(to_email: str, restaurant_name: str, code: str) -> bool:
    try:
        resend.Emails.send({
            "from": f"Bluqq <{FROM_EMAIL}>",
            "to": [to_email],
            "subject": "Verify your Bluqq account",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 32px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #FF6B35;">Welcome to Bluqq! 🍽️</h2>
                    <p style="font-size: 15px; color: #333;">Hi <strong>{restaurant_name}</strong>,</p>
                    <p style="font-size: 15px; color: #333;">Use the code below to verify your email address. It expires in <strong>15 minutes</strong>.</p>
                    <div style="font-size: 40px; font-weight: bold; letter-spacing: 10px;
                                color: #FF6B35; text-align: center; padding: 24px 0;">
                        {code}
                    </div>
                    <p style="font-size: 13px; color: #999;">If you didn't create a Bluqq account, you can safely ignore this email.</p>
                </div>
            """
        })
        return True
    except Exception as e:
        logging.error(f"Resend email failed: {e}")
        return False


# ✅ SIGNUP — saves restaurant, sends OTP, does NOT return token yet
def signup(db: Session, data: SignupRequest) -> dict:
    existing = db.query(Restaurant).filter(Restaurant.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    code = generate_verification_code()
    expires = datetime.utcnow() + timedelta(minutes=15)

    restaurant = Restaurant(
        name=data.name,
        owner_name=data.owner_name,
        email=data.email,
        phone=data.phone,
        city=data.city,
        business_type=data.business_type,
        password_hash=get_password_hash(data.password),
        status=RestaurantStatus.inactive,
        onboarding_status=OnboardingStatus.started,
        email_verified=False,
        verification_code=code,
        verification_code_expires=expires,
    )

    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)

    # ✅ Rollback if email fails — prevents ghost accounts
    email_sent = send_verification_email(restaurant.email, restaurant.name, code)
    if not email_sent:
        db.delete(restaurant)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification email. Please try again."
        )

    return {
        "message": "Signup successful. Please check your email for the verification code.",
        "restaurant_id": restaurant.id
    }


# ✅ VERIFY EMAIL — checks OTP, marks verified, returns JWT token
def verify_email(db: Session, email: str, code: str) -> AuthResponse:
    restaurant = db.query(Restaurant).filter(Restaurant.email == email).first()

    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    if restaurant.email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")
    if restaurant.verification_code != code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    if datetime.utcnow() > restaurant.verification_code_expires:
        raise HTTPException(status_code=400, detail="Verification code has expired")

    # ✅ Mark verified & clear OTP fields
    restaurant.email_verified = True
    restaurant.verification_code = None
    restaurant.verification_code_expires = None
    db.commit()
    db.refresh(restaurant)

    token = create_access_token({"sub": restaurant.id, "email": restaurant.email})
    return AuthResponse(access_token=token, restaurant_id=restaurant.id)


# ✅ RESEND VERIFICATION CODE
def resend_verification_code(db: Session, email: str) -> dict:
    restaurant = db.query(Restaurant).filter(Restaurant.email == email).first()

    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    if restaurant.email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    code = generate_verification_code()
    expires = datetime.utcnow() + timedelta(minutes=15)

    restaurant.verification_code = code
    restaurant.verification_code_expires = expires
    db.commit()

    send_verification_email(restaurant.email, restaurant.name, code)

    return {"message": "A new verification code has been sent to your email."}


# ✅ LOGIN — blocks unverified users
def login(db: Session, data: LoginRequest) -> AuthResponse:
    restaurant = db.query(Restaurant).filter(Restaurant.email == data.email).first()

    if not restaurant or not verify_password(data.password, restaurant.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not restaurant.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

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