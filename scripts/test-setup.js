#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Prestige-AI setup...\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found. Make sure you\'re in the Prestige-Ai directory.');
  process.exit(1);
}

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.name !== 'prestige-ai') {
    console.error('❌ Error: Not in Prestige-AI directory. Current package:', packageJson.name);
    process.exit(1);
  }
  
  console.log('✅ Found Prestige-AI package.json');
  
  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`✅ Node.js version: ${nodeVersion}`);
  
  // Check if dependencies are installed
  if (!fs.existsSync('node_modules')) {
    console.log('⚠️  node_modules not found. Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  } else {
    console.log('✅ node_modules found');
  }
  
  // Check for Claude Code CLI
  try {
    execSync('claude --version', { stdio: 'pipe' });
    console.log('✅ Claude Code CLI is available');
  } catch (error) {
    console.log('⚠️  Claude Code CLI not found (will use simulation mode)');
    console.log('   Install with: npm install -g @anthropic/claude');
  }
  
  console.log('\n🚀 Setup looks good! You can now run:');
  console.log('   npm start        - Launch with automatic CLI detection');
  console.log('   npm run electron:dev - Direct Electron development mode');
  console.log('   npm run dev      - Web-only mode');
  
} catch (error) {
  console.error('❌ Error during setup check:', error.message);
  process.exit(1);
}