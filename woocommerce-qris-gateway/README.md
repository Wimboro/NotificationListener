# QRIS Dynamic Payment Gateway

A complete WooCommerce payment gateway integration that converts static QRIS codes to dynamic ones and automatically confirms payments using Android notification monitoring.

## 🚀 Features

- **Dynamic QRIS Generation**: Converts static QRIS to dynamic with exact payment amounts
- **Automatic Payment Confirmation**: Uses Android notifications to automatically confirm payments
- **Real-time Status Updates**: AJAX-based payment status monitoring
- **Secure Integration**: API key authentication and proper validation
- **Order Reference Matching**: Links payments to specific orders using unique references
- **Timeout Handling**: Automatic order cancellation after configurable timeout
- **Mobile Optimized**: Responsive QR code display and copy functionality

## 📁 Project Structure

```
woocommerce-qris-gateway/
├── backend-extensions/          # Backend integration files
│   ├── qris-converter.js       # QRIS conversion library
│   ├── qris-integration.js     # WooCommerce integration endpoints
│   └── integration-guide.js    # Backend modification guide
├── wordpress-plugin/            # WordPress plugin files
│   ├── assets/
│   │   └── qris-payment.js     # Frontend payment handling
│   ├── includes/
│   │   ├── class-qris-dynamic-gateway.php  # Main gateway class
│   │   └── payment-instructions.php        # Payment UI template
│   └── qris-dynamic-gateway.php           # Main plugin file
├── docs/                       # Documentation
├── tests/                      # Test scripts
└── README.md                   # This file
```

## 🛠 Installation

### 1. Backend Integration

The backend enhancement adds QRIS functionality to your existing NotificationListener backend.

#### Option A: Manual Integration (Recommended)

1. Copy the backend extensions to your project:
   ```bash
   cp -r woocommerce-qris-gateway/backend-extensions/* /path/to/your/backend/
   ```

2. Modify your existing `backend/server.js`:

   ```javascript
   // Add at the top after existing imports
   const qrisIntegration = require('./qris-integration');

   // Add after existing table creation in db.serialize()
   qrisIntegration.setupPaymentExpectationsTable(db);

   // Add after existing routes
   qrisIntegration.setupQRISRoutes(app, validateApiKey, db);

   // Enhance existing webhook endpoint
   // In your /webhook endpoint, after notification insertion success:
   if (amountDetected) {
       qrisIntegration.checkPaymentMatch(db, text, title, bigText, amountDetected);
   }
   ```

#### Option B: Copy Enhanced Backend

1. Backup your current backend
2. Copy the enhanced backend files
3. Update your environment variables

### 2. WordPress Plugin Installation

1. Copy the plugin to your WordPress installation:
   ```bash
   cp -r woocommerce-qris-gateway/wordpress-plugin /path/to/wordpress/wp-content/plugins/qris-dynamic-gateway
   ```

2. Activate the plugin in WordPress admin:
   - Go to **Plugins > Installed Plugins**
   - Find "QRIS Dynamic Payment Gateway"
   - Click **Activate**

3. Configure the payment gateway:
   - Go to **WooCommerce > Settings > Payments**
   - Click **QRIS Dynamic Payment**
   - Configure the settings (see Configuration section)

## ⚙️ Configuration

### Backend Configuration

Add these environment variables to your backend `.env` file:

```env
# Existing variables
PORT=3000
API_KEY=your-secret-api-key

# QRIS-specific (optional)
QRIS_TIMEOUT_MINUTES=15
QRIS_AUTO_CHECK_INTERVAL=30
```

### WordPress Plugin Configuration

Configure the following settings in **WooCommerce > Settings > Payments > QRIS Dynamic Payment**:

| Setting | Description | Example |
|---------|-------------|---------|
| **Backend URL** | Your NotificationListener backend URL | `https://your-backend.example.com` |
| **API Key** | Backend authentication key | `your-secret-api-key` |
| **Static QRIS Code** | Your merchant's static QRIS code | `00020101021126570011ID.DANA.WWW...` |
| **Merchant Name** | Your business name | `Toko Saya` |
| **Payment Timeout** | Minutes to wait for payment | `15` |
| **Auto Check Interval** | Seconds between status checks | `30` |

## 🔄 Payment Flow

