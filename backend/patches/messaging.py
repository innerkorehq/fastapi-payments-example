"""Runtime patches for messaging integrations used by the example backend."""
from __future__ import annotations

import logging
from typing import Callable

from fastapi_payments.messaging import publishers as payment_publishers

logger = logging.getLogger("fastapi_payments_example.patches")

_patch_applied: bool = False


def ensure_memory_broker_support() -> None:
    """Force PaymentEventPublisher to honor the in-memory broker setting."""
    global _patch_applied
    if _patch_applied:
        return

    original_initialize: Callable = (
        payment_publishers.PaymentEventPublisher._initialize_broker  # type: ignore[attr-defined]
    )

    def _patched_initialize(self):  # type: ignore[no-untyped-def]
        broker_type = str(getattr(self.config, "broker_type", "redis")).lower()
        if broker_type == "memory":
            logger.info(
                "Patched PaymentEventPublisher to use the in-memory broker as requested."
            )
            return payment_publishers.InMemoryBroker()
        return original_initialize(self)

    payment_publishers.PaymentEventPublisher._initialize_broker = _patched_initialize  # type: ignore[assignment]
    _patch_applied = True
