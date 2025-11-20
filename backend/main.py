"""Main FastAPI application."""
import os
from typing import Dict, Any, List

from fastapi import FastAPI, Depends, HTTPException, Header, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

# Fix the import - routes might be in a different location
from fastapi_payments import FastAPIPayments
from fastapi_payments.api import routes as payment_routes  # Updated import path
from fastapi_payments.config.config_schema import PaymentConfig

from config import get_payment_config
from schemas import (
    CustomerCreate, CustomerResponse, 
    PaymentMethodCreate, PaymentMethodResponse,
    PaymentCreate, PaymentResponse,
    ProductCreate, ProductResponse,
    PlanCreate, PlanResponse,
    SubscriptionCreate, SubscriptionResponse
)
from dependencies import get_current_user

# Create FastAPI application
app = FastAPI(
    title="FastAPI Payments Demo",
    description="API for payment processing with FastAPI Payments",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize FastAPI Payments
payments_config = PaymentConfig(**get_payment_config())
payments = FastAPIPayments(payments_config)

# Include payment routes
app.include_router(
    payment_routes.router,
    prefix="/api/payments",
    tags=["payments"]
)

# Create custom routes
@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to FastAPI Payments Demo"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

# Customer routes
@app.get("/customers", response_model=List[CustomerResponse])
async def list_customers(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all customers."""
    try:
        # In a real app, this would query a database
        # For this demo, return mock data
        mock_customers = [
            {
                "id": "cust_123",
                "email": "john@example.com",
                "name": "John Doe",
                "created_at": "2023-01-01T00:00:00Z",
                "metadata": {"source": "demo"}
            },
            {
                "id": "cust_456",
                "email": "jane@example.com",
                "name": "Jane Smith",
                "created_at": "2023-01-02T00:00:00Z",
                "metadata": {"source": "demo"}
            },
        ]
        return mock_customers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/customers", response_model=CustomerResponse)
async def create_customer(
    customer: CustomerCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new customer."""
    try:
        # In a real app, this would call payments.create_customer
        # For this demo, return mock data
        mock_customer = {
            "id": "cust_new",
            "email": customer.email,
            "name": customer.name,
            "created_at": "2023-01-03T00:00:00Z",
            "metadata": customer.metadata or {"source": "demo"}
        }
        return mock_customer
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Additional routes for payment methods
@app.get("/customers/{customer_id}/payment-methods", response_model=List[PaymentMethodResponse])
async def list_payment_methods(
    customer_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all payment methods for a customer."""
    try:
        mock_payment_methods = [
            {
                "id": f"pm_{customer_id}_1",
                "type": "card",
                "card": {
                    "brand": "visa",
                    "last4": "4242",
                    "exp_month": 12,
                    "exp_year": 2025
                },
                "created_at": "2023-01-01T00:00:00Z"
            }
        ]
        return mock_payment_methods
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/customers/{customer_id}/payment-methods", response_model=PaymentMethodResponse)
async def create_payment_method(
    customer_id: str,
    payment_method: PaymentMethodCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a payment method for a customer."""
    try:
        mock_payment_method = {
            "id": f"pm_{customer_id}_new",
            "type": payment_method.type,
            "card": {
                "brand": "visa",
                "last4": "4242",
                "exp_month": 12,
                "exp_year": 2025
            },
            "created_at": "2023-01-03T00:00:00Z"
        }
        return mock_payment_method
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get a specific customer by ID."""
    try:
        mock_customer = {
            "id": customer_id,
            "email": f"customer_{customer_id[:5]}@example.com",
            "name": f"Customer {customer_id[:5]}",
            "created_at": "2023-01-01T00:00:00Z",
            "metadata": {"source": "demo"}
        }
        return mock_customer
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Payment routes
@app.get("/payments", response_model=List[PaymentResponse])
async def list_payments(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all payments."""
    try:
        mock_payments = [
            {
                "id": "pay_123456",
                "amount": 49.99,
                "currency": "USD",
                "status": "succeeded",
                "customer_id": "cust_123",
                "customer_email": "john@example.com",
                "description": "One-time payment",
                "created_at": "2023-01-01T00:00:00Z",
                "metadata": {}
            },
            {
                "id": "pay_123457",
                "amount": 19.99,
                "currency": "USD",
                "status": "succeeded",
                "customer_id": "cust_456",
                "customer_email": "jane@example.com",
                "description": "Product purchase",
                "created_at": "2023-01-02T00:00:00Z",
                "metadata": {}
            }
        ]
        return mock_payments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/payments", response_model=PaymentResponse)
async def create_payment(
    payment: PaymentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a one-time payment."""
    try:
        mock_payment = {
            "id": "pay_new",
            "amount": payment.amount,
            "currency": payment.currency,
            "status": "succeeded",
            "customer_id": payment.customer_id,
            "description": payment.description,
            "payment_method_id": payment.payment_method_id,
            "created_at": "2023-01-03T00:00:00Z",
            "metadata": payment.metadata or {}
        }
        return mock_payment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Product routes
@app.get("/products", response_model=List[ProductResponse])
async def list_products(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all products."""
    try:
        mock_products = [
            {
                "id": "prod_basic",
                "name": "Basic Plan",
                "description": "Basic features for individuals",
                "active": True,
                "created_at": "2023-01-01T00:00:00Z",
                "metadata": {}
            },
            {
                "id": "prod_premium",
                "name": "Premium Plan",
                "description": "Advanced features for professionals",
                "active": True,
                "created_at": "2023-01-01T00:00:00Z",
                "metadata": {}
            }
        ]
        return mock_products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/products", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new product."""
    try:
        mock_product = {
            "id": "prod_new",
            "name": product.name,
            "description": product.description,
            "active": True,
            "created_at": "2023-01-03T00:00:00Z",
            "metadata": product.metadata or {}
        }
        return mock_product
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Plan routes
@app.get("/products/{product_id}/plans", response_model=List[PlanResponse])
async def list_plans(
    product_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all plans for a product."""
    try:
        mock_plans = [
            {
                "id": f"plan_{product_id}_monthly",
                "product_id": product_id,
                "name": "Monthly Plan",
                "description": "Monthly billing",
                "pricing_model": "subscription",
                "amount": 9.99,
                "currency": "USD",
                "billing_interval": "month",
                "billing_interval_count": 1,
                "created_at": "2023-01-01T00:00:00Z",
                "metadata": {}
            }
        ]
        return mock_plans
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/products/{product_id}/plans", response_model=PlanResponse)
async def create_plan(
    product_id: str,
    plan: PlanCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a plan for a product."""
    try:
        mock_plan = {
            "id": f"plan_{product_id}_new",
            "product_id": product_id,
            "name": plan.name,
            "description": plan.description,
            "pricing_model": plan.pricing_model,
            "amount": plan.amount,
            "currency": plan.currency,
            "billing_interval": plan.billing_interval,
            "billing_interval_count": plan.billing_interval_count,
            "created_at": "2023-01-03T00:00:00Z",
            "metadata": plan.metadata or {}
        }
        return mock_plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Subscription routes
@app.get("/subscriptions", response_model=List[SubscriptionResponse])
async def list_subscriptions(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all subscriptions."""
    try:
        from datetime import datetime, timedelta
        now = datetime.now()
        mock_subscriptions = [
            {
                "id": "sub_123",
                "customer_id": "cust_123",
                "plan_id": "plan_basic_monthly",
                "plan_name": "Basic Monthly",
                "status": "active",
                "quantity": 1,
                "current_period_start": now.isoformat(),
                "current_period_end": (now + timedelta(days=30)).isoformat(),
                "cancel_at_period_end": False,
                "created_at": "2023-01-01T00:00:00Z",
                "metadata": {}
            }
        ]
        return mock_subscriptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/customers/{customer_id}/subscriptions", response_model=List[SubscriptionResponse])
async def list_customer_subscriptions(
    customer_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all subscriptions for a customer."""
    try:
        from datetime import datetime, timedelta
        now = datetime.now()
        mock_subscriptions = [
            {
                "id": f"sub_{customer_id}_1",
                "customer_id": customer_id,
                "plan_id": "plan_basic_monthly",
                "plan_name": "Basic Plan",
                "status": "active",
                "quantity": 1,
                "current_period_start": now.isoformat(),
                "current_period_end": (now + timedelta(days=30)).isoformat(),
                "cancel_at_period_end": False,
                "created_at": "2023-01-01T00:00:00Z",
                "metadata": {}
            }
        ]
        return mock_subscriptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/customers/{customer_id}/subscriptions", response_model=SubscriptionResponse)
async def create_subscription(
    customer_id: str,
    subscription: SubscriptionCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a subscription for a customer."""
    try:
        from datetime import datetime, timedelta
        now = datetime.now()
        mock_subscription = {
            "id": f"sub_{customer_id}_new",
            "customer_id": customer_id,
            "plan_id": subscription.plan_id,
            "status": "active",
            "quantity": subscription.quantity,
            "current_period_start": now.isoformat(),
            "current_period_end": (now + timedelta(days=30)).isoformat(),
            "cancel_at_period_end": False,
            "created_at": now.isoformat(),
            "metadata": subscription.metadata or {}
        }
        return mock_subscription
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/subscriptions/{subscription_id}/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    subscription_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Cancel a subscription."""
    try:
        from datetime import datetime, timedelta
        now = datetime.now()
        mock_subscription = {
            "id": subscription_id,
            "customer_id": "cust_123",
            "plan_id": "plan_basic_monthly",
            "status": "active",
            "quantity": 1,
            "current_period_start": now.isoformat(),
            "current_period_end": (now + timedelta(days=30)).isoformat(),
            "cancel_at_period_end": True,
            "created_at": "2023-01-01T00:00:00Z",
            "metadata": {}
        }
        return mock_subscription
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)