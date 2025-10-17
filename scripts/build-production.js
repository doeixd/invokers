#!/usr/bin/env node

/**
 * Production Build Script for Invokers Library
 *
 * This script creates a production build by removing debug logging code
 * and building the library without development overhead.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '..', 'src');
const TEMP_DIR = path.join(__dirname, '..', 'temp-src');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Regex to match debug logging blocks - handles multiple variations
const DEBUG_BLOCK_REGEX = /if\s*\(\s*(?:typeof\s+window\s+!==\s*['"]undefined['"]\s+&&\s*)?\(\s*window\s+as\s+any\)\.Invoker(?:\?\.)?debug\s*\)\s*\{[\s\S]*?\}/g;

// Regex to match individual debug console statements (fallback) - handles multiple variations
const DEBUG_CONSOLE_REGEX = /if\s*\(\s*(?:typeof\s+window\s+!==\s*['"]undefined['"]\s+&&\s*)?\(\s*window\s+as\s+any\)\.Invoker(?:\?\.)?debug\s*\)\s*\{\s*console\.(log|warn|error)\([^;]*\);\s*\}/g;

/**
 * Recursively get all TypeScript files
 */
function getTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      getTsFiles(fullPath, files);
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Remove debug logging from a file
 */
function removeDebugLogging(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // First try to remove entire debug blocks
  let cleaned = content.replace(DEBUG_BLOCK_REGEX, '');

  // Fallback: remove individual debug console statements
  cleaned = cleaned.replace(DEBUG_CONSOLE_REGEX, '');

  // Remove any leftover empty lines that might have been created
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

  return cleaned;
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Clean up temporary directory
 */
function cleanup() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    console.log('✅ Cleaned up temporary directory');
  }
}

/**
 * Main build process
 */
async function buildProduction() {
  try {
    console.log('🚀 Starting production build process...');

    // Clean up any existing temp directory
    cleanup();

    // Create temp directory
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    console.log('📁 Created temporary directory');

    // Copy src to temp directory
    copyDir(SRC_DIR, TEMP_DIR);
    console.log('📋 Copied source files to temp directory');

    // Get all TypeScript files
    const tsFiles = getTsFiles(TEMP_DIR);
    console.log(`📝 Found ${tsFiles.length} TypeScript files to process`);

    // Process each file to remove debug logging
    let processedCount = 0;
    for (const filePath of tsFiles) {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const cleanedContent = removeDebugLogging(filePath);

      if (originalContent !== cleanedContent) {
        fs.writeFileSync(filePath, cleanedContent);
        processedCount++;
      }
    }

    console.log(`🧹 Removed debug logging from ${processedCount} files`);

    // Change to temp directory and run build
    const originalCwd = process.cwd();
    process.chdir(path.dirname(TEMP_DIR));

    console.log('🔨 Running production build...');

    // Run the build command
    execSync('npm run build', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    // Change back to original directory
    process.chdir(originalCwd);

    console.log('✅ Production build completed successfully!');
    console.log(`📦 Build output available in: ${DIST_DIR}`);

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  } finally {
    // Always clean up
    cleanup();
  }
}

// Run the build
if (require.main === module) {
  buildProduction();
}

module.exports = { buildProduction, removeDebugLogging };