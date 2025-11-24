"""Main FastAPI application."""
from patches import ensure_memory_broker_support

ensure_memory_broker_support()

from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Fix the import - routes might be in a different location
from fastapi_payments import FastAPIPayments
from fastapi_payments.api import routes as payment_routes  # Updated import path
from fastapi_payments.api.dependencies import (
    get_payment_service_with_db,
    initialize_dependencies,
)
from fastapi_payments.config.config_schema import PaymentConfig
from fastapi_payments.services.payment_service import PaymentService

from config import get_payment_config
from schemas import (
    CustomerCreate, CustomerResponse, 
    PaymentMethodCreate, PaymentMethodResponse,
    PaymentCreate, PaymentResponse,
    ProductCreate, ProductResponse,
    PlanCreate, PlanResponse,
    SubscriptionCreate, SubscriptionResponse
)

from schemas import CustomerUpdate
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
initialize_dependencies(payments_config)

# Include payment routes
app.include_router(
    payment_routes.router,
    prefix="/api/payments",
    tags=["payments"]
)

# Serialization helpers -------------------------------------------------------


def _ensure_timestamp(value: Optional[str]) -> str:
    return value or datetime.utcnow().isoformat()


def _customer_payload(customer: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": customer["id"],
        "email": customer.get("email"),
        "name": customer.get("name"),
        "created_at": _ensure_timestamp(customer.get("created_at")),
        "metadata": customer.get("meta_info") or customer.get("metadata"),
        "address": (
            customer.get("address")
            or (customer.get("meta_info") or {}).get("address")
            or (customer.get("metadata") or {}).get("address")
        ),
    }


def _payment_method_payload(method: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": method["id"],
        "type": method.get("type", "card"),
        "card": method.get("card"),
        "created_at": _ensure_timestamp(method.get("created_at")),
        "mandate_id": method.get("mandate_id"),
    }


def _product_payload(product: Dict[str, Any]) -> Dict[str, Any]:
    metadata = product.get("meta_info") or product.get("metadata") or {}
    return {
        "id": product["id"],
        "name": product.get("name"),
        "description": product.get("description"),
        "active": product.get("active", True),
        "created_at": _ensure_timestamp(product.get("created_at")),
        "metadata": metadata,
    }


def _plan_payload(plan: Dict[str, Any]) -> Dict[str, Any]:
    metadata = plan.get("meta_info") or plan.get("metadata") or {}
    return {
        "id": plan["id"],
        "product_id": plan.get("product_id"),
        "name": plan.get("name"),
        "description": plan.get("description"),
        "pricing_model": plan.get("pricing_model"),
        "amount": plan.get("amount"),
        "currency": plan.get("currency"),
        "billing_interval": plan.get("billing_interval") or "",
        "billing_interval_count": plan.get("billing_interval_count") or 1,
        "created_at": _ensure_timestamp(plan.get("created_at")),
        "metadata": metadata,
    }


def _subscription_payload(subscription: Dict[str, Any]) -> Dict[str, Any]:
    metadata = (
        subscription.get("meta_info")
        or subscription.get("provider_data")
        or subscription.get("metadata")
        or {}
    )
    return {
        "id": subscription["id"],
        "customer_id": subscription.get("customer_id"),
        "plan_id": subscription.get("plan_id"),
        "status": subscription.get("status"),
        "quantity": subscription.get("quantity", 1),
        "current_period_start": subscription.get("current_period_start"),
        "current_period_end": subscription.get("current_period_end"),
        "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        "created_at": _ensure_timestamp(subscription.get("created_at")),
        "metadata": metadata,
    }


def _payment_payload(payment: Dict[str, Any]) -> Dict[str, Any]:
    metadata = payment.get("meta_info") or payment.get("metadata") or {}
    return {
        "id": payment["id"],
        "amount": payment.get("amount"),
        "currency": payment.get("currency"),
        "status": payment.get("status"),
        "description": metadata.get("description"),
        "customer_id": payment.get("customer_id"),
        "payment_method_id": payment.get("payment_method"),
        "created_at": _ensure_timestamp(payment.get("created_at")),
        "metadata": metadata,
    }


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
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, description="Filter by name or email"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """List customers stored in the payments database."""
    try:
        customers = await payment_service.list_customers(
            limit=limit, offset=offset, search=search
        )
        return [_customer_payload(customer) for customer in customers]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/customers", response_model=CustomerResponse)
