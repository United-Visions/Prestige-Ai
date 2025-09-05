#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🌟 Starting Prestige-AI in development mode...\n');

// Check if Claude Code CLI is available
const checkClaude = spawn('claude', ['--version'], { 
  shell: true, 
  stdio: ['ignore', 'pipe', 'pipe'] 
});

checkClaude.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Claude Code CLI detected - full functionality available');
  } else {
    console.log('⚠️  Claude Code CLI not found - will run in simulation mode');
    console.log('   Install with: npm install -g @anthropic/claude');
  }
  
  console.log('\n🚀 Launching Electron app...\n');
  
  // Start the Electron app
  const electronDev = spawn('npm', ['run', 'electron:dev'], {
    shell: true,
    stdio: 'inherit',
    cwd: path.dirname(__dirname)
  });

  electronDev.on('close', (code) => {
    console.log(`\n👋 Prestige-AI closed with code ${code}`);
    process.exit(code);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    electronDev.kill('SIGINT');
  });
});

checkClaude.on('error', () => {
  console.log('⚠️  Claude Code CLI not found - will run in simulation mode');
  console.log('   Install with: npm install -g @anthropic/claude\n');
  
  console.log('🚀 Launching Electron app...\n');
  
  const electronDev = spawn('npm', ['run', 'electron:dev'], {
    shell: true,
    stdio: 'inherit',
    cwd: path.dirname(__dirname)
  });

  electronDev.on('close', (code) => {
    console.log(`\n👋 Prestige-AI closed with code ${code}`);
    process.exit(code);
  });

  process.on('SIGINT', () => {
    electronDev.kill('SIGINT');
  });
});