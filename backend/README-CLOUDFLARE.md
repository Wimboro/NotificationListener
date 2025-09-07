# Cloudflare Workers QRIS WooCommerce Integration

This implementation provides a complete serverless backend for the WooCommerce QRIS payment gateway using Cloudflare Workers.

## 🚀 Features

- **Dynamic QRIS Generation**: Convert static QRIS codes to dynamic ones with unique amounts
- **Automatic Payment Matching**: Match payment notifications to WooCommerce orders using order reference and unique amounts
- **Real-time Payment Processing**: Process notifications from Android devices and update payment status
- **Webhook Integration**: Notify WooCommerce when payments are completed
- **Database Management**: SQLite D1 database for payment expectations and notifications
- **API Security**: API key authentication for all endpoints

## 📋 Endpoints

### Core Endpoints
- `GET /health` - Health check
- `POST /webhook` - Receive notifications from Android app

### QRIS Endpoints  
- `POST /qris/convert` - Convert static QRIS to dynamic
- `POST /qris/validate` - Validate QRIS code format
- `POST /qris/generate-for-order` - Generate QRIS for WooCommerce orders

### WooCommerce Integration
- `POST /woocommerce/payment-webhook` - Register payment expectations
- `GET /woocommerce/payment-status/{order}` - Check payment status
- `GET /qris/unique-amount/{order}` - Get unique amount for order

### Data Endpoints
- `GET /notifications` - Get notification history
- `GET /devices` - Get device information
- `GET /stats` - Get usage statistics

## 🔧 Installation & Deployment

### Prerequisites
- Cloudflare account
- Wrangler CLI installed
- Node.js 18+

### 1. Setup Cloudflare Workers

```bash
# Clone and setup
cd backend
npm install

# Login to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create notification-listener-db

# Update wrangler.toml with your database ID
# Copy the database ID from the previous command output
```

### 2. Configure Environment

```bash
# Set API key
npx wrangler secret put API_KEY
# Enter your API key when prompted (e.g., "Akusuk4k4mu:")

# Initialize database
npx wrangler d1 execute notification-listener-db --file=schema.sql
```

### 3. Deploy

```bash
# Deploy to Cloudflare Workers
npx wrangler deploy

# Your worker will be available at:
# https://notification-listener-backend.<your-subdomain>.workers.dev
```

### 4. Alternative: Quick Deploy Script

```bash
# Make the deploy script executable and run
chmod +x deploy.sh
./deploy.sh
```

## 🧪 Testing

### Local Testing
```bash
# Start local development server
npx wrangler dev --local

# Test endpoints
curl -s http://localhost:8787/health
```

### Integration Testing
```bash
# Run comprehensive test suite
chmod +x test-integration.sh
./test-integration.sh https://your-worker-url.workers.dev your-api-key
```

### Test Flow Example

1. **Register Payment Expectation**:
```bash
curl -X POST https://your-worker-url.workers.dev/woocommerce/payment-webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "orderRef": "WC_ORDER_123",
    "expectedAmount": "75000", 
    "callbackUrl": "https://yoursite.com/callback",
    "useUniqueAmount": true
  }'
```

2. **Generate QRIS Code**:
```bash
curl -X POST https://your-worker-url.workers.dev/qris/generate-for-order \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "staticQRIS": "your-static-qris-code",
    "originalAmount": "75000",
    "orderRef": "WC_ORDER_123",
    "callbackUrl": "https://yoursite.com/callback"
  }'
```

3. **Simulate Payment Notification**:
```bash
curl -X POST https://your-worker-url.workers.dev/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "deviceId": "test_device",
    "packageName": "com.dana", 
    "title": "Payment Received",
    "text": "You received payment of 75059 from WC_ORDER_123",
    "amountDetected": "75059"
  }'
```

4. **Check Payment Status**:
```bash
curl -X GET "https://your-worker-url.workers.dev/woocommerce/payment-status/WC_ORDER_123" \
  -H "x-api-key: your-api-key"
```

## 🔌 WooCommerce Plugin Configuration

Update your WordPress QRIS plugin settings:

1. **Backend URL**: `https://your-worker-url.workers.dev`
2. **API Key**: The same key you set with `wrangler secret put API_KEY`
3. **Test the connection** using the plugin's test feature

## 📊 Database Schema

The system uses these SQLite D1 tables:

- `notifications`: Store payment notifications from Android devices
- `devices`: Track Android devices and their status  
- `payment_expectations`: Store expected payments for WooCommerce orders
- `unique_amounts`: Track unique 3-digit amounts for payment identification

## 🔍 Monitoring

```bash
# View real-time logs
npx wrangler tail

# Check D1 database
npx wrangler d1 execute notification-listener-db --command="SELECT * FROM payment_expectations"
```

## 🏗 Architecture

### Payment Flow
1. Customer places WooCommerce order
2. Plugin registers payment expectation with unique amount
3. System generates dynamic QRIS with combined amount (original + unique)
4. Customer pays using mobile banking app
5. Android device captures payment notification 
6. Workers backend matches notification to order
7. Payment status updated and WooCommerce notified

### Unique Amount System
- Generates 3-digit unique amounts (001-200) for each order
- Combined with original amount for payment identification
- Prevents amount collision between concurrent orders
- Expires after 1 hour for reuse

### Security Features
- API key authentication on all endpoints
- Input validation and sanitization
- CORS protection
- Rate limiting (configurable)

## 🔧 Configuration

Key environment variables in `wrangler.toml`:

```toml
[vars]
NODE_ENV = "production"

[[d1_databases]]
binding = "DB"
database_name = "notification-listener-db" 
database_id = "your-database-id"
```

Secrets (set with `wrangler secret put`):
- `API_KEY`: Authentication key for API access

## 📝 Example Response Formats

**Payment Webhook Registration**:
```json
{
  "success": true,
  "message": "Payment expectation registered",
  "order_reference": "WC_ORDER_123", 
  "expected_amount": "75059",
  "original_amount": "75000",
  "unique_amount": "059",
  "combined_amount": "75059",
  "amount_type": "combined",
  "id": 1
}
```

**Payment Status Check**:
```json
{
  "success": true,
  "payment_found": true,
  "amount": "75059",
  "expected_amount": "75059", 
  "amount_matches": true,
  "notification_text": "You received payment of 75059 from WC_ORDER_123",
  "timestamp": "2025-09-07T06:33:06.394Z",
  "order_reference": "WC_ORDER_123",
  "status": "completed"
}
```

## 🆘 Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check API key configuration
2. **Database errors**: Ensure D1 database is properly initialized
3. **Payment not matching**: Verify order reference appears in notification text
4. **QRIS validation fails**: Check QRIS format and CRC checksum

### Debug Commands
```bash
# Check worker logs
npx wrangler tail

# Test database connectivity  
npx wrangler d1 execute notification-listener-db --command="SELECT 1"

# Validate environment
curl -s https://your-worker-url.workers.dev/health
```

## 🔄 Updates & Maintenance

```bash
# Deploy updates
npx wrangler deploy

# Update secrets
npx wrangler secret put API_KEY

# Database migrations
npx wrangler d1 execute notification-listener-db --file=new-schema.sql
```

## 📞 Support

- Check logs with `npx wrangler tail`
- Test endpoints using provided test scripts
- Monitor D1 database for payment data
- Verify WooCommerce callback URLs are reachable