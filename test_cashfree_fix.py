#!/usr/bin/env python3
"""
Test script to verify Cashfree subscription creation works without phone number.
"""
import asyncio
import httpx
import json

async def test_cashfree_subscription():
    """Test creating a Cashfree subscription for a customer without phone number."""

    # First, create a customer without phone
    customer_data = {
        "email": "test@example.com",
        "name": "Test Customer"
        # Note: no phone provided in meta_info
    }

    try:
        async with httpx.AsyncClient() as client:
            # Create customer
            print("Creating customer without phone...")
            customer_response = await client.post(
                "http://localhost:8000/customers",
                json=customer_data,
                timeout=30.0
            )

            if customer_response.status_code != 200:
                print(f"❌ Failed to create customer: {customer_response.status_code} - {customer_response.text}")
                return

            customer = customer_response.json()
            customer_id = customer["id"]
            print(f"✅ Customer created with ID: {customer_id}")

            # Create a product first (required for plan)
            product_data = {
                "name": "Test Product",
                "description": "Test product for Cashfree subscription",
                "meta_info": {
                    "provider": "cashfree"
                }
            }

            print("Creating product...")
            product_response = await client.post(
                "http://localhost:8000/products",
                json=product_data,
                timeout=30.0
            )

            if product_response.status_code != 200:
                print(f"❌ Failed to create product: {product_response.status_code} - {product_response.text}")
                return

            product = product_response.json()
            product_id = product["id"]
            print(f"✅ Product created with ID: {product_id}")

            # Create a plan for the product
            plan_data = {
                "name": "Test Plan",
                "amount": 1000,  # Amount in paisa (₹10.00)
                "currency": "INR",
                "interval": "month",
                "interval_count": 1,
                "meta_info": {
                    "provider": "cashfree"
                }
            }

            print("Creating plan...")
            plan_response = await client.post(
                f"http://localhost:8000/products/{product_id}/plans",
                json=plan_data,
                timeout=30.0
            )

            if plan_response.status_code != 200:
                print(f"❌ Failed to create plan: {plan_response.status_code} - {plan_response.text}")
                return

            plan = plan_response.json()
            plan_id = plan["id"]
            print(f"✅ Plan created with ID: {plan_id}")

            # Now create subscription
            subscription_data = {
                "plan_id": plan_id,
                "provider": "cashfree"
            }

            print("Creating subscription...")
            subscription_response = await client.post(
                f"http://localhost:8000/customers/{customer_id}/subscriptions",
                json=subscription_data,
                timeout=30.0
            )

            print(f"Status Code: {subscription_response.status_code}")
            print(f"Response: {subscription_response.text}")

            if subscription_response.status_code == 200:
                data = subscription_response.json()
                print("✅ SUCCESS: Subscription created successfully!")
                print(f"Subscription ID: {data.get('id')}")
                print(f"Provider Subscription ID: {data.get('provider_subscription_id')}")
            else:
                print("❌ FAILED: Subscription creation failed")
                if subscription_response.status_code == 400:
                    error_data = subscription_response.json()
                    if "phone" in str(error_data).lower():
                        print("This was the original error we were trying to fix!")

    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    print("Testing Cashfree subscription creation for customer without phone number...")
    asyncio.run(test_cashfree_subscription())