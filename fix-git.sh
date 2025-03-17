#!/bin/bash

# fix-git.sh - A simple script to fix git branch issues
# For Whispher Pro Desktop repository

echo "===== Whispher Pro Git Fix Script ====="
echo "This script will help you fix Git branch issues"
echo

# Create a backup of the current branch
CURRENT_DATE=$(date +"%Y%m%d%H%M%S")
BACKUP_BRANCH="backup-$CURRENT_DATE"

echo "📋 Creating backup branch: $BACKUP_BRANCH"
git branch "$BACKUP_BRANCH"
echo "✅ Backup created! If anything goes wrong, your changes are safe in the '$BACKUP_BRANCH' branch"
echo

echo "📋 Fetching the latest changes from GitHub..."
git fetch origin
echo "✅ Done!"
echo

echo "📋 Switching to the clean fresh-start branch..."
git checkout fresh-start
echo "✅ Done!"
echo

echo "📋 Pulling the latest changes..."
git pull origin fresh-start
echo "✅ Done!"
echo

echo "======================================"
echo "🎉 All done! You are now on a clean branch called 'fresh-start'"
echo
echo "Your previous work is safely stored in the '$BACKUP_BRANCH' branch."
echo "If you need to access it, use: git checkout $BACKUP_BRANCH"
echo
echo "Next steps:"
echo "1. Continue working on this clean branch"
echo "2. Create a GitHub release as described in issue #9"
echo "======================================"