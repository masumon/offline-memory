# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Hermes + JNI bridges — accessed reflectively by the RN runtime.
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo modules — the module registry resolves these by name at runtime.
-keep class expo.modules.** { *; }
-keep class expo.modules.kotlin.** { *; }
-dontwarn expo.modules.**

# expo-sqlite / expo-notifications / expo-blur native entry points
-keep class expo.modules.sqlite.** { *; }
-keep class expo.modules.notifications.** { *; }

# React Native core — keep JS-facing native modules and view managers.
-keep,includedescriptorclasses class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-dontwarn com.facebook.react.**

# Add any project specific keep options here:
