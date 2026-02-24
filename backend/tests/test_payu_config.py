import os

from config import get_payment_config


def test_payu_present_in_config():
    cfg = get_payment_config()
    assert "providers" in cfg
    assert "payu" in cfg["providers"], "PayU provider should be in payment config"


def test_payu_defaults():
    # Ensure sensible default keys exist even if env vars are absent
    cfg = get_payment_config()
    payu = cfg["providers"]["payu"]
    assert "api_key" in payu
    assert "api_secret" in payu
    # Additional settings should be a dict
    assert isinstance(payu.get("additional_settings", {}), dict)

    # Default callback URLs should follow the standardized /{provider}/{action}
    frontend_default = os.getenv("FRONTEND_URL", os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")).rstrip('/')
    assert payu["additional_settings"]["success_url"].startswith(frontend_default)
    assert payu["additional_settings"]["success_url"].endswith("/payu/success")
    assert payu["additional_settings"]["failure_url"].endswith("/payu/failure")
    assert payu["additional_settings"]["cancel_url"].endswith("/payu/cancel")


def test_frontend_url_env_overrides():
    # Ensure FRONTEND_URL env var, when set, controls the callback base
    os.environ["FRONTEND_URL"] = "https://example.test/app"
    # Ensure provider-specific overrides do not mask the frontend URL default
    os.environ.pop("PAYU_SUCCESS_URL", None)
    os.environ.pop("PAYU_FAILURE_URL", None)
    os.environ.pop("PAYU_CANCEL_URL", None)
    cfg = get_payment_config()
    payu = cfg["providers"]["payu"]
    assert payu["additional_settings"]["success_url"].startswith("https://example.test/app")
    # Clean up environment change
    os.environ.pop("FRONTEND_URL", None)