async def create_customer(
    customer: CustomerCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Create a new customer via the payment service."""
    try:
        created = await payment_service.create_customer(
            email=customer.email,
            name=customer.name,
            meta_info=customer.metadata,
            address=customer.address,
        )
        return _customer_payload(created)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Return a single customer."""
    try:
        customer = await payment_service.get_customer(customer_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return _customer_payload(customer)


@app.patch("/customers/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer_update: CustomerUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Update an existing customer (partial update)."""
    try:
        # Do not duplicate address into meta_info – store address in the
        # dedicated address column and pass the provided metadata through.
        updated = await payment_service.update_customer(
            customer_id,
            email=customer_update.email,
            name=customer_update.name,
            meta_info=customer_update.metadata,
            address=customer_update.address,
        )
        return _customer_payload(updated)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get(
    "/customers/{customer_id}/payment-methods",
    response_model=List[PaymentMethodResponse],
)
async def list_payment_methods(
    customer_id: str,
    provider: Optional[str] = Query(None, description="Filter by provider"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """List payment methods for the given customer."""
    try:
        methods = await payment_service.list_payment_methods(
            customer_id=customer_id, provider=provider
        )
        return [_payment_method_payload(method) for method in methods]
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post(
    "/customers/{customer_id}/payment-methods",
    response_model=PaymentMethodResponse,
)
async def create_payment_method(
    customer_id: str,
    payment_method: PaymentMethodCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Attach a new payment method to a customer."""
    try:
        created = await payment_service.create_payment_method(
            customer_id=customer_id,
            payment_details=payment_method.model_dump(exclude_none=True),
        )
        return _payment_method_payload(created)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@app.post("/customers/{customer_id}/payment-methods/setup-intent")
async def create_setup_intent(
    customer_id: str,
    usage: Optional[str] = Query(None, description="Optional usage for the setup intent (e.g., 'off_session')."),
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Create a provider-specific SetupIntent for saving payment methods
    (used by the client to run 3DS and confirm a card in regions like India).
    Returns a JSON object with `id` and `client_secret`.
    """
    try:
        result = await payment_service.create_setup_intent(customer_id, usage=usage)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# Payment routes
@app.get("/payments", response_model=List[PaymentResponse])
async def list_payments(
    customer_id: Optional[str] = Query(None, description="Filter by customer"),
    status: Optional[str] = Query(None, description="Filter by payment status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """List processed payments from the service."""
    try:
        payments = await payment_service.list_payments(
            customer_id=customer_id, status=status, limit=limit, offset=offset
        )
        return [_payment_payload(payment) for payment in payments]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/payments", response_model=PaymentResponse)
async def create_payment(
    payment: PaymentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Create a one-time charge via the payment provider."""
    if not payment.customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required")
    try:
        processed = await payment_service.process_payment(
            customer_id=payment.customer_id,
            amount=payment.amount,
            currency=payment.currency,
            payment_method_id=payment.payment_method_id,
            mandate_id=getattr(payment, 'mandate_id', None),
            description=payment.description,
            meta_info=payment.metadata,
        )
        return _payment_payload(processed)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# Product routes
@app.get("/products", response_model=List[ProductResponse])
async def list_products(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """List products stored in the payments catalog."""
    try:
        products = await payment_service.list_products(limit=limit, offset=offset)
        return [_product_payload(product) for product in products]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/products", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Create a new product across provider + local DB."""
    try:
        created = await payment_service.create_product(
            name=product.name,
            description=product.description,
            meta_info=product.metadata,
        )
        return _product_payload(created)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# Plan routes
@app.get("/products/{product_id}/plans", response_model=List[PlanResponse])
async def list_plans(
    product_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """List plans for a specific product."""
    try:
        plans = await payment_service.list_plans(
            product_id=product_id, limit=limit, offset=offset
        )
        return [_plan_payload(plan) for plan in plans]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/products/{product_id}/plans", response_model=PlanResponse)
async def create_plan(
    product_id: str,
    plan: PlanCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Create pricing for an existing product."""
    try:
        created = await payment_service.create_plan(
            product_id=product_id,
            name=plan.name,
            pricing_model=plan.pricing_model,
            amount=plan.amount,
            description=plan.description,
            currency=plan.currency,
            billing_interval=plan.billing_interval,
            billing_interval_count=plan.billing_interval_count,
            meta_info=plan.metadata,
        )
        return _plan_payload(created)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# Subscription routes
@app.get("/subscriptions", response_model=List[SubscriptionResponse])
async def list_subscriptions(
    customer_id: Optional[str] = Query(None, description="Filter by customer"),
    status: Optional[str] = Query(None, description="Filter by subscription status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Return subscriptions from the catalog."""
    try:
        subscriptions = await payment_service.list_subscriptions(
            customer_id=customer_id, status=status, limit=limit, offset=offset
        )
        return [_subscription_payload(subscription) for subscription in subscriptions]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get(
    "/customers/{customer_id}/subscriptions",
    response_model=List[SubscriptionResponse],
)
async def list_customer_subscriptions(
    customer_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Return subscriptions for a single customer."""
    try:
        subscriptions = await payment_service.list_subscriptions(
            customer_id=customer_id, limit=limit, offset=offset
        )
        return [_subscription_payload(subscription) for subscription in subscriptions]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/customers/{customer_id}/subscriptions", response_model=SubscriptionResponse)
async def create_subscription(
    customer_id: str,
    subscription: SubscriptionCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Create a subscription using an existing plan."""
    try:
        created = await payment_service.create_subscription(
            customer_id=customer_id,
            plan_id=subscription.plan_id,
            quantity=subscription.quantity,
            trial_period_days=subscription.trial_period_days,
            meta_info=subscription.metadata,
        )
        return _subscription_payload(created)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/subscriptions/{subscription_id}/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    subscription_id: str,
    cancel_at_period_end: bool = Query(True, description="Cancel at period end"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Cancel an active subscription."""
    try:
        canceled = await payment_service.cancel_subscription(
            subscription_id=subscription_id,
            cancel_at_period_end=cancel_at_period_end,
        )
        return _subscription_payload(canceled)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Return a single subscription by id."""
    try:
        subscription = await payment_service.get_subscription(subscription_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    return _subscription_payload(subscription)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)