"""Configuration settings for the payment API."""
import os
from typing import Dict, Any

from dotenv import load_dotenv

# Load environment variables from a .env file if present
load_dotenv()

def get_stripe_config() -> Dict[str, Any]:
    """Get Stripe configuration from environment variables."""
    return {
        "api_key": os.getenv("STRIPE_API_KEY", "sk_test_your_test_key"),
        "webhook_secret": os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_your_webhook_secret"),
        "sandbox_mode": os.getenv("PAYMENT_SANDBOX_MODE", "true").lower() == "true"
    }


def get_payu_config() -> Dict[str, Any]:
    """Get PayU configuration from environment variables."""
    return {
        "api_key": os.getenv("PAYU_API_KEY", "your_payu_merchant_key"),
        "api_secret": os.getenv("PAYU_API_SECRET", "your_payu_merchant_salt"),
        "sandbox_mode": os.getenv("PAYU_SANDBOX_MODE", "true").lower() == "true",
        "additional_settings": {
            "hosted_checkout_url": os.getenv(
                "PAYU_HOSTED_CHECKOUT_URL", "https://test.payu.in/_payment"
            ),
            "verify_payment_url": os.getenv(
                "PAYU_VERIFY_PAYMENT_URL", "https://test.payu.in/merchant/postservice.php?form=2"
            ),
                # Callback URLs are intentionally left to be derived from the
                # top-level configuration so they can be standardized across
                # providers. Individual env vars may still override these but
                # we avoid hard-coding localhost paths here.
                "success_url": os.getenv("PAYU_SUCCESS_URL"),
                "failure_url": os.getenv("PAYU_FAILURE_URL"),
                "cancel_url": os.getenv("PAYU_CANCEL_URL"),
        },
    }


def get_cashfree_config() -> Dict[str, Any]:
    """Get Cashfree configuration from environment variables."""
    return {
        "api_key": os.getenv("CASHFREE_CLIENT_ID", "your_cashfree_client_id"),
        "api_secret": os.getenv("CASHFREE_CLIENT_SECRET", "your_cashfree_client_secret"),
        "sandbox_mode": os.getenv("CASHFREE_SANDBOX_MODE", "true").lower() == "true",
        "additional_settings": {
            "collection_mode": os.getenv("CASHFREE_COLLECTION_MODE", "india"),
            "api_version": os.getenv("CASHFREE_API_VERSION", "2023-08-01"),
            # Callback URLs are intentionally left to be derived from the
            # top-level configuration so they can be standardized across
            # providers. Individual env vars may still override these but
            # we avoid hard-coding localhost paths here.
            "return_url": os.getenv("CASHFREE_RETURN_URL"),
            "notify_url": os.getenv("CASHFREE_NOTIFY_URL"),
        },
    }


def get_razorpay_config() -> Dict[str, Any]:
    """Get Razorpay configuration from environment variables."""
    return {
        "api_key": os.getenv("RAZORPAY_KEY_ID", "your_razorpay_key_id"),
        "api_secret": os.getenv("RAZORPAY_KEY_SECRET", "your_razorpay_key_secret"),
        "webhook_secret": os.getenv("RAZORPAY_WEBHOOK_SECRET"),
        "sandbox_mode": os.getenv("RAZORPAY_SANDBOX_MODE", "true").lower() == "true",
        "additional_settings": {
            "default_currency": os.getenv("RAZORPAY_DEFAULT_CURRENCY", "INR"),
            # Callback URLs are intentionally left to be derived from the
            # top-level configuration so they can be standardized across
            # providers. Individual env vars may still override these but
            # we avoid hard-coding localhost paths here.
            "return_url": os.getenv("RAZORPAY_RETURN_URL"),
            "notify_url": os.getenv("RAZORPAY_NOTIFY_URL"),
        },
    }


def get_payment_config() -> Dict[str, Any]:
    """Get the full payment configuration."""
    providers: Dict[str, Any] = {}

    stripe_config = get_stripe_config()
    if stripe_config.get("api_key"):
        providers["stripe"] = stripe_config

    payu_key = os.getenv("PAYU_API_KEY")
    payu_secret = os.getenv("PAYU_API_SECRET")
    if payu_key and payu_secret:
        providers["payu"] = get_payu_config()

    cashfree_id = os.getenv("CASHFREE_CLIENT_ID")
    cashfree_secret = os.getenv("CASHFREE_CLIENT_SECRET")
    if cashfree_id and cashfree_secret:
        providers["cashfree"] = get_cashfree_config()

    razorpay_key = os.getenv("RAZORPAY_KEY_ID")
    razorpay_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if razorpay_key and razorpay_secret:
        providers["razorpay"] = get_razorpay_config()

    if not providers:
        providers["stripe"] = stripe_config

    default_provider = os.getenv("DEFAULT_PAYMENT_PROVIDER", "stripe").lower()
    if default_provider not in providers:
        default_provider = next(iter(providers))

    # Build canonical frontend base URL (default to localhost:3000 used by the example UI)
    frontend_url = os.getenv("FRONTEND_URL", os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")).rstrip('/')

    # Ensure provider callback URLs follow a standard pattern unless explicitly configured
    for provider_name, provider_cfg in providers.items():
        settings = provider_cfg.setdefault("additional_settings", {})
        # success/failure/cancel defaults should follow /{provider}/{action}
        if not settings.get("success_url"):
            settings["success_url"] = f"{frontend_url}/{provider_name}/success"
        if not settings.get("failure_url"):
            settings["failure_url"] = f"{frontend_url}/{provider_name}/failure"
        if not settings.get("cancel_url"):
            settings["cancel_url"] = f"{frontend_url}/{provider_name}/cancel"
        
        # Cashfree uses return_url instead of success_url
        if provider_name == "cashfree":
            if not settings.get("return_url"):
                settings["return_url"] = settings["success_url"]
            # Notify URL defaults to backend webhook endpoint
            if not settings.get("notify_url"):
                backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
                settings["notify_url"] = f"{backend_url}/api/webhooks/{provider_name}"

        # Razorpay uses return_url for redirects and notify_url for webhooks
        if provider_name == "razorpay":
            if not settings.get("return_url"):
                settings["return_url"] = settings["success_url"]
            # Notify URL defaults to backend webhook endpoint
            if not settings.get("notify_url"):
                backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
                settings["notify_url"] = f"{backend_url}/api/webhooks/{provider_name}"

    return {
        "providers": providers,
        "database": {
            "url": os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./payments.db"),
            "echo": os.getenv("DB_ECHO", "false").lower() == "true"
        },
        "messaging": {
            "broker_type": os.getenv("MESSAGE_BROKER_TYPE", "memory"),
            "url": os.getenv("MESSAGE_BROKER_URL", "memory://"),
            "exchange_name": "payments",
            "queue_prefix": "payment_"
        },
        "default_provider": default_provider,
        "logging_level": os.getenv("LOGGING_LEVEL", "INFO"),
        "debug_mode": os.getenv("DEBUG", "false").lower() == "true"
    }