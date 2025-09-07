#!/bin/bash

# Deploy Cloudflare Workers for QRIS WooCommerce Integration
echo "🚀 Deploying QRIS WooCommerce Integration to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v npx wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install wrangler --save-dev
fi

# Check if logged in to Cloudflare
echo "🔐 Checking Cloudflare authentication..."
if ! npx wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run 'npx wrangler login' first"
    exit 1
fi

# Create D1 database if it doesn't exist
echo "🗄️  Setting up D1 database..."
npx wrangler d1 create notification-listener-db || echo "Database may already exist"

# Apply database migrations
echo "📊 Applying database schema..."
npx wrangler d1 execute notification-listener-db --file=schema.sql

# Set API key secret
echo "🔑 Setting up API key..."
echo "Please enter your API key for the backend:"
read -s API_KEY
if [ ! -z "$API_KEY" ]; then
    echo "$API_KEY" | npx wrangler secret put API_KEY
    echo "✅ API key configured"
else
    echo "⚠️  No API key provided. You'll need to set it manually with:"
    echo "   npx wrangler secret put API_KEY"
fi

# Deploy the worker
echo "☁️  Deploying to Cloudflare Workers..."
npx wrangler deploy

echo "🎉 Deployment complete!"
echo ""
echo "🔗 Your endpoints are now available at:"
echo "   https://notification-listener-backend.<your-subdomain>.workers.dev"
echo ""
echo "📋 Available endpoints:"
echo "   POST /webhook - Receive notifications from Android app"
echo "   POST /qris/convert - Convert static QRIS to dynamic"
echo "   POST /qris/generate-for-order - Generate QRIS for WooCommerce orders"
echo "   GET  /woocommerce/payment-status/{order} - Check payment status"
echo "   POST /woocommerce/payment-webhook - Register payment expectations"
echo "   GET  /health - Health check"
echo ""
echo "🔧 Next steps:"
echo "   1. Update your WooCommerce plugin backend URL to use the Workers URL"
echo "   2. Test the integration with a sample order"
echo "   3. Monitor logs with: npx wrangler tail"