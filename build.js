#!/usr/bin/env node

/**
 * Whispher Pro Build Script
 * This script builds the application for Windows and Linux platforms.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Log with color
function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

// Execute shell command and return output
function exec(command, options = {}) {
  log(`Executing: ${colors.dim}${command}${colors.reset}`, colors.blue);
  try {
    return execSync(command, {
      stdio: 'inherit',
      ...options
    });
  } catch (error) {
    log(`Error executing command: ${command}`, colors.red);
    log(error.message, colors.red);
    process.exit(1);
  }
}

// Clean dist directory
function cleanDist() {
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    log('Cleaning dist directory...', colors.yellow);
    try {
      fs.rmSync(distPath, { recursive: true, force: true });
      log('Dist directory cleaned successfully.', colors.green);
    } catch (error) {
      log(`Error cleaning dist directory: ${error.message}`, colors.red);
    }
  } else {
    log('Dist directory does not exist, skipping clean.', colors.yellow);
  }
}

// Build for Windows
function buildWindows() {
  log('Starting Windows build...', colors.bright + colors.blue);
  log('Building for Windows 10/11 (x64)...', colors.blue);
  exec('npm run build:win');
  
  log('Building for Windows 7 (x64/ia32)...', colors.blue);
  exec('npm run build:win7');
  
  log('Windows builds completed successfully!', colors.green);
}

// Build for Linux
function buildLinux() {
  log('Starting Linux build...', colors.bright + colors.blue);
  exec('npm run build:linux');
  log('Linux build completed successfully!', colors.green);
}

// Main build process
function build() {
  const args = process.argv.slice(2);
  const buildWindows = args.includes('--win') || args.length === 0;
  const buildLinuxOnly = args.includes('--linux');
  
  log('===============================', colors.bright + colors.cyan);
  log('   WHISPHER PRO BUILD SCRIPT   ', colors.bright + colors.cyan);
  log('===============================', colors.bright + colors.cyan);
  
  // Clean dist directory
  cleanDist();
  
  // Install dependencies if node_modules doesn't exist
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    log('Installing dependencies...', colors.yellow);
    exec('npm install');
  }
  
  if (buildWindows && !buildLinuxOnly) {
    buildWindows();
  }
  
  if (buildLinuxOnly || args.length === 0) {
    buildLinux();
  }
  
  log('Build process completed successfully!', colors.bright + colors.green);
  log(`Check the ${colors.bright}dist${colors.reset} directory for the build outputs.`, colors.cyan);
}

// Run the build process
build(); 