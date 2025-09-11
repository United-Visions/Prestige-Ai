#!/usr/bin/env node

const { spawn } = require('child_process');
const { writeFileSync, unlinkSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

console.log('🔍 Testing Claude Code CLI integration...\n');

// Test 1: Check if Claude CLI is available
console.log('1. Checking Claude CLI availability...');
const versionCheck = spawn('claude', ['--version'], { 
  shell: true, 
  stdio: ['ignore', 'pipe', 'pipe'] 
});

let versionOutput = '';
let versionError = '';

versionCheck.stdout?.on('data', (data) => {
  versionOutput += data.toString();
});

versionCheck.stderr?.on('data', (data) => {
  versionError += data.toString();
});

versionCheck.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Claude CLI is available');
    console.log('   Version:', versionOutput.trim());
    
    // Test 2: Check authentication
    console.log('\n2. Testing Claude CLI authentication and execution...');
    testAuthentication();
  } else {
    console.log('❌ Claude CLI not found or not working');
    console.log('   Exit code:', code);
    if (versionError) {
      console.log('   Error:', versionError.trim());
    }
    console.log('\n💡 To install Claude CLI:');
    console.log('   npm install -g @anthropic/claude');
    console.log('   claude login');
    process.exit(1);
  }
});

versionCheck.on('error', (err) => {
  console.log('❌ Failed to check Claude CLI:', err.message);
  console.log('\n💡 To install Claude CLI:');
  console.log('   npm install -g @anthropic/claude');
  console.log('   claude login');
  process.exit(1);
});

function testAuthentication() {
  // Create a simple test prompt
  const testPrompt = 'You are working in a development environment. Please help with the following request and create any necessary files or code as requested:\n\nSay hello and confirm you are working correctly.';
  const tempFileName = `prestige-claude-test-${Date.now()}.txt`;
  const tempFilePath = join(tmpdir(), tempFileName);
  
  try {
    writeFileSync(tempFilePath, testPrompt, 'utf8');
    console.log('   Created test prompt file:', tempFilePath);
    
    const testProcess = spawn('claude', [
      '--continue',
      '--print',
      '--dangerously-skip-permissions',
      tempFilePath
    ], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let testOutput = '';
    let testError = '';

    testProcess.stdout?.on('data', (data) => {
      testOutput += data.toString();
    });

    testProcess.stderr?.on('data', (data) => {
      testError += data.toString();
    });

    testProcess.on('close', (code) => {
      // Cleanup
      try {
        unlinkSync(tempFilePath);
        console.log('   Cleaned up test file');
      } catch (e) {
        console.warn('   Warning: Could not clean up test file');
      }
      
      console.log('\n📊 Test Results:');
      console.log('   Exit code:', code);
      console.log('   Output length:', testOutput.length);
      console.log('   Error length:', testError.length);
      
      if (code === 0) {
        console.log('✅ Claude CLI authentication and execution working');
        console.log('   Response preview:', testOutput.substring(0, 200) + '...');
        console.log('\n🎉 Setup is complete! Claude Code CLI is ready to use.');
      } else {
        console.log('❌ Claude CLI execution failed');
        console.log('   Exit code:', code);
        
        if (testError.trim()) {
          console.log('\n🔍 Error Details:');
          console.log('   STDERR:', testError.trim());
        }
        
        if (testOutput.trim()) {
          console.log('\n🔍 Output Details:');
          console.log('   STDOUT:', testOutput.trim());
        }
        
        console.log('\n🔧 Troubleshooting Steps:');
        console.log('   1. Check authentication: claude login');
        console.log('   2. Verify API key: echo $ANTHROPIC_API_KEY');
        console.log('   3. Test basic command: claude --help');
        console.log('   4. Check permissions in current directory');
        console.log('   5. Try running from home directory');
        console.log('   6. Check network connectivity to Anthropic services');
      }
    });

    testProcess.on('error', (err) => {
      try {
        unlinkSync(tempFilePath);
      } catch (e) {}
      
      console.log('❌ Failed to execute Claude CLI:', err.message);
      console.log('\n🔧 Possible solutions:');
      console.log('   1. Run: claude login');
      console.log('   2. Check your Anthropic API key');
      console.log('   3. Verify Claude CLI installation');
    });
    
  } catch (err) {
    console.log('❌ Failed to create test file:', err.message);
  }
}