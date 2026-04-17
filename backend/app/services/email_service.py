import resend
import os
import random
import string
from datetime import datetime, timedelta

resend.api_key = os.getenv("RESEND_API_KEY")

def generate_verification_code() -> str:
    """Generate a 6-digit OTP code"""
    return ''.join(random.choices(string.digits, k=6))

def get_code_expiry() -> datetime:
    """Code expires in 15 minutes"""
    return datetime.utcnow() + timedelta(minutes=15)

def send_verification_email(to_email: str, restaurant_name: str, code: str) -> bool:
    try:
        resend.Emails.send({
            "from": "Bluqq <noreply@yourdomain.com>",  # ← your verified domain
            "to": [to_email],
            "subject": "Verify your Bluqq account",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
                    <h2>Welcome to Bluqq, {restaurant_name}! 🍽️</h2>
                    <p>Use the code below to verify your email address:</p>
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; 
                                color: #FF6B35; text-align: center; padding: 20px;">
                        {code}
                    </div>
                    <p style="color: #888;">This code expires in 15 minutes.</p>
                    <p>If you didn't create a Bluqq account, ignore this email.</p>
                </div>
            """
        })
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False