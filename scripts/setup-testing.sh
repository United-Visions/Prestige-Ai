#!/bin/bash

# Test setup script for Prestige-AI
# This script helps set up the testing environment

echo "🧪 Setting up Prestige-AI Testing Environment"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Playwright browsers with retry logic
echo "🎭 Installing Playwright browsers..."
for i in {1..3}; do
    echo "Attempt $i/3..."
    if npx playwright install; then
        echo "✅ Playwright browsers installed successfully"
        break
    elif [ $i -eq 3 ]; then
        echo "⚠️  Playwright browser installation failed after 3 attempts"
        echo "   You can run tests without browser installation, but E2E tests will fail"
        echo "   Try running: npm run test:install later"
        break
    else
        echo "❌ Attempt $i failed, retrying..."
        sleep 5
    fi
done

# Install system dependencies if on Linux
if command -v apt-get &> /dev/null; then
    echo "🐧 Installing Linux system dependencies..."
    if npx playwright install-deps; then
        echo "✅ System dependencies installed"
    else
        echo "⚠️  System dependencies installation failed (may need sudo)"
    fi
fi

# Run unit tests to verify setup
echo "🧪 Running unit tests to verify setup..."
if npm run test:unit; then
    echo "✅ Unit tests passed! Setup is working correctly."
else
    echo "❌ Unit tests failed. Please check the setup."
    exit 1
fi

echo ""
echo "🎉 Testing environment setup complete!"
echo ""
echo "Available test commands:"
echo "  npm test                 # Run all tests"
echo "  npm run test:unit        # Unit tests only"
echo "  npm run test:component   # Component tests"
echo "  npm run test:e2e         # End-to-end tests"
echo "  npm run test:integration # Integration tests"
echo ""
echo "For more information, see TESTING.md"