from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, restaurants, menu

# IMPORTANT: models import BEFORE create_all
from app import models  

app = FastAPI(title="Restaurant Onboarding API", version="1.0.0")


# ✅ CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://bluqq-restaurant.vercel.app",  # ✅ correct spelling
        "http://localhost:3000",                # optional (for local dev)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ Safe DB connection (NO CRASH)
@app.on_event("startup")
def startup():
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database connected & tables verified")
    except Exception as e:
        print("❌ Database error:", e)


# ✅ Routes
app.include_router(auth.router, prefix="/restaurant/auth", tags=["Auth"])
app.include_router(restaurants.router, prefix="/restaurants", tags=["Restaurants"])
app.include_router(menu.router, prefix="/restaurants", tags=["Menu"])


# ✅ Root route (IMPORTANT for Railway)
@app.get("/")
def root():
    return {"message": "Restaurant Onboarding API is running 🚀"}