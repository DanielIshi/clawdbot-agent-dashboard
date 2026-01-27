#!/bin/bash
# Build APK for Agent Dashboard
# Requirements: Android SDK, Java 17+

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔨 Building Agent Dashboard APK..."

cd "$PROJECT_DIR"

# Step 1: Build web assets
echo "📦 Building web assets..."
npm run build

# Step 2: Sync with Capacitor
echo "📱 Syncing with Capacitor..."
npx cap sync android

# Step 3: Build APK
echo "🏗️ Building APK..."
cd android

# Debug APK
./gradlew assembleDebug

# Find the APK
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
    echo "✅ APK built successfully!"
    echo "📍 Location: $PROJECT_DIR/android/$APK_PATH"
    
    # Copy to dist folder for easy access
    mkdir -p "$PROJECT_DIR/dist-apk"
    cp "$APK_PATH" "$PROJECT_DIR/dist-apk/agent-dashboard.apk"
    echo "📍 Copied to: $PROJECT_DIR/dist-apk/agent-dashboard.apk"
else
    echo "❌ APK build failed!"
    exit 1
fi

# Optional: Build release APK (requires signing)
if [ "$1" == "--release" ]; then
    echo "🔐 Building release APK..."
    ./gradlew assembleRelease
    
    RELEASE_APK="app/build/outputs/apk/release/app-release-unsigned.apk"
    if [ -f "$RELEASE_APK" ]; then
        cp "$RELEASE_APK" "$PROJECT_DIR/dist-apk/agent-dashboard-release.apk"
        echo "📍 Release APK: $PROJECT_DIR/dist-apk/agent-dashboard-release.apk"
        echo "⚠️ Note: Release APK needs to be signed before distribution"
    fi
fi

echo ""
echo "🎉 Done!"
