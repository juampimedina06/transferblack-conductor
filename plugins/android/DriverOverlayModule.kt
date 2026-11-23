package com.transferblack.driver.overlay

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.media.ToneGenerator
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
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.bridge.LifecycleEventListener
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
  ReactContextBaseJavaModule(reactContext),
  LifecycleEventListener {

  private val mainHandler = Handler(Looper.getMainLooper())

  @Volatile
  private var isHostInForeground: Boolean = true

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = "DriverOverlay"

  override fun onHostResume() {
    isHostInForeground = true
    UiThreadUtil.runOnUiThread {
      removeBubbleInternal()
      removeOverlayInternal()
    }
  }

  override fun onHostPause() {
    isHostInForeground = false
  }

  override fun onHostDestroy() {
    isHostInForeground = false
    UiThreadUtil.runOnUiThread {
      removeBubbleInternal()
      removeOverlayInternal()
      stopOfferSoundInternal()
    }
  }

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
          removeBubbleInternal()
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
            windowLayoutParams = layoutParams,
            offerId = offerId,
            tripId = tripId,
            priceDisplay = priceDisplay,
            origin = origin,
            destination = destination
          )

          wm.addView(cardView, layoutParams)
          activeOverlayWindowManager = wm
          activeOverlayView = cardView

          val dismissCallback = Runnable {
            removeOverlayInternal()
          }
          activeOverlayDismissRunnable = dismissCallback
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

  @ReactMethod
  fun playOfferSound(tone: String?, loop: Boolean, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        stopOfferSoundInternal()

        if (tone == "chime") {
          val generator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 90)
          activeToneGenerator = generator
          generator.startTone(ToneGenerator.TONE_PROP_BEEP2, 900)
          val stopChime = Runnable {
            stopOfferSoundInternal()
          }
          activeSoundStopRunnable = stopChime
          mainHandler.postDelayed(stopChime, if (loop) 1400L else 1000L)
          promise.resolve(true)
          return@runOnUiThread
        }

        val ringtoneType = when (tone) {
          "alarm" -> RingtoneManager.TYPE_ALARM
          "default" -> RingtoneManager.TYPE_NOTIFICATION
          else -> RingtoneManager.TYPE_RINGTONE
        }

        val soundUri =
          RingtoneManager.getDefaultUri(ringtoneType)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        if (soundUri == null) {
          promise.resolve(false)
          return@runOnUiThread
        }

        val ringtone = RingtoneManager.getRingtone(reactApplicationContext, soundUri)
        if (ringtone == null) {
          promise.resolve(false)
          return@runOnUiThread
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          val usage = if (tone == "alarm") {
            AudioAttributes.USAGE_ALARM
          } else {
            AudioAttributes.USAGE_NOTIFICATION_RINGTONE
          }
          ringtone.audioAttributes = AudioAttributes.Builder()
            .setUsage(usage)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          ringtone.isLooping = loop
        }

        activeOfferRingtone = ringtone
        ringtone.play()

        // Safety auto-stop after 22s so audio can never loop forever if app is killed
        val safetyStop = Runnable {
          stopOfferSoundInternal()
        }
        activeSoundStopRunnable = safetyStop
        mainHandler.postDelayed(safetyStop, if (loop) 22_000L else 2_200L)

        promise.resolve(true)
      } catch (_: Exception) {
        stopOfferSoundInternal()
        promise.resolve(false)
      }
    }
  }

  @ReactMethod
  fun stopOfferSound(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      stopOfferSoundInternal()
      promise.resolve(true)
    }
  }

  @ReactMethod
  fun showFloatingBubble(status: String?, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
        !Settings.canDrawOverlays(reactApplicationContext)
      ) {
        promise.resolve(false)
        return
      }

      val isTripActive = status == "trip"

      UiThreadUtil.runOnUiThread {
        try {
          // Si la app ya volvió al frente o hay una tarjeta de oferta visible, no mostrar la esfera
          if (isHostInForeground || activeOverlayView != null) {
            removeBubbleInternal()
            promise.resolve(false)
            return@runOnUiThread
          }

          removeBubbleInternal()

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

          val windowFlags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN

          val bubbleSize = dp(60)
          val metrics = context.resources.displayMetrics
          val screenWidth = metrics.widthPixels
          val screenHeight = metrics.heightPixels
          val edgeMargin = dp(8)

          val bubbleParams = WindowManager.LayoutParams(
            bubbleSize,
            bubbleSize,
            windowType,
            windowFlags,
            PixelFormat.TRANSLUCENT
          ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (screenWidth - bubbleSize - edgeMargin).coerceAtLeast(edgeMargin)
            y = (screenHeight * 0.35f).toInt().coerceIn(dp(64), (screenHeight - bubbleSize - dp(64)).coerceAtLeast(dp(64)))
          }

          val sphereView = buildFloatingBubble(
            context = context,
            wm = wm,
            bubbleParams = bubbleParams,
            bubbleSize = bubbleSize,
            screenWidth = screenWidth,
            screenHeight = screenHeight,
            isTripActive = isTripActive
          )

          wm.addView(sphereView, bubbleParams)
          activeBubbleWindowManager = wm
          activeBubbleView = sphereView

          promise.resolve(true)
        } catch (_: Exception) {
          removeBubbleInternal()
          promise.resolve(false)
        }
      }
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun hideFloatingBubble(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      removeBubbleInternal()
      promise.resolve(true)
    }
  }

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    super.invalidate()
    UiThreadUtil.runOnUiThread {
      removeOverlayInternal()
      removeBubbleInternal()
      stopOfferSoundInternal()
    }
  }

  @SuppressLint("ClickableViewAccessibility")
  private fun buildFloatingBubble(
    context: Context,
    wm: WindowManager,
    bubbleParams: WindowManager.LayoutParams,
    bubbleSize: Int,
    screenWidth: Int,
    screenHeight: Int,
    isTripActive: Boolean
  ): FrameLayout {
    val root = FrameLayout(context).apply {
      clipChildren = false
      clipToPadding = false
      contentDescription = "Volver a Transfer Black Conductor"
    }

    val circleBackground = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(Color.parseColor(COLOR_OBSIDIAN_SURFACE))
      setStroke(dp(2f), Color.parseColor(COLOR_GOLD))
    }

    val sphereBody = FrameLayout(context).apply {
      background = circleBackground
      elevation = dp(10).toFloat()
      layoutParams = FrameLayout.LayoutParams(bubbleSize, bubbleSize)
    }

    val logoResId = context.resources.getIdentifier(
      "tb_floating_bubble_logo",
      "drawable",
      context.packageName
    )

    if (logoResId != 0) {
      val logoView = ImageView(context).apply {
        setImageResource(logoResId)
        scaleType = ImageView.ScaleType.FIT_CENTER
        setPadding(dp(8), dp(8), dp(8), dp(8))
        contentDescription = "Logo Transfer Black"
        layoutParams = FrameLayout.LayoutParams(
          FrameLayout.LayoutParams.MATCH_PARENT,
          FrameLayout.LayoutParams.MATCH_PARENT
        )
      }
      sphereBody.addView(logoView)
    } else {
      val monogramView = TextView(context).apply {
        text = "TB"
        setTextColor(Color.parseColor(COLOR_GOLD))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
        setTypeface(Typeface.DEFAULT_BOLD)
        letterSpacing = 0.04f
        gravity = Gravity.CENTER
        layoutParams = FrameLayout.LayoutParams(
          FrameLayout.LayoutParams.MATCH_PARENT,
          FrameLayout.LayoutParams.MATCH_PARENT
        )
      }
      sphereBody.addView(monogramView)
    }

    val statusDotSize = dp(14)
    val statusDotBackground = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(Color.parseColor(if (isTripActive) COLOR_GOLD else COLOR_EMERALD))
      setStroke(dp(2f), Color.parseColor(COLOR_OBSIDIAN_SURFACE))
    }

    val statusDot = View(context).apply {
      background = statusDotBackground
      layoutParams = FrameLayout.LayoutParams(statusDotSize, statusDotSize).apply {
        gravity = Gravity.BOTTOM or Gravity.END
        rightMargin = dp(2)
        bottomMargin = dp(2)
      }
    }

    root.addView(sphereBody)
    root.addView(statusDot)

    val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
    val edgeMargin = dp(8)
    val minY = dp(36)
    val maxY = (screenHeight - bubbleSize - dp(36)).coerceAtLeast(minY)
    val maxX = (screenWidth - bubbleSize - edgeMargin).coerceAtLeast(edgeMargin)

    var initialX = 0
    var initialY = 0
    var initialTouchX = 0f
    var initialTouchY = 0f
    var isDragging = false

    root.setOnTouchListener { _, event ->
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          activeBubbleSnapAnimator?.cancel()
          initialX = bubbleParams.x
          initialY = bubbleParams.y
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
            bubbleParams.x = (initialX + dx).coerceIn(0, (screenWidth - bubbleSize).coerceAtLeast(0))
            bubbleParams.y = (initialY + dy).coerceIn(minY, maxY)
            try {
              if (root.isAttachedToWindow) {
                wm.updateViewLayout(root, bubbleParams)
              }
            } catch (_: Exception) {
              // Ignorar si la vista ya fue removida
            }
          }
          true
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          if (!isDragging && event.action == MotionEvent.ACTION_UP) {
            openAppFromBubble()
          } else {
            val centerX = bubbleParams.x + bubbleSize / 2
            val targetX = if (centerX < screenWidth / 2) edgeMargin else maxX
            activeBubbleSnapAnimator?.cancel()
            activeBubbleSnapAnimator = ValueAnimator.ofInt(bubbleParams.x, targetX).apply {
              duration = 220L
              interpolator = DecelerateInterpolator()
              addUpdateListener { animator ->
                bubbleParams.x = animator.animatedValue as Int
                try {
                  if (root.isAttachedToWindow) {
                    wm.updateViewLayout(root, bubbleParams)
                  }
                } catch (_: Exception) {
                  // Ignorar si la vista ya fue removida
                }
              }
              start()
            }
          }
          true
        }
        else -> false
      }
    }

    return root
  }

  private fun openAppFromBubble() {
    val context = reactApplicationContext
    val launchIntent = context.packageManager
      .getLaunchIntentForPackage(context.packageName)
      ?.apply {
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_SINGLE_TOP or
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        )
      }

    if (launchIntent != null) {
      try {
        context.startActivity(launchIntent)
      } catch (_: Exception) {
        // Sin actividad disponible para abrir
      }
    }

    removeBubbleInternal()
  }

  private fun removeBubbleInternal() {
    activeBubbleSnapAnimator?.cancel()
    activeBubbleSnapAnimator = null

    val view = activeBubbleView
    val wm = activeBubbleWindowManager
    activeBubbleView = null
    activeBubbleWindowManager = null

    if (view != null && wm != null) {
      try {
        wm.removeViewImmediate(view)
      } catch (_: Exception) {
        try {
          wm.removeView(view)
        } catch (_: Exception) {
          // La vista ya fue removida o no estaba adjunta
        }
      }
    }
  }

  @SuppressLint("ClickableViewAccessibility")
  private fun buildOverlayCard(
    context: Context,
    wm: WindowManager,
    windowLayoutParams: WindowManager.LayoutParams,
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

    val closeBg = GradientDrawable().apply {
      shape = GradientDrawable.OVAL
      setColor(Color.parseColor("#27272A"))
    }

    val closeButton = TextView(context).apply {
      text = "✕"
      setTextColor(Color.parseColor(COLOR_PLATINUM))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
      setTypeface(Typeface.DEFAULT_BOLD)
      gravity = Gravity.CENTER
      background = closeBg
      layoutParams = LinearLayout.LayoutParams(dp(36), dp(36))
      contentDescription = "Cerrar alerta flotante"
      isClickable = true
      setOnClickListener {
        stopOfferSoundInternal()
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
          initialX = windowLayoutParams.x
          initialY = windowLayoutParams.y
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
            windowLayoutParams.x = initialX + dx
            windowLayoutParams.y = (initialY + dy).coerceAtLeast(0)
            try {
              if (container.isAttachedToWindow) {
                wm.updateViewLayout(container, windowLayoutParams)
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
    activeOverlayDismissRunnable?.let {
      mainHandler.removeCallbacks(it)
    }
    activeOverlayDismissRunnable = null

    val view = activeOverlayView
    val wm = activeOverlayWindowManager
    activeOverlayView = null
    activeOverlayWindowManager = null

    if (view != null && wm != null) {
      try {
        wm.removeViewImmediate(view)
      } catch (_: Exception) {
        try {
          wm.removeView(view)
        } catch (_: Exception) {
          // La vista ya no estaba adjunta
        }
      }
    }
  }

  private fun stopOfferSoundInternal() {
    activeSoundStopRunnable?.let {
      mainHandler.removeCallbacks(it)
    }
    activeSoundStopRunnable = null

    val ringtone = activeOfferRingtone
    activeOfferRingtone = null
    if (ringtone != null) {
      try {
        if (ringtone.isPlaying) {
          ringtone.stop()
        }
      } catch (_: Exception) {
        // Ignorar al detener ringtone
      }
    }

    val toneGen = activeToneGenerator
    activeToneGenerator = null
    if (toneGen != null) {
      try {
        toneGen.stopTone()
        toneGen.release()
      } catch (_: Exception) {
        // Ignorar al liberar ToneGenerator
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
    @Volatile
    private var activeOverlayWindowManager: WindowManager? = null
    @Volatile
    private var activeOverlayView: View? = null
    private var activeOverlayDismissRunnable: Runnable? = null

    @Volatile
    private var activeBubbleWindowManager: WindowManager? = null
    @Volatile
    private var activeBubbleView: View? = null
    private var activeBubbleSnapAnimator: ValueAnimator? = null

    @Volatile
    private var activeOfferRingtone: Ringtone? = null
    @Volatile
    private var activeToneGenerator: ToneGenerator? = null
    private var activeSoundStopRunnable: Runnable? = null

    private const val DEFAULT_TTL_SECONDS = 20L
    private const val COLOR_OBSIDIAN = "#0A0A0C"
    private const val COLOR_OBSIDIAN_SURFACE = "#0E1015"
    private const val COLOR_GOLD = "#D4AF37"
    private const val COLOR_EMERALD = "#10B981"
    private const val COLOR_PLATINUM = "#E4E4E5"
    private const val COLOR_ASH = "#A1A1AA"
  }
}
