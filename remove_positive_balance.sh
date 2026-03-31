#!/bin/bash

# Remove positive balance implementation from frontend
# This script removes all positive balance related files and reverts changes

echo "🗑️ Removing positive balance implementation..."

# Remove positive balance component files
rm -f components/PositiveBalanceManager.tsx

# Revert payment service changes
git checkout HEAD~ -- services/paymentServiceFixed.ts

# Revert treatments-completados page changes
git checkout HEAD~ -- app/\(auth\)/tratamientos-completados/page.tsx

# Remove the service file
rm -f services/patientBalanceService.ts

# Remove database migration files
rm -f database/migrations/setup_complete_positive_balance_system.sql
rm -f database/migrations/add_patient_positive_balance.sql
rm -f database/migrations/retroactive_samir_balance_application.sql
rm -f database/migrations/setup_jane_doe_positive_balance.sql
rm -f database/migrations/remove_positive_balance_implementation.sql

echo "✅ Positive balance implementation removed from frontend"
echo "✅ Component files deleted"
echo "✅ Service files reverted"
echo "✅ Migration files cleaned up"
echo ""
echo "🎯 To complete removal:"
echo "1. Run remove_positive_balance_implementation.sql in Supabase"
echo "2. Commit the changes: git add . && git commit -m 'Remove positive balance implementation'"
echo ""
echo "⚠️ Make sure to test that everything works correctly after removal"
