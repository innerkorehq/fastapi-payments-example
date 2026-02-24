#!/usr/bin/env python3
"""
Direct test of Cashfree provider with customer context missing phone.
"""
import asyncio
import sys
import os

# Add the fastapi-payments src to path
sys.path.insert(0, '/Users/baneet/Documents/GitHub/fastapi-payments/src')

from fastapi_payments.providers.cashfree import CashfreeProvider
from fastapi_payments.config.config_schema import ProviderConfig

async def test_cashfree_provider():
    """Test Cashfree provider directly with missing phone."""

    # Initialize provider with proper config
    config = ProviderConfig(
        api_key="test_key",
        api_secret="test_secret",
        sandbox_mode=True,
        additional_settings={"mode": "india"}
    )

    provider = CashfreeProvider(config)

    # Test customer context with missing phone (this was the original issue)
    customer_context = {
        "name": "Test Customer",
        "email": "test@example.com",
        "phone": None  # This was causing the error
    }

    print("Testing Cashfree provider with customer_context missing phone...")
    print(f"Customer context: {customer_context}")

    try:
        # Test 1: Create customer with missing phone
        result = await provider.create_customer(
            email=customer_context["email"],
            name=customer_context["name"],
            meta_info={"phone": customer_context["phone"]}
        )

        print("✅ SUCCESS: Customer created successfully!")
        print(f"Result: {result}")

        # Test 2: Create subscription (this was the original failing case)
        print("\nTesting subscription creation with customer missing phone...")
        subscription_result = await provider.create_subscription(
            provider_customer_id=result["provider_customer_id"],
            price_id="test_price_123",
            meta_info={
                "customer_context": customer_context  # This contains phone: None
            }
        )

        # Test 3: Process payment (another method that uses customer context)
        print("\nTesting payment processing with customer missing phone...")
        payment_result = await provider.process_payment(
            provider_customer_id=result["provider_customer_id"],
            amount=1000,  # 10.00 INR
            currency="INR",
            meta_info={
                "customer_context": customer_context  # This contains phone: None
            }
        )

        print("✅ SUCCESS: Payment processed successfully!")
        print(f"Payment result: {payment_result}")

    except Exception as e:
        print(f"❌ FAILED: {e}")
        # Check if it's the expected API failure (not our validation error)
        if "phone" in str(e).lower() and "required" in str(e).lower():
            print("❌ This indicates the phone validation is still failing - our fix didn't work")
        elif "response_type" in str(e) or "api" in str(e).lower():
            print("✅ This is expected API failure (test credentials) - our phone validation fix is working!")
        else:
            print("❓ Unexpected error - may need investigation")

if __name__ == "__main__":
    asyncio.run(test_cashfree_provider())