import { useState, useRef, useCallback, useEffect } from 'react';

// Fix: Add types for Web Speech API to resolve TypeScript errors as they are not in standard DOM typings.
interface SpeechRecognitionAlternative {
  readonly transcript: string;
}
interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionAlternative;
  readonly length: number;
}
interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult;
  readonly length: number;
}
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  addEventListener(type: "result", listener: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: "error", listener: (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: "end", listener: (this: SpeechRecognition, ev: Event) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: "result", listener: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: "error", listener: (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: "end", listener: (this: SpeechRecognition, ev: Event) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}
interface SpeechRecognitionStatic {
  new(): SpeechRecognition;
}


// Polyfill for cross-browser compatibility
const SpeechRecognition: SpeechRecognitionStatic | undefined = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: SpeechRecognition | null = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
}

export const useSpeech = (onSpeechResult: (result: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const onResultCallbackRef = useRef(onSpeechResult);
  onResultCallbackRef.current = onSpeechResult;

  useEffect(() => {
    const handleVoicesChanged = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
    };
    if ('speechSynthesis' in window) {
      handleVoicesChanged();
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      return () => {
          window.speechSynthesis.onvoiceschanged = null;
      }
    }
  }, []);

  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    if (transcript) {
      onResultCallbackRef.current(transcript);
    }
    setIsListening(false);
  }, []);

  const handleError = useCallback((event: SpeechRecognitionErrorEvent) => {
    console.error('Speech recognition error', event.error);
    setIsListening(false);
  }, []);

  const handleEnd = useCallback(() => {
     setIsListening(false);
  }, []);

  useEffect(() => {
    if (!recognition) return;

    recognition.addEventListener('result', handleResult);
    recognition.addEventListener('error', handleError);
    recognition.addEventListener('end', handleEnd);

    return () => {
      recognition?.removeEventListener('result', handleResult);
      recognition?.removeEventListener('error', handleError);
      recognition?.removeEventListener('end', handleEnd);
    };
  }, [handleResult, handleError, handleEnd]);

  const startListening = useCallback(() => {
    if (isListening || !recognition) return;
    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
        console.error("Speech recognition could not be started: ", error)
        setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!isListening || !recognition) return;
    recognition.stop();
    setIsListening(false);
  }, [isListening]);

  const speak = useCallback((text: string, options?: { rate?: number; voiceURI?: string; onEnd?: () => void }) => {
    if (!window.speechSynthesis) {
        console.warn("Speech synthesis not supported.");
        options?.onEnd?.();
        return;
    };

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1;
    
    if (options?.voiceURI) {
        const selectedVoice = voices.find(v => v.voiceURI === options.voiceURI);
        if(selectedVoice) {
            utterance.voice = selectedVoice;
        }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      options?.onEnd?.();
    };
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    window.speechSynthesis.speak(utterance);
  }, [voices]);
  
  const browserSupport = {
      recognition: !!recognition,
      synthesis: 'speechSynthesis' in window,
  }

  return { isListening, isSpeaking, startListening, stopListening, speak, browserSupport, voices };
};