#!/bin/bash

# Test QRIS WooCommerce Integration on Cloudflare Workers
echo "🧪 Testing QRIS WooCommerce Integration..."

# Configuration
WORKER_URL="${1:-https://notification-listener-backend.your-subdomain.workers.dev}"
API_KEY="${2:-your-secret-api-key}"

if [ "$WORKER_URL" = "https://notification-listener-backend.your-subdomain.workers.dev" ]; then
    echo "❌ Please provide your actual Worker URL as the first argument"
    echo "Usage: $0 <worker-url> [api-key]"
    exit 1
fi

echo "🔗 Testing Worker URL: $WORKER_URL"
echo "🔑 Using API Key: ${API_KEY:0:10}..."

# Test 1: Health Check
echo ""
echo "📋 Test 1: Health Check"
HEALTH_RESPONSE=$(curl -s "$WORKER_URL/health")
echo "Response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q "OK"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# Test 2: QRIS Validation
echo ""
echo "📋 Test 2: QRIS Validation"
QRIS_TEST='{"qris": "00020101021226670016COM.NOBUBANK.WWW01189360091530225914810214000003039802045802ID5909Merchant6007Jakarta61051234562070703A0163044698"}'
VALIDATION_RESPONSE=$(curl -s -X POST "$WORKER_URL/qris/validate" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "$QRIS_TEST")
echo "Response: $VALIDATION_RESPONSE"
if echo "$VALIDATION_RESPONSE" | grep -q "success.*true"; then
    echo "✅ QRIS validation passed"
else
    echo "❌ QRIS validation failed"
fi

# Test 3: QRIS Conversion
echo ""
echo "📋 Test 3: QRIS Conversion"
CONVERT_TEST='{"staticQRIS": "00020101021226670016COM.NOBUBANK.WWW01189360091530225914810214000003039802045802ID5909TestStore6007Jakarta61051234562070703A0163044698", "amount": "50000", "orderRef": "TEST_ORDER_001"}'
CONVERT_RESPONSE=$(curl -s -X POST "$WORKER_URL/qris/convert" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "$CONVERT_TEST")
echo "Response: $CONVERT_RESPONSE"
if echo "$CONVERT_RESPONSE" | grep -q "success.*true"; then
    echo "✅ QRIS conversion passed"
else
    echo "❌ QRIS conversion failed"
fi

# Test 4: WooCommerce Payment Webhook Registration
echo ""
echo "📋 Test 4: WooCommerce Payment Webhook"
WEBHOOK_TEST='{"orderRef": "WC_ORDER_123", "expectedAmount": "75000", "callbackUrl": "https://example.com/callback", "useUniqueAmount": true}'
WEBHOOK_RESPONSE=$(curl -s -X POST "$WORKER_URL/woocommerce/payment-webhook" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "$WEBHOOK_TEST")
echo "Response: $WEBHOOK_RESPONSE"
if echo "$WEBHOOK_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Payment webhook registration passed"
else
    echo "❌ Payment webhook registration failed"
fi

# Test 5: Payment Status Check
echo ""
echo "📋 Test 5: Payment Status Check"
STATUS_RESPONSE=$(curl -s -X GET "$WORKER_URL/woocommerce/payment-status/WC_ORDER_123?timeout=1" \
    -H "x-api-key: $API_KEY")
echo "Response: $STATUS_RESPONSE"
if echo "$STATUS_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Payment status check passed"
else
    echo "❌ Payment status check failed"
fi

# Test 6: Notification Webhook (Simulate payment notification)
echo ""
echo "📋 Test 6: Notification Webhook"
NOTIFICATION_TEST='{"deviceId": "test_device", "packageName": "com.dana", "title": "Payment Received", "text": "You received payment of 75100 from WC_ORDER_123", "amountDetected": "75100"}'
NOTIFICATION_RESPONSE=$(curl -s -X POST "$WORKER_URL/webhook" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "$NOTIFICATION_TEST")
echo "Response: $NOTIFICATION_RESPONSE"
if echo "$NOTIFICATION_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Notification webhook passed"
else
    echo "❌ Notification webhook failed"
fi

echo ""
echo "🎉 All tests completed!"
echo ""
echo "📝 Test Summary:"
echo "   - Health Check: ✅"
echo "   - QRIS Validation: Check output above"
echo "   - QRIS Conversion: Check output above" 
echo "   - Payment Webhook: Check output above"
echo "   - Payment Status: Check output above"
echo "   - Notification Processing: Check output above"
echo ""
echo "🔧 Next Steps:"
echo "   1. Configure your WooCommerce plugin with the Worker URL"
echo "   2. Set up the API key in both systems"
echo "   3. Test with real orders and payments"
echo "   4. Monitor with: npx wrangler tail"