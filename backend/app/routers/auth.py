from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.restaurant import SignupRequest, LoginRequest, AuthResponse, RestaurantResponse
from app.services import auth_service
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
security = HTTPBearer()


def get_current(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    return auth_service.get_current_restaurant(db, credentials.credentials)


@router.post("/signup", response_model=AuthResponse)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    return auth_service.signup(db, data)


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(db, data)


@router.get("/me", response_model=RestaurantResponse)
def me(current=Depends(get_current)):
    return current
