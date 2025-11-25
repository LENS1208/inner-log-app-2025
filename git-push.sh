#!/bin/bash

# Git Push Helper Script
# This script helps push changes to GitHub when Bolt UI is not working

echo "=== Git Push Helper ==="
echo ""
echo "Current git status:"
git status

echo ""
echo "To push to GitHub, you have two options:"
echo ""
echo "Option 1: Use GitHub Personal Access Token"
echo "  git push https://YOUR_TOKEN@github.com/LENS1208/inner-log-app-2025.git main"
echo ""
echo "Option 2: Use SSH (if you have SSH key configured)"
echo "  git remote set-url origin git@github.com:LENS1208/inner-log-app-2025.git"
echo "  git push origin main"
echo ""
echo "Note: You need to run these commands in a terminal with GitHub authentication."
