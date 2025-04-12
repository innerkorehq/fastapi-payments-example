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

# Additional routes would be added for:
# - Payment methods
# - Payments
# - Products and plans
# - Subscriptions
# - Webhooks

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)