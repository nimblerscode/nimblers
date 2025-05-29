# Shopify OAuth Testing Guide

This guide explains how to test the Shopify OAuth integration in your app.

## Testing Environment Setup

### 1. Environment Variables

Make sure you have these variables set in your `.dev.vars` file:

```bash
SHOPIFY_CLIENT_ID=your_app_client_id
SHOPIFY_CLIENT_SECRET=your_app_client_secret
SHOPIFY_OAUTH_DO=ShopifyOAuthDurableObject
```

### 2. Shopify Partner Account

1. Create a [Shopify Partner account](https://partners.shopify.com/)
2. Create a new app in your Partner dashboard
3. Note down your Client ID and Client Secret
4. Set your app's callback URL to: `https://your-domain.com/shopify/oauth/callback`

## Testing the OAuth Flow

### 1. Access the Dashboard

Navigate to: `https://your-domain.com/shopify`

You'll see the Shopify Integration dashboard with:

- A "Connect to Shopify" button
- Instructions for the OAuth flow
- An input field for your shop domain

### 2. Connect to Shopify

1. Enter your shop name (without `.myshopify.com`) in the input field
   - Example: enter `my-test-shop` for `my-test-shop.myshopify.com`
2. Click "Connect to Shopify"
3. You'll be redirected to Shopify's authorization page
4. Log in to your Shopify store and approve the app
5. You'll be redirected back to your app with success parameters

### 3. Expected Flow

```
User clicks "Connect"
  ↓
Redirect to /shopify/oauth/install?shop=my-shop.myshopify.com
  ↓
OAuth use case generates authorization URL
  ↓
User redirected to Shopify: https://my-shop.myshopify.com/admin/oauth/authorize?...
  ↓
User approves app on Shopify
  ↓
Shopify redirects to: /shopify/oauth/callback?code=...&shop=...&state=...
  ↓
OAuth use case exchanges code for access token
  ↓
Token stored in Durable Object SQLite database
  ↓
User redirected to: /shopify?shop=my-shop.myshopify.com&success=true
  ↓
Dashboard shows "Connected to Shopify!" status
```

## Testing Endpoints

### 1. Dashboard Page

- **URL**: `/shopify`
- **Description**: Main dashboard with Connect button
- **Query Params**:
  - `shop`: Shop domain (shows connection status)
  - `success`: Set to "true" after successful OAuth

### 2. OAuth Install

- **URL**: `/shopify/oauth/install?shop=SHOP_DOMAIN`
- **Description**: Initiates OAuth flow
- **Redirects**: To Shopify authorization page

### 3. OAuth Callback

- **URL**: `/shopify/oauth/callback?code=...&shop=...`
- **Description**: Handles OAuth callback from Shopify
- **Redirects**: Back to dashboard with success parameters

### 4. Connection Status API

- **URL**: `/shopify/status?shop=SHOP_DOMAIN`
- **Method**: GET
- **Response**: JSON with connection status

### 5. Disconnect

- **URL**: `/shopify/disconnect`
- **Method**: POST
- **Description**: Disconnects the shop (currently just returns success)

## Testing with Development Shop

### Option 1: Create a Development Store

1. In your Shopify Partner dashboard, create a "Development store"
2. Use the development store domain for testing
3. Install your app on the development store

### Option 2: Use an Existing Store

1. Use any Shopify store you have access to
2. Make sure you have admin permissions
3. Test the OAuth flow

## Manual Testing Checklist

- [ ] Dashboard loads without errors
- [ ] Can enter shop domain in input field
- [ ] "Connect to Shopify" button works
- [ ] Redirects to Shopify authorization page
- [ ] Can approve app on Shopify
- [ ] Gets redirected back with success message
- [ ] Dashboard shows connected status
- [ ] Disconnect button works (if implemented)

## Troubleshooting

### Common Issues

1. **"Shop parameter required" error**

   - Make sure you enter a shop domain
   - Shop domain should be in format: `shop-name.myshopify.com`

2. **Authorization failed**

   - Check your `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`
   - Verify callback URL in Shopify Partner dashboard

3. **HMAC verification failed**

   - Check that your `SHOPIFY_CLIENT_SECRET` is correct
   - Ensure the request hasn't been tampered with

4. **Nonce errors**
   - This indicates potential replay attacks or timing issues
   - Try the flow again with a fresh session

### Debug Information

Check browser console and network tabs for:

- Error messages
- Failed requests
- Redirect chains
- Response payloads

### Server Logs

The Durable Object includes structured logging:

- Request/response times
- Error details with context
- OAuth flow progression

## What Happens Behind the Scenes

1. **Nonce Generation**: Each OAuth request gets a unique nonce for security
2. **HMAC Verification**: All Shopify requests are verified for authenticity
3. **Shop Domain Validation**: Ensures only valid `.myshopify.com` domains
4. **Token Exchange**: Authorization codes are exchanged for access tokens
5. **Secure Storage**: Tokens are stored in Durable Object SQLite database
6. **Cleanup**: Expired nonces are cleaned up periodically

## Next Steps

After successful OAuth connection, you can:

1. Use the stored access token to make Shopify API calls
2. Implement webhook handling for store events
3. Build your app's core functionality
4. Handle token refresh if using online tokens

## Security Notes

- Access tokens are never displayed in the UI (shown as `***hidden***`)
- All OAuth parameters are verified using HMAC
- Nonces prevent replay attacks
- Shop domains are validated against Shopify's pattern
- Tokens are stored securely in Durable Objects with SQLite
