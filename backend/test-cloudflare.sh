#!/bin/bash

# Cloudflare Workers Test Script
# This script tests the deployed Cloudflare Workers endpoints

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
WORKER_URL=""
API_KEY=""

# Function to print colored output
print_status() {
    if [ "$2" = "success" ]; then
        echo -e "${GREEN}✅ $1${NC}"
    elif [ "$2" = "error" ]; then
        echo -e "${RED}❌ $1${NC}"
    else
        echo -e "${YELLOW}ℹ️  $1${NC}"
    fi
}

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local method=$2
    local data=$3
    local expected_status=$4
    
    print_status "Testing $method $endpoint" "info"
    
    if [ "$method" = "GET" ]; then
        if [ -n "$API_KEY" ]; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -H "x-api-key: $API_KEY" "$WORKER_URL$endpoint")
        else
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$WORKER_URL$endpoint")
        fi
    else
        if [ -n "$API_KEY" ]; then
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" -H "Content-Type: application/json" -H "x-api-key: $API_KEY" -d "$data" "$WORKER_URL$endpoint")
        else
            response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$WORKER_URL$endpoint")
        fi
    fi
    
    status=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')
    
    if [ "$status" -eq "$expected_status" ]; then
        print_status "Status: $status (Expected: $expected_status)" "success"
        echo "Response: $body" | jq '.' 2>/dev/null || echo "Response: $body"
    else
        print_status "Status: $status (Expected: $expected_status)" "error"
        echo "Response: $body"
    fi
    
    echo "----------------------------------------"
}

# Main script
echo "🚀 Cloudflare Workers Deployment Test"
echo "======================================"

# Get worker URL
if [ -z "$WORKER_URL" ]; then
    echo "Please enter your Cloudflare Workers URL:"
    read -p "URL (e.g., https://your-worker.your-subdomain.workers.dev): " WORKER_URL
fi

# Get API key (optional for health check)
echo "Please enter your API key (press Enter to skip for health check only):"
read -s -p "API Key: " API_KEY
echo

echo "Testing with Worker URL: $WORKER_URL"
echo "======================================"

# Test health endpoint (no API key required)
test_endpoint "/health" "GET" "" 200

# Test with API key if provided
if [ -n "$API_KEY" ]; then
    # Test webhook endpoint
    test_data='{"deviceId":"test-device-123","packageName":"com.example.test","appName":"Test App","title":"Test Notification","text":"This is a test notification","amountDetected":"50000"}'
    test_endpoint "/webhook" "POST" "$test_data" 200
    
    # Test test endpoint
    test_endpoint "/test" "POST" "$test_data" 200
    
    # Test get notifications
    test_endpoint "/notifications" "GET" "" 200
    
    # Test get devices
    test_endpoint "/devices" "GET" "" 200
    
    # Test get stats
    test_endpoint "/stats" "GET" "" 200
    
    print_status "All tests completed!" "success"
else
    print_status "Skipping authenticated endpoints (no API key provided)" "info"
    print_status "To test all endpoints, run the script again with your API key" "info"
fi

echo "======================================"
echo "🎉 Testing completed!"