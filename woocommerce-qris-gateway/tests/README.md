# QRIS Payment Gateway Tests

This directory contains comprehensive test suites for the QRIS Dynamic Payment Gateway integration.

## 🧪 Test Files

### 1. Backend Tests (`test-backend.sh`)
Tests the backend integration and QRIS functionality:
- Backend health checks
- API authentication
- QRIS conversion endpoints
- Payment expectation registration
- Notification webhook processing
- Error handling

**Usage:**
```bash
./test-backend.sh --backend-url http://localhost:3000 --api-key your-secret-api-key
```

### 2. QRIS Converter Tests (`test-qris-converter.js`)
Unit tests for the QRIS conversion library:
- Basic QRIS conversion
- Amount extraction
- QRIS validation
- CRC16 calculation
- Service fee handling
- Error handling
- Performance benchmarks

**Usage:**
```bash
node test-qris-converter.js
```

### 3. WordPress Plugin Tests (`test-wordpress-plugin.sh`)
Tests the WordPress plugin integration:
- WordPress accessibility
- WooCommerce availability
- Plugin activation status
- Payment gateway registration
- JavaScript/CSS assets
- Webhook endpoints

**Usage:**
```bash
./test-wordpress-plugin.sh --wp-url http://localhost/wordpress
```

## 🚀 Running All Tests

### Prerequisites
- Backend server running
- WordPress with WooCommerce installed
- Node.js for JavaScript tests
- curl and jq installed

### Quick Test Run
```bash
# Test backend functionality
./tests/test-backend.sh

# Test QRIS converter
node tests/test-qris-converter.js

# Test WordPress plugin
./tests/test-wordpress-plugin.sh
```

### Comprehensive Testing
```bash
# Backend with custom configuration
./tests/test-backend.sh \
  --backend-url https://your-backend.example.com \
  --api-key your-production-api-key \
  --static-qris "00020101021126570011ID.DANA.WWW..."

# WordPress with WooCommerce API
./tests/test-wordpress-plugin.sh \
  --wp-url https://your-wordpress-site.com \
  --wc-api-key ck_your_api_key \
  --wc-api-secret cs_your_api_secret
```

## 📊 Test Coverage

### Backend Tests Cover:
- ✅ Health endpoint (`/health`)
- ✅ QRIS conversion (`/qris/convert`)
- ✅ QRIS validation (`/qris/validate`)
- ✅ Payment expectation (`/woocommerce/payment-webhook`)
- ✅ Payment status (`/woocommerce/payment-status/:ref`)
- ✅ Notification processing (`/webhook`)
- ✅ API authentication
- ✅ Error handling

### QRIS Converter Tests Cover:
- ✅ Static to dynamic conversion
- ✅ Amount embedding and extraction
- ✅ QRIS format validation
- ✅ CRC16 checksum calculation
- ✅ Service fee handling
- ✅ Input validation
- ✅ Error scenarios
- ✅ Performance benchmarks

### WordPress Plugin Tests Cover:
- ✅ WordPress site accessibility
- ✅ WooCommerce REST API
- ✅ Plugin activation status
- ✅ Payment gateway registration
- ✅ JavaScript asset loading
- ✅ Webhook endpoint functionality
- ✅ File permissions
- ✅ External dependencies

## 🔧 Test Configuration

### Environment Variables
```bash
# Backend testing
export BACKEND_URL="http://localhost:3000"
export API_KEY="your-secret-api-key"
export STATIC_QRIS="your-static-qris-code"

# WordPress testing
export WP_URL="http://localhost/wordpress"
export WC_API_KEY="ck_your_wc_key"
export WC_API_SECRET="cs_your_wc_secret"
```

### Test Data
Update these values in test files for your environment:
- Backend URL and API key
- WordPress site URL
- WooCommerce API credentials
- Static QRIS code for testing

## 📈 Test Reports

### Backend Test Output
```
=== Testing Backend Health ===
✅ Backend is healthy

=== Testing QRIS Conversion ===
✅ QRIS conversion successful
✅ Dynamic QRIS generated: 00020201021126570011ID.DANA.WWW...
✅ QRIS contains amount field

=== Testing Payment Status Check ===
✅ Payment status endpoint working
✅ Correctly reported no payment found for nonexistent order
```

### QRIS Converter Test Output
```
🧪 Running QRIS Converter Tests

Running testBasicConversion...
✅ testBasicConversion passed

⚡ Running Performance Benchmarks
⚡ QRIS Conversion: 1000 iterations in 45ms (0.045ms/op)
```

### WordPress Plugin Test Output
```
=== Testing WordPress Site Access ===
✅ WordPress site is accessible

=== Testing WooCommerce Availability ===
✅ WooCommerce REST API is available

=== Testing Payment Gateway Registration ===
✅ QRIS Dynamic Payment Gateway is registered
```

## 🐛 Troubleshooting Tests

### Common Issues

**Backend tests fail with connection error:**
- Check if backend server is running
- Verify backend URL and port
- Check firewall settings

**QRIS conversion tests fail:**
- Verify static QRIS format is valid
- Check if QRIS contains required fields
- Ensure test data is not corrupted

**WordPress tests fail:**
- Check WordPress site accessibility
- Verify WooCommerce is installed and active
- Check plugin installation path

### Debug Mode
Enable debug output by setting:
```bash
export DEBUG=1
```

### Manual Verification
Test individual components manually:
```bash
# Test backend health
curl http://localhost:3000/health

# Test QRIS conversion
curl -X POST http://localhost:3000/qris/convert \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"staticQRIS": "your-qris", "amount": "50000"}'

# Test WordPress AJAX
curl -X POST http://localhost/wordpress/wp-admin/admin-ajax.php \
  -d "action=qris_check_payment&order_id=123&nonce=test"
```

## 📝 Adding New Tests

### Backend Test Example
```bash
test_new_feature() {
    print_header "Testing New Feature"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/test_response.json \
        "${BACKEND_URL}/new-endpoint" \
        -H "X-API-Key: ${API_KEY}")
    
    if [ "$response" = "200" ]; then
        print_success "New feature works"
    else
        print_error "New feature failed"
    fi
}
```

### JavaScript Test Example
```javascript
static testNewFeature() {
    const result = QRISConverter.newMethod("test");
    assertNotNull(result, "New method should return result");
    assertEqual(result.status, "success", "Should return success status");
}
```

## 🤝 Contributing Tests

When adding new functionality:
1. Add corresponding tests
2. Update test documentation
3. Ensure all tests pass
4. Add test data if needed
5. Update CI/CD pipeline if applicable

## 📞 Test Support

For test-related issues:
1. Check test logs for detailed error messages
2. Verify environment configuration
3. Run tests individually to isolate issues
4. Check dependencies are installed
5. Review test documentation