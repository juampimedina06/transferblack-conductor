package com.transferblack.driver.overlay

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.UiThreadUtil
import java.util.Locale
import kotlin.math.abs

class DriverOverlayModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val mainHandler = Handler(Looper.getMainLooper())
  private var windowManager: WindowManager? = null
  private var overlayView: View? = null
  private var autoDismissRunnable: Runnable? = null

  override fun getName(): String = "DriverOverlay"

  @ReactMethod
  fun canDrawOverlays(promise: Promise) {
    try {
      val allowed =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
          Settings.canDrawOverlays(reactApplicationContext)
      promise.resolve(allowed)
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun requestOverlayPermission(promise: Promise) {
    try {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${reactApplicationContext.packageName}")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactApplicationContext.startActivity(intent)
      promise.resolve(true)
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun showOfferOverlay(payload: ReadableMap, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
        !Settings.canDrawOverlays(reactApplicationContext)
      ) {
        promise.resolve(false)
        return
      }

      val offerId = readString(payload, "offerId")
      val tripId = readString(payload, "tripId")
      val priceDisplay = resolvePriceDisplay(payload)
      val origin = resolveAddress(payload, "origin", "pickup", "Origen indicado en app")
      val destination = resolveAddress(payload, "destination", "dropoff", "Destino indicado en app")
      val ttlSeconds = (readNumber(payload, "ttlSeconds")?.toLong() ?: DEFAULT_TTL_SECONDS)
        .coerceAtLeast(1L)

      UiThreadUtil.runOnUiThread {
        try {
          removeOverlayInternal()

          val context = reactApplicationContext
          val wm = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
          if (wm == null) {
            promise.resolve(false)
            return@runOnUiThread
          }

          val windowType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
          } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
          }

          @Suppress("DEPRECATION")
          val windowFlags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON

          val cardWidth = (context.resources.displayMetrics.widthPixels - dp(24)).coerceAtLeast(dp(260))

          val layoutParams = WindowManager.LayoutParams(
            cardWidth,
            WindowManager.LayoutParams.WRAP_CONTENT,
            windowType,
            windowFlags,
            PixelFormat.TRANSLUCENT
          ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            x = 0
            y = 120
          }

          val cardView = buildOverlayCard(
            context = context,
            wm = wm,
            layoutParams = layoutParams,
            offerId = offerId,
            tripId = tripId,
            priceDisplay = priceDisplay,
            origin = origin,
            destination = destination
          )

          wm.addView(cardView, layoutParams)
          windowManager = wm
          overlayView = cardView

          val dismissCallback = Runnable {
            removeOverlayInternal()
          }
          autoDismissRunnable = dismissCallback
          mainHandler.postDelayed(dismissCallback, ttlSeconds * 1000L)

          promise.resolve(true)
        } catch (_: Exception) {
          removeOverlayInternal()
          promise.resolve(false)
        }
      }
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun hideOfferOverlay(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      removeOverlayInternal()
      promise.resolve(true)
    }
  }

  override fun invalidate() {
    super.invalidate()
    UiThreadUtil.runOnUiThread {
      removeOverlayInternal()
    }
  }

  @SuppressLint("ClickableViewAccessibility")
  private fun buildOverlayCard(
    context: Context,
    wm: WindowManager,
    layoutParams: WindowManager.LayoutParams,
    offerId: String,
    tripId: String,
    priceDisplay: String,
    origin: String,
    destination: String
  ): LinearLayout {
    val cardBackground = GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = dp(16).toFloat()
      setColor(Color.parseColor(COLOR_OBSIDIAN))
      setStroke(dp(1.5f), Color.parseColor(COLOR_GOLD))
    }

    val container = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      background = cardBackground
      setPadding(dp(16), dp(14), dp(16), dp(14))
      elevation = dp(12).toFloat()
    }

    // Fila superior: título de marca y botón de cierre
    val headerRow = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }

    val titleView = TextView(context).apply {
      text = "TRANSFER BLACK · NUEVA OFERTA"
      setTextColor(Color.parseColor(COLOR_GOLD))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
      setTypeface(Typeface.DEFAULT_BOLD)
      letterSpacing = 0.08f
      layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
    }

    val closeButton = TextView(context).apply {
      text = "✕"
      setTextColor(Color.parseColor(COLOR_PLATINUM))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
      setTypeface(Typeface.DEFAULT_BOLD)
      setPadding(dp(10), dp(4), dp(4), dp(4))
      contentDescription = "Cerrar alerta flotante"
      setOnClickListener {
        removeOverlayInternal()
      }
    }

    headerRow.addView(titleView)
    headerRow.addView(closeButton)

    val fareView = TextView(context).apply {
      text = "$" + priceDisplay
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 26f)
      setTypeface(Typeface.DEFAULT_BOLD)
      setPadding(0, dp(6), 0, 0)
    }

    val originView = TextView(context).apply {
      text = "Origen: $origin"
      setTextColor(Color.parseColor(COLOR_PLATINUM))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
      maxLines = 2
      ellipsize = TextUtils.TruncateAt.END
      setPadding(0, dp(6), 0, 0)
    }

    val destinationView = TextView(context).apply {
      text = "Destino: $destination"
      setTextColor(Color.parseColor(COLOR_ASH))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
      maxLines = 2
      ellipsize = TextUtils.TruncateAt.END
      setPadding(0, dp(2), 0, 0)
    }

    val actionBackground = GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = dp(12).toFloat()
      setColor(Color.parseColor(COLOR_GOLD))
    }

    val actionButton = TextView(context).apply {
      text = "VER OFERTA"
      setTextColor(Color.parseColor(COLOR_OBSIDIAN))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
      setTypeface(Typeface.DEFAULT_BOLD)
      gravity = Gravity.CENTER
      background = actionBackground
      setPadding(dp(16), dp(11), dp(16), dp(11))
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
      ).apply {
        topMargin = dp(12)
      }
      setOnClickListener {
        openOfferAndDismiss(offerId, tripId)
      }
    }

    container.addView(headerRow)
    container.addView(fareView)
    container.addView(originView)
    container.addView(destinationView)
    container.addView(actionButton)

    val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    var initialX = 0
    var initialY = 0
    var initialTouchX = 0f
    var initialTouchY = 0f
    var isDragging = false

    container.setOnTouchListener { _, event ->
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          initialX = layoutParams.x
          initialY = layoutParams.y
          initialTouchX = event.rawX
          initialTouchY = event.rawY
          isDragging = false
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = (event.rawX - initialTouchX).toInt()
          val dy = (event.rawY - initialTouchY).toInt()
          if (abs(dx) > touchSlop || abs(dy) > touchSlop) {
            isDragging = true
          }
          if (isDragging) {
            layoutParams.x = initialX + dx
            layoutParams.y = (initialY + dy).coerceAtLeast(0)
            try {
              if (container.isAttachedToWindow) {
                wm.updateViewLayout(container, layoutParams)
              }
            } catch (_: Exception) {
              // Ignorar si la vista ya fue removida
            }
          }
          true
        }
        MotionEvent.ACTION_UP -> {
          if (!isDragging) {
            openOfferAndDismiss(offerId, tripId)
          }
          true
        }
        else -> false
      }
    }

    return container
  }

  private fun openOfferAndDismiss(offerId: String, tripId: String) {
    val context = reactApplicationContext
    val deepLinkUri = Uri.parse(
      "transferblackconductor://?offerId=${Uri.encode(offerId)}&tripId=${Uri.encode(tripId)}"
    )
    val deepLinkIntent = Intent(Intent.ACTION_VIEW, deepLinkUri).apply {
      setPackage(context.packageName)
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_CLEAR_TOP
      )
    }

    try {
      context.startActivity(deepLinkIntent)
    } catch (_: Exception) {
      val fallbackIntent = context.packageManager
        .getLaunchIntentForPackage(context.packageName)
        ?.apply {
          addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
              Intent.FLAG_ACTIVITY_SINGLE_TOP or
              Intent.FLAG_ACTIVITY_CLEAR_TOP
          )
        }
      if (fallbackIntent != null) {
        try {
          context.startActivity(fallbackIntent)
        } catch (_: Exception) {
          // Sin actividad disponible para abrir
        }
      }
    }

    removeOverlayInternal()
  }

  private fun removeOverlayInternal() {
    autoDismissRunnable?.let {
      mainHandler.removeCallbacks(it)
    }
    autoDismissRunnable = null

    val view = overlayView
    val wm = windowManager
    overlayView = null

    if (view != null && wm != null) {
      try {
        if (view.isAttachedToWindow) {
          wm.removeViewImmediate(view)
        }
      } catch (_: Exception) {
        try {
          wm.removeView(view)
        } catch (_: Exception) {
          // La vista ya no estaba adjunta
        }
      }
    }
  }

  private fun resolvePriceDisplay(payload: ReadableMap): String {
    val directPrice = readNumber(payload, "price")
    val directFare = readNumber(payload, "fare")
    val nestedFare = if (payload.hasKey("fare") && !payload.isNull("fare") &&
      payload.getType("fare") == ReadableType.Map
    ) {
      val fareMap = payload.getMap("fare")
      fareMap?.let {
        readNumber(it, "totalFare") ?: readNumber(it, "netEarnings")
      }
    } else {
      null
    }

    val amount = directPrice ?: directFare ?: nestedFare ?: 0.0
    return if (amount % 1.0 == 0.0) {
      amount.toLong().toString()
    } else {
      String.format(Locale.US, "%.2f", amount)
    }
  }

  private fun resolveAddress(
    payload: ReadableMap,
    flatKey: String,
    nestedMapKey: String,
    fallback: String
  ): String {
    val flatValue = readString(payload, flatKey)
    if (flatValue.isNotBlank()) {
      return flatValue
    }

    if (payload.hasKey(nestedMapKey) && !payload.isNull(nestedMapKey) &&
      payload.getType(nestedMapKey) == ReadableType.Map
    ) {
      val nestedAddress = payload.getMap(nestedMapKey)?.let { readString(it, "address") }
      if (!nestedAddress.isNullOrBlank()) {
        return nestedAddress
      }
    }

    return fallback
  }

  private fun readString(map: ReadableMap, key: String, fallback: String = ""): String {
    if (!map.hasKey(key) || map.isNull(key)) {
      return fallback
    }
    return when (map.getType(key)) {
      ReadableType.String -> map.getString(key) ?: fallback
      ReadableType.Number -> {
        val number = map.getDouble(key)
        if (number % 1.0 == 0.0) number.toLong().toString() else number.toString()
      }
      else -> fallback
    }
  }

  private fun readNumber(map: ReadableMap, key: String): Double? {
    if (!map.hasKey(key) || map.isNull(key)) {
      return null
    }
    return when (map.getType(key)) {
      ReadableType.Number -> map.getDouble(key)
      ReadableType.String -> map.getString(key)?.toDoubleOrNull()
      else -> null
    }
  }

  private fun dp(value: Int): Int {
    return (value * reactApplicationContext.resources.displayMetrics.density).toInt()
  }

  private fun dp(value: Float): Int {
    return (value * reactApplicationContext.resources.displayMetrics.density).toInt()
  }

  companion object {
    private const val DEFAULT_TTL_SECONDS = 20L
    private const val COLOR_OBSIDIAN = "#0A0A0C"
    private const val COLOR_GOLD = "#D4AF37"
    private const val COLOR_PLATINUM = "#E4E4E5"
    private const val COLOR_ASH = "#A1A1AA"
  }
}
