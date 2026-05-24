package com.chorebuddy

import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * ApkUpdater — downloads an .apk to the app's cache dir and fires the
 * system install intent via a FileProvider URI. Lets the user update
 * the app from inside ChoreBuddy without bouncing through Chrome.
 *
 * Caller flow:
 *   1. JS calls ApkUpdater.installFromUrl(url)
 *   2. Native streams the APK to cache/update.apk
 *   3. Fires ACTION_VIEW with the FileProvider URI → Android shows the
 *      "Update existing app?" dialog
 *   4. Promise resolves once the intent is dispatched (Android then
 *      handles the rest in its own UI)
 *
 * The app needs REQUEST_INSTALL_PACKAGES in AndroidManifest and a
 * FileProvider declaration for ${packageName}.provider.
 */
class ApkUpdaterModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "ApkUpdater"

  override fun getConstants(): Map<String, Any?> {
    val info = try {
      reactContext.packageManager.getPackageInfo(reactContext.packageName, 0)
    } catch (e: Exception) { null }
    return mapOf(
      "versionName" to (info?.versionName ?: "0"),
      "versionCode" to (info?.let {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) it.longVersionCode.toInt()
        else @Suppress("DEPRECATION") it.versionCode
      } ?: 0),
    )
  }

  @ReactMethod
  fun installFromUrl(url: String, promise: Promise) {
    Thread {
      try {
        val outFile = File(reactContext.cacheDir, "update.apk")
        if (outFile.exists()) outFile.delete()

        downloadWithRetry(url, outFile, maxAttempts = 3)

        val authority = "${reactContext.packageName}.provider"
        val uri: Uri = FileProvider.getUriForFile(reactContext, authority, outFile)

        val intent = Intent(Intent.ACTION_VIEW).apply {
          setDataAndType(uri, "application/vnd.android.package-archive")
          addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_GRANT_READ_URI_PERMISSION
          )
        }
        reactContext.startActivity(intent)
        promise.resolve(outFile.absolutePath)
      } catch (e: Exception) {
        promise.reject("APK_INSTALL_FAILED", e.message, e)
      }
    }.start()
  }

  /** Follows redirects manually so we can re-apply headers on each hop,
   *  and retries on transient IOException ("Software caused connection
   *  abort", reset by peer, etc.) which is common on cellular when
   *  pulling large APKs from GitHub's CDN. */
  @Throws(IOException::class)
  private fun downloadWithRetry(url: String, outFile: File, maxAttempts: Int) {
    var attempt = 0
    var lastErr: IOException? = null
    while (attempt < maxAttempts) {
      attempt++
      try {
        openStreamFollowingRedirects(url).use { input ->
          FileOutputStream(outFile).use { out -> input.copyTo(out) }
        }
        return
      } catch (e: IOException) {
        lastErr = e
        if (outFile.exists()) outFile.delete()
        Thread.sleep(1500L * attempt)
      }
    }
    throw lastErr ?: IOException("download failed")
  }

  @Throws(IOException::class)
  private fun openStreamFollowingRedirects(initialUrl: String): java.io.InputStream {
    var url = initialUrl
    repeat(5) {
      val conn = URL(url).openConnection() as HttpURLConnection
      conn.instanceFollowRedirects = false
      conn.connectTimeout = 20_000
      conn.readTimeout = 300_000
      conn.setRequestProperty("User-Agent", "ChoreBuddy-Updater/1.0")
      conn.setRequestProperty("Accept", "*/*")
      conn.connect()
      val code = conn.responseCode
      if (code in 300..399) {
        val next = conn.getHeaderField("Location")
        conn.disconnect()
        if (next.isNullOrBlank()) throw IOException("redirect without Location")
        url = next
        return@repeat
      }
      if (code !in 200..299) {
        conn.disconnect()
        throw IOException("HTTP $code")
      }
      return conn.inputStream
    }
    throw IOException("too many redirects")
  }
}
