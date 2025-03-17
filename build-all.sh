#!/bin/bash

# Build for Linux
echo "Building for Linux..."
npm run build:linux

# Build for Windows
echo "Building for Windows..."
npm run build:win

# Note: Building for macOS requires a macOS system
echo "Note: Building for macOS requires a macOS system."
echo "To build for macOS, run 'npm run build:mac' on a macOS system."

# Copy all distribution files to the website downloads directory
echo "Copying distribution files to website..."
mkdir -p website/downloads
cp -r dist/*.AppImage website/downloads/
cp -r dist/*.exe website/downloads/ 2>/dev/null || echo "No Windows executables found."
cp -r dist/*.dmg website/downloads/ 2>/dev/null || echo "No macOS disk images found."

echo "Build complete! Distribution files are available in the 'dist' directory."
echo "Website files are available in the 'website' directory."
echo "To deploy the website, follow the instructions in website/README.md." 