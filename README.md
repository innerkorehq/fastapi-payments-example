# FastAPI Payments Next.js Example

This project demonstrates the integration of [fastapi-payments](https://github.com/yourusername/fastapi-payments) with a Next.js frontend application.

## Features

- Customer management
- Payment method management
- Subscription handling
- One-time payments
- Product and pricing plan management
- Webhooks for payment events

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- Docker and Docker Compose (optional)

### Environment Variables

Create a `.env` file with the following variables:
Common (Stripe) example variables are set in the already included `.env` files. To enable PayU hosted checkout add the PayU keys to `.env` (backend or root):

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
```

When PayU is configured, the backend will include a `payu` provider in the payments configuration and PayU-hosted checkout results will be returned in the payment's `meta_info.provider_data.payu.redirect` field.

### Testing PayU hosted flow

- Start the backend and frontend apps (see start instructions in this repo). Ensure `PAYU_API_KEY` and `PAYU_API_SECRET` are set in the `.env` file.
- Create or pick a customer and call POST /api/payments (or use the frontend one-time payment form). Include a `meta_info.payu` block with `firstname`, `email`, `productinfo` and callback URLs (`surl` and `furl`) if you want to override the defaults.
- The payment response will contain `meta_info.provider_data.payu.redirect` with an `action_url` and signed `fields`. The frontend will detect this and submit a hidden form to redirect to PayU's hosted checkout page.
- After checkout, PayU will POST the result to `/api/payments/webhooks/payu` (or your configured webhook route). The app will verify PayU's hash automatically and publish a standardized event (payment.succeeded/payment.failed).
