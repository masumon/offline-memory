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

type SpeechError = 'no-speech' | 'unavailable' | 'permission' | null;

export function useSpeech(language: 'bn' | 'en') {
  const locale = language === 'bn' ? 'bn-BD' : 'en-US';
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const [lastError, setLastError] = useState<SpeechError>(null);
  const [supported] = useState(() => {
    try { return ExpoSpeechRecognitionModule.isRecognitionAvailable?.() ?? true; } catch { return false; }
  });
  const onFinalRef = useRef<((text: string) => void) | null>(null);
  const lastTextRef = useRef('');
  const deliveredRef = useRef(false);

  const deliver = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean || deliveredRef.current) return;
    deliveredRef.current = true;
    onFinalRef.current?.(clean);
  }, []);

  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results?.[0]?.transcript ?? '';
    if (text) lastTextRef.current = text;
    if (e.isFinal) { deliver(text); setPartial(''); }
    else setPartial(text);
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setPartial('');
    // If the engine stopped without a "final" event but we heard something, use it.
    if (lastTextRef.current.trim()) deliver(lastTextRef.current);
    else if (!deliveredRef.current) setLastError('no-speech');
  });
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    setPartial('');
    if (lastTextRef.current.trim()) { deliver(lastTextRef.current); return; }
    const code = (e as { error?: string })?.error ?? '';
    setLastError(code === 'no-speech' || code === 'no-match' || code === 'speech-timeout' ? 'no-speech' : 'unavailable');
  });

  const startListening = useCallback(async (onFinal: (text: string) => void) => {
    onFinalRef.current = onFinal;
    lastTextRef.current = '';
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
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 9000,
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2200,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1800,
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
