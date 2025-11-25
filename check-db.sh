#!/bin/bash

# Database Configuration Comprehensive Check Script
# Last updated: 2025-11-20
# Usage: ./check-db.sh

EXPECTED_DB="xjviqzyhephwkytwjmwd"
FORBIDDEN_DB1="zcflpkmxeupharqbaymc"
FORBIDDEN_DB2="xvqpsnrcmkvngxrinjyf"

echo "=========================================="
echo "🔍 Database Configuration Check"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# Check 1: .env file
echo "📄 Checking .env file..."
if [ -f .env ]; then
    url=$(grep VITE_SUPABASE_URL .env | cut -d'=' -f2)
    if echo "$url" | grep -q "$EXPECTED_DB"; then
        echo -e "${GREEN}✅ .env: Correct database ($EXPECTED_DB)${NC}"
    elif echo "$url" | grep -q "$FORBIDDEN_DB1"; then
        echo -e "${RED}❌ .env: FORBIDDEN database detected ($FORBIDDEN_DB1)${NC}"
        errors=$((errors + 1))
    elif echo "$url" | grep -q "$FORBIDDEN_DB2"; then
        echo -e "${RED}❌ .env: FORBIDDEN database detected ($FORBIDDEN_DB2)${NC}"
        errors=$((errors + 1))
    else
        echo -e "${YELLOW}⚠️  .env: Unexpected database${NC}"
        warnings=$((warnings + 1))
    fi
else
    echo -e "${RED}❌ .env: File not found${NC}"
    errors=$((errors + 1))
fi
echo ""

# Check 2: .env.local file
echo "📄 Checking .env.local file..."
if [ -f .env.local ]; then
    url=$(grep VITE_SUPABASE_URL .env.local | cut -d'=' -f2)
    perms=$(stat -c %a .env.local 2>/dev/null || stat -f %A .env.local 2>/dev/null)

    if echo "$url" | grep -q "$EXPECTED_DB"; then
        echo -e "${GREEN}✅ .env.local: Correct database ($EXPECTED_DB)${NC}"
    elif echo "$url" | grep -q "$FORBIDDEN_DB1"; then
        echo -e "${RED}❌ .env.local: FORBIDDEN database detected ($FORBIDDEN_DB1)${NC}"
        errors=$((errors + 1))
    elif echo "$url" | grep -q "$FORBIDDEN_DB2"; then
        echo -e "${RED}❌ .env.local: FORBIDDEN database detected ($FORBIDDEN_DB2)${NC}"
        errors=$((errors + 1))
    else
        echo -e "${YELLOW}⚠️  .env.local: Unexpected database${NC}"
        warnings=$((warnings + 1))
    fi

    if [ "$perms" = "444" ]; then
        echo -e "${GREEN}✅ .env.local: Read-only (locked)${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.local: Not read-only (permissions: $perms)${NC}"
        echo -e "${YELLOW}   Run: chmod 444 .env.local${NC}"
        warnings=$((warnings + 1))
    fi
else
    echo -e "${YELLOW}⚠️  .env.local: File not found${NC}"
    echo -e "${YELLOW}   This file should exist and be locked${NC}"
    warnings=$((warnings + 1))
fi
echo ""

# Check 3: .env.development file
echo "📄 Checking .env.development file..."
if [ -f .env.development ]; then
    url=$(grep VITE_SUPABASE_URL .env.development | cut -d'=' -f2)
    if echo "$url" | grep -q "$EXPECTED_DB"; then
        echo -e "${GREEN}✅ .env.development: Correct database ($EXPECTED_DB)${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.development: Unexpected or missing database${NC}"
        warnings=$((warnings + 1))
    fi
else
    echo -e "${YELLOW}⚠️  .env.development: File not found${NC}"
    warnings=$((warnings + 1))
fi
echo ""

# Check 4: .env.production file
echo "📄 Checking .env.production file..."
if [ -f .env.production ]; then
    url=$(grep VITE_SUPABASE_URL .env.production | cut -d'=' -f2)
    if echo "$url" | grep -q "$EXPECTED_DB"; then
        echo -e "${GREEN}✅ .env.production: Correct database ($EXPECTED_DB)${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.production: Unexpected or missing database${NC}"
        warnings=$((warnings + 1))
    fi
else
    echo -e "${YELLOW}⚠️  .env.production: File not found${NC}"
    warnings=$((warnings + 1))
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Summary"
echo "=========================================="
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo -e "${GREEN}✅ Database configuration is correct.${NC}"
    exit 0
elif [ $errors -gt 0 ]; then
    echo -e "${RED}❌ Found $errors error(s)${NC}"
    echo -e "${YELLOW}⚠️  Found $warnings warning(s)${NC}"
    echo ""
    echo -e "${RED}ACTION REQUIRED:${NC}"
    echo "1. Fix the errors listed above"
    echo "2. Run this script again to verify"
    echo ""
    echo "Quick fix commands:"
    echo "  rm .env.local"
    echo "  cp .env.development .env.local"
    echo "  chmod 444 .env.local"
    echo "  ./check-db.sh"
    exit 1
else
    echo -e "${YELLOW}⚠️  Found $warnings warning(s)${NC}"
    echo -e "${GREEN}✅ No critical errors found${NC}"
    echo ""
    echo "Consider fixing the warnings above for optimal setup."
    exit 0
fi
