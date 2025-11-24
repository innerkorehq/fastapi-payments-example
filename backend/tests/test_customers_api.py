import json
from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_create_and_update_customer_address():
    # Create customer
    payload = {
        "email": "api.test@example.com",
        "name": "API Test",
        "address": {"line1": "100 Road St", "city": "Kolkata", "country": "IN", "postal_code": "700001"}
    }
    resp = client.post("/customers", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    customer_id = data["id"]

    # Update only address
    update_payload = {"address": {"line1": "200 Updated Rd", "city": "Bangalore", "country": "IN", "postal_code": "560001"}}
    upd = client.patch(f"/customers/{customer_id}", json=update_payload)
    assert upd.status_code == 200
    updated = upd.json()

    assert updated["address"]["line1"] == "200 Updated Rd"
    assert updated["address"]["city"] == "Bangalore"
