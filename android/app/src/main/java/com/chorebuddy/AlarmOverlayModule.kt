package com.chorebuddy

import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Draws a TYPE_APPLICATION_OVERLAY view on top of whatever app the user
 * is currently in. Used when a reminder fires while ChoreBuddy is
 * backgrounded — Android blocks background activity starts even with
 * SYSTEM_ALERT_WINDOW on some OEM builds, so we draw directly with the
 * WindowManager instead of trying to launch our Activity.
 */
class AlarmOverlayModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {

  private var overlay: View? = null

  override fun getName(): String = "AlarmOverlay"

  @ReactMethod
  fun show(title: String, kind: String, targetId: String) {
    Handler(Looper.getMainLooper()).post {
      val appCtx = ctx.applicationContext
      if (!Settings.canDrawOverlays(appCtx)) return@post
      if (overlay != null) hideInternal()

      val wm = appCtx.getSystemService(android.content.Context.WINDOW_SERVICE) as WindowManager

      val root = FrameLayout(appCtx).apply {
        setBackgroundColor(Color.parseColor("#CC1A0B2E"))
      }

      val column = LinearLayout(appCtx).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        setPadding(48, 96, 48, 96)
      }

      val emoji = TextView(appCtx).apply {
        text = "👾"
        textSize = 96f
        gravity = Gravity.CENTER
      }
      val titleText = TextView(appCtx).apply {
        text = "CHECK REMINDER"
        setTextColor(Color.WHITE)
        textSize = 28f
        gravity = Gravity.CENTER
        setPadding(0, 32, 0, 16)
      }
      val body = TextView(appCtx).apply {
        text = title
        setTextColor(Color.parseColor("#FFE6F2"))
        textSize = 20f
        gravity = Gravity.CENTER
        setPadding(0, 0, 0, 48)
      }

      val openLabel = if (kind == "chore") "Open Chore" else "Open Reminder"
      val openBtn = Button(appCtx).apply {
        text = openLabel
        setOnClickListener {
          hideInternal()
          val safeKind = if (kind == "chore" || kind == "reminder") kind else "reminder"
          val safeId = targetId.ifEmpty { "_" }
          val uri = Uri.parse("chorebuddy://$safeKind/$safeId")
          val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            setPackage(appCtx.packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
          }
          try {
            appCtx.startActivity(intent)
          } catch (_: Throwable) {
            val launch = appCtx.packageManager.getLaunchIntentForPackage(appCtx.packageName)
            launch?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            if (launch != null) appCtx.startActivity(launch)
          }
        }
      }
      val dismissBtn = Button(appCtx).apply {
        text = "Dismiss"
        setOnClickListener { hideInternal() }
      }

      column.addView(emoji)
      column.addView(titleText)
      column.addView(body)
      column.addView(openBtn)
      column.addView(dismissBtn)
      root.addView(column, FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT,
        Gravity.CENTER,
      ))

      val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        @Suppress("DEPRECATION")
        WindowManager.LayoutParams.TYPE_SYSTEM_ALERT

      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.MATCH_PARENT,
        overlayType,
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
        PixelFormat.TRANSLUCENT,
      )

      try {
        wm.addView(root, params)
        overlay = root
      } catch (_: Throwable) {}
    }
  }

  @ReactMethod
  fun hide() {
    Handler(Looper.getMainLooper()).post { hideInternal() }
  }

  private fun hideInternal() {
    val v = overlay ?: return
    try {
      val wm = ctx.applicationContext.getSystemService(android.content.Context.WINDOW_SERVICE) as WindowManager
      wm.removeView(v)
    } catch (_: Throwable) {}
    overlay = null
  }
}
