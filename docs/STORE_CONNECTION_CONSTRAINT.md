# Store Connection Constraint Change

## Overview

This change implements a **global uniqueness constraint** on Shopify store connections to ensure that each Shopify store can only be connected to **one organization** at a time.

## What Changed

### Before

- **Database constraint**: `UNIQUE(organizationId, shopDomain)` - prevented same org from connecting to same shop multiple times
- **Behavior**: Different organizations could connect to the same Shopify store
- **Problem**: This violated Shopify's app installation model and could cause webhook/data conflicts

### After

- **Database constraint**: `UNIQUE(shopDomain)` - prevents ANY organization from connecting to a shop that's already connected elsewhere
- **Behavior**: Each Shopify store can only be connected to one organization globally
- **Benefit**: Matches Shopify's app installation model and prevents data conflicts

## Database Migration

**Migration file**: `drizzle/tenant/0001_outgoing_sunset_bain.sql`

```sql
DROP INDEX `connected_store_organizationId_shopDomain_unique`;
CREATE UNIQUE INDEX `connected_store_shopDomain_unique` ON `connected_store` (`shopDomain`);
```

## Error Handling

### Database Level

- **Constraint violation**: `UNIQUE constraint failed: connected_store.shopDomain`
- **Result**: Insert/update operations fail with database error

### Application Level

- **Pre-check**: Verify shop availability before connection attempt
- **Error message**: "Shop '{domain}' is already connected to another organization. Each Shopify store can only be connected to one organization at a time."

### UI Level

- **Early validation**: Check existing connections before OAuth flow
- **Clear messaging**: Display specific error about shop already being connected
- **Fallback handling**: Graceful error display instead of generic failures

## Impact on Existing Data

### If No Duplicate Connections Exist

- ✅ Migration will succeed
- ✅ All existing connections remain intact
- ✅ New constraint takes effect immediately

### If Duplicate Connections Exist

- ❌ Migration will fail
- 🔧 **Required action**: Manual cleanup of duplicate connections before migration
- 📝 **Recommended**: Keep the connection for the organization that installed the app most recently

## Checking for Duplicates

```sql
-- Find shops connected to multiple organizations
SELECT shopDomain, COUNT(*) as connection_count, GROUP_CONCAT(organizationId) as organizations
FROM connected_store
GROUP BY shopDomain
HAVING COUNT(*) > 1;
```

## Cleanup Process (if needed)

1. **Identify duplicates** using the query above
2. **Determine correct organization** for each shop (usually most recent connection)
3. **Remove incorrect connections**:
   ```sql
   DELETE FROM connected_store
   WHERE shopDomain = 'shop.myshopify.com'
   AND organizationId != 'correct-org-id';
   ```
4. **Run migration** after cleanup

## Business Logic Changes

### OAuth Flow

- **Added**: Pre-connection availability check
- **Enhanced**: Better error messaging for already-connected shops
- **Improved**: Prevents users from starting OAuth for unavailable shops

### Store Management

- **Validation**: Ensures shop is available before connection attempts
- **Error handling**: Specific error types for different failure scenarios
- **User experience**: Clear guidance on resolving connection conflicts

## Testing

### Updated Tests

- ✅ Removed test that allowed multiple organizations per shop
- ✅ Added test verifying constraint enforcement
- ✅ Added test for proper error message formatting
- ✅ Added test for organization-specific store validation

### Manual Testing Scenarios

1. **Happy path**: Connect shop to organization (should work)
2. **Duplicate attempt**: Try connecting already-connected shop (should fail with clear error)
3. **Same org retry**: Reconnect shop to same organization (should work/update)
4. **Migration**: Verify constraint is properly enforced after migration

## Rollback Plan

If issues arise, the constraint can be temporarily removed:

```sql
DROP INDEX `connected_store_shopDomain_unique`;
CREATE UNIQUE INDEX `connected_store_organizationId_shopDomain_unique` ON `connected_store` (`organizationId`, `shopDomain`);
```

However, this should only be done as a last resort and requires careful consideration of the business implications.

## Future Considerations

### Store Transfer Feature

If business requirements change to allow transferring stores between organizations:

1. **Implement transfer workflow**: Proper disconnection from source + connection to target
2. **Add transfer permissions**: Ensure both organizations approve the transfer
3. **Maintain audit trail**: Track store ownership history
4. **Handle webhooks**: Properly manage webhook registrations during transfer

### Multi-Store Management

Organizations can still connect multiple stores:

- ✅ `org-1` → [`shop1.myshopify.com`, `shop2.myshopify.com`, `shop3.myshopify.com`]
- ❌ `org-1` → [`shop1.myshopify.com`] AND `org-2` → [`shop1.myshopify.com`]

This maintains the one-to-many relationship from organizations to stores while enforcing one-to-one from stores to organizations.
