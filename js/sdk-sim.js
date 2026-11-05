// =============================================================================
// SIMULATED Pleos Connect SDK layer  (NOT the real SDK)
// -----------------------------------------------------------------------------
// The interface names mirror the SDK families listed in the contest guide:
//   Vehicle SDK / FusedLocation SDK / NaviHelper SDK / TextToSpeech SDK / SpeechToText SDK
// Method names/signatures below are PROTOTYPE ASSUMPTIONS. Final signatures must be
// re-checked against the official Pleos Playground SDK reference (see README).
// Every call is written to the SDK log with the flag sim:true and shown in the UI.
// =============================================================================

const subs = new Set();
export const sdkLog = [];
export function onSdkLog(fn) { subs.add(fn); }
export function logSdk(api, call, result) {
  const e = { ts: Date.now(), api, call, result, sim: true };
  sdkLog.push(e);
  if (sdkLog.length > 300) sdkLog.shift();
  subs.forEach((f) => f(e));
}

/** Drive state provider (the scripted drive). Replaced by the real vehicle in-car. */
export class DriveSource {
  constructor() { this.s = { speedKmh: 0, gear: 'P', lat: 0, lon: 0, bearing: 0, remainingSec: 0, remainingM: 0 }; }
}

export class Vehicle {                                  // [SIMULATED] Vehicle SDK
  constructor(src) { this.src = src; this.override = null; this._last = ''; }
  getSpeedKmh() { return this.override?.speedKmh ?? this.src.s.speedKmh; }
  getGear() { return this.override?.gear ?? this.src.s.gear; }  // 'P' | 'R' | 'N' | 'D'
  snapshot() {
    const v = { speedKmh: Math.round(this.getSpeedKmh()), gear: this.getGear() };
    const key = v.gear + ':' + Math.round(v.speedKmh / 10);
    if (key !== this._last) { this._last = key; logSdk('Vehicle', 'getSpeed()/getGear()', `${v.speedKmh} km/h, gear ${v.gear}`); }
    return v;
  }
}

export class FusedLocation {                            // [SIMULATED] FusedLocation SDK
  constructor(src) { this.src = src; this._n = 0; }
  getLastLocation() {
    const { lat, lon, bearing } = this.src.s;
    if (this._n++ % 40 === 0) logSdk('FusedLocation', 'getLastLocation()', `${lat.toFixed(4)}, ${lon.toFixed(4)}, bearing ${Math.round(bearing)}deg`);
    return { lat, lon, bearingDeg: bearing, accuracyM: 8 };
  }
}

export class NaviHelper {                               // [SIMULATED] NaviHelper SDK
  constructor(src, dest) { this.src = src; this.dest = dest; }
  getDestination() { return this.dest; }
  getRemainingTimeSec() { return this.src.s.remainingSec; }
  getRemainingDistanceM() { return this.src.s.remainingM; }
  getRoutePreview(aheadM, ids) { logSdk('NaviHelper', `getRoutePreview(${Math.round(aheadM / 1000)}km)`, `prefetch ${ids.join(', ') || '-'}`); return ids; }
}

export class TextToSpeech {                             // [SIMULATED] TextToSpeech SDK (browser speechSynthesis or timed stub)
  constructor({ mute = false, fast = 1 } = {}) { this.mute = mute; this.fast = fast; this._timer = null; this._res = null; this.onSpeakStart = null; }
  speak(text, opts = {}) {
    logSdk('TextToSpeech', 'speak()', text.length > 28 ? text.slice(0, 28) + '...' : text);
    this.onSpeakStart?.(text);
    return new Promise((resolve) => {
      this._res = resolve;
      const done = () => { clearTimeout(this._timer); this._res = null; resolve(); };
      const native = window.RoadSchoolNative;           // Android host: platform TTS via the Kotlin bridge
      if (native && !this.mute) {
        const id = 'u' + (this._n = (this._n || 0) + 1);
        window.__ttsDone = (got) => { if (got === id) done(); };
        try { native.speak(id, text); this._timer = setTimeout(done, est * 3 + 4000); return; } catch (e) { /* fall through */ }
      }
      const synth = window.speechSynthesis;
      const useVoice = synth && !this.mute;
      const est = Math.max(900, text.length * 105 / (opts.rate || 1)) / this.fast;
      if (useVoice) {
        try {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'ko-KR'; u.rate = (opts.rate || 1) * 1.02; u.pitch = opts.pitch || 1.25;
          const v = synth.getVoices().find((x) => x.lang?.startsWith('ko'));
          if (v) u.voice = v;
          u.onend = done; u.onerror = done;
          synth.speak(u);
          this._timer = setTimeout(done, est * 3 + 3000);   // safety net if the engine never fires onend
          return;
        } catch (e) { /* fall through to timed stub */ }
      }
      this._timer = setTimeout(done, est);
    });
  }
  stop() { logSdk('TextToSpeech', 'stop()', ''); try { window.RoadSchoolNative?.stopSpeaking(); } catch (e) {} try { window.speechSynthesis?.cancel(); } catch (e) {} clearTimeout(this._timer); this._res?.(); this._res = null; }
}

export class SpeechToText {                             // [SIMULATED] SpeechToText SDK (utterance injected by dev panel / tablet tap / auto-child)
  constructor() { this._res = null; this._timer = null; this.listening = false; this.onListen = null; }
  startListening({ timeoutMs = 15000 } = {}) {
    this.listening = true; this.onListen?.(true);
    logSdk('SpeechToText', 'startListening()', 'waiting for child utterance (simulated)');
    return new Promise((resolve) => {
      this._res = resolve;
      this._timer = setTimeout(() => this._finish({ timeout: true }), timeoutMs);
    });
  }
  /** SIMULATION ONLY: stands in for the recognizer result. */
  simulateUtterance(text, confidence = 0.9) {
    if (!this._res) return false;
    logSdk('SpeechToText', 'onResult()', `"${text}" (conf ${confidence})`);
    this._finish({ text, confidence });
    return true;
  }
  _finish(r) { clearTimeout(this._timer); this.listening = false; this.onListen?.(false); const f = this._res; this._res = null; f?.(r); }
  stopListening() { if (this._res) this._finish({ timeout: true, aborted: true }); }
}
