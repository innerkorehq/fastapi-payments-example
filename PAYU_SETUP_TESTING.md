# PayU Subscription Setup & Testing Guide

## Issue Fixed

The PayU subscription flow wasn't redirecting because:
1. `PaymentService.create_subscription()` wasn't returning `meta_info` with redirect data
2. Provider parameter wasn't being passed from frontend to backend
3. PayU provider customer wasn't being auto-created
4. Plans needed to be created with PayU as the provider

## Fixes Applied

### 1. Core Library (`fastapi-payments`)

**File: `src/fastapi_payments/services/payment_service.py`**
- ✅ Added `meta_info` to subscription return value
- ✅ Auto-create provider customer if not exists (for PayU and similar providers)
- ✅ Support provider override from meta_info
- ✅ Store full provider response in subscription meta_info

### 2. Example Backend

**File: `backend/main.py`**
- ✅ Pass provider parameter from SubscriptionCreate to PaymentService
- ✅ Merge provider into meta_info

### 3. Example Frontend

**File: `components/subscriptions/SubscriptionForm.tsx`**
- ✅ Added console logging for debugging
- ✅ Properly detect and handle redirect response

## Setup Steps

### Step 1: Configure PayU Credentials

Add to `.env`:
```bash
PAYU_API_KEY=your_merchant_key
PAYU_API_SECRET=your_merchant_salt
PAYU_SANDBOX_MODE=true
```

### Step 2: Create a Product with PayU Provider

```bash
curl -X POST http://localhost:8000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Subscription",
    "description": "Monthly premium features"
  }'
```

Response:
```json
{
  "id": "prod_abc123",
  "name": "Premium Subscription",
  ...
}
```

### Step 3: Create a Plan with PayU Provider

**IMPORTANT**: Specify `provider: "payu"` when creating the plan!

```bash
curl -X POST http://localhost:8000/products/{product_id}/plans \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Plan",
    "amount": 999.00,
    "currency": "INR",
    "billing_interval": "month",
    "billing_interval_count": 1,
    "pricing_model": "subscription",
    "provider": "payu"
  }'
```

Response:
```json
{
  "id": "plan_xyz789",
  "product_id": "prod_abc123",
  "provider": "payu",
  "provider_price_id": "payu_price_...",
  ...
}
```

### Step 4: Create a Customer

```bash
curl -X POST http://localhost:8000/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### Step 5: Create Subscription via Frontend

1. Navigate to: `http://localhost:3000/subscriptions/new?customer_id={customer_id}`

2. Fill in the form:
   - Provider: **PayU (SI/Recurring)**
   - Plan: Select your PayU plan
   - Phone: `9876543210`
   - SI Start Date: `25-12-2025` (dd-MM-yyyy format)
   - SI Period: `monthly`
   - SI Cycles: `12` (optional)

3. Click **Continue to PayU**

4. You should be redirected to PayU hosted checkout

### Step 6: Complete Payment on PayU

Use test cards in sandbox:
- Card: 4508 7509 7509 7509
- CVV: 123
- Expiry: Any future date

### Step 7: Verify Redirect Back

After successful SI registration, you'll be redirected to:
`http://localhost:3000/payu/success?status=success&mihpayid=...&si=1&...`

## Debugging

### Check Console Logs

Open browser console to see:
```
Subscription created: { id: "sub_123", ... }
Provider: payu
Metadata: { redirect: { action_url: "...", fields: {...} } }
Redirect info: { action_url: "https://test.payu.in/_payment", ... }
Redirecting to PayU with: { action_url: "...", method: "POST", fields: {...} }
```

### If No Redirect Happens

1. **Check plan provider**:
   ```bash
   curl http://localhost:8000/plans/{plan_id}
   ```
   Verify `provider: "payu"` is set

2. **Check subscription response**:
   ```bash
   curl -X POST http://localhost:8000/customers/{customer_id}/subscriptions \
     -H "Content-Type: application/json" \
     -d '{ "plan_id": "...", "provider": "payu", "metadata": {...} }'
   ```
   Verify response contains `metadata.redirect`

3. **Check backend logs**:
   Look for:
   - "Provider customer not found for payu, creating one"
   - Any errors during subscription creation

4. **Verify SI parameters**:
   - `si_start_date` must be in dd-MM-yyyy format
   - `phone` is required
   - `amount` must be present in metadata

## API Endpoint Summary

### Create Subscription (Backend)
```http
POST /customers/{customer_id}/subscriptions
Content-Type: application/json

{
  "plan_id": "plan_xyz789",
  "quantity": 1,
  "provider": "payu",
  "metadata": {
    "amount": 999.00,
    "payu": {
      "firstname": "Test User",
      "email": "test@example.com",
      "phone": "9876543210",
      "si_start_date": "25-12-2025",
      "si_period": "monthly",
      "si_cycles": "12",
      "productinfo": "Monthly Subscription"
    }
  }
}
```

### Expected Response
```json
{
  "id": "sub_123",
  "customer_id": "cust_456",
  "plan_id": "plan_xyz789",
  "status": "pending",
  "metadata": {
    "redirect": {
      "action_url": "https://test.payu.in/_payment",
      "method": "POST",
      "fields": {
        "key": "...",
        "hash": "...",
        "txnid": "...",
        "amount": "999.00",
        "si": "1",
        "si_start_date": "25-12-2025",
        "si_period": "monthly",
        ...
      }
    }
  }
}
```

### Frontend Auto-Submit Logic
```typescript
if (subscription.metadata?.redirect) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = subscription.metadata.redirect.action_url;
  
  Object.entries(subscription.metadata.redirect.fields).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });
  
  document.body.appendChild(form);
  form.submit(); // This redirects to PayU
}
```

## Common Errors

### "Provider info not found for plan"
**Cause**: Plan wasn't created with PayU provider  
**Fix**: Create plan with `"provider": "payu"`

### "si_start_date is required"
**Cause**: SI start date not provided or wrong format  
**Fix**: Provide date in `dd-MM-yyyy` format (e.g., "25-12-2025")

### "Subscription amount is required in meta_info"
**Cause**: Amount not passed in metadata  
**Fix**: Include `metadata.amount` in subscription request

### No redirect happens
**Cause**: Response doesn't contain redirect info  
**Fix**: Check console logs and verify provider is "payu"

## Verification Checklist

Before testing:
- [ ] PayU credentials configured in `.env`
- [ ] Product created
- [ ] Plan created with `provider: "payu"`
- [ ] Customer created
- [ ] SI start date in correct format (dd-MM-yyyy)
- [ ] Phone number provided
- [ ] Browser console open for debugging

## Next Steps After SI Registration

Once SI registration is complete:

1. **Store mandate token** from success callback
2. **Execute recurring payments**:
   ```bash
   curl -X POST http://localhost:8000/payu/si-transaction \
     -H "Content-Type: application/json" \
     -d '{
       "mandate_token": "token_from_registration",
       "amount": 999.00
     }'
   ```

3. **Send pre-debit notifications** (24-72 hours before):
   ```bash
   curl -X POST http://localhost:8000/payu/pre-debit-notify \
     -H "Content-Type: application/json" \
     -d '{
       "mandate_token": "token",
       "amount": 999.00,
       "debit_date": "25-01-2026"
     }'
   ```

---

**Last Updated**: December 24, 2025
**Status**: ✅ Issues fixed and tested
