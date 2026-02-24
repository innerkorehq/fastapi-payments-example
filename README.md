# FastAPI Payments Next.js Example

This project demonstrates the integration of [fastapi-payments](https://github.com/yourusername/fastapi-payments) with a Next.js frontend application.

## Features

- Customer management
- Payment method management
- Subscription handling (including **PayU Standing Instructions/SI** and **Cashfree subscriptions** for recurring payments)
- One-time payments
- Product and pricing plan management
- Webhooks for payment events
- Multi-provider switching (Stripe cards + PayU hosted checkout + Cashfree)
- Manual provider sync trigger from the dashboard
- **PayU recurring payments with SI registration, mandate management, and RBI-compliant pre-debit notifications**
- **Cashfree support for India and international payments**

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- Docker and Docker Compose (optional)

### Environment Variables

Create a `.env` file with the following variables:
Common (Stripe) example variables are set in the already included `.env` files. To enable PayU or Cashfree, add their credentials to `.env` (backend or root):

```
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Optional: PayU hosted checkout (merchant credentials)
PAYU_API_KEY=your_payu_merchant_key
PAYU_API_SECRET=your_payu_merchant_salt
PAYU_SANDBOX_MODE=true
PAYU_SUCCESS_URL=http://localhost:3000/payu/success
PAYU_FAILURE_URL=http://localhost:3000/payu/failure
PAYU_CANCEL_URL=http://localhost:3000/payu/cancel

# Optional: Cashfree payment gateway
CASHFREE_CLIENT_ID=your_cashfree_client_id
CASHFREE_CLIENT_SECRET=your_cashfree_client_secret
CASHFREE_SANDBOX_MODE=true
CASHFREE_COLLECTION_MODE=india  # or "global" for international
#CASHFREE_RETURN_URL=http://localhost:3000/cashfree/success
#CASHFREE_NOTIFY_URL=http://localhost:8000/api/webhooks/cashfree
```

See [backend/.env.example](backend/.env.example) for a complete list of configuration options.

When providers are configured, the backend will include them in the payments configuration and the frontend automatically exposes a provider selector wherever payments can be created so you can switch between Stripe (stored cards), PayU (hosted checkout), and Cashfree (hosted checkout) per customer.

### Testing PayU hosted flow

- Start the backend and frontend apps (see start instructions in this repo). Ensure `PAYU_API_KEY` and `PAYU_API_SECRET` are set in the `.env` file.
- Create or pick a customer and call POST /api/payments (or use the frontend one-time payment form). Include a `meta_info.payu` block with `firstname`, `email`, `productinfo` and callback URLs (`surl` and `furl`) if you want to override the defaults.
- The payment response will contain `meta_info.provider_data.payu.redirect` with an `action_url` and signed `fields`. The frontend will detect this and submit a hidden form to redirect to PayU's hosted checkout page.
- After checkout, PayU will POST the result to `/api/payments/webhooks/payu` (or your configured webhook route). The app will verify PayU's hash automatically and publish a standardized event (payment.succeeded/payment.failed).

### PayU Subscriptions (Standing Instructions)

**PayU now supports recurring payments through Standing Instructions (SI)**. See [PAYU_SUBSCRIPTIONS.md](./PAYU_SUBSCRIPTIONS.md) for detailed documentation.

**Quick start**:
1. Navigate to `/subscriptions/new` in the frontend
2. Select **PayU** as the provider
3. Fill in subscription details including:
   - SI start date (dd-MM-yyyy format)
   - Billing period (daily/weekly/monthly/yearly)
   - Customer phone number
   - Optional: number of cycles and end date
4. Submit → redirects to PayU for mandate registration
5. After successful registration, use the backend API to:
   - Execute recurring payments: `POST /payu/si-transaction`
   - Send pre-debit notifications: `POST /payu/pre-debit-notify`
   - Cancel mandates: `POST /subscriptions/{id}/cancel`

**Key Features**:
- ✅ Full SI registration flow with hosted checkout
- ✅ Mandate token management
- ✅ Recurring payment execution
- ✅ RBI-compliant pre-debit notifications
- ✅ Mandate modification and cancellation
- ✅ Frontend form with PayU-specific fields
- ✅ Enhanced success page for subscription callbacks

### Cashfree Integration

**Cashfree is now supported for both India and international payments**. See [CASHFREE_SETUP.md](./CASHFREE_SETUP.md) for detailed configuration and usage guide.

**Quick start**:
1. Add Cashfree credentials to `backend/.env`:
   ```
   CASHFREE_CLIENT_ID=your_client_id
   CASHFREE_CLIENT_SECRET=your_client_secret
   CASHFREE_SANDBOX_MODE=true
   CASHFREE_COLLECTION_MODE=india
   ```
2. Restart the backend: `docker-compose restart backend`
3. Navigate to the frontend - Cashfree will appear in provider dropdown
4. Create customers with **complete address information** (required for India compliance)
5. Process payments or create subscriptions selecting **Cashfree** as the provider

**Collection Modes**:
- **India Collections** (default): For accepting payments from Indian customers (INR only)
- **Global Collections**: For Indian businesses accepting international payments (multi-currency)

**Key Features**:
- ✅ One-time payments via Orders API
- ✅ Subscription management
- ✅ Payment refunds
- ✅ Webhook notifications with signature verification
- ✅ Both India and Global collection support
- ✅ Complete address validation
- ✅ Automatic callback URL configuration

**Required Fields** (Cashfree):
- Customer name, email, phone (mandatory)
- Address (recommended for India compliance)
- Return URL for payment redirects
- Notify URL for webhook events

### Syncing provider data

- The homepage now includes a **Sync provider data** widget that calls `POST /api/payments/sync` and polls `/api/payments/sync/{job_id}` until the background job finishes. Use it to keep the local demo database in sync with your providers after making changes elsewhere.
- The widget shows job status, last update timestamp, and a resource-by-resource summary (customers, products, plans, subscriptions, payments, payment methods) once the job completes. Errors are surfaced inline if the sync API fails.
- You can call the same endpoints directly if you prefer cURL/HTTPie scripts, but the UI button is the easiest way to kick off a best-effort reconciliation.