1. **Customer places order** → WooCommerce creates pending order
2. **Dynamic QRIS generated** → Static QRIS converted with exact amount
3. **Payment expectation registered** → Backend expects payment with order reference
4. **Customer scans QR code** → Mobile banking app processes payment
5. **Android device receives notification** → NotificationListener captures payment notification
6. **Backend matches payment** → Amount and reference matched with expectation
7. **WooCommerce receives webhook** → Order automatically marked as paid

## 📱 Supported Banking Apps

The system supports all Indonesian banking and e-wallet apps that send QRIS payment notifications, including:

- **Banks**: BCA, Mandiri, BNI, BRI, CIMB, Permata, etc.
- **E-wallets**: DANA, OVO, GoPay, LinkAja, ShopeePay, etc.
- **Digital Banks**: Jenius, Digibank, Blu, etc.

## 🔧 API Endpoints

### QRIS Conversion

```http
POST /qris/convert
Content-Type: application/json
X-API-Key: your-api-key

{
  "staticQRIS": "00020101021126570011ID.DANA.WWW...",
  "amount": "100000"
}
```

**Response:**
```json
{
  "success": true,
  "staticQRIS": "00020101021126570011ID.DANA.WWW...",
  "dynamicQRIS": "00020201021126570011ID.DANA.WWW...5410000054051000005802ID...",
  "amount": "100000",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### Payment Status Check

```http
GET /woocommerce/payment-status/ORDER-123-1234567890
X-API-Key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "payment_found": true,
  "amount": "100000",
  "notification_text": "Pembayaran QRIS berhasil...",
  "timestamp": "2025-01-01T12:05:00.000Z",
  "order_reference": "ORDER-123-1234567890"
}
```

### Register Payment Expectation

```http
POST /woocommerce/payment-webhook
Content-Type: application/json
X-API-Key: your-api-key

{
  "orderRef": "ORDER-123-1234567890",
  "expectedAmount": "100000",
  "callbackUrl": "https://yoursite.com/wp-admin/admin-ajax.php?action=qris_payment_webhook"
}
```

## 🧪 Testing

### Backend Testing

Test the QRIS conversion:

```bash
curl -X POST "http://localhost:3000/qris/convert" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -d '{
    "staticQRIS": "00020101021126570011ID.DANA.WWW011893600915302259148102090225914810303UMI51440014ID.CO.QRIS.WWW0215ID10200176114730303UMI5204581253033605802ID5922Warung Sayur Bu Sugeng6010Kab. Demak610559567630458C7",
    "amount": "50000"
  }'
```

### WordPress Testing

1. Create a test product in WooCommerce
2. Add to cart and proceed to checkout
3. Select "QRIS Payment" as payment method
4. Complete the order to see the payment instructions
5. Test payment status checking (manual and automatic)

### Notification Testing

Send a test notification to verify payment matching:

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

## 🔐 Security Considerations

1. **API Key Protection**: Never expose API keys in frontend code
2. **HTTPS Required**: Use HTTPS for all production environments
3. **Input Validation**: All inputs are validated and sanitized
4. **Database Security**: Prepared statements prevent SQL injection
5. **CORS Configuration**: Properly configure CORS for your domain
6. **Rate Limiting**: Consider implementing rate limiting for API endpoints

## 🐛 Troubleshooting

### Common Issues

**1. QRIS Conversion Failed**
- Check if static QRIS format is valid
- Verify amount is numeric string without formatting
- Check backend logs for detailed error messages

**2. Payment Not Detected**
- Ensure order reference appears in notification text
- Check amount detection is working correctly
- Verify payment expectation was registered

**3. Webhook Not Received**
- Check callback URL is accessible from backend
- Verify API key configuration
- Check WordPress error logs

**4. Frontend Errors**
- Ensure JavaScript is enabled
- Check browser console for errors
- Verify AJAX nonce is valid

### Debug Mode

Enable debug mode by adding to your WordPress `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Backend logs can be found in your server logs or console output.

## 📞 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review backend and WordPress logs
3. Test with the provided test scripts
4. Open an issue on the project repository

## 📄 License

This project is licensed under the GPL v2 or later license.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📝 Changelog

### Version 1.0.0
- Initial release
- QRIS static to dynamic conversion
- WooCommerce payment gateway integration
- Automatic payment confirmation via notifications
- Real-time payment status checking
- Mobile-optimized payment instructions