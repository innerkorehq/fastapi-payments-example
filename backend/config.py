"""Configuration settings for the payment API."""
import os
from typing import Dict, Any

def get_stripe_config() -> Dict[str, Any]:
    """Get Stripe configuration from environment variables."""
    return {
        "api_key": os.getenv("STRIPE_API_KEY", "sk_test_your_test_key"),
        "webhook_secret": os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_your_webhook_secret"),
        "sandbox_mode": os.getenv("PAYMENT_SANDBOX_MODE", "true").lower() == "true"
    }

def get_payment_config() -> Dict[str, Any]:
    """Get the full payment configuration."""
    return {
        "providers": {
            "stripe": get_stripe_config()
        },
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
        "default_provider": "stripe",
        "logging_level": os.getenv("LOGGING_LEVEL", "INFO"),
        "debug_mode": os.getenv("DEBUG", "false").lower() == "true"
    }