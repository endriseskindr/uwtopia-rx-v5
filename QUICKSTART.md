# ⚡ UWtopia Rx V5.1 - Quick Start Guide

**Get your app running in 5 minutes!**

---

## 🎯 Prerequisites Check

Before starting, make sure you have:
- ✅ Android phone with Termux
- ✅ Internet connection
- ✅ This package extracted

---

## 🚀 Installation (Copy-Paste Each Block)

### Step 1: Navigate to Project

```bash
cd ~/UWtopia_V5.1_PRODUCTION
```

### Step 2: Run Setup

```bash
bash setup.sh
```

**What this does:**
- Installs Node.js, Python (if needed)
- Installs expo-cli and eas-cli
- Generates app icons
- Installs npm dependencies
- Verifies everything

**Time:** 5-10 minutes

---

## 🔨 Building Your APK

### First Time Only: Configure EAS

```bash
eas login
# Enter your Expo credentials

eas build:configure
# Choose: Android
```

### Build the APK

```bash
eas build --platform android --profile preview
```

**What happens:**
1. Uploads project (few seconds)
2. Builds on EAS servers (10-15 min)
3. Gives you download link

---

## 📥 Installing Your App

1. Download APK from link
2. Open APK file
3. Allow "Install from unknown sources" if prompted
4. Install and launch!

---

## 🎮 Using the App

### Home Screen
- Select category or "All Categories"
- Choose study mode (All, Incorrect, Untaken, Correct)
- Optional: Set timer
- Tap "Start Quiz"

### During Quiz
- Read question
- Select answer
- Tap "Submit" to lock and see explanation
- Tap "Next" for next question

### Features
- **Search:** Tap search icon to find questions
- **Bookmark:** Star icon to mark questions
- **Settings:** Change font size or dark mode
- **Custom Quiz:** Build your own quiz set

---

## ⚠️ Troubleshooting

### Setup fails

```bash
# Re-run setup
bash setup.sh
```

### Build fails with 403

**Cause:** Free tier limit (30 builds/month)

**Solution:** Wait 1 hour or upgrade plan

### No questions in app

```bash
# Verify questions exist
ls -lh assets/uwtopia_rx_questions.json

# Should show ~4MB file
```

---

## 📞 Need Help?

- **Telegram:** [@DrEndris](https://t.me/DrEndris)
- **Full docs:** See README.md

---

**That's it! You're ready to study!** 🎓
