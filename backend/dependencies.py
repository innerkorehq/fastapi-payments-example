"""Dependencies for the payment API."""
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

from fastapi_payments.config.config_schema import PaymentConfig
from config import get_payment_config as get_config_dict  # Renamed import to avoid recursion

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

def get_payment_config() -> PaymentConfig:
    """Get payment configuration as a PaymentConfig object."""
    # Use the imported function from config.py instead of calling self
    return PaymentConfig(**get_config_dict())

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get the authenticated user from the token."""
    # This is a simplified example. In a real application,
    # you would validate the token and retrieve the user
    # from a database or authentication service.
    if not token:
        return None
    return {"id": "user_123", "email": "demo@example.com"}