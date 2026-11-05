package com.roadschool.app.safety

/** Driver-safety levels. Mirrors js/safety.js of the web prototype (same thresholds and hysteresis). */
enum class Mode { STOPPED, LOW, DRIVING }

data class Policy(val visuals: Boolean, val newQuestion: Boolean, val rearTouch: Boolean)

/** Gear as reported by the Vehicle SDK (simulated in this prototype). */
enum class Gear { P, R, N, D }

/**
 * 3-level state machine:
 *  STOPPED = gear P and ~0 km/h (only level that may show visuals, rear-seat touch only)
 *  LOW     = slow, or stopped but not in P (voice only, NO new questions)
 *  DRIVING = normal speed (voice only, new questions allowed, answered by voice)
 * Leaving STOPPED never goes straight to a visual-capable level. Hysteresis: up at 35 km/h, down below 25 km/h.
 */
class SafetyGovernor(
    private val drivingUpKmh: Double = 35.0,
    private val drivingDownKmh: Double = 25.0,
    private val stopEpsKmh: Double = 0.5,
) {
    var mode: Mode = Mode.STOPPED
        private set
    private val _history = mutableListOf<Triple<Mode, Mode, Double>>()
    val history: List<Triple<Mode, Mode, Double>> get() = _history

    fun update(speedKmh: Double, gear: Gear): Mode {
        val prev = mode
        var next = prev
        if (gear == Gear.P && speedKmh <= stopEpsKmh) next = Mode.STOPPED
        else if (prev == Mode.STOPPED) next = Mode.LOW
        else if (prev == Mode.LOW) next = if (speedKmh >= drivingUpKmh) Mode.DRIVING else Mode.LOW
        else if (prev == Mode.DRIVING) next = if (speedKmh < drivingDownKmh) Mode.LOW else Mode.DRIVING
        if (prev == Mode.STOPPED && next == Mode.LOW && speedKmh >= drivingUpKmh) next = Mode.DRIVING
        if (next != prev) { mode = next; _history += Triple(prev, next, speedKmh) }
        return mode
    }

    val policy: Policy get() = policyOf(mode)

    companion object {
        fun policyOf(m: Mode): Policy = when (m) {
            Mode.STOPPED -> Policy(visuals = true, newQuestion = true, rearTouch = true)
            Mode.LOW -> Policy(visuals = false, newQuestion = false, rearTouch = false)
            Mode.DRIVING -> Policy(visuals = false, newQuestion = true, rearTouch = false)
        }
    }
}
