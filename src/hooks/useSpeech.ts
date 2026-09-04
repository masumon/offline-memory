import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

// Voice input. The OS speech recogniser turns speech into text; our app records,
// stores and sends nothing itself. We hint the recogniser with the app's language
// (Bangla → bn-BD, English → en-US).
//
// Privacy-first engine choice: when the platform reports on-device recognition is
// available we ask for it (`requiresOnDeviceRecognition: true`) so nothing leaves the
// phone. If that attempt fails for this locale (no on-device language pack) we retry
// once WITHOUT the constraint, letting the OS use whatever engine works — so voice never
// simply "stops working". TTS uses the OS voices. Everything degrades gracefully when
// the recogniser is unavailable.
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
  // Whether the current attempt asked for on-device only, and whether we already fell
  // back to the unconstrained engine for this session (retry at most once).
  const onDeviceAttemptRef = useRef(false);
  const triedFallbackRef = useRef(false);
  // Set when the user stops (or a new session starts) so a scheduled fallback retry from
  // a just-failed on-device attempt can't re-open the recogniser behind their back.
  const cancelFallbackRef = useRef(false);
  // Bumped every startListening() — a queued fallback checks it still owns the session.
  const sessionRef = useRef(0);

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

  // One place that actually kicks off the recogniser. `onDevice` maps straight to
  // `requiresOnDeviceRecognition` so nothing leaves the phone when a local pack exists.
  const beginRecognition = useCallback((onDevice: boolean) => {
    onDeviceAttemptRef.current = onDevice;
    setPartial('');
    setListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: locale,
      interimResults: true,
      continuous: false,
      requiresOnDeviceRecognition: onDevice,
      addsPunctuation: true,
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: 'free_form',
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 12000,
        // Give a spoken sentence room to breathe — do not cut off on a short pause.
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3500,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2600,
      },
    });
  }, [locale]);

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
    // While a fallback retry is queued it owns the "listening" state; otherwise the
    // session is really over.
    const fallbackQueued = triedFallbackRef.current && onDeviceAttemptRef.current && !cancelFallbackRef.current;
    if (!fallbackQueued) setListening(false);
    const full = runningTranscript();
    setPartial('');
    if (full.trim()) deliver(full);
    else if (!deliveredRef.current) setLastError('no-speech');
  });
  useSpeechRecognitionEvent('error', (e) => {
    const full = runningTranscript();
    if (full.trim()) { setListening(false); setPartial(''); deliver(full); return; }
    const code = (e as { error?: string })?.error ?? '';
    const recoverable = code !== 'no-speech' && code !== 'no-match' && code !== 'speech-timeout' && code !== 'aborted';
    // On-device was asked for but this locale has no local pack → one silent retry with
    // the unconstrained engine so voice still works.
    if (onDeviceAttemptRef.current && !triedFallbackRef.current && recoverable) {
      triedFallbackRef.current = true;
      deliveredRef.current = false;
      finalizedRef.current = '';
      interimRef.current = '';
      const token = sessionRef.current;
      // Let the failed recogniser session fully tear down before re-arming.
      setTimeout(() => {
        if (token === sessionRef.current && !cancelFallbackRef.current && !deliveredRef.current) beginRecognition(false);
      }, 180);
      return;
    }
    setListening(false);
    setPartial('');
    setLastError(code === 'no-speech' || code === 'no-match' || code === 'speech-timeout' ? 'no-speech' : 'unavailable');
  });

  const startListening = useCallback(async (onFinal: (text: string) => void) => {
    // If a previous session is still winding down (user tapped stop then mic again fast),
    // abort it and mark it delivered so its late `end`/`error` can't push a stale
    // transcript into this new session.
    deliveredRef.current = true;
    try { ExpoSpeechRecognitionModule.abort(); } catch { /* nothing was running */ }
    onFinalRef.current = onFinal;
    finalizedRef.current = '';
    interimRef.current = '';
    deliveredRef.current = false;
    triedFallbackRef.current = false;
    cancelFallbackRef.current = false;
    sessionRef.current += 1;
    setLastError(null);
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) { setLastError('permission'); return false; }
      let onDevice = false;
      try { onDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition?.() ?? false; } catch { onDevice = false; }
      beginRecognition(onDevice);
      return true;
    } catch {
      setListening(false);
      setLastError('unavailable');
      return false;
    }
  }, [beginRecognition]);

  const stopListening = useCallback(() => {
    // stop() asks for a final result; abort() would drop it. Prefer stop().
    cancelFallbackRef.current = true;
    try { ExpoSpeechRecognitionModule.stop(); } catch { /* noop */ }
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    try { Speech.speak(text, { language: locale, rate: 1.0 }); } catch { /* noop */ }
  }, [locale]);

  const stopSpeaking = useCallback(() => { try { Speech.stop(); } catch { /* noop */ } }, []);

  useEffect(() => () => {
    cancelFallbackRef.current = true;
    try { ExpoSpeechRecognitionModule.abort(); } catch { /* noop */ }
    try { Speech.stop(); } catch { /* noop */ }
  }, []);

  return { supported, listening, partial, lastError, startListening, stopListening, speak, stopSpeaking };
}
