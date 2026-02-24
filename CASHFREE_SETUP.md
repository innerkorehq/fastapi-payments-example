# Cashfree Configuration Guide

This guide explains how to configure and use Cashfree payment provider in the fastapi-payments-example project.

## Overview

Cashfree is now configured as a payment provider in this example application. It supports:
- ✅ One-time payments (Order creation and payment processing)
- ✅ Subscription management
- ✅ Payment refunds
- ✅ Webhook notifications
- ✅ Both India and Global collection modes

## Configuration Steps

### 1. Get Cashfree Credentials

1. Sign up at [Cashfree Dashboard](https://merchant.cashfree.com/)
2. Navigate to **Developers → API Keys**
3. Generate test mode credentials:
   - Client ID (x-client-id)
   - Client Secret (x-client-secret)

### 2. Update Environment Variables

Edit `backend/.env` and add your Cashfree credentials:

```env
# Cashfree Payment Gateway
CASHFREE_CLIENT_ID=your_actual_cashfree_client_id
CASHFREE_CLIENT_SECRET=your_actual_cashfree_client_secret
CASHFREE_SANDBOX_MODE=true
CASHFREE_COLLECTION_MODE=india

# Optional: Custom callback URLs (defaults provided)
#CASHFREE_RETURN_URL=http://localhost:3000/cashfree/success
#CASHFREE_NOTIFY_URL=http://localhost:8000/api/webhooks/cashfree
```

### 3. Collection Modes

Choose the appropriate collection mode based on your business:

**India Collections (Default)**
- For all businesses accepting payments from Indian customers
- Supports INR currency
```env
CASHFREE_COLLECTION_MODE=india
```

**Global Collections**
- For Indian businesses accepting international payments
- Supports multiple currencies
```env
CASHFREE_COLLECTION_MODE=global
```

### 4. Start the Application

```bash
# Using Docker Compose (recommended)
docker-compose up --build

# Or manually
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

cd frontend
npm install
npm run dev
```

## Using Cashfree in the UI

### 1. Access Provider Selection

Navigate to http://localhost:3000 and the Cashfree provider will be automatically available in the provider dropdown.

### 2. Create a Customer

1. Go to **Customers** page
2. Fill in customer details (name, email, phone, address are all important for Cashfree)
3. Click "Create Customer"

**Note**: For India-based providers, providing complete customer address is important for regulatory compliance.

### 3. Process a One-Time Payment

1. Go to **Payments** page
2. Select **Cashfree** as the provider
3. Enter payment details:
   - Amount (in INR for India mode)
   - Currency (INR)
   - Customer ID
   - Description
4. Click "Process Payment"

The system will:
- Create a Cashfree order
- Return a payment session ID and order token
- Redirect to Cashfree's checkout page (in a real integration)

### 4. Create a Subscription

1. First, create a **Product** and **Price/Plan**
2. Go to **Subscriptions** → **New Subscription**
3. Select:
   - Customer
   - Price/Plan
   - Quantity
4. Add required metadata:
   - Customer name, email, phone
   - First charge date (YYYY-MM-DD format)
5. Click "Create Subscription"

The system will:
- Create a subscription plan on Cashfree
- Create a subscription
- Return an authorization URL for the customer to complete setup

## API Endpoints

### Process Payment

```bash
POST http://localhost:8000/api/payments/process
Content-Type: application/json

{
  "amount": 100.0,
  "currency": "INR",
  "provider": "cashfree",
  "provider_customer_id": "cashfree_cust_xxx",
  "description": "Test payment",
  "meta_info": {
    "cashfree": {
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "9999999999"
    }
  }
}
```

### Create Subscription

```bash
POST http://localhost:8000/api/subscriptions
Content-Type: application/json

{
  "provider": "cashfree",
  "provider_customer_id": "cashfree_cust_xxx",
  "price_id": "cashfree_price_xxx",
  "quantity": 1,
  "meta_info": {
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "9999999999",
    "cashfree": {
      "first_charge_date": "2024-12-31"
    }
  }
}
```

### Webhook Endpoint

The webhook endpoint is automatically configured at:
```
http://localhost:8000/api/webhooks/cashfree
```

For local testing, you can use [ngrok](https://ngrok.com/) or [localtunnel](https://localtunnel.github.io/www/) to expose your local server:

```bash
# Using ngrok
ngrok http 8000

# Then update CASHFREE_NOTIFY_URL in .env with the ngrok URL
CASHFREE_NOTIFY_URL=https://your-ngrok-id.ngrok.io/api/webhooks/cashfree
```

## Callback URLs

The application automatically sets up callback URLs following this pattern:

- **Success**: `http://localhost:3000/cashfree/success`
- **Failure**: `http://localhost:3000/cashfree/failure`
- **Cancel**: `http://localhost:3000/cashfree/cancel`
- **Webhook**: `http://localhost:8000/api/webhooks/cashfree`

These pages are created dynamically using Next.js dynamic routes at `app/[provider]/[action]/page.tsx`.

## Testing

### Test with Cashfree Sandbox

1. Ensure `CASHFREE_SANDBOX_MODE=true` in your `.env`
2. Use test credentials from Cashfree dashboard
3. Test payment flows without real money

### Test Cards (Cashfree Sandbox)

Use Cashfree's test cards for various scenarios:
- **Success**: Use any valid test card from Cashfree docs
- **Failure**: Use specific test cards that trigger failures
- Refer to [Cashfree Testing Documentation](https://www.cashfree.com/docs/payments/testing)

## Important Notes

### Required Customer Fields

For Cashfree payments, the following fields are **required**:
- Customer name
- Customer email
- Customer phone number

### Address Information

For India-based providers, providing customer address is important:
- Helps with regulatory compliance
- Improves transaction success rates
- Required for risk assessment

### Currency Support

- **India Mode**: INR only
- **Global Mode**: Multiple currencies supported

### Webhook Signature Verification

The application automatically verifies Cashfree webhook signatures using HMAC SHA256. Make sure your client secret is kept secure.

## Troubleshooting

### Provider Not Showing in UI

1. Check that credentials are set in `.env`
2. Restart the backend: `docker-compose restart backend`
3. Check logs: `docker-compose logs backend`

### Payment Creation Fails

1. Verify all required fields are provided (name, email, phone)
2. Check that return_url and notify_url are accessible
3. Verify sandbox mode matches your credentials
4. Check backend logs for specific error messages

### Webhook Not Receiving Events

1. Ensure notify_url is publicly accessible
2. Use ngrok or similar tool for local testing
3. Verify webhook endpoint in Cashfree dashboard
4. Check Cashfree dashboard for webhook delivery logs

### Invalid Credentials Error

1. Double-check CLIENT_ID and CLIENT_SECRET in `.env`
2. Ensure you're using the correct mode (sandbox vs production)
3. Verify credentials are active in Cashfree dashboard

## Production Deployment

When deploying to production:

1. **Update Credentials**
   ```env
   CASHFREE_CLIENT_ID=your_production_client_id
   CASHFREE_CLIENT_SECRET=your_production_client_secret
   CASHFREE_SANDBOX_MODE=false
   ```

2. **Update URLs**
   - Set proper FRONTEND_URL
   - Set proper BACKEND_URL
   - Ensure CASHFREE_NOTIFY_URL is publicly accessible

3. **Security**
   - Never commit credentials to version control
   - Use environment variables or secrets management
   - Enable webhook signature verification (already implemented)

4. **Configure Webhooks in Cashfree Dashboard**
   - Add your production webhook URL
   - Select events to subscribe to
   - Test webhook delivery

## Additional Resources

- [Cashfree API Documentation](https://www.cashfree.com/docs/api-reference/payments/latest)
- [Cashfree Subscriptions](https://www.cashfree.com/docs/payments/subscription/manage)
- [FastAPI Payments Library - Cashfree Guide](../../fastapi-payments/docs/providers/cashfree.md)
- [Cashfree Dashboard](https://merchant.cashfree.com/)

## Support

For issues specific to:
- **Cashfree API**: Contact Cashfree support
- **FastAPI Payments Library**: Open an issue on GitHub
- **This Example App**: Check the main README or open an issue
