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
