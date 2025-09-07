#!/bin/bash

# QRIS Payment Gateway Test Suite
# This script tests all aspects of the QRIS payment integration

# Configuration
BACKEND_URL="http://localhost:3000"
API_KEY="your-secret-api-key"
STATIC_QRIS="00020101021126570011ID.DANA.WWW011893600915302259148102090225914810303UMI51440014ID.CO.QRIS.WWW0215ID10200176114730303UMI5204581253033605802ID5922Warung Sayur Bu Sugeng6010Kab. Demak610559567630458C7"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test backend health
test_backend_health() {
    print_header "Testing Backend Health"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "${BACKEND_URL}/health")
    
    if [ "$response" = "200" ]; then
        print_success "Backend is healthy"
        cat /tmp/health_response.json | jq '.' 2>/dev/null || cat /tmp/health_response.json
    else
        print_error "Backend health check failed (HTTP $response)"
        return 1
    fi
}

# Test QRIS conversion
test_qris_conversion() {
    print_header "Testing QRIS Conversion"
    
    # Test valid conversion
    echo "Testing valid QRIS conversion..."
    response=$(curl -s -w "%{http_code}" -o /tmp/qris_response.json \
        -X POST "${BACKEND_URL}/qris/convert" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${API_KEY}" \
        -d "{\"staticQRIS\": \"${STATIC_QRIS}\", \"amount\": \"50000\"}")
    
    if [ "$response" = "200" ]; then
        print_success "QRIS conversion successful"
        
        # Validate response
        dynamic_qris=$(cat /tmp/qris_response.json | jq -r '.dynamicQRIS' 2>/dev/null)
        if [ "$dynamic_qris" != "null" ] && [ "$dynamic_qris" != "" ]; then
            print_success "Dynamic QRIS generated: ${dynamic_qris:0:50}..."
            
            # Check if it's actually dynamic (contains amount)
            if [[ $dynamic_qris == *"54"* ]]; then
                print_success "QRIS contains amount field"
            else
                print_warning "QRIS might not contain amount field"
            fi
        else
            print_error "No dynamic QRIS in response"
        fi
    else
        print_error "QRIS conversion failed (HTTP $response)"
        cat /tmp/qris_response.json
    fi
    
    # Test invalid inputs
    echo -e "\nTesting invalid inputs..."
    
    # Missing amount
    response=$(curl -s -w "%{http_code}" -o /tmp/qris_error.json \
        -X POST "${BACKEND_URL}/qris/convert" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${API_KEY}" \
        -d "{\"staticQRIS\": \"${STATIC_QRIS}\"}")
    
    if [ "$response" = "400" ]; then
        print_success "Correctly rejected missing amount"
    else
        print_error "Should have rejected missing amount (HTTP $response)"
    fi
    
    # Invalid QRIS format
    response=$(curl -s -w "%{http_code}" -o /tmp/qris_error.json \
        -X POST "${BACKEND_URL}/qris/convert" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${API_KEY}" \
        -d "{\"staticQRIS\": \"invalid_qris\", \"amount\": \"50000\"}")
    
    if [ "$response" = "400" ]; then
        print_success "Correctly rejected invalid QRIS"
    else
        print_error "Should have rejected invalid QRIS (HTTP $response)"
    fi
}

# Test QRIS validation
test_qris_validation() {
    print_header "Testing QRIS Validation"
    
    # Test valid static QRIS
    response=$(curl -s -w "%{http_code}" -o /tmp/validate_response.json \
        -X POST "${BACKEND_URL}/qris/validate" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${API_KEY}" \
        -d "{\"qris\": \"${STATIC_QRIS}\"}")
    
    if [ "$response" = "200" ]; then
        print_success "QRIS validation endpoint working"
        
        valid=$(cat /tmp/validate_response.json | jq -r '.valid' 2>/dev/null)
        type=$(cat /tmp/validate_response.json | jq -r '.type' 2>/dev/null)
        
        if [ "$valid" = "true" ]; then
            print_success "Static QRIS validated as valid"
        else
            print_error "Static QRIS marked as invalid"
        fi
        
        if [ "$type" = "static" ]; then
            print_success "QRIS correctly identified as static"
        else
            print_warning "QRIS type: $type"
        fi
    else
        print_error "QRIS validation failed (HTTP $response)"
    fi
}

# Test payment expectation registration
test_payment_expectation() {
    print_header "Testing Payment Expectation Registration"
    
    order_ref="ORDER-TEST-$(date +%s)"
    callback_url="https://example.com/webhook"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/expectation_response.json \
        -X POST "${BACKEND_URL}/woocommerce/payment-webhook" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${API_KEY}" \
        -d "{\"orderRef\": \"${order_ref}\", \"expectedAmount\": \"75000\", \"callbackUrl\": \"${callback_url}\"}")
    
    if [ "$response" = "200" ]; then
        print_success "Payment expectation registered"
        
        # Verify it was stored
        echo "Checking if expectation was stored..."
        sleep 1
        
        response=$(curl -s -w "%{http_code}" -o /tmp/expectations_list.json \
            "${BACKEND_URL}/woocommerce/payment-expectations?status=pending" \
            -H "X-API-Key: ${API_KEY}")
        
        if [ "$response" = "200" ]; then
            count=$(cat /tmp/expectations_list.json | jq '.count' 2>/dev/null)
            print_success "Found $count pending payment expectations"
        fi
    else
        print_error "Payment expectation registration failed (HTTP $response)"
        cat /tmp/expectation_response.json
    fi
}

# Test payment status check
test_payment_status() {
    print_header "Testing Payment Status Check"
    
    order_ref="ORDER-NONEXISTENT-123"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/status_response.json \
        "${BACKEND_URL}/woocommerce/payment-status/${order_ref}" \
        -H "X-API-Key: ${API_KEY}")
    
    if [ "$response" = "200" ]; then
        print_success "Payment status endpoint working"
        
        payment_found=$(cat /tmp/status_response.json | jq -r '.payment_found' 2>/dev/null)
        if [ "$payment_found" = "false" ]; then
            print_success "Correctly reported no payment found for nonexistent order"
        else
            print_warning "Unexpected payment found for test order"
        fi
    else
        print_error "Payment status check failed (HTTP $response)"
    fi
}

# Test webhook notification processing
test_notification_webhook() {
    print_header "Testing Notification Webhook"
    
    # First register a payment expectation
    order_ref="ORDER-WEBHOOK-TEST-$(date +%s)"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/webhook_expectation.json \
        -X POST "${BACKEND_URL}/woocommerce/payment-webhook" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${API_KEY}" \
        -d "{\"orderRef\": \"${order_ref}\", \"expectedAmount\": \"100000\", \"callbackUrl\": \"https://httpbin.org/post\"}")
    
    if [ "$response" = "200" ]; then
        print_success "Payment expectation registered for webhook test"
        
        # Send matching notification
        sleep 1
        response=$(curl -s -w "%{http_code}" -o /tmp/webhook_notification.json \
            -X POST "${BACKEND_URL}/webhook" \
            -H "Content-Type: application/json" \
            -H "X-API-Key: ${API_KEY}" \
            -d "{
                \"deviceId\": \"test-device-webhook\",
                \"packageName\": \"id.dana\",
                \"appName\": \"DANA\",
                \"title\": \"Pembayaran Berhasil\",
                \"text\": \"Transaksi ${order_ref} sebesar Rp 100.000 berhasil\",
                \"amountDetected\": \"100000\"
            }")
        
        if [ "$response" = "200" ]; then
            print_success "Notification webhook processed"
            
            # Check if payment was matched
            sleep 2
            response=$(curl -s -w "%{http_code}" -o /tmp/payment_check.json \
                "${BACKEND_URL}/woocommerce/payment-status/${order_ref}" \
                -H "X-API-Key: ${API_KEY}")
            
            if [ "$response" = "200" ]; then
                payment_found=$(cat /tmp/payment_check.json | jq -r '.payment_found' 2>/dev/null)
                if [ "$payment_found" = "true" ]; then
                    print_success "Payment successfully matched!"
                else
                    print_warning "Payment not yet matched (might need more time)"
                fi
            fi
        else
            print_error "Notification webhook failed (HTTP $response)"
        fi
    else
        print_error "Could not register payment expectation for webhook test"
    fi
}

# Test API authentication
test_api_authentication() {
    print_header "Testing API Authentication"
    
    # Test without API key
    response=$(curl -s -w "%{http_code}" -o /tmp/auth_test.json \
        "${BACKEND_URL}/notifications")
    
    if [ "$response" = "401" ]; then
        print_success "Correctly rejected request without API key"
    else
        print_warning "Request without API key got HTTP $response (expected 401)"
    fi
    
    # Test with wrong API key
    response=$(curl -s -w "%{http_code}" -o /tmp/auth_test.json \
        "${BACKEND_URL}/notifications" \
        -H "X-API-Key: wrong-key")
    
    if [ "$response" = "401" ]; then
        print_success "Correctly rejected request with wrong API key"
    else
        print_warning "Request with wrong API key got HTTP $response (expected 401)"
    fi
    
    # Test with correct API key
    response=$(curl -s -w "%{http_code}" -o /tmp/auth_test.json \
        "${BACKEND_URL}/notifications" \
        -H "X-API-Key: ${API_KEY}")
    
    if [ "$response" = "200" ]; then
        print_success "Correctly accepted request with valid API key"
    else
        print_error "Request with valid API key failed (HTTP $response)"
    fi
}

# Test error handling
test_error_handling() {
    print_header "Testing Error Handling"
    
    # Test malformed JSON
    response=$(curl -s -w "%{http_code}" -o /tmp/error_test.json \
        -X POST "${BACKEND_URL}/qris/convert" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${API_KEY}" \
        -d "invalid json")
    
    if [ "$response" = "400" ] || [ "$response" = "500" ]; then
        print_success "Correctly handled malformed JSON"
    else
        print_warning "Malformed JSON got HTTP $response"
    fi
    
    # Test nonexistent endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/error_test.json \
        "${BACKEND_URL}/nonexistent-endpoint" \
        -H "X-API-Key: ${API_KEY}")
    
    if [ "$response" = "404" ]; then
        print_success "Correctly returned 404 for nonexistent endpoint"
    else
        print_warning "Nonexistent endpoint got HTTP $response (expected 404)"
    fi
}

# Main test runner
main() {
    print_header "QRIS Payment Gateway Test Suite"
    echo "Backend URL: $BACKEND_URL"
    echo "Testing started at: $(date)"
    
    # Check if required tools are available
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq not found - JSON parsing will be limited"
    fi
    
    # Run tests
    test_backend_health || exit 1
    test_api_authentication
    test_qris_conversion
    test_qris_validation
    test_payment_expectation
    test_payment_status
    test_notification_webhook
    test_error_handling
    
    print_header "Test Summary"
    print_success "All tests completed!"
    echo "Check the output above for any failures or warnings."
    echo "Temporary files are in /tmp/ with names starting with qris_, health_, etc."
    
    # Cleanup
    rm -f /tmp/health_response.json /tmp/qris_response.json /tmp/qris_error.json \
          /tmp/validate_response.json /tmp/expectation_response.json \
          /tmp/expectations_list.json /tmp/status_response.json \
          /tmp/webhook_expectation.json /tmp/webhook_notification.json \
          /tmp/payment_check.json /tmp/auth_test.json /tmp/error_test.json
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-url)
            BACKEND_URL="$2"
            shift 2
            ;;
        --api-key)
            API_KEY="$2"
            shift 2
            ;;
        --static-qris)
            STATIC_QRIS="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --backend-url URL    Backend server URL (default: http://localhost:3000)"
            echo "  --api-key KEY        API key for authentication"
            echo "  --static-qris CODE   Static QRIS code for testing"
            echo "  -h, --help          Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main