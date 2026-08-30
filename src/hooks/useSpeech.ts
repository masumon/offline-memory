import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

// Voice input. The OS speech recogniser turns speech into text; our app records,
// stores and sends nothing itself. We hint the recogniser with the app's language
// (Bangla → bn-BD, English → en-US) but let it use whatever engine actually returns a
// result, so it works even when an offline language pack is not installed and it can
// still pick up the odd word in another language. TTS uses the OS voices. Everything
// degrades gracefully when the recogniser is unavailable.
//
// Long-utterance handling: Android's recogniser often emits several `isFinal` chunks
// for one sentence (it finalises each time you pause). We accumulate every finalised
// chunk plus the live interim, and only hand the *whole* transcript to the caller when
// the session ends — so "half the sentence" can no longer be lost.

type SpeechError = 'no-speech' | 'unavailable' | 'permission' | null;

function joinTranscript(base: string, next: string): string {
  const a = base.trim();
  const b = next.trim();
  if (!b) return a;
  if (!a) return b;
  // The recogniser sometimes re-sends the running transcript as a "final" chunk.
  if (a === b || a.endsWith(b)) return a;
  if (b.startsWith(a)) return b;
  return `${a} ${b}`;
}

export function useSpeech(language: 'bn' | 'en') {
  const locale = language === 'bn' ? 'bn-BD' : 'en-US';
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [lastError, setLastError] = useState<SpeechError>(null);
  const [supported] = useState(() => {
    try { return ExpoSpeechRecognitionModule.isRecognitionAvailable?.() ?? true; } catch { return false; }
  });
  const onFinalRef = useRef<((text: string) => void) | null>(null);
  const finalizedRef = useRef('');
  const interimRef = useRef('');
  const deliveredRef = useRef(false);

  const runningTranscript = useCallback(
    () => joinTranscript(finalizedRef.current, interimRef.current),
    [],
  );

  const deliver = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean || deliveredRef.current) return;
    deliveredRef.current = true;
    onFinalRef.current?.(clean);
  }, []);

  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results?.[0]?.transcript ?? '';
    if (e.isFinal) {
      // Fold this finalised chunk into the accumulator; keep listening for more.
      finalizedRef.current = joinTranscript(finalizedRef.current, text);
      interimRef.current = '';
      setPartial(finalizedRef.current);
    } else if (text) {
      interimRef.current = text;
      setPartial(joinTranscript(finalizedRef.current, text));
    }
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    const full = runningTranscript();
    setPartial('');
    if (full.trim()) deliver(full);
    else if (!deliveredRef.current) setLastError('no-speech');
  });
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    setPartial('');
    const full = runningTranscript();
    if (full.trim()) { deliver(full); return; }
    const code = (e as { error?: string })?.error ?? '';
    setLastError(code === 'no-speech' || code === 'no-match' || code === 'speech-timeout' ? 'no-speech' : 'unavailable');
  });

  const startListening = useCallback(async (onFinal: (text: string) => void) => {
    onFinalRef.current = onFinal;
    finalizedRef.current = '';
    interimRef.current = '';
    deliveredRef.current = false;
    setLastError(null);
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) { setLastError('permission'); return false; }
      setPartial('');
      setListening(true);
      ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        continuous: false,
        // Let the platform choose the engine (online or on-device) — forcing on-device
        // makes start() fail on phones without that language pack.
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
        androidIntentOptions: {
          EXTRA_LANGUAGE_MODEL: 'free_form',
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 12000,
          // Give a spoken sentence room to breathe — do not cut off on a short pause.
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3500,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2600,
        },
      });
      return true;
    } catch {
      setListening(false);
      setLastError('unavailable');
      return false;
    }
  }, [locale]);

  const stopListening = useCallback(() => {
    // stop() asks for a final result; abort() would drop it. Prefer stop().
    try { ExpoSpeechRecognitionModule.stop(); } catch { /* noop */ }
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    try { Speech.speak(text, { language: locale, rate: 1.0 }); } catch { /* noop */ }
  }, [locale]);

  const stopSpeaking = useCallback(() => { try { Speech.stop(); } catch { /* noop */ } }, []);

  useEffect(() => () => {
    try { ExpoSpeechRecognitionModule.abort(); } catch { /* noop */ }
    try { Speech.stop(); } catch { /* noop */ }
  }, []);

  return { supported, listening, partial, lastError, startListening, stopListening, speak, stopSpeaking };
}
