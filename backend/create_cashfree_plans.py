import asyncio
from main import app
from fastapi.testclient import TestClient

async def create_cashfree_plans():
    client = TestClient(app)

    # First create a product for Cashfree
    print("Sending request with metadata: {'provider': 'cashfree'}")
    product_response = client.post('/products', json={
        'name': 'Cashfree Subscription Product',
        'description': 'Product for Cashfree subscriptions',
        'metadata': {'provider': 'cashfree'}
    })
    print('Product creation response:', product_response.status_code)
    print('Response JSON:', product_response.json())
    asyncio.run(create_cashfree_plans())