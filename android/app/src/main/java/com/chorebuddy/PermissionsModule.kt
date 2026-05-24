package com.chorebuddy

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap

/**
 * Bridges three Android reminder-related permission checks + their settings
 * deep links to JS:
 *   • POST_NOTIFICATIONS — surfaced via Notifee on the JS side, but here we
 *     expose the app-notification settings deep link for users who denied it.
 *   • SCHEDULE_EXACT_ALARM — Android 12+ runtime grant; without it Notifee
 *     trigger notifications get batched / dropped under Doze.
 *   • SYSTEM_ALERT_WINDOW (overlay) — required for AlarmOverlayModule to
 *     draw the full-screen alarm UI while the app is backgrounded.
 *
 * `check*()` methods are pure reads. `open*Settings()` methods fire an
 * ACTION_* intent to send the user to the correct system page.
 */
class PermissionsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "ChoreBuddyPermissions"

  @ReactMethod
  fun check(promise: Promise) {
    val map = WritableNativeMap()
    map.putBoolean("exactAlarms", canScheduleExactAlarms())
    map.putBoolean("overlay", canDrawOverlays())
    promise.resolve(map)
  }

  @ReactMethod
  fun openAlarmSettings() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
    val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
      data = Uri.parse("package:${reactContext.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    safeStart(intent)
  }

  @ReactMethod
  fun openOverlaySettings() {
    val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
      data = Uri.parse("package:${reactContext.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    safeStart(intent)
  }

  @ReactMethod
  fun openAppNotificationSettings() {
    val intent = Intent().apply {
      action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
      putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    safeStart(intent)
  }

  private fun canScheduleExactAlarms(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val am = reactContext.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
      ?: return false
    return am.canScheduleExactAlarms()
  }

  private fun canDrawOverlays(): Boolean = Settings.canDrawOverlays(reactContext)

  private fun safeStart(intent: Intent) {
    try {
      reactContext.startActivity(intent)
    } catch (_: Exception) {
      // Some OEM ROMs don't expose these deep links; user can navigate manually.
    }
  }
}
