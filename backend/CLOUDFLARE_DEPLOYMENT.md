# Cloudflare Workers Deployment Guide

This guide will help you deploy the Notification Listener backend to Cloudflare Workers.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js**: Version 18 or higher
3. **Git**: For version control

## Step-by-Step Deployment

### 1. Install Wrangler CLI

Install Wrangler globally (recommended) or as a dev dependency:

```bash
# Global installation (recommended)
npm install -g wrangler

# OR as dev dependency (already added to package.json)
cd backend && npm install
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### 3. Create D1 Database

Navigate to the backend directory and create the database:

```bash
cd backend
npm run cf:db:create
```

This will output something like:
```
✅ Successfully created DB 'notification-listener-db'!

[[d1_databases]]
binding = "DB"
database_name = "notification-listener-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` and update your `wrangler.toml` file:

```toml
[[d1_databases]]
binding = "DB"
database_name = "notification-listener-db"
database_id = "your-actual-database-id-here"
```

### 4. Initialize Database Schema

```bash
npm run cf:db:init
```

This creates the necessary tables in your D1 database.

### 5. Set Environment Variables

Set your API key as a secret:

```bash
wrangler secret put API_KEY
```

When prompted, enter your desired API key (make it strong and secure).

### 6. Test Locally (Optional)

Test your worker locally before deploying:

```bash
npm run cf:dev
```

This starts a local development server. You can test endpoints at `http://localhost:8787`.

### 7. Deploy to Production

```bash
npm run cf:deploy
```

After successful deployment, you'll get a URL like:
```
https://notification-listener-backend.your-subdomain.workers.dev
```

## Testing Your Deployment

### Health Check
```bash
curl https://your-worker-url.workers.dev/health
```

### Test Webhook (replace with your API key)
```bash
curl -X POST https://your-worker-url.workers.dev/test \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "deviceId": "test-device",
    "packageName": "com.example.test",
    "title": "Test Notification",
    "text": "This is a test"
  }'
```

## Useful Commands

### Development
```bash
npm run cf:dev          # Start local development server
npm run cf:tail         # View live logs from production
```

### Database Operations
```bash
# Execute SQL command
wrangler d1 execute notification-listener-db --command="SELECT COUNT(*) FROM notifications"

# Execute SQL file
wrangler d1 execute notification-listener-db --file=./query.sql
```

### Deployment Management
```bash
wrangler deployments list    # List recent deployments
wrangler rollback           # Rollback to previous deployment
```

## Configuration

### Custom Domain (Optional)

1. In Cloudflare Dashboard, go to Workers & Pages
2. Click on your worker
3. Go to Settings → Triggers
4. Add Custom Domain

### Environment Variables

You can set additional environment variables:

```bash
wrangler secret put DATABASE_URL    # If using external database
wrangler secret put WEBHOOK_SECRET  # Additional security
```

## Benefits of Cloudflare Workers

✅ **Global Edge Network**: Your API runs on 250+ locations worldwide
✅ **SQLite Compatible**: D1 database works with your existing SQLite code
✅ **Generous Free Tier**: 100,000 requests/day free
✅ **Sub-millisecond Cold Starts**: Extremely fast response times
✅ **Built-in Analytics**: Request metrics included
✅ **Zero Infrastructure Management**: Fully serverless

## Monitoring and Logs

- **Live Logs**: `npm run cf:tail`
- **Analytics**: Available in Cloudflare Dashboard
- **Metrics**: Request count, error rate, response time

## Troubleshooting

### Common Issues

1. **Database ID Missing**: Make sure to update `wrangler.toml` with the actual database ID
2. **API Key Not Set**: Run `wrangler secret put API_KEY`
3. **CORS Issues**: The worker includes proper CORS headers
4. **Build Errors**: Check that all dependencies are compatible with Workers runtime

### Getting Help

- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **D1 Documentation**: https://developers.cloudflare.com/d1/
- **Community**: https://discord.gg/cloudflaredev

## Production Considerations

- Set a strong API key
- Monitor usage to stay within limits
- Consider implementing rate limiting for high-traffic scenarios
- Backup your D1 database regularly
- Use custom domains for production applications

Your backend is now deployed globally on Cloudflare's edge network! 🚀