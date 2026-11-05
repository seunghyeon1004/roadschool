package com.roadschool.app

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import com.roadschool.app.safety.Gear
import com.roadschool.app.safety.SafetyGovernor
import com.roadschool.app.sdk.AndroidTts
import com.roadschool.app.sdk.SimFusedLocation
import com.roadschool.app.sdk.SimNaviHelper
import com.roadschool.app.sdk.SimVehicle

/** Hosts the web prototype (bundled assets) and exposes the native SafetyGovernor + platform TTS to it. */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private lateinit var tts: AndroidTts
    private val governor = SafetyGovernor()
    private val vehicle = SimVehicle()
    private val location = SimFusedLocation()
    private val navi = SimNaviHelper("강릉 경포 (경포호·오죽헌 일대)")

    /** window.RoadSchoolNative, available to the page. */
    inner class Bridge {
        /** The Kotlin governor is authoritative when present. Returns "STOPPED" | "LOW" | "DRIVING". */
        @JavascriptInterface fun updateSafety(speedKmh: Double, gear: String): String {
            vehicle.speed = speedKmh; vehicle.gear = runCatching { Gear.valueOf(gear) }.getOrDefault(Gear.D)
            return governor.update(vehicle.speedKmh(), vehicle.gear()).name
        }
        @JavascriptInterface fun speak(id: String, text: String) {
            tts.speak(id, text) { web.post { web.evaluateJavascript("window.__ttsDone && window.__ttsDone('$id')", null) } }
        }
        @JavascriptInterface fun stopSpeaking() { tts.stop() }
        @JavascriptInterface fun info(): String = "RoadSchool native bridge: SafetyGovernor(kotlin), TTS(android), SDKs simulated; dest=${navi.destinationName()}; fix=${location.lastLocation()}"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        tts = AndroidTts(this)
        val loader = WebViewAssetLoader.Builder().addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            addJavascriptInterface(Bridge(), "RoadSchoolNative")
            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(view: WebView, request: android.webkit.WebResourceRequest) = loader.shouldInterceptRequest(request.url)
            }
        }
        setContentView(web)
        web.loadUrl("https://appassets.androidplatform.net/assets/web/index.html?native=1")
        Log.i("RoadSchool", "loaded prototype in WebView")
    }

    override fun onDestroy() { tts.shutdown(); web.destroy(); super.onDestroy() }
}
