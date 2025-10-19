# Settings Page Cleanup

This document summarizes the changes made to clean up the settings page by removing the redundant data sync component.

## Changes Made

### 1. Removed Data Sync Component
- Removed the entire "数据同步" (Data Sync) section from the settings page
- This component was redundant since Supabase is now the primary storage method

### 2. Cleaned Up State Variables
- Removed unused imports:
  - `useTravelStore` (no longer needed since we removed the sync component)
- Removed unused state variables:
  - `syncStatus` and `lastSyncAt` from the useTravelStore hook

### 3. Updated Configuration State
- Removed unused sync API configuration fields from the settings page state:
  - `sync_api_base`
  - `sync_api_key`
- Kept these fields in the APIConfig type for backward compatibility
- Removed default values for these fields in the config store

### 4. Simplified Imports
- Removed unused imports from the settings page component

## Reasoning

The data sync component was removed because:

1. **Supabase is the primary storage**: The application now uses Supabase as the main data storage mechanism
2. **Redundancy**: The data sync component was a duplicate of the Supabase configuration
3. **Simplified user experience**: Users only need to configure Supabase, not multiple sync options
4. **Reduced confusion**: Having both Supabase and data sync components was confusing for users

## Backward Compatibility

While the UI components and default configurations were removed:
- The `sync_api_base` and `sync_api_key` fields are still present in the `APIConfig` type
- This maintains backward compatibility with any existing configurations
- The travel store still supports these fields as fallback options if Supabase is not configured

## Testing

To verify the changes:
1. Open the settings page
2. Confirm that the "数据同步" section is no longer visible
3. Confirm that all other settings sections work correctly
4. Confirm that Supabase configuration still works as expected