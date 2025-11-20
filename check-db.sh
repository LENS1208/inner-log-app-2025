#!/bin/bash
# Database connection checker
# Last updated: 2025-11-17

CURRENT_URL=$(grep VITE_SUPABASE_URL .env | cut -d'=' -f2)
EXPECTED_URL="https://xjviqzyhephwkytwjmwd.supabase.co"

echo "=========================================="
echo "Database Connection Checker"
echo "=========================================="
echo ""

if [ -z "$CURRENT_URL" ]; then
    echo "❌ ERROR: .env file not found or VITE_SUPABASE_URL not set"
    echo ""
    echo "Creating .env from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from .env.example"
        echo "   Please run this script again to verify."
    else
        echo "❌ ERROR: .env.example not found"
        echo "   Please create .env manually with correct credentials."
    fi
    exit 1
fi

echo "Current database URL:"
echo "   $CURRENT_URL"
echo ""

if [ "$CURRENT_URL" = "$EXPECTED_URL" ]; then
    echo "✅ OK: Connected to correct database"
    echo "   Database ID: xjviqzyhephwkytwjmwd"
    echo ""
    echo "✅ Configuration is correct!"
    exit 0
else
    echo "⚠️  WARNING: Unexpected database URL"
    echo "   Expected: $EXPECTED_URL"
    echo "   Found: $CURRENT_URL"
    echo ""
    echo "Fixing automatically..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Fixed! Copied correct configuration from .env.example"
        echo ""
        echo "⚠️  IMPORTANT: Clear cache and rebuild:"
        echo "   rm -rf dist node_modules/.vite .vite"
        echo "   npm run build"
    else
        echo "❌ Cannot auto-fix: .env.example not found"
        echo "   Please update .env manually."
    fi
    exit 1
fi
