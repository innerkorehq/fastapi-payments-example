# Docker Quick Start - Cashfree Configuration

This guide will help you quickly set up and test Cashfree in the fastapi-payments-example project using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Cashfree account with test credentials

## Quick Setup (5 minutes)

### 1. Configure Environment Variables

Edit `backend/.env` and add your Cashfree test credentials:

```bash
# Add these lines to backend/.env
CASHFREE_CLIENT_ID=your_actual_test_client_id
CASHFREE_CLIENT_SECRET=your_actual_test_client_secret
CASHFREE_SANDBOX_MODE=true
CASHFREE_COLLECTION_MODE=india
```

### 2. Start the Application

From the project root directory:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

This will:
- Build the backend with Cashfree support
- Build the frontend
- Start both services
- Make backend available at http://localhost:8000
- Make frontend available at http://localhost:3000

### 3. Verify Cashfree is Configured

Open your browser and go to:
```
http://localhost:3000
```

You should see Cashfree in the provider dropdown when creating payments or subscriptions.

### 4. Check Backend Logs

```bash
# View backend logs
docker-compose logs -f backend

# You should see something like:
# INFO:     Initialized Cashfree provider (sandbox=True, mode=india)
```

### 5. Test Cashfree Payment Flow

#### Create a Customer
1. Navigate to http://localhost:3000/customers
2. Click "Create Customer"
3. Fill in **all fields** (important for Cashfree):
   - Name: John Doe
   - Email: john@example.com
   - Phone: 9999999999
   - Address Line 1: 123 Main St
   - City: Mumbai
   - State: Maharashtra
   - Postal Code: 400001
   - Country: IN
4. Click "Create Customer"

#### Process a Payment
1. Navigate to http://localhost:3000/payments
2. Click "Create Payment"
3. Select **Cashfree** from provider dropdown
4. Fill in:
   - Amount: 100
   - Currency: INR
   - Select the customer you created
   - Description: Test payment
5. Click "Process Payment"

The response will include:
- Payment session ID
- Order token
- Cashfree order ID

In a real integration, you would redirect the user to Cashfree's checkout using these credentials.

## Docker Commands Reference

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Rebuild and start
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View frontend logs only
docker-compose logs -f frontend

# Restart backend only
docker-compose restart backend

# Execute commands in backend container
docker-compose exec backend bash

# Execute commands in frontend container
docker-compose exec frontend sh
```

## Testing Different Providers

The Docker setup supports multiple providers simultaneously:

```bash
# In backend/.env, configure all providers you want to test:
STRIPE_API_KEY=sk_test_...
PAYU_API_KEY=...
PAYU_API_SECRET=...
CASHFREE_CLIENT_ID=...
CASHFREE_CLIENT_SECRET=...
```

After updating `.env`, restart the backend:
```bash
docker-compose restart backend
```

All configured providers will be available in the frontend dropdown.

## Environment Variables in Docker

The docker-compose.yml passes environment variables to containers:

```yaml
environment:
  - CASHFREE_CLIENT_ID=${CASHFREE_CLIENT_ID:-your_cashfree_client_id}
  - CASHFREE_CLIENT_SECRET=${CASHFREE_CLIENT_SECRET:-your_cashfree_client_secret}
  - CASHFREE_SANDBOX_MODE=${CASHFREE_SANDBOX_MODE:-true}
  - CASHFREE_COLLECTION_MODE=${CASHFREE_COLLECTION_MODE:-india}
```

Variables are read from:
1. Your shell environment (if exported)
2. `backend/.env` file
3. Default values (fallback)

## Troubleshooting

### Cashfree Not Appearing in Dropdown

**Check if credentials are set:**
```bash
docker-compose exec backend python -c "import os; print('ID:', os.getenv('CASHFREE_CLIENT_ID')); print('Secret:', os.getenv('CASHFREE_CLIENT_SECRET'))"
```

**Check backend logs:**
```bash
docker-compose logs backend | grep -i cashfree
```

You should see:
```
INFO:     Initialized Cashfree provider (sandbox=True, mode=india)
```

**Solution:**
1. Verify credentials are in `backend/.env`
2. Restart backend: `docker-compose restart backend`
3. Clear browser cache and reload frontend

### Port Already in Use

```bash
# If port 8000 or 3000 is already in use, stop conflicting services:
docker-compose down
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
docker-compose up
```

### Changes Not Reflecting

**Backend changes:**
```bash
# Restart backend (hot reload enabled)
docker-compose restart backend

# Or rebuild if requirements changed
docker-compose up --build backend
```

**Frontend changes:**
- Frontend has hot reload enabled
- Just refresh your browser
- If not working: `docker-compose restart frontend`

### Database Issues

```bash
# Reset database
docker-compose down
rm backend/payments.db
docker-compose up
```

## API Testing with curl

### Get Provider List
```bash
curl http://localhost:8000/api/providers
```

Should return Cashfree in the list.

### Create Cashfree Customer
```bash
curl -X POST http://localhost:8000/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "provider": "cashfree",
    "meta_info": {
      "phone": "9999999999"
    },
    "address": {
      "line1": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postal_code": "400001",
      "country": "IN"
    }
  }'
```

### Create Cashfree Payment
```bash
curl -X POST http://localhost:8000/api/payments/process \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.0,
    "currency": "INR",
    "provider": "cashfree",
    "provider_customer_id": "cashfree_cust_xxx",
    "description": "Test payment",
    "meta_info": {
      "cashfree": {
        "customer_name": "Test User",
        "customer_email": "test@example.com",
        "customer_phone": "9999999999"
      }
    }
  }'
```

## Development Workflow

1. **Make code changes** - Files are mounted as volumes
2. **Backend auto-reloads** - Changes take effect immediately
3. **Frontend auto-reloads** - Refresh browser to see changes
4. **Check logs** - `docker-compose logs -f`
5. **Test API** - Use frontend UI or curl

## Switching Collection Modes

### India Mode (Default)
```bash
# In backend/.env
CASHFREE_COLLECTION_MODE=india
```
- Accepts INR only
- For payments from Indian customers

### Global Mode
```bash
# In backend/.env
CASHFREE_COLLECTION_MODE=global
```
- Accepts multiple currencies
- For Indian businesses collecting internationally

After changing mode:
```bash
docker-compose restart backend
```

## Production Deployment

When ready for production:

1. **Update credentials:**
   ```bash
   CASHFREE_CLIENT_ID=prod_client_id
   CASHFREE_CLIENT_SECRET=prod_client_secret
   CASHFREE_SANDBOX_MODE=false
   ```

2. **Set proper URLs:**
   ```bash
   FRONTEND_URL=https://yourdomain.com
   BACKEND_URL=https://api.yourdomain.com
   ```

3. **Configure webhooks in Cashfree Dashboard:**
   - Webhook URL: `https://api.yourdomain.com/api/webhooks/cashfree`
   - Enable signature verification

## Next Steps

- Read [CASHFREE_SETUP.md](./CASHFREE_SETUP.md) for detailed configuration
- Check [README.md](./README.md) for complete feature documentation
- Visit [Cashfree Docs](https://www.cashfree.com/docs) for API reference

## Support

- **Docker issues**: Check Docker documentation
- **Cashfree integration**: See CASHFREE_SETUP.md
- **General issues**: Check main README.md
