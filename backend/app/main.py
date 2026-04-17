from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, restaurants, menu, whatsapp

# IMPORTANT: models import BEFORE create_all
from app import models

# ✅ Create app
app = FastAPI(title="Restaurant Onboarding API", version="1.0.0")


# ✅ CORS Middleware (FIXED)
origins = [
    "https://www.bluqq.com",
    "https://bluqq.com",
    "https://bluqq-restaurant.vercel.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ Safe DB connection
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
app.include_router(whatsapp.router, tags=["WhatsApp"])


# ✅ Root route
@app.get("/")
def root():
    return {"message": "Restaurant Onboarding API is running 🚀"}


# ✅ TEST ROUTE (CORS DEBUG)
@app.get("/test-cors")
def test_cors():
    return {"message": "CORS is working ✅"}