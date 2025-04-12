"""Pydantic schemas for the API."""
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


# Customer schemas
class CustomerCreate(BaseModel):
    """Schema for customer creation."""
    email: str
    name: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CustomerResponse(BaseModel):
    """Schema for customer response."""
    id: str
    email: str
    name: Optional[str] = None
    created_at: str
    metadata: Optional[Dict[str, Any]] = None


# Payment method schemas
class CardDetails(BaseModel):
    """Schema for card details."""
    number: str
    exp_month: int
    exp_year: int
    cvc: str


class PaymentMethodCreate(BaseModel):
    """Schema for payment method creation."""
    type: str = "card"
    card: Optional[CardDetails] = None
    token: Optional[str] = None  # For token-based creation
    set_default: bool = False


class PaymentMethodResponse(BaseModel):
    """Schema for payment method response."""
    id: str
    type: str
    card: Optional[Dict[str, Any]] = None
    created_at: str


# Product schemas
class ProductCreate(BaseModel):
    """Schema for product creation."""
    name: str
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ProductResponse(BaseModel):
    """Schema for product response."""
    id: str
    name: str
    description: Optional[str] = None
    active: bool
    created_at: str
    metadata: Optional[Dict[str, Any]] = None


# Plan schemas
class PlanCreate(BaseModel):
    """Schema for plan creation."""
    name: str
    description: Optional[str] = None
    pricing_model: str = "subscription"  # subscription, per_user, tiered, etc.
    amount: float
    currency: str = "USD"
    billing_interval: str  # day, week, month, year
    billing_interval_count: int = 1
    metadata: Optional[Dict[str, Any]] = None


class PlanResponse(BaseModel):
    """Schema for plan response."""
    id: str
    product_id: str
    name: str
    description: Optional[str] = None
    pricing_model: str
    amount: float
    currency: str
    billing_interval: str
    billing_interval_count: int
    created_at: str
    metadata: Optional[Dict[str, Any]] = None


# Subscription schemas
class SubscriptionCreate(BaseModel):
    """Schema for subscription creation."""
    plan_id: str
    quantity: int = 1
    trial_period_days: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class SubscriptionResponse(BaseModel):
    """Schema for subscription response."""
    id: str
    customer_id: str
    plan_id: str
    status: str
    quantity: int
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    cancel_at_period_end: bool = False
    created_at: str
    metadata: Optional[Dict[str, Any]] = None


# Payment schemas
class PaymentCreate(BaseModel):
    """Schema for payment creation."""
    amount: float
    currency: str = "USD"
    payment_method_id: Optional[str] = None
    description: Optional[str] = None
    customer_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class PaymentResponse(BaseModel):
    """Schema for payment response."""
    id: str
    amount: float
    currency: str
    status: str
    description: Optional[str] = None
    customer_id: Optional[str] = None
    payment_method_id: Optional[str] = None
    created_at: str
    metadata: Optional[Dict[str, Any]] = None


# Webhook schemas
class WebhookEvent(BaseModel):
    """Schema for webhook events."""
    id: str
    type: str
    data: Dict[str, Any]
    created_at: str