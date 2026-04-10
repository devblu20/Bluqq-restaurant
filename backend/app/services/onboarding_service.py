from sqlalchemy.orm import Session
from app.models.menu import OnboardingEvent


def log_event(db: Session, restaurant_id: str, step_key: str, event_type: str, note: str = None):
    event = OnboardingEvent(
        restaurant_id=restaurant_id,
        step_key=step_key,
        event_type=event_type,
        note=note,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_events(db: Session, restaurant_id: str):
    return db.query(OnboardingEvent).filter(
        OnboardingEvent.restaurant_id == restaurant_id
    ).order_by(OnboardingEvent.created_at).all()
