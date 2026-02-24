"""Main FastAPI application."""
from patches import ensure_memory_broker_support

ensure_memory_broker_support()

from datetime import datetime
from typing import Dict, Any, List, Optional

import logging
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
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
from fastapi_payments.db.repositories.subscription_repository import SubscriptionRepository
from fastapi_payments.db.repositories.payment_repository import PaymentRepository

from config import get_payment_config
from schemas import (
    CustomerCreate, CustomerResponse,
    PaymentMethodCreate, PaymentMethodResponse,
    PaymentCreate, PaymentResponse,
    ProductCreate, ProductResponse,
    PlanCreate, PlanResponse,
    SubscriptionCreate, SubscriptionResponse,
    ProviderLinkResponse,
    SITransactionRequest, PreDebitNotifyRequest,
)

from schemas import CustomerUpdate
from dependencies import get_current_user

# Create FastAPI application
app = FastAPI(
    title="FastAPI Payments Demo",
    description="API for payment processing with FastAPI Payments",
    version="0.1.0",
)

logger = logging.getLogger(__name__)

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

PROVIDER_CAPABILITIES = {
    "stripe": {
        "display_name": "Stripe",
        "supports_payment_methods": True,
        "supports_hosted_payments": False,
    },
    "payu": {
        "display_name": "PayU",
        "supports_payment_methods": False,
        "supports_hosted_payments": True,
    },
    "cashfree": {
        "display_name": "Cashfree",
        "supports_payment_methods": False,
        "supports_hosted_payments": True,
    },
    "razorpay": {
        "display_name": "Razorpay",
        "supports_payment_methods": False,
        # Razorpay uses Checkout JS (embedded modal) rather than a full-page redirect.
        # The frontend receives checkout_config in the subscription/payment response
        # and opens the modal directly \u2014 no redirect needed.
        "supports_hosted_payments": False,
        "supports_checkout_js": True,
    },
}


def _provider_catalog() -> Dict[str, Any]:
    providers = []
    for name in payments_config.providers.keys():
        metadata = PROVIDER_CAPABILITIES.get(name, {})
        providers.append(
            {
                "name": name,
                "display_name": metadata.get("display_name", name.title()),
                "supports_payment_methods": metadata.get("supports_payment_methods", False),
                "supports_hosted_payments": metadata.get("supports_hosted_payments", False),
                "is_default": name == payments_config.default_provider,
            }
        )

    return {"default_provider": payments_config.default_provider, "providers": providers}

# Include payment routes
app.include_router(
    payment_routes.router,
    tags=["payments"]
)

# Serialization helpers -------------------------------------------------------


def _ensure_timestamp(value: Optional[str]) -> str:
    return value or datetime.utcnow().isoformat()


def _customer_payload(customer: Dict[str, Any]) -> Dict[str, Any]:
    provider_links = customer.get("provider_customers") or []
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
        "provider_customer_id": customer.get("provider_customer_id"),
        "provider_customers": [
            {
                "provider": link.get("provider"),
                "provider_customer_id": link.get("provider_customer_id"),
            }
            for link in provider_links
            if link
        ],
    }


def _payment_method_payload(method: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": method["id"],
        "type": method.get("type", "card"),
        "card": method.get("card"),
        "created_at": _ensure_timestamp(method.get("created_at")),
        "mandate_id": method.get("mandate_id"),
        "provider": method.get("provider"),
        "is_default": method.get("is_default", False),
    }


def _product_payload(product: Dict[str, Any]) -> Dict[str, Any]:
    meta_info = product.get("meta_info") or product.get("metadata") or {}
    return {
        "id": product["id"],
        "name": product.get("name"),
        "description": product.get("description"),
        "active": product.get("active", True),
        "created_at": _ensure_timestamp(product.get("created_at")),
        "meta_info": meta_info,
        "provider_product_id": product.get("provider_product_id"),
        "provider": product.get("provider"),
    }


def _plan_payload(plan: Dict[str, Any]) -> Dict[str, Any]:
    meta_info = plan.get("meta_info") or plan.get("metadata") or {}
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
        "meta_info": meta_info,
    }


