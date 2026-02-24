#!/usr/bin/env python3
"""
Test script to verify PayU subscription creation flow and check for redirect info.
This will help diagnose if the issue is in the library or the configuration.
"""

import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from fastapi_payments.services.payment_service import PaymentService
from fastapi_payments.providers.payu import PayUProvider
from fastapi_payments.config.config_schema import ProviderConfig

DATABASE_URL = "sqlite+aiosqlite:///./test_subscriptions.db"


async def test_payu_subscription():
    """Test PayU subscription creation and verify redirect data is returned."""
    
    # Create database engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Initialize payment service with PayU provider
        payu_config = ProviderConfig(
            provider_name="payu",
            api_key="test_merchant_key",
            api_secret="test_salt",
            sandbox_mode=True,
            additional_settings={
                "salt": "test_salt",
            }
        )
        payu_provider = PayUProvider(config=payu_config)
        
        payment_service = PaymentService(providers={"payu": payu_provider})
        payment_service.set_db_session(session)
        
        print("\n" + "="*80)
        print("STEP 1: Creating a plan with PayU provider")
        print("="*80)
        
        try:
            # Create a plan with PayU provider
            plan = await payment_service.create_plan(
                name="PayU Test Plan",
                amount=999.0,
                currency="INR",
                interval="month",
                interval_count=1,
                provider="payu",  # THIS IS CRITICAL - Plan must have provider set!
            )
            print(f"✅ Plan created: {plan['id']}")
            print(f"   Provider: {plan.get('provider')}")
            print(f"   Meta info: {plan.get('meta_info')}")
        except Exception as e:
            print(f"❌ Failed to create plan: {e}")
            return
        
        print("\n" + "="*80)
        print("STEP 2: Creating a customer")
        print("="*80)
        
        try:
            customer = await payment_service.create_customer(
                email="test@example.com",
                name="Test Customer",
            )
            print(f"✅ Customer created: {customer['id']}")
        except Exception as e:
            print(f"❌ Failed to create customer: {e}")
            return
        
        print("\n" + "="*80)
        print("STEP 3: Creating subscription with PayU-specific metadata")
        print("="*80)
        
        # Calculate SI start date (tomorrow)
        si_start = (datetime.now() + timedelta(days=1)).strftime("%d-%m-%Y")
        
        meta_info = {
            "provider": "payu",  # Override provider (should use plan's provider)
            "amount": 999.0,
            "description": "Monthly Subscription",
            "customer_context": {
                "name": "Test Customer",
                "email": "test@example.com",
                "phone": "9999999999",
            },
            "payu": {
                "firstname": "Test",
                "email": "test@example.com",
                "phone": "9999999999",
                "productinfo": "Monthly Subscription",
                "si_start_date": si_start,
                "si_period": "monthly",
                "si_cycles": "12",
                "surl": "http://localhost:3000/payu/success",
                "furl": "http://localhost:3000/payu/failure",
            }
        }
        
        print(f"Meta info being sent:")
        print(f"  - provider: {meta_info.get('provider')}")
        print(f"  - si_start_date: {si_start}")
        print(f"  - amount: {meta_info.get('amount')}")
        
        try:
            subscription = await payment_service.create_subscription(
                customer_id=customer["id"],
                plan_id=plan["id"],
                quantity=1,
                meta_info=meta_info,
            )
            
            print(f"\n✅ Subscription created: {subscription['id']}")
            print(f"   Status: {subscription.get('status')}")
            print(f"   Provider: {subscription.get('provider')}")
            print(f"   Provider Subscription ID: {subscription.get('provider_subscription_id')}")
            
            print("\n" + "="*80)
            print("STEP 4: Checking meta_info for redirect data")
            print("="*80)
            
            meta_info_response = subscription.get("meta_info", {})
            print(f"Meta info keys in response: {list(meta_info_response.keys())}")
            
            if "redirect" in meta_info_response:
                redirect = meta_info_response["redirect"]
                print(f"\n✅ REDIRECT DATA FOUND!")
                print(f"   Action URL: {redirect.get('action_url')}")
                print(f"   Method: {redirect.get('method')}")
                print(f"   Fields count: {len(redirect.get('fields', {}))}")
                
                # Show some key fields
                fields = redirect.get('fields', {})
                print(f"\n   Key fields:")
                print(f"     - txnid: {fields.get('txnid')}")
                print(f"     - amount: {fields.get('amount')}")
                print(f"     - si: {fields.get('si')}")
                print(f"     - si_start_date: {fields.get('si_start_date')}")
                print(f"     - hash present: {'hash' in fields}")
                
                print("\n" + "="*80)
                print("✅ SUCCESS: Redirect data is properly returned!")
                print("="*80)
                print("\nThe library is working correctly. If frontend still doesn't redirect,")
                print("check the following:")
                print("1. Frontend is receiving this response")
                print("2. Frontend is checking subscription.metadata.redirect")
                print("3. Browser console shows the redirect URL")
                print("4. No JavaScript errors preventing form submission")
                
            else:
                print("\n❌ REDIRECT DATA NOT FOUND!")
                print("\nThis is the problem. The subscription was created but redirect info is missing.")
                print("\nDebugging information:")
                print(f"  Full meta_info: {meta_info_response}")
                
                if "provider_data" in meta_info_response:
                    provider_data = meta_info_response.get("provider_data", {})
                    print(f"\n  Provider data keys: {list(provider_data.keys())}")
                    if "meta_info" in provider_data:
                        print(f"  Provider meta_info keys: {list(provider_data['meta_info'].keys())}")
                
        except Exception as e:
            print(f"\n❌ Failed to create subscription: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    print("PayU Subscription Flow Test")
    print("="*80)
    asyncio.run(test_payu_subscription())
