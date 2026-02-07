# 🏥 UWtopia Rx V5.1 - Production Medical Quiz Application

**Complete, Production-Grade Medical Exam Preparation App**

[![Version](https://img.shields.io/badge/version-5.1.0-blue.svg)](https://github.com/DrEndris/uwtopia-rx)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android-green.svg)](https://www.android.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Building](#building)
- [Usage](#usage)
- [Technical Specifications](#technical-specifications)
- [Troubleshooting](#troubleshooting)
- [Author](#author)

---

## 🎯 Overview

UWtopia Rx is a professional medical examination preparation application featuring **1005 questions** across **19 medical categories**. Built with React Native and Expo, it provides an offline-first, production-ready studying experience modeled after leading medical exam platforms.

### Key Highlights

- ✅ **1005 Medical Questions** with detailed explanations
- ✅ **19 Categories** covering all major medical specialties  
- ✅ **Offline-First** - Works without internet connection
- ✅ **Session Recovery** - Never lose your progress
- ✅ **Answer Locking** - Maintains study integrity
- ✅ **Dark Mode** - Easy on the eyes
- ✅ **Custom Quiz Builder** - Create personalized study sessions
- ✅ **Global Search** - Find any question instantly

---

## ✨ Features

### 🧠 Core Study Engine

| Feature | Description |
|---------|-------------|
| **SQLite Database** | Fast, reliable offline storage |
| **Session-Based Studying** | UWorld-style blocks with frozen question order |
| **Question-Level Tracking** | Monitor time spent and performance per question |
| **Session Recovery** | Resume where you left off, even after app restart |
| **Answer Locking** | Prevents changing answers after submission |

### 📚 Study Modes

1. **All Questions** - Study everything
2. **Incorrect Only** - Review wrong answers
3. **Untaken** - Fresh questions only
4. **Correct** - Reinforce what you know

### ⏱️ Timer System

- Optional countdown timer
- Fixed presets: **5, 10, 20, 30 minutes**
- Visual warnings as time runs low
- Persists across app backgrounding
- Manual submit when time expires

### 📖 Advanced Features

- **Global Search** - SQLite-powered full-text search
- **Custom Quiz Builder** - Select categories, modes, question count
- **Font Size Control** - Small, Medium, Large options
- **Dark Mode** - System-adaptive theming
- **HTML Rendering** - Properly formatted medical explanations
- **Bookmarking** - Mark questions for later review

### 📊 Analytics

- Overall accuracy tracking
- Category-level performance
- Incorrect question review
- Last session summaries
- Time per question metrics

---

## 🚀 Installation

### Prerequisites

- **Android phone** with Termux installed
- **Internet connection** (for initial setup only)
- **2GB free space**

### Quick Start (One Command)

```bash
# 1. Extract the package
cd ~
tar -xzf UWtopia_V5.1_PRODUCTION.tar.gz
cd UWtopia_V5.1_PRODUCTION

# 2. Run setup
bash setup.sh
```

That's it! The setup script will:
- ✅ Install all prerequisites
- ✅ Generate app icons
- ✅ Install dependencies
- ✅ Verify everything is ready

---

## 🔨 Building

### Option 1: Build APK (Recommended)

```bash
# One-time: Configure EAS
eas build:configure

# Build the APK
eas build --platform android --profile preview
```

The build takes 10-15 minutes. You'll get a download link when complete.

### Option 2: Test Locally

```bash
# Start development server
npx expo start

# Scan QR code with Expo Go app
```

---

## 📱 Usage

### First Launch

1. App initializes database (1-2 seconds)
2. 1005 questions loaded automatically
3. Choose a study mode from home screen

### Starting a Quiz

1. **Select Category** (or "All Categories")
2. **Choose Study Mode** (All, Incorrect, Untaken, Correct)
3. **Optional:** Set timer (5, 10, 20, or 30 minutes)
4. **Start Quiz**

### During Quiz

- **Submit** - Lock your answer and see explanation
- **Next** - Move to next question
- **Previous** - Review already-answered questions
- **Bookmark** - Mark for later review
- **Search** - Find specific questions

### Session Recovery

If you close the app mid-session:
- **Automatic Save** - Progress saved continuously
- **Resume** - Pick up exactly where you left off
- **Timer Preserved** - Remaining time maintained

---

## 🛠️ Technical Specifications

### Stack

| Component | Technology |
|-----------|------------|
| **Framework** | React Native (Expo 52) |
| **Language** | TypeScript |
| **Database** | SQLite |
| **Storage** | AsyncStorage (preferences) |
| **UI** | Native Components |
| **Rendering** | react-native-render-html |

### Performance

- **Load Time:** <2 seconds
- **Database Queries:** <50ms
- **Memory Usage:** 50-80MB
- **Storage:** ~15MB (app + database)

### Compatibility

- **Android:** 10+ (API 29+)
- **Devices:** Phones and tablets
- **Processors:** ARM and x86
- **Screen Sizes:** All supported

---

## 🔧 Troubleshooting

### Common Issues

#### "No questions found"

**Solution:**
```bash
# Verify questions file exists
ls -lh assets/uwtopia_rx_questions.json

# Should show ~4MB file with 1005 questions
```

#### Build fails with dependency errors

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### Assets not found errors

**Solution:**
```bash
# Regenerate assets
python generate_assets.py

# Verify
ls -lh assets/
# Should show: icon.png, adaptive-icon.png, splash.png
```

#### EAS build fails with 403 error

**Causes:**
- Free tier build limit reached (30/month)
- Rate limiting (wait 1 hour)

**Solution:**
```bash
# Wait and retry, or upgrade EAS plan
```

---

## 📊 Project Structure

```
UWtopia_V5.1_PRODUCTION/
├── App.tsx                     # Main application (1888 lines)
├── package.json                # Dependencies
├── app.json                    # Expo configuration
├── eas.json                    # Build profiles
├── tsconfig.json               # TypeScript config
├── setup.sh                    # One-command setup
├── generate_assets.py          # Icon generator
├── assets/
│   ├── icon.png               # 1024x1024 app icon
│   ├── adaptive-icon.png      # Android adaptive
│   ├── splash.png             # 1284x2778 splash
│   └── uwtopia_rx_questions.json  # 1005 questions
├── README.md                   # This file
├── QUICKSTART.md               # Fast start guide
└── DEPLOYMENT.md               # Build instructions
```

---

## 🎨 Customization

### Change Colors

Edit `App.tsx`, find the `themes` object:

```typescript
const themes = {
  light: {
    primary: '#1A365D',    // Change this
    background: '#FFFFFF',
    // ...
  }
}
```

### Change App Name

1. Edit `app.json`:
```json
{
  "expo": {
    "name": "Your App Name"
  }
}
```

2. Rebuild:
```bash
eas build --platform android --profile preview
```

---

## 👨‍⚕️ Author

**Dr Endris A**
- Telegram: [@DrEndris](https://t.me/DrEndris)
- Email: [Contact via Telegram]

### Acknowledgments

- Medical content curated from ERMP 2018-2022 exam materials
- UI/UX inspired by UWorld and professional medical platforms
- Built with ❤️ for medical students

---

## 📄 License

MIT License - See LICENSE file for details

**Summary:**
- ✅ Use freely
- ✅ Modify as needed
- ✅ Distribute copies
- ✅ Commercial use OK
- ℹ️ Include copyright notice
- ℹ️ No warranty provided

---

## 🔄 Version History

### V5.1.0 (Current) - February 2026
- ✅ Production-ready release
- ✅ All 1005 questions included
- ✅ Complete feature set
- ✅ Error-proof build system
- ✅ Comprehensive documentation

### V5.0.0 - January 2026
- Custom Quiz Builder
- Global Search
- Dark Mode
- Font Size Control

### V4.0.0 - December 2025
- Session Recovery
- Answer Locking
- Timer System
- Android BackHandler

---

## 🆘 Support

Having issues? Check these resources:

1. **README.md** (this file) - Complete overview
2. **QUICKSTART.md** - Fast start guide
3. **DEPLOYMENT.md** - Detailed build instructions
4. **Telegram:** [@DrEndris](https://t.me/DrEndris) - Direct support

---

**🎓 Good luck with your medical studies!**

© 2026 Dr Endris A (@DrEndris)
