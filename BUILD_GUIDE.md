# 🔨 UWtopia Rx V5.1 - Complete Build Guide

**Step-by-step instructions for building your medical quiz app from scratch.**

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Initial Setup](#initial-setup)
3. [Local Testing](#local-testing)
4. [Building APK](#building-apk)
5. [Distribution](#distribution)
6. [Troubleshooting](#troubleshooting)

---

## 💻 System Requirements

### Minimum Requirements
- **Device:** Android phone/tablet
- **OS:** Android 10+
- **RAM:** 2GB+
- **Storage:** 2GB free space
- **App:** Termux (from F-Droid)

### Network Requirements
- **Initial Setup:** Internet required
- **Building:** Internet required
- **App Usage:** Offline (no internet needed)

---

## 🚀 Initial Setup

### 1. Extract Package

```bash
cd ~
tar -xzf UWtopia_V5.1_PRODUCTION.tar.gz
cd UWtopia_V5.1_PRODUCTION
```

### 2. Verify Contents

```bash
ls -la
```

**You should see:**
- ✅ App.tsx (main app file)
- ✅ package.json (dependencies)
- ✅ setup.sh (setup script)
- ✅ assets/ (questions and icons)

### 3. Check Questions

```bash
python -c "import json; print(f\"Questions: {len(json.load(open('assets/uwtopia_rx_questions.json')))}\")"
```

**Expected output:** `Questions: 1005`

### 4. Run Setup Script

```bash
bash setup.sh
```

**The script will:**
1. ✅ Check/install Node.js
2. ✅ Check/install Python
3. ✅ Install expo-cli and eas-cli
4. ✅ Install Pillow (for icons)
5. ✅ Generate app icons
6. ✅ Install npm dependencies
7. ✅ Verify installation

**Time:** 5-10 minutes

---

## 🧪 Local Testing

Before building the APK, test locally to ensure everything works:

### Start Development Server

```bash
npx expo start
```

**What happens:**
- Metro bundler starts
- QR code appears in terminal
- App available at http://localhost:19000

### Test on Device

**Option 1: Expo Go (Recommended)**
1. Install "Expo Go" from Play Store
2. Open Expo Go
3. Scan QR code from terminal
4. App launches on your device

**Option 2: Development Build**
```bash
npx expo run:android
```

### What to Test

- ✅ App launches without errors
- ✅ 1005 questions load
- ✅ Can start quiz
- ✅ Can answer questions
- ✅ Explanations display
- ✅ Timer works
- ✅ Search works
- ✅ Dark mode toggles

---

## 📦 Building APK

### One-Time Setup: EAS Configuration

#### 1. Create Expo Account
- Go to https://expo.dev
- Sign up (free account)
- Note your username and password

#### 2. Login to EAS

```bash
eas login
```

Enter your Expo credentials.

#### 3. Configure Build

```bash
eas build:configure
```

**Prompts:**
- "Which platforms?" → **Android**
- "Create new project?" → **Yes**

**What happens:**
- Creates `eas.json` (build config)
- Links project to EAS
- Updates `app.json` with project ID

### Building Your APK

#### Preview Build (Recommended)

```bash
eas build --platform android --profile preview
```

**Profile:** `preview` creates APK for testing

#### Production Build

```bash
eas build --platform android --profile production
```

**Profile:** `production` creates optimized APK

### Build Process

**Timeline:**
1. **Uploading** (30 seconds)
   - Project files compress
   - Upload to EAS servers
   
2. **Building** (10-15 minutes)
   - Dependencies install
   - App compiles
   - APK created

3. **Complete**
   - Download link provided
   - APK ready

**Monitoring:**
- Watch progress at: https://expo.dev/accounts/[username]/projects/uwtopia-rx/builds
- Build logs available in real-time

---

## 📤 Distribution

### Installing on Your Device

#### Method 1: Direct Download

1. Click download link from EAS
2. Open APK file
3. Android may warn "Install from unknown source"
4. Enable "Allow from this source"
5. Tap "Install"

#### Method 2: Share via Link

```bash
# After build completes, share link
echo "Download: [YOUR_APK_LINK]"
```

Send link to:
- Yourself (email/messaging)
- Study partners
- Telegram groups

### Distribution Options

#### Personal Use
- Keep APK link private
- Reinstall anytime from link (available 30 days)

#### Small Group (<100 people)
- Share APK link directly
- EAS preview links work for anyone

#### Large Scale
- Publish to Play Store (requires developer account)
- Use internal testing tracks

---

## 🔧 Troubleshooting

### Build Errors

#### Error: "403 Forbidden"

**Cause:** 
- Free tier limit (30 builds/month)
- Rate limiting

**Solution:**
```bash
# Wait 1 hour, then retry
eas build --platform android --profile preview

# Or upgrade to paid plan
```

#### Error: "expo-sqlite version mismatch"

**Solution:**
```bash
# Update dependencies
npm install expo-sqlite@~15.0.0
npm install expo-file-system@~18.0.0
npm install expo-sharing@~13.0.0

# Rebuild
eas build --platform android --profile preview
```

#### Error: "Assets not found"

**Solution:**
```bash
# Regenerate assets
python generate_assets.py

# Verify
ls -lh assets/
# Should show icon.png, adaptive-icon.png, splash.png

# Rebuild
eas build --platform android --profile preview
```

### Local Testing Errors

#### Error: "Cannot find module './assets/uwtopia_rx_questions.json'"

**Solution:**
```bash
# Verify questions file
ls -lh assets/uwtopia_rx_questions.json

# If missing, copy from backup
cp questions_original.json assets/uwtopia_rx_questions.json
```

#### Error: "Database error"

**Solution:**
```bash
# Clear app data in device settings
# Or reinstall app
```

### Performance Issues

#### Slow Loading

**Check:**
```bash
# Verify question count
python -c "import json; print(len(json.load(open('assets/uwtopia_rx_questions.json'))))"

# Should be 1005, not more
```

#### High Memory Usage

**Normal:** 50-80MB
**High:** >150MB → Reinstall app

---

## 📊 Build Variants

### Profile Comparison

| Profile | Build Time | APK Size | Use Case |
|---------|------------|----------|----------|
| **development** | 5-10 min | ~50MB | Local testing |
| **preview** | 10-15 min | ~20MB | Testing APK |
| **production** | 10-15 min | ~15MB | Release |

### Choosing a Profile

**Use `preview` when:**
- Testing on real devices
- Sharing with study partners
- Personal use

**Use `production` when:**
- Publishing to Play Store
- Final release version
- Maximum optimization needed

---

## 🔄 Rebuilding

### When to Rebuild

- ✅ Changed questions
- ✅ Updated icons
- ✅ Modified app code
- ✅ Changed app name

### Quick Rebuild

```bash
# Make your changes
# Then:
eas build --platform android --profile preview --clear-cache
```

**`--clear-cache`** ensures fresh build

---

## 📈 Version Management

### Updating Version

Edit `app.json`:

```json
{
  "expo": {
    "version": "5.2.0",  // Increment this
    "android": {
      "versionCode": 52  // Increment this
    }
  }
}
```

**Rules:**
- `version`: User-facing (5.1.0 → 5.2.0)
- `versionCode`: Android internal (51 → 52)

---

## 🎓 Best Practices

### Before Building

1. ✅ Test locally first
2. ✅ Verify all 1005 questions load
3. ✅ Check icons generated
4. ✅ Review app.json settings

### During Build

1. ✅ Monitor build logs
2. ✅ Note any warnings
3. ✅ Save APK download link

### After Building

1. ✅ Test APK on device
2. ✅ Verify all features work
3. ✅ Check offline functionality

---

## 📞 Support

Need help?

- **Documentation:** README.md, QUICKSTART.md
- **Telegram:** [@DrEndris](https://t.me/DrEndris)
- **EAS Docs:** https://docs.expo.dev/build/introduction/

---

**Happy Building!** 🚀

© 2026 Dr Endris A
