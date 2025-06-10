-- Migration: Add unique constraint on externalMessageId to prevent duplicate message processing
-- Date: 2025-01-10

-- Add unique constraint to externalMessageId column
CREATE UNIQUE INDEX idx_message_external_message_id ON message(externalMessageId) WHERE externalMessageId IS NOT NULL; 
