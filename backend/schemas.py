"""Pydantic schemas for the API."""
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


# Customer schemas
class CustomerCreate(BaseModel):
    """Schema for customer creation."""
    email: str
    name: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    meta_info: Optional[Dict[str, Any]] = None


class CustomerUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    meta_info: Optional[Dict[str, Any]] = None


class ProviderCustomer(BaseModel):
    provider: str
    provider_customer_id: str


class CustomerResponse(BaseModel):
    """Schema for customer response."""

    id: str
    email: str
    name: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    meta_info: Optional[Dict[str, Any]] = None
    address: Optional[Dict[str, Any]] = None
    provider_customer_id: Optional[str] = None
    provider_customers: Optional[List[ProviderCustomer]] = None


class ProviderLinkResponse(BaseModel):
    provider: str
    provider_customer_id: str


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
    payment_method_id: Optional[str] = None  # For existing payment method attachment
    setup_intent_id: Optional[str] = None
    mandate_id: Optional[str] = None
    set_default: bool = False
    provider: Optional[str] = None


class PaymentMethodResponse(BaseModel):
    """Schema for payment method response."""

    id: str
    type: str
    card: Optional[Dict[str, Any]] = None
    created_at: str
    is_default: Optional[bool] = False
    provider: Optional[str] = None
    mandate_id: Optional[str] = None


# Product schemas
class ProductCreate(BaseModel):
    """Schema for product creation."""
    name: str
    description: Optional[str] = None
    meta_info: Optional[Dict[str, Any]] = None


class ProductResponse(BaseModel):
    """Schema for product response."""

    id: str
    name: str
    description: Optional[str] = None
    active: bool
    created_at: str
    meta_info: Optional[Dict[str, Any]] = None
    provider_product_id: Optional[str] = None
    provider: Optional[str] = None


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
    meta_info: Optional[Dict[str, Any]] = None


class PlanResponse(BaseModel):
    """Schema for plan response."""

    id: str
    product_id: str
    name: str
    description: Optional[str] = None
    pricing_model: str
    amount: float
    currency: str
    billing_interval: Optional[str] = None
    billing_interval_count: Optional[int] = None
    created_at: str
    meta_info: Optional[Dict[str, Any]] = None
    provider: Optional[str] = None
    provider_price_id: Optional[str] = None


# Subscription schemas
class SubscriptionCreate(BaseModel):
    """Schema for subscription creation."""
    plan_id: str
    quantity: int = 1
    trial_period_days: Optional[int] = None
    meta_info: Optional[Dict[str, Any]] = None
    provider: Optional[str] = None  # Specify provider for subscription
    
    # PayU-specific SI fields (passed in metadata['payu'] typically)
    # These are documented here for reference but passed via metadata


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
    meta_info: Optional[Dict[str, Any]] = None
    provider_subscription_id: Optional[str] = None
    provider: Optional[str] = None
    checkout_config: Optional[Dict[str, Any]] = None  # Razorpay Checkout JS options dict
    redirect_url: Optional[str] = None  # For PayU hosted checkout redirect
    mandate_token: Optional[str] = None  # For PayU SI mandate token


# Payment schemas
class PaymentCreate(BaseModel):
    """Schema for payment creation."""
    amount: float
    currency: str = "USD"
    payment_method_id: Optional[str] = None
    mandate_id: Optional[str] = None
    description: Optional[str] = None
    customer_id: Optional[str] = None
    meta_info: Optional[Dict[str, Any]] = None
    provider: Optional[str] = None


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
    meta_info: Optional[Dict[str, Any]] = None
    provider: Optional[str] = None
    provider_payment_id: Optional[str] = None
    refunded_amount: Optional[float] = None
    checkout_config: Optional[Dict[str, Any]] = None  # Razorpay Checkout JS options dict


# PayU SI (Standing Instruction) schemas
class SITransactionRequest(BaseModel):
    """Schema for PayU SI transaction request."""
    mandate_token: str
    amount: float
    txnid: Optional[str] = None


class PreDebitNotifyRequest(BaseModel):
    """Schema for PayU pre-debit notification."""
    mandate_token: str
    amount: float
    debit_date: str  # Format: dd-MM-yyyy


# Webhook schemas
class WebhookEvent(BaseModel):
    """Schema for webhook events."""
    id: str
    type: str
    data: Dict[str, Any]
    created_at: str