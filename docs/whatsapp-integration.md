# WhatsApp Integration Architecture

This document outlines the WhatsApp Business API integration following Clean Architecture principles with Effect-TS.

## Overview

The WhatsApp integration enables:

1. **Campaign Messages**: Send WhatsApp messages via campaigns
2. **Incoming Messages**: Handle incoming WhatsApp messages via webhooks
3. **Conversation Management**: Route WhatsApp messages to conversation DOs
4. **Template Messages**: Support for WhatsApp business templates

## Current Implementation Status

### ✅ Completed Components

1. **Domain Models** (`src/domain/global/messaging/models.ts`)

   - WhatsApp Business API schemas
   - Webhook payload validation
   - Template message structures
   - Provider-specific error types

2. **Messaging Service Updates**

   - Modified `ConversationMessagingServiceLive` to support message type detection
   - WhatsApp campaigns now pass through with proper message type

3. **Webhook Infrastructure** (`src/app/api/webhooks/whatsapp/route.ts`)

   - GET endpoint for webhook verification
   - POST endpoint for incoming messages and status updates
   - Automatic conversation creation for new WhatsApp contacts
   - Message parsing and routing to conversation DOs

4. **Configuration Layer** (`src/config/layers.ts`)
   - WhatsApp Business API configuration layer
   - Integration points for provider configuration

### 🚧 Partial Implementation

1. **WhatsApp Business Provider** (`src/infrastructure/messaging/whatsapp-business/provider.ts`)
   - Provider implementation exists but has type compatibility issues
   - Needs integration with the messaging layer configuration

### ❌ Missing Components

1. **Environment Variables**: Need to add WhatsApp credentials to environment
2. **Provider Layer Integration**: Complete the WhatsApp Business provider integration
3. **Campaign Type Detection**: Update campaign launch to specify WhatsApp message type

## Setup Instructions

### 1. Facebook/Meta WhatsApp Business Setup

You already have these credentials - add them to your environment:

```bash
# Add to .dev.vars
WHATSAPP_ACCESS_TOKEN="EAAbI4VvFXk4BOy171hEY9zDtH1OZB2ETPpUj7voWKaGpIUczZBFkkQZBA3qh2LXTuHauLXnZCRUZBNYbmMBa6z10LbVWRUI3WeDllZCKGylofYMGgfyxnxCmOytNiIkSd35ZBMGoLaSbifiw9rPZAsb7WnOS6YQHkBZAIYbKojF8JyXzhLZCM7xV27pZBSDcHSZBGZAZAEZCvBge5FlZCvWIzlNuYqeH5qaC03d7EpimQtsZD"
WHATSAPP_PHONE_NUMBER_ID="646664281870480"
WHATSAPP_BUSINESS_ACCOUNT_ID="your_business_account_id"
WHATSAPP_VERIFY_TOKEN="your_webhook_verify_token"
```

### 2. Webhook Configuration

Configure your WhatsApp Business App to send webhooks to:

- **Webhook URL**: `https://your-domain.com/api/webhooks/whatsapp`
- **Verify Token**: Use the `WHATSAPP_VERIFY_TOKEN` from your environment

### 3. Environment Types

Add WhatsApp variables to your environment types:

```typescript
// worker-configuration.d.ts or env types
interface Env {
  // ... existing vars
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_BUSINESS_ACCOUNT_ID: string;
  WHATSAPP_VERIFY_TOKEN: string;
}
```

## Message Flow Architecture

### Outbound Messages (Campaigns → WhatsApp)

```
Campaign Creation → Campaign Launch → Conversation DO → Messaging Service → WhatsApp Business API
```

1. **Campaign**: User creates WhatsApp campaign in UI
2. **Launch**: Campaign launch process creates conversations per customer
3. **Message Routing**: ConversationDO calls messaging service with `messageType: "whatsapp"`
4. **Provider Selection**: Messaging service routes to WhatsApp Business provider
5. **API Call**: Provider sends message via Facebook Graph API

### Inbound Messages (WhatsApp → Conversations)

```
WhatsApp API → Webhook → Conversation DO → Message Processing → AI/Response
```

1. **Webhook**: Facebook sends webhook to `/api/webhooks/whatsapp`
2. **Parsing**: Webhook parses WhatsApp message format
3. **Conversation Routing**: Creates/finds conversation DO by customer phone
4. **Message Storage**: Stores inbound message in conversation
5. **Processing**: Optional AI processing and auto-response

## API Examples

### Send WhatsApp Campaign Message

The existing campaign system works - just select "WhatsApp" as the campaign type:

```typescript
// Campaign creation automatically handles WhatsApp type
const campaign = await createCampaign({
  name: "Holiday Promotion",
  campaignType: "whatsapp", // 👈 This routes to WhatsApp
  messageContent: "🎄 Holiday Sale! 50% off everything!",
  messageSubject: "Holiday Sale", // WhatsApp title
  segmentIds: ["segment-123"],
  // ... other fields
});
```

### Send Template Message

```typescript
// Using your provided example structure
const templatePayload = {
  messaging_product: "whatsapp",
  to: "573164939358",
  type: "template",
  template: {
    name: "hello_world",
    language: { code: "en_US" },
  },
};
```

### Webhook Payload Example

```typescript
// Incoming message webhook
{
  object: "whatsapp_business_account",
  entry: [{
    id: "your_business_account_id",
    changes: [{
      value: {
        messaging_product: "whatsapp",
        metadata: {
          display_phone_number: "+15556529645",
          phone_number_id: "646664281870480"
        },
        messages: [{
          id: "wamid.123456",
          from: "573164939358",
          timestamp: "1699999999",
          type: "text",
          text: { body: "Hello!" }
        }]
      },
      field: "messages"
    }]
  }]
}
```

## Next Steps

### Immediate (Required for Production)

1. **Complete Provider Integration**:

   - Fix type issues in `WhatsAppBusinessMessageProviderLive`
   - Wire provider into messaging layer configuration
   - Test with your provided credentials

2. **Environment Setup**:

   - Add WhatsApp environment variables
   - Update environment type definitions
   - Configure webhook verification

3. **Campaign Integration**:
   - Update campaign launch to pass `messageType: "whatsapp"` for WhatsApp campaigns
   - Test end-to-end campaign flow

### Future Enhancements

1. **Template Management**:

   - UI for managing WhatsApp business templates
   - Dynamic template parameter injection
   - Template approval workflow

2. **Media Support**:

   - Image/document message handling
   - Media upload to WhatsApp Business API
   - Rich message formatting

3. **Advanced Features**:
   - WhatsApp Business profiles
   - Message reactions and replies
   - WhatsApp Business verified checkmarks

## Testing

### Test Webhook

```bash
curl -X GET "https://your-domain.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
# Should return: test123
```

### Test Campaign

1. Create WhatsApp campaign in UI
2. Select test segment with your phone number
3. Launch campaign
4. Verify message received on WhatsApp

### Test Incoming Message

1. Send WhatsApp message to +15556529645
2. Check logs for webhook processing
3. Verify conversation created in system
4. Check for AI responses (if enabled)

## Architecture Benefits

- **Channel Agnostic**: Same conversation infrastructure handles SMS, WhatsApp, email
- **Type Safety**: Full Effect-TS type safety throughout message pipeline
- **Scalability**: Durable Objects provide distributed conversation management
- **Observability**: Built-in tracing and logging via Effect spans
- **Error Handling**: Graceful degradation with Effect error types
- **Clean Architecture**: Clear separation between domain, application, and infrastructure layers

This integration maintains your existing patterns while extending capabilities to WhatsApp Business messaging.
