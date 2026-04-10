from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, restaurants, menu
from fastapi.middleware.cors import CORSMiddleware

# IMPORTANT: Import models here so Base knows about the tables
from app import models 

# Database tables create/verify
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified successfully")
except Exception as e:
    print(f"❌ Database error: {e}")

app = FastAPI(title="Restaurant Onboarding API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://bluqg-restaurant.vercel.app",  # frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/restaurant/auth", tags=["Auth"])
app.include_router(restaurants.router, prefix="/restaurants", tags=["Restaurants"])
app.include_router(menu.router, prefix="/restaurants", tags=["Menu"])


@app.get("/")
def root():
    return {"message": "Restaurant Onboarding API is running and CORS is enabled"}