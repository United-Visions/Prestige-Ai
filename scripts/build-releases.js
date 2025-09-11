#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const releaseDir = path.join(__dirname, '../release');
const downloadDir = path.join(__dirname, '../download-site/downloads');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  yellow: '\x1b[33m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`\n${colors.blue}${description}...${colors.reset}`);
  try {
    execSync(command, { stdio: 'inherit' });
    log(`${colors.green}✓ ${description} completed${colors.reset}`);
  } catch (error) {
    log(`${colors.red}✗ ${description} failed${colors.reset}`);
    throw error;
  }
}

function createDownloadDirectory() {
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
    log(`${colors.green}Created download directory: ${downloadDir}${colors.reset}`);
  }
}

function copyReleaseFiles() {
  log(`\n${colors.blue}Copying release files to download directory...${colors.reset}`);
  
  if (fs.existsSync(releaseDir)) {
    const files = fs.readdirSync(releaseDir);
    files.forEach(file => {
      if (file.endsWith('.dmg') || file.endsWith('.exe') || file.endsWith('.zip') || file.endsWith('.AppImage')) {
        const src = path.join(releaseDir, file);
        const dest = path.join(downloadDir, file);
        fs.copyFileSync(src, dest);
        log(`${colors.green}Copied: ${file}${colors.reset}`);
      }
    });
  }
}

function generateVersionInfo() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  const versionInfo = {
    version: packageJson.version,
    name: packageJson.productName || packageJson.name,
    description: packageJson.description,
    buildDate: new Date().toISOString(),
    files: []
  };

  if (fs.existsSync(downloadDir)) {
    const files = fs.readdirSync(downloadDir);
    files.forEach(file => {
      if (file.endsWith('.dmg') || file.endsWith('.exe') || file.endsWith('.zip') || file.endsWith('.AppImage')) {
        const stats = fs.statSync(path.join(downloadDir, file));
        versionInfo.files.push({
          name: file,
          size: stats.size,
          platform: getPlatformFromFilename(file)
        });
      }
    });
  }

  fs.writeFileSync(
    path.join(downloadDir, 'version.json'),
    JSON.stringify(versionInfo, null, 2)
  );
  
  log(`${colors.green}Generated version.json${colors.reset}`);
}

function getPlatformFromFilename(filename) {
  if (filename.includes('.dmg')) return 'macOS';
  if (filename.includes('.exe')) return 'Windows';
  if (filename.includes('.AppImage')) return 'Linux';
  if (filename.includes('mac')) return 'macOS';
  if (filename.includes('win')) return 'Windows';
  if (filename.includes('linux')) return 'Linux';
  return 'Unknown';
}

async function main() {
  try {
    log(`${colors.bright}${colors.blue}Starting Prestige-AI Release Build Process${colors.reset}`);
    
    // Clean previous builds
    execCommand('rm -rf release dist dist-electron', 'Cleaning previous builds');
    
    // Install dependencies
    execCommand('npm install', 'Installing dependencies');
    
    // Build for all platforms
    if (process.platform === 'darwin') {
      // On macOS, we can build for Mac and other platforms
      log(`${colors.yellow}Building for macOS...${colors.reset}`);
      execCommand('npm run build:mac', 'Building macOS version');
      
      log(`${colors.yellow}Building for Windows...${colors.reset}`);
      execCommand('npm run build:win', 'Building Windows version');
    } else if (process.platform === 'win32') {
      // On Windows, build for Windows
      log(`${colors.yellow}Building for Windows...${colors.reset}`);
      execCommand('npm run build:win', 'Building Windows version');
    } else {
      // On Linux, build for Linux
      log(`${colors.yellow}Building for Linux...${colors.reset}`);
      execCommand('npm run build:linux', 'Building Linux version');
    }
    
    // Create download directory and copy files
    createDownloadDirectory();
    copyReleaseFiles();
    generateVersionInfo();
    
    log(`\n${colors.bright}${colors.green}✓ Build process completed successfully!${colors.reset}`);
    log(`${colors.blue}Release files are available in: ${releaseDir}${colors.reset}`);
    log(`${colors.blue}Download files are available in: ${downloadDir}${colors.reset}`);
    
  } catch (error) {
    log(`\n${colors.red}Build process failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };