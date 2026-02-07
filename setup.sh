#!/bin/bash
#
# UWtopia Rx V5.1 - Complete Setup Script
# One-command installation for Termux
# 
# Usage: bash setup.sh
#

set -e  # Exit on any error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  UWtopia Rx V5.1 - Production Setup"
echo "  Medical Quiz Application - Complete Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# STEP 1: Verify Prerequisites
# ============================================================================

echo "📋 Step 1: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing..."
    pkg install nodejs -y
else
    NODE_VERSION=$(node --version)
    echo "✓ Node.js: $NODE_VERSION"
fi

# Check Python
if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Installing..."
    pkg install python -y
else
    PYTHON_VERSION=$(python --version)
    echo "✓ Python: $PYTHON_VERSION"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo "✓ npm: $NPM_VERSION"
fi

echo ""

# ============================================================================
# STEP 2: Install Global Tools
# ============================================================================

echo "🔧 Step 2: Installing global tools..."

# Check if expo-cli is installed
if ! npm list -g expo-cli &> /dev/null; then
    echo "  Installing expo-cli..."
    npm install -g expo-cli
else
    echo "✓ expo-cli already installed"
fi

# Check if eas-cli is installed
if ! npm list -g eas-cli &> /dev/null; then
    echo "  Installing eas-cli..."
    npm install -g eas-cli
else
    echo "✓ eas-cli already installed"
fi

echo ""

# ============================================================================
# STEP 3: Install Python Dependencies
# ============================================================================

echo "🐍 Step 3: Installing Python dependencies..."

if ! python -c "import PIL" &> /dev/null; then
    echo "  Installing Pillow..."
    pip install Pillow --break-system-packages
else
    echo "✓ Pillow already installed"
fi

echo ""

# ============================================================================
# STEP 4: Create Project Structure
# ============================================================================

echo "📁 Step 4: Setting up project structure..."

# Create assets directory
mkdir -p assets

# Copy questions to assets
if [ -f "questions_original.json" ]; then
    cp questions_original.json assets/uwtopia_rx_questions.json
    echo "✓ Questions copied to assets/"
else
    echo "⚠️  Warning: questions_original.json not found"
    echo "   The app will not have question data!"
fi

echo ""

# ============================================================================
# STEP 5: Generate App Assets
# ============================================================================

echo "🎨 Step 5: Generating app icons and splash screen..."

if [ -f "generate_assets.py" ]; then
    python generate_assets.py
    
    if [ -f "assets/icon.png" ] && [ -f "assets/splash.png" ]; then
        echo "✓ Assets generated successfully"
    else
        echo "⚠️  Asset generation incomplete"
    fi
else
    echo "⚠️  generate_assets.py not found"
fi

echo ""

# ============================================================================
# STEP 6: Initialize Expo Project
# ============================================================================

echo "📦 Step 6: Installing npm dependencies..."

# Install dependencies
npm install

echo "✓ Dependencies installed"
echo ""

# ============================================================================
# STEP 7: Verification
# ============================================================================

echo "🔍 Step 7: Verifying installation..."

# Check critical files
ERRORS=0

if [ ! -f "App.tsx" ]; then
    echo "❌ App.tsx missing"
    ERRORS=$((ERRORS + 1))
else
    echo "✓ App.tsx"
fi

if [ ! -f "assets/uwtopia_rx_questions.json" ]; then
    echo "❌ questions.json missing"
    ERRORS=$((ERRORS + 1))
else
    QUESTION_COUNT=$(python -c "import json; print(len(json.load(open('assets/uwtopia_rx_questions.json'))))" 2>/dev/null || echo "0")
    echo "✓ questions.json ($QUESTION_COUNT questions)"
fi

if [ ! -f "assets/icon.png" ]; then
    echo "❌ icon.png missing"
    ERRORS=$((ERRORS + 1))
else
    echo "✓ icon.png"
fi

if [ ! -f "assets/splash.png" ]; then
    echo "❌ splash.png missing"
    ERRORS=$((ERRORS + 1))
else
    echo "✓ splash.png"
fi

if [ ! -d "node_modules" ]; then
    echo "❌ node_modules missing"
    ERRORS=$((ERRORS + 1))
else
    echo "✓ node_modules"
fi

echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================

if [ $ERRORS -eq 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ✅ Setup Complete - Ready to Build!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Configure EAS (one-time):"
    echo "   eas build:configure"
    echo ""
    echo "2. Build APK:"
    echo "   eas build --platform android --profile preview"
    echo ""
    echo "3. Or test locally:"
    echo "   npx expo start"
    echo ""
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ⚠️  Setup completed with $ERRORS error(s)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Please fix the errors above before building."
    echo ""
fi
