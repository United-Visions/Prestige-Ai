#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

/**
 * Organize builds into version-based folders with platform subfolders
 */
class BuildOrganizer {
  constructor() {
    this.version = `v${packageJson.version}`;
    this.buildsDir = path.join(__dirname, '..', 'builds');
    this.versionDir = path.join(this.buildsDir, this.version);
    this.platforms = ['mac', 'windows', 'linux'];
  }

  /**
   * Create the folder structure for the current version
   */
  createFolderStructure() {
    console.log(`📁 Creating build structure for ${this.version}...`);
    
    // Create main builds directory
    if (!fs.existsSync(this.buildsDir)) {
      fs.mkdirSync(this.buildsDir, { recursive: true });
    }

    // Create version directory
    if (!fs.existsSync(this.versionDir)) {
      fs.mkdirSync(this.versionDir, { recursive: true });
    }

    // Create platform directories
    this.platforms.forEach(platform => {
      const platformDir = path.join(this.versionDir, platform);
      if (!fs.existsSync(platformDir)) {
        fs.mkdirSync(platformDir, { recursive: true });
        
        // Create .gitkeep to track empty directories
        const gitkeepPath = path.join(platformDir, '.gitkeep');
        fs.writeFileSync(gitkeepPath, '# Keep this directory in git\n');
        
        console.log(`  ✅ Created: builds/${this.version}/${platform}/`);
      }
    });
  }

  /**
   * Move files from release/ to organized structure
   */
  organizeBuildFiles() {
    const releaseDir = path.join(__dirname, '..', 'release');
    
    if (!fs.existsSync(releaseDir)) {
      console.log('ℹ️  No release/ directory found - this is expected for new builds');
      return;
    }

    console.log(`📦 Organizing build files from release/ to ${this.version}...`);

    const files = fs.readdirSync(releaseDir);
    
    files.forEach(file => {
      const filePath = path.join(releaseDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile() && this.isBuildFile(file)) {
        const platform = this.detectPlatform(file);
        if (platform) {
          const destDir = path.join(this.versionDir, platform);
          const destPath = path.join(destDir, file);
          
          try {
            fs.copyFileSync(filePath, destPath);
            console.log(`  📄 ${file} → ${platform}/`);
          } catch (error) {
            console.error(`  ❌ Failed to copy ${file}:`, error.message);
          }
        }
      }
    });
  }

  /**
   * Check if file is a build artifact
   */
  isBuildFile(filename) {
    const buildExtensions = ['.dmg', '.exe', '.zip', '.tar.gz', '.AppImage', '.deb', '.rpm'];
    return buildExtensions.some(ext => filename.toLowerCase().endsWith(ext.toLowerCase()));
  }

  /**
   * Detect platform from filename
   */
  detectPlatform(filename) {
    const lower = filename.toLowerCase();
    
    if (lower.includes('mac') || lower.endsWith('.dmg')) {
      return 'mac';
    }
    
    if (lower.includes('win') || lower.endsWith('.exe')) {
      return 'windows';
    }
    
    if (lower.includes('linux') || lower.endsWith('.appimage') || 
        lower.endsWith('.deb') || lower.endsWith('.rpm') || 
        lower.endsWith('.tar.gz')) {
      return 'linux';
    }
    
    return null;
  }

  /**
   * Generate build summary
   */
  generateSummary() {
    const summaryPath = path.join(this.versionDir, 'build-summary.md');
    const timestamp = new Date().toISOString();
    
    let summary = `# Build Summary - ${this.version}\n\n`;
    summary += `**Built**: ${timestamp}\n`;
    summary += `**Version**: ${packageJson.version}\n\n`;
    summary += `## Platform Builds\n\n`;

    this.platforms.forEach(platform => {
      const platformDir = path.join(this.versionDir, platform);
      summary += `### ${platform.charAt(0).toUpperCase() + platform.slice(1)}\n`;
      
      if (fs.existsSync(platformDir)) {
        const files = fs.readdirSync(platformDir)
          .filter(file => file !== '.gitkeep' && this.isBuildFile(file));
        
        if (files.length > 0) {
          files.forEach(file => {
            const filePath = path.join(platformDir, file);
            const stats = fs.statSync(filePath);
            const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            summary += `- \`${file}\` (${sizeInMB} MB)\n`;
          });
        } else {
          summary += `- No builds found\n`;
        }
      } else {
        summary += `- Directory not created\n`;
      }
      summary += `\n`;
    });

    summary += `## Auto-Update Notes\n\n`;
    summary += `- Upload files to GitHub Release \`${this.version}\`\n`;
    summary += `- Maintain platform folder structure in release\n`;
    summary += `- Auto-updater will detect and download appropriate platform\n`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`📋 Generated: ${this.version}/build-summary.md`);
  }

  /**
   * Clean current version directory
   */
  clean() {
    if (fs.existsSync(this.versionDir)) {
      console.log(`🧹 Cleaning ${this.version} directory...`);
      fs.rmSync(this.versionDir, { recursive: true, force: true });
      console.log(`  ✅ Removed: builds/${this.version}/`);
    } else {
      console.log(`ℹ️  No ${this.version} directory to clean`);
    }
  }

  /**
   * Run the full organization process
   */
  run() {
    console.log(`🚀 Prestige AI Build Organizer - ${this.version}\n`);
    
    this.createFolderStructure();
    this.organizeBuildFiles();
    this.generateSummary();
    
    console.log(`\n✅ Build organization complete!`);
    console.log(`📁 Files organized in: builds/${this.version}/`);
    console.log(`📋 Summary available: builds/${this.version}/build-summary.md`);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const organizer = new BuildOrganizer();

if (args.includes('--clean')) {
  organizer.clean();
} else if (args.includes('--structure-only')) {
  organizer.createFolderStructure();
} else {
  organizer.run();
}