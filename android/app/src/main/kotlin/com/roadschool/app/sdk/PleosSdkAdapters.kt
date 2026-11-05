package com.roadschool.app.sdk

import com.roadschool.app.safety.Gear

/*
 * Adapter interfaces named after the Pleos Connect SDK modules listed in the contest guide
 * (Vehicle SDK, FusedLocation SDK, NaviHelper SDK, TextToSpeech SDK, SpeechToText SDK).
 * The method shapes are PROTOTYPE ASSUMPTIONS, not the official signatures. In a real Pleos Connect build each
 * interface gets an implementation that delegates to the official SDK; the Sim* classes below are SIMULATED stand-ins.
 */
interface VehicleSdk { fun speedKmh(): Double; fun gear(): Gear }
interface FusedLocationSdk { fun lastLocation(): GeoFix }
interface NaviHelperSdk { fun destinationName(): String; fun remainingTimeSec(): Int }
interface TextToSpeechSdk { fun speak(utteranceId: String, text: String, onDone: () -> Unit); fun stop() }
interface SpeechToTextSdk { fun startListening(onResult: (String?) -> Unit); fun stopListening() }

data class GeoFix(val lat: Double, val lon: Double, val bearingDeg: Double)

/** SIMULATED: values are pushed in by the scripted drive of the web prototype. */
class SimVehicle : VehicleSdk {
    @Volatile var speed = 0.0
    @Volatile var gear = Gear.P
    override fun speedKmh() = speed
    override fun gear() = gear
}

/** SIMULATED */
class SimFusedLocation : FusedLocationSdk {
    @Volatile var fix = GeoFix(37.519, 127.090, 0.0)
    override fun lastLocation() = fix
}

/** SIMULATED */
class SimNaviHelper(private val dest: String) : NaviHelperSdk {
    @Volatile var remaining = 0
    override fun destinationName() = dest
    override fun remainingTimeSec() = remaining
}

/** SIMULATED recognizer: the child's utterance is injected by the prototype UI (no microphone, no permission). */
class SimSpeechToText : SpeechToTextSdk {
    private var cb: ((String?) -> Unit)? = null
    override fun startListening(onResult: (String?) -> Unit) { cb = onResult }
    override fun stopListening() { cb?.invoke(null); cb = null }
    fun inject(text: String) { cb?.invoke(text); cb = null }
}
