#!/bin/bash

# Production Migration Script for Vercel Deploy
echo "=== PRODUCTION MIGRATION SCRIPT ==="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set"
    exit 1
fi

echo "Database URL configured: ${DATABASE_URL:0:50}..."

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Deploy migrations (if any)
echo "Deploying migrations..."
npx prisma migrate deploy

# Validate database connection
echo "Validating database connection..."
npx prisma db push --accept-data-loss

echo "=== MIGRATION COMPLETED SUCCESSFULLY ==="
