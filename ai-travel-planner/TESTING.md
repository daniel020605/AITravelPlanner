# Testing Guide

This guide explains how to test the Supabase integration in the AI Travel Planner application.

## Manual Testing

### Prerequisites
1. Set up a Supabase project following the instructions in [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
2. Configure the Supabase URL and Anon Key in the application settings

### Test Steps

1. **Test Plan Creation**
   - Log in to the application
   - Navigate to the travel plans page
   - Create a new travel plan
   - Verify the plan appears in the list
   - Check the Supabase table browser to confirm the plan was saved

2. **Test Plan Update**
   - Edit an existing travel plan
   - Make changes to the title, destination, or other fields
   - Save the changes
   - Verify the changes are reflected in the UI
   - Check the Supabase table browser to confirm the update was saved

3. **Test Plan Deletion**
   - Delete a travel plan
   - Verify the plan is removed from the list
   - Check the Supabase table browser to confirm the plan was deleted

4. **Test Expense Management**
   - Add expenses to a travel plan
   - Edit an existing expense
   - Delete an expense
   - Verify all changes are reflected in the UI and Supabase

5. **Test Data Sync**
   - Use the "立即同步" button in the settings page
   - Verify that data is properly synchronized between local storage and Supabase

## Automated Testing

To set up automated testing, you would need to:

1. Install testing dependencies:
   ```bash
   npm install -D vitest @vitest/ui jsdom @testing-library/react
   ```

2. Add test scripts to package.json:
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:run": "vitest run"
     }
   }
   ```

3. Create test files with the `.test.ts` or `.test.tsx` extension

4. Run tests with:
   ```bash
   npm run test
   ```