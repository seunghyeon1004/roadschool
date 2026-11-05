package com.roadschool.app.safety

import org.junit.Assert.*
import org.junit.Test

class SafetyGovernorTest {
    @Test fun parkedIsStoppedButGearDAtZeroIsNot() {
        val g = SafetyGovernor()
        assertEquals(Mode.STOPPED, g.update(0.0, Gear.P))
        assertEquals(Mode.LOW, g.update(0.0, Gear.D))      // red light in D: not a visual-capable state
        assertEquals(Mode.LOW, g.update(0.0, Gear.D))
    }

    @Test fun hysteresisBetweenLowAndDriving() {
        val g = SafetyGovernor(); g.update(0.0, Gear.D)
        assertEquals(Mode.LOW, g.update(30.0, Gear.D))
        assertEquals(Mode.DRIVING, g.update(36.0, Gear.D))
        assertEquals(Mode.DRIVING, g.update(28.0, Gear.D))
        assertEquals(Mode.LOW, g.update(24.0, Gear.D))
    }

    @Test fun policyOnlyAllowsVisualsWhenStopped() {
        assertTrue(SafetyGovernor.policyOf(Mode.STOPPED).visuals)
        assertFalse(SafetyGovernor.policyOf(Mode.LOW).visuals)
        assertFalse(SafetyGovernor.policyOf(Mode.DRIVING).visuals)
        assertFalse(SafetyGovernor.policyOf(Mode.LOW).newQuestion)
        assertTrue(SafetyGovernor.policyOf(Mode.DRIVING).newQuestion)
        assertFalse(SafetyGovernor.policyOf(Mode.LOW).rearTouch || SafetyGovernor.policyOf(Mode.DRIVING).rearTouch)
    }

    @Test fun neverJumpsFromStoppedToVisualStateWhileMoving() {
        val g = SafetyGovernor()
        assertEquals(Mode.STOPPED, g.update(0.0, Gear.P))
        assertEquals(Mode.LOW, g.update(5.0, Gear.P))       // rolling in P is not stopped
        assertEquals(Mode.LOW, g.update(0.0, Gear.D))
    }

    @Test fun sweepAllSpeedsAndGearsNeverShowsVisualsOutsideParkedZeroSpeed() {
        val g = SafetyGovernor(); var violations = 0
        for (gear in Gear.values()) for (kmh in (0..1500).map { it / 10.0 } + (1500 downTo 0).map { it / 10.0 }) {
            val m = g.update(kmh, gear)
            if (SafetyGovernor.policyOf(m).visuals && !(gear == Gear.P && kmh <= 0.5)) violations++
        }
        assertEquals(0, violations)
    }
}
