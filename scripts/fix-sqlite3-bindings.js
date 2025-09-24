#!/usr/bin/env node

/**
 * Post-install script to fix better-sqlite3 binary path issues
 * This ensures the binary is available at the expected location
 * for both development and production builds
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('🔧 Fixing better-sqlite3 binary paths...');

const nodeModulesDir = path.join(__dirname, '..', 'node_modules');
const sqlite3Dir = path.join(nodeModulesDir, 'better-sqlite3');

// Check if better-sqlite3 is installed
if (!fs.existsSync(sqlite3Dir)) {
  console.log('⚠️  better-sqlite3 not found, skipping binary fix');
  process.exit(0);
}

// Helper: attempt rebuild if missing
function attemptRebuild() {
  console.log('🛠  Attempting electron-rebuild for better-sqlite3...');
  const result = spawnSync(process.execPath, [
    require.resolve('.bin/electron-rebuild').replace(/\\/g, '/'),
    '-f',
    '-w',
    'better-sqlite3'
  ], { stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.warn('⚠️  electron-rebuild did not complete successfully. You may need to run `pnpm run rebuild` manually.');
  } else {
    console.log('✅ electron-rebuild completed.');
  }
}

// Find the actual binary
function locateBinary() {
  const binDir = path.join(sqlite3Dir, 'bin');
  if (fs.existsSync(binDir)) {
    const binSubdirs = fs.readdirSync(binDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    for (const subdir of binSubdirs) {
      const candidatePath = path.join(binDir, subdir, 'better-sqlite3.node');
      if (fs.existsSync(candidatePath)) {
        console.log(`✅ Found binary at: ${candidatePath}`);
        return candidatePath;
      }
    }
  }
  return null;
}

let binaryPath = locateBinary();

// If we did not find a binary, attempt rebuild once
if (!binaryPath) {
  console.log('ℹ️  No compiled better-sqlite3 binary found yet. Will attempt rebuild.');
  attemptRebuild();
  binaryPath = locateBinary();
}

if (!binaryPath) {
  console.log('⚠️  Could not find better-sqlite3 binary after rebuild attempt.');
  console.log('   Try manually running: pnpm run rebuild');
  console.log('⏭️  Continuing with build anyway...');
  process.exit(0); // Don't fail the build
}

// Create the expected directory structure
const expectedDir = path.join(sqlite3Dir, 'build');
const expectedPath = path.join(expectedDir, 'better_sqlite3.node');

try {
  // Ensure build directory exists
  if (!fs.existsSync(expectedDir)) {
    fs.mkdirSync(expectedDir, { recursive: true });
    console.log(`📁 Created directory: ${expectedDir}`);
  }

  // Copy binary to expected location
  if (!fs.existsSync(expectedPath)) {
    fs.copyFileSync(binaryPath, expectedPath);
    console.log(`📋 Copied binary to: ${expectedPath}`);
  } else {
    console.log(`✅ Binary already exists at: ${expectedPath}`);
  }

  // Also create additional expected paths for different architectures
  const additionalPaths = [
    path.join(sqlite3Dir, 'lib', 'binding'),
    path.join(sqlite3Dir, 'compiled', process.version.slice(1), process.platform, process.arch)
  ];

  for (const additionalDir of additionalPaths) {
    if (!fs.existsSync(additionalDir)) {
      fs.mkdirSync(additionalDir, { recursive: true });
      const additionalPath = path.join(additionalDir, 'better_sqlite3.node');
      if (!fs.existsSync(additionalPath)) {
        fs.copyFileSync(binaryPath, additionalPath);
        console.log(`📋 Created additional binary at: ${additionalPath}`);
      }
    }
  }

  console.log('✅ better-sqlite3 binary paths fixed successfully');
  
} catch (error) {
  console.error('❌ Error fixing binary paths:', error.message);
  process.exit(1);
}