def _subscription_payload(subscription: Dict[str, Any]) -> Dict[str, Any]:
    metadata = (
        subscription.get("meta_info")
        or subscription.get("provider_data")
        or subscription.get("metadata")
        or {}
    )
    
    # Extract redirect info from various providers
    redirect_info = metadata.get("redirect")
    redirect_url = None
    if redirect_info:
        redirect_url = redirect_info.get("action_url")
    
    # Razorpay: prefer Checkout JS over the hosted short_url redirect.
    # checkout_config is bubbled up to the top level for easy front-end access.
    checkout_config = metadata.get("checkout_config")

    # Only fall back to short_url redirect when there is no checkout_config
    # (i.e. Razorpay Checkout JS is not available).
    if not checkout_config:
        if not redirect_url and metadata.get("short_url"):
            redirect_url = metadata.get("short_url")
        if not redirect_url and metadata.get("auth_link"):
            redirect_url = metadata.get("auth_link")

    mandate_token = metadata.get("mandate_token") or subscription.get("provider_subscription_id", "")

    # Determine if mandate token should be returned (provider-specific prefixes)
    should_show_mandate = (
        mandate_token.startswith("payu") or
        mandate_token.startswith("sub_")  # Razorpay subscription IDs start with sub_
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
        "meta_info": metadata,
        "checkout_config": checkout_config,  # Razorpay Checkout JS options dict
        "redirect_url": redirect_url,
        "mandate_token": mandate_token if should_show_mandate else None,
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
        "meta_info": metadata,
        "checkout_config": metadata.get("checkout_config"),  # Razorpay Checkout JS options dict
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


@app.get("/providers")
async def list_providers():
    """Return configured payment providers and their capabilities."""
    return _provider_catalog()


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global handler to log unexpected exceptions with full trace and return
    a safe 500 to clients while avoiding leaking implementation details.
    """
    logger.exception("Unhandled exception during request %s %s", request.method, request.url)
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


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
        # Log the full traceback to help debug unexpected 500s
        logger.exception("Unexpected error listing payment methods for %s (provider=%s)", customer_id, provider)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/customers", response_model=CustomerResponse)
async def create_customer(
    customer: CustomerCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Create a new customer via the payment service."""
    try:
        # Extract provider from meta_info if provided
        provider = None
        if customer.meta_info:
            provider = customer.meta_info.get("provider")
            logger.info(f"Customer creation: extracted provider={provider} from meta_info")
        
        logger.info(f"Customer creation: final provider={provider}")
        
        created = await payment_service.create_customer(
            email=customer.email,
            name=customer.name,
            meta_info=customer.meta_info,
            address=customer.address,
            provider=provider,
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


@app.post(
    "/customers/{customer_id}/providers/{provider}",
    response_model=ProviderLinkResponse,
)
async def link_customer_provider(
    customer_id: str,
    provider: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Register a customer with an additional provider."""
    try:
        result = await payment_service.ensure_provider_customer(customer_id, provider)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
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
        payload = payment_method.model_dump(exclude_none=True)
        provider = payload.pop("provider", None)
        created = await payment_service.create_payment_method(
            customer_id=customer_id,
            payment_details=payload,
            provider=provider,
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
    provider: Optional[str] = Query(None, description="Provider to create the setup intent for"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Create a provider-specific SetupIntent for saving payment methods
    (used by the client to run 3DS and confirm a card in regions like India).
    Returns a JSON object with `id` and `client_secret`.
    """
    try:
        result = await payment_service.create_setup_intent(customer_id, provider=provider, usage=usage)
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
            provider=payment.provider,
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
        logger.info("=== CREATE PRODUCT ENDPOINT CALLED ===")
        logger.info(f"Raw product data: {product.dict()}")
        # Extract provider from meta_info if provided
        provider = None
        if product.meta_info:
            provider = product.meta_info.get("provider")
            logger.info(f"Extracted provider from meta_info: {provider}")
        
        logger.info(f"Final provider to use: {provider}")
        
        created = await payment_service.create_product(
            name=product.name,
            description=product.description,
            meta_info=product.meta_info,
            provider=provider,
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
        # Extract provider from metadata if provided
        provider = None
        if plan.meta_info:
            provider = plan.meta_info.get("provider")
        
        created = await payment_service.create_plan(
            product_id=product_id,
            name=plan.name,
            pricing_model=plan.pricing_model,
            amount=plan.amount,
            description=plan.description,
            currency=plan.currency,
            billing_interval=plan.billing_interval,
            billing_interval_count=plan.billing_interval_count,
            meta_info=plan.meta_info,
            provider=provider,
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
    print(f"[BACKEND] create_subscription endpoint called with provider={subscription.provider}")
    print(f"[BACKEND] meta_info from request: {subscription.meta_info}")
    
    try:
        # Pass provider if specified, otherwise will use plan's default provider
        meta_info = subscription.meta_info or {}
        if subscription.provider:
            meta_info["provider"] = subscription.provider
        
        print(f"[BACKEND] Calling payment_service.create_subscription with meta_info: {meta_info}")
        
        created = await payment_service.create_subscription(
            customer_id=customer_id,
            plan_id=subscription.plan_id,
            quantity=subscription.quantity,
            trial_period_days=subscription.trial_period_days,
            meta_info=meta_info,
        )
        
        print(f"[BACKEND] Received subscription response with meta_info keys: {list((created.get('meta_info') or {}).keys())}")
        if created.get('meta_info', {}).get('redirect'):
            print(f"[BACKEND] REDIRECT INFO PRESENT: {created['meta_info']['redirect'].get('action_url')}")
        else:
            print(f"[BACKEND] WARNING: NO REDIRECT INFO in response")
        
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


# ---------------------------------------------------------------------------
# Razorpay-specific routes
# ---------------------------------------------------------------------------
from pydantic import BaseModel as _BaseModel


class RazorpayVerifyPaymentRequest(_BaseModel):
    """Payload from Razorpay Checkout JS handler after a successful payment."""

    razorpay_payment_id: str
    razorpay_order_id: Optional[str] = None           # present for one-time orders
    razorpay_subscription_id: Optional[str] = None    # present for subscriptions
    razorpay_signature: str
    # Our internal DB IDs — used to mark the record as active/completed after verification.
    subscription_id: Optional[str] = None             # internal DB subscription.id
    payment_id: Optional[str] = None                  # internal DB payment.id


@app.post("/razorpay/verify-payment")
async def razorpay_verify_payment(
    request: RazorpayVerifyPaymentRequest,
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Verify the Razorpay payment signature that the frontend sends after checkout.

    Call this from the Razorpay Checkout JS ``handler`` callback.
    Returns ``{\"verified\": true}`` on success or raises HTTP 400 on failure.
    """
    try:
        provider = payment_service.get_provider("razorpay")
        provider.verify_payment_signature(
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_order_id=request.razorpay_order_id,
            razorpay_subscription_id=request.razorpay_subscription_id,
            razorpay_signature=request.razorpay_signature,
        )

        # ── Mark subscription active ────────────────────────────────────────
        if request.subscription_id:
            sub_repo = SubscriptionRepository(payment_service.db_session)
            updated = await sub_repo.update(request.subscription_id, status="active")
            if updated:
                sub_dict = {
                    "id": updated.id,
                    "customer_id": updated.customer_id,
                    "plan_id": updated.plan_id,
                    "status": updated.status,
                    "quantity": updated.quantity or 1,
                    "current_period_start": updated.current_period_start,
                    "current_period_end": updated.current_period_end,
                    "cancel_at_period_end": updated.cancel_at_period_end or False,
                    "created_at": updated.created_at,
                    "meta_info": updated.meta_info,
                }
                return {"verified": True, "subscription": _subscription_payload(sub_dict)}

        # ── Mark payment completed ──────────────────────────────────────────
        if request.payment_id:
            pay_repo = PaymentRepository(payment_service.db_session)
            updated_pay = await pay_repo.update(request.payment_id, status="COMPLETED")
            if updated_pay:
                pay_dict = {
                    "id": updated_pay.id,
                    "customer_id": updated_pay.customer_id,
                    "amount": updated_pay.amount,
                    "currency": updated_pay.currency,
                    "status": updated_pay.status,
                    "payment_method": updated_pay.payment_method,
                    "created_at": updated_pay.created_at,
                    "meta_info": updated_pay.meta_info,
                }
                return {"verified": True, "payment": _payment_payload(pay_dict)}

        return {"verified": True}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Razorpay signature verification error")
        raise HTTPException(status_code=500, detail=str(exc))


# PayU SI-specific routes
from schemas import SITransactionRequest, PreDebitNotifyRequest


@app.post("/payu/si-transaction")
async def payu_si_transaction(
    request: SITransactionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Execute a PayU SI (Standing Instruction) recurring payment transaction."""
    try:
        provider = payment_service.get_provider("payu")
        if not hasattr(provider, "si_transaction"):
            raise HTTPException(status_code=400, detail="SI transactions not supported by provider")
        
        result = await provider.si_transaction(
            mandate_token=request.mandate_token,
            amount=request.amount,
            txnid=request.txnid,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/payu/pre-debit-notify")
async def payu_pre_debit_notify(
    request: PreDebitNotifyRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    payment_service: PaymentService = Depends(get_payment_service_with_db),
):
    """Send PayU pre-debit notification to customer (RBI compliance)."""
    try:
        provider = payment_service.get_provider("payu")
        if not hasattr(provider, "pre_debit_notify"):
            raise HTTPException(status_code=400, detail="Pre-debit notifications not supported by provider")
        
        result = await provider.pre_debit_notify(
            mandate_token=request.mandate_token,
            amount=request.amount,
            debit_date=request.debit_date,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)