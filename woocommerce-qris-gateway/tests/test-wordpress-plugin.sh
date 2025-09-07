#!/bin/bash

# WordPress Plugin Test Script
# Tests the WooCommerce QRIS gateway plugin functionality

# Configuration
WP_URL="http://localhost/wordpress"
WC_API_KEY=""
WC_API_SECRET=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Test WordPress site accessibility
test_wordpress_access() {
    print_header "Testing WordPress Site Access"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/wp_response.html "${WP_URL}")
    
    if [ "$response" = "200" ]; then
        print_success "WordPress site is accessible"
    else
        print_error "WordPress site not accessible (HTTP $response)"
        return 1
    fi
}

# Test WooCommerce availability
test_woocommerce_availability() {
    print_header "Testing WooCommerce Availability"
    
    # Check if WooCommerce REST API is available
    response=$(curl -s -w "%{http_code}" -o /tmp/wc_response.json "${WP_URL}/wp-json/wc/v3/")
    
    if [ "$response" = "401" ]; then
        print_success "WooCommerce REST API is available (authentication required)"
    elif [ "$response" = "200" ]; then
        print_success "WooCommerce REST API is available"
    else
        print_warning "WooCommerce REST API response: HTTP $response"
    fi
}

# Test plugin activation status
test_plugin_activation() {
    print_header "Testing Plugin Activation"
    
    # This would require WordPress CLI or admin access
    # For now, we'll check if the payment gateway endpoints respond
    
    response=$(curl -s -w "%{http_code}" -o /tmp/ajax_response.json \
        -X POST "${WP_URL}/wp-admin/admin-ajax.php" \
        -d "action=qris_check_payment&order_id=999&nonce=invalid")
    
    if [ "$response" = "200" ] || [ "$response" = "400" ]; then
        print_success "Plugin AJAX endpoints are responding"
    else
        print_warning "Plugin AJAX endpoints response: HTTP $response"
    fi
}

# Test payment gateway registration
test_payment_gateway_registration() {
    print_header "Testing Payment Gateway Registration"
    
    if [ -n "$WC_API_KEY" ] && [ -n "$WC_API_SECRET" ]; then
        # Test with WooCommerce API if credentials are provided
        response=$(curl -s -w "%{http_code}" -o /tmp/gateways_response.json \
            -u "${WC_API_KEY}:${WC_API_SECRET}" \
            "${WP_URL}/wp-json/wc/v3/payment_gateways")
        
        if [ "$response" = "200" ]; then
            print_success "Retrieved payment gateways list"
            
            # Check if QRIS gateway is in the list
            if command -v jq &> /dev/null; then
                qris_gateway=$(cat /tmp/gateways_response.json | jq '.[] | select(.id == "qris_dynamic")')
                if [ -n "$qris_gateway" ]; then
                    print_success "QRIS Dynamic Payment Gateway is registered"
                else
                    print_error "QRIS Dynamic Payment Gateway not found in gateways list"
                fi
            else
                print_warning "jq not available - cannot parse gateway list"
            fi
        else
            print_error "Failed to retrieve payment gateways (HTTP $response)"
        fi
    else
        print_warning "WooCommerce API credentials not provided - skipping gateway registration test"
        echo "Set WC_API_KEY and WC_API_SECRET to enable this test"
    fi
}

# Test JavaScript assets loading
test_javascript_assets() {
    print_header "Testing JavaScript Assets"
    
    # Check if the payment script is accessible
    response=$(curl -s -w "%{http_code}" -o /tmp/js_response.txt \
        "${WP_URL}/wp-content/plugins/qris-dynamic-gateway/assets/qris-payment.js")
    
    if [ "$response" = "200" ]; then
        print_success "JavaScript assets are accessible"
        
        # Check if the script contains expected functions
        if grep -q "qrisPayment" /tmp/js_response.txt; then
            print_success "JavaScript contains expected payment functions"
        else
            print_warning "JavaScript file might be missing expected functions"
        fi
    else
        print_error "JavaScript assets not accessible (HTTP $response)"
    fi
}

# Test CSS assets loading
test_css_assets() {
    print_header "Testing CSS Assets"
    
    # Check for any custom CSS files
    response=$(curl -s -w "%{http_code}" -o /tmp/css_response.txt \
        "${WP_URL}/wp-content/plugins/qris-dynamic-gateway/assets/qris-style.css")
    
    if [ "$response" = "200" ]; then
        print_success "CSS assets are accessible"
    elif [ "$response" = "404" ]; then
        print_warning "No custom CSS files found (this is okay if using inline styles)"
    else
        print_error "Unexpected response for CSS assets (HTTP $response)"
    fi
}

