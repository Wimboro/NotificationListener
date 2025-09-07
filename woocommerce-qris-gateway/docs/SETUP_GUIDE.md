# QRIS Payment Gateway Setup Guide

This guide will help you integrate the QRIS Dynamic Payment Gateway with your existing NotificationListener project.

## 📋 Prerequisites

- NotificationListener Android app running
- Backend server operational
- WordPress with WooCommerce installed
- Static QRIS code from your payment provider

## 🔧 Backend Integration

### Step 1: Copy Extension Files

Copy the backend extension files to your project:

```bash
# From the woocommerce-qris-gateway directory
cp backend-extensions/qris-converter.js ../backend/
cp backend-extensions/qris-integration.js ../backend/
```

### Step 2: Modify server.js

Add the following modifications to your existing `backend/server.js`:

```javascript
// 1. Add import after existing requires
const qrisIntegration = require('./qris-integration');

// 2. Add table setup in db.serialize() block after existing tables
qrisIntegration.setupPaymentExpectationsTable(db);

// 3. Add QRIS routes after existing routes
qrisIntegration.setupQRISRoutes(app, validateApiKey, db);

// 4. Enhance existing webhook endpoint
// In your existing /webhook POST handler, after successful notification insertion:
if (amountDetected) {
    qrisIntegration.checkPaymentMatch(db, text, title, bigText, amountDetected);
}
```

### Step 3: Restart Backend

```bash
cd backend
npm install # If you added any new dependencies
npm run dev  # or npm start
```

### Step 4: Test Backend Integration

```bash
# Test QRIS conversion
curl -X POST "http://localhost:3000/qris/convert" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{
    "staticQRIS": "YOUR_STATIC_QRIS_CODE_HERE",
    "amount": "50000"
  }'
```

## 🌐 WordPress Plugin Installation

### Step 1: Install Plugin

```bash
# Copy plugin to WordPress
cp -r wordpress-plugin /path/to/wordpress/wp-content/plugins/qris-dynamic-gateway

# Or upload via WordPress admin
```

### Step 2: Activate Plugin

1. Login to WordPress admin
2. Go to **Plugins > Installed Plugins**
3. Find "QRIS Dynamic Payment Gateway"
4. Click **Activate**

### Step 3: Configure Gateway

1. Go to **WooCommerce > Settings > Payments**
2. Click **QRIS Dynamic Payment**
3. Enable the gateway
4. Configure settings:

```
Title: QRIS Payment
Description: Pay using QRIS. Scan the QR code with your mobile banking app.
Backend URL: http://your-backend-domain.com (without trailing slash)
API Key: your-secret-api-key
Static QRIS Code: [Your static QRIS code from payment provider]
Merchant Name: Your Business Name
Payment Timeout: 15 (minutes)
Auto Check Interval: 30 (seconds)
```

5. Save changes

## 📱 Android App Configuration

Ensure your NotificationListener app is configured to:

1. **Monitor Banking Apps**: Enable notification access for banking/e-wallet apps
2. **Send to Backend**: Configure webhook URL to your backend
3. **Include Order References**: Ensure notifications contain order reference text

### Supported Banking Apps

Make sure these apps have notification access enabled:
- DANA, OVO, GoPay, LinkAja, ShopeePay
- BCA, Mandiri, BNI, BRI, CIMB, Permata
- Jenius, Digibank, Blu, etc.

## 🧪 Testing the Complete Flow

### 1. Test Order Creation

1. Create a test product in WooCommerce
2. Add to cart and checkout
3. Select "QRIS Payment"
4. Complete order

### 2. Test Payment Process

1. You should see payment instructions with QR code
2. The page should auto-refresh checking for payment
3. Order reference should be visible

### 3. Test Payment Simulation

Simulate a payment notification:

```bash
curl -X POST "http://localhost:3000/webhook" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{
    "deviceId": "test-device",
    "packageName": "id.dana",
    "appName": "DANA",
    "title": "Pembayaran Berhasil",
    "text": "ORDER-123-1234567890 Rp 50.000",
    "amountDetected": "50000"
  }'
```

### 4. Verify Payment Confirmation

- Check if order status changed to "Processing"
- Verify order notes show payment confirmation
- Check backend logs for payment matching

## 🔍 Monitoring and Debugging

### Backend Logs

Monitor backend console for:
```
✅ Payment expectations table ready
QRIS conversion: amount 50000, length: 150
✅ Payment matched! Order: ORDER-123-1234567890, Amount: 50000
```

### WordPress Logs

Enable WordPress debugging in `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Check logs at: `/wp-content/debug.log`

### Database Verification

Check payment expectations table:
```sql
SELECT * FROM payment_expectations WHERE status = 'pending';
SELECT * FROM notifications WHERE amount_detected IS NOT NULL;
```

## 🚨 Common Issues & Solutions

### Issue: QRIS Conversion Failed
**Solution:**
- Verify static QRIS format is valid
- Check if QRIS starts with "000201"
- Ensure amount is numeric string

### Issue: Payment Not Detected
**Solution:**
- Check notification text contains order reference
- Verify amount detection is working
- Check payment expectation was registered

### Issue: WordPress AJAX Errors
**Solution:**
- Check nonce verification
- Verify API key configuration
- Enable WordPress debug mode

### Issue: Backend Connection Failed
**Solution:**
- Verify backend URL accessibility
- Check API key matches
- Test backend endpoints manually

## 🔒 Production Deployment

### Security Checklist

- [ ] Use HTTPS for all communications
- [ ] Strong API keys (32+ characters)
- [ ] Firewall rules for backend access
- [ ] Regular backup of database
- [ ] Monitor logs for suspicious activity

### Performance Optimization

- [ ] Enable PHP opcode caching
- [ ] Optimize WordPress database
- [ ] Use CDN for static assets
- [ ] Monitor backend response times
- [ ] Set up server monitoring

### Backup Strategy

- [ ] Regular database backups
- [ ] Configuration file backups
- [ ] Plugin file backups
- [ ] SSL certificate management

## 📞 Support Contacts

For technical support:
- Check project documentation
- Review logs and error messages
- Test with provided scripts
- Contact project maintainer

## 📚 Additional Resources

- [WooCommerce Payment Gateway API](https://woocommerce.github.io/code-reference/classes/WC-Payment-Gateway.html)
- [QRIS Specification](https://www.bi.go.id/qris)
- [WordPress Plugin Development](https://developer.wordpress.org/plugins/)
- [Node.js Express Documentation](https://expressjs.com/)