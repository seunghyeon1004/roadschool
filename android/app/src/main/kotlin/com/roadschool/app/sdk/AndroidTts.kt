package com.roadschool.app.sdk

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale

/** TextToSpeechSdk backed by the Android platform TTS (stand-in for the Pleos TextToSpeech SDK; Korean voice if installed). */
class AndroidTts(context: Context) : TextToSpeechSdk {
    private var ready = false
    private val callbacks = HashMap<String, () -> Unit>()
    private val tts: TextToSpeech = TextToSpeech(context.applicationContext) { status ->
        ready = status == TextToSpeech.SUCCESS
        if (ready) { tts.language = Locale.KOREAN; tts.setPitch(1.25f) }
    }

    init {
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {}
            override fun onDone(id: String?) { synchronized(callbacks) { callbacks.remove(id) }?.invoke() }
            @Deprecated("deprecated in API") override fun onError(id: String?) { onDone(id) }
        })
    }

    override fun speak(utteranceId: String, text: String, onDone: () -> Unit) {
        if (!ready) { onDone(); return }                 // no engine: caller falls back to its timed stub
        synchronized(callbacks) { callbacks[utteranceId] = onDone }
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
    }
    override fun stop() { tts.stop() }
    fun shutdown() { tts.shutdown() }
}