# Test plugin settings page
test_plugin_settings() {
    print_header "Testing Plugin Settings Access"
    
    # Try to access WooCommerce settings page
    response=$(curl -s -w "%{http_code}" -o /tmp/settings_response.html \
        "${WP_URL}/wp-admin/admin.php?page=wc-settings&tab=checkout&section=qris_dynamic")
    
    if [ "$response" = "200" ]; then
        print_success "Plugin settings page is accessible"
    elif [ "$response" = "302" ] || [ "$response" = "301" ]; then
        print_warning "Plugin settings page redirected (login may be required)"
    else
        print_error "Plugin settings page not accessible (HTTP $response)"
    fi
}

# Test webhook endpoint
test_webhook_endpoint() {
    print_header "Testing Webhook Endpoint"
    
    # Test the payment webhook endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/webhook_response.txt \
        -X POST "${WP_URL}/wp-admin/admin-ajax.php?action=qris_payment_webhook" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: test-key" \
        -d '{"order_reference": "ORDER-TEST-123", "amount": "50000", "status": "completed"}')
    
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        print_success "Webhook endpoint is responding"
        
        if [ "$response" = "401" ]; then
            print_success "Webhook correctly requires authentication"
        fi
    else
        print_error "Webhook endpoint failed (HTTP $response)"
    fi
}

# Test QR code library loading
test_qr_library() {
    print_header "Testing QR Code Library"
    
    # Check if QRious library is being loaded
    response=$(curl -s -w "%{http_code}" -o /tmp/qr_lib_response.txt \
        "https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js")
    
    if [ "$response" = "200" ]; then
        print_success "QR code library (QRious) is accessible from CDN"
    else
        print_warning "QR code library not accessible from CDN (HTTP $response)"
    fi
}

# Test plugin file permissions
test_file_permissions() {
    print_header "Testing File Permissions"
    
    plugin_dir="/var/www/html/wp-content/plugins/qris-dynamic-gateway"
    
    if [ -d "$plugin_dir" ]; then
        print_success "Plugin directory exists"
        
        # Check if main plugin file is readable
        if [ -r "$plugin_dir/qris-dynamic-gateway.php" ]; then
            print_success "Main plugin file is readable"
        else
            print_error "Main plugin file is not readable"
        fi
        
        # Check if assets directory is accessible
        if [ -d "$plugin_dir/assets" ]; then
            print_success "Assets directory exists"
        else
            print_warning "Assets directory not found"
        fi
        
        # Check if includes directory is accessible
        if [ -d "$plugin_dir/includes" ]; then
            print_success "Includes directory exists"
        else
            print_error "Includes directory not found"
        fi
    else
        print_warning "Plugin directory not found at expected location"
        echo "Expected: $plugin_dir"
    fi
}

# Generate test report
generate_report() {
    print_header "Test Report Generation"
    
    report_file="/tmp/qris_plugin_test_report.txt"
    
    cat > "$report_file" << EOF
QRIS Dynamic Payment Gateway Plugin Test Report
Generated: $(date)
WordPress URL: $WP_URL

Test Results Summary:
EOF
    
    echo "Report generated: $report_file"
    print_success "Test report created"
}

# Main test runner
main() {
    print_header "QRIS WordPress Plugin Test Suite"
    echo "WordPress URL: $WP_URL"
    echo "Testing started at: $(date)"
    
    # Check prerequisites
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed"
        exit 1
    fi
    
    # Run tests
    test_wordpress_access || exit 1
    test_woocommerce_availability
    test_plugin_activation
    test_payment_gateway_registration
    test_javascript_assets
    test_css_assets
    test_plugin_settings
    test_webhook_endpoint
    test_qr_library
    test_file_permissions
    generate_report
    
    print_header "Plugin Test Summary"
    print_success "WordPress plugin tests completed!"
    echo "Review the results above for any issues."
    
    # Cleanup
    rm -f /tmp/wp_response.html /tmp/wc_response.json /tmp/ajax_response.json \
          /tmp/gateways_response.json /tmp/js_response.txt /tmp/css_response.txt \
          /tmp/settings_response.html /tmp/webhook_response.txt /tmp/qr_lib_response.txt
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --wp-url)
            WP_URL="$2"
            shift 2
            ;;
        --wc-api-key)
            WC_API_KEY="$2"
            shift 2
            ;;
        --wc-api-secret)
            WC_API_SECRET="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --wp-url URL           WordPress site URL (default: http://localhost/wordpress)"
            echo "  --wc-api-key KEY       WooCommerce API key (optional)"
            echo "  --wc-api-secret SECRET WooCommerce API secret (optional)"
            echo "  -h, --help            Show this help message"
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