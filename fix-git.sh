#!/bin/bash
# Simple script to fix git branch issues

echo "🛠️ Whispher Pro Git Fix Tool 🛠️"
echo "================================="
echo "This script will help fix your Git issues."
echo

# Backup local changes just in case
echo "📦 Step 1: Creating backup of your changes..."
timestamp=$(date +%Y%m%d_%H%M%S)
backup_branch="backup_$timestamp"
git checkout -b $backup_branch
echo "✅ Created backup branch: $backup_branch"
echo

# Switch to the fresh-start branch
echo "🔄 Step 2: Switching to fresh-start branch..."
git fetch origin
git checkout fresh-start
echo "✅ Now on the fresh-start branch"
echo

echo "🎉 All done! Your repository is now on a clean branch."
echo
echo "If you had local changes that you need, they are saved in branch: $backup_branch"
echo "You can see your files with: git checkout $backup_branch"
echo
echo "Any large binary files (like .AppImage, .deb, .exe) should be uploaded directly"
echo "to GitHub Releases rather than committed to the repository."