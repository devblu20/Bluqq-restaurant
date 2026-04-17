from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.restaurant import SignupRequest, LoginRequest, AuthResponse, RestaurantResponse, VerifyEmailRequest, ResendVerificationRequest
from app.services import auth_service
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
security = HTTPBearer()


def get_current(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    return auth_service.get_current_restaurant(db, credentials.credentials)


# ✅ SIGNUP — returns message + restaurant_id (no token yet)
@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    return auth_service.signup(db, data)


# ✅ VERIFY EMAIL — submit OTP, returns JWT token on success
@router.post("/verify-email", response_model=AuthResponse)
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    return auth_service.verify_email(db, data.email, data.code)


# ✅ RESEND VERIFICATION CODE
@router.post("/resend-verification")
def resend_verification(data: ResendVerificationRequest, db: Session = Depends(get_db)):
    return auth_service.resend_verification_code(db, data.email)


# ✅ LOGIN — blocked if email not verified
@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(db, data)


# ✅ GET CURRENT USER
@router.get("/me", response_model=RestaurantResponse)
def me(current=Depends(get_current)):
    return current