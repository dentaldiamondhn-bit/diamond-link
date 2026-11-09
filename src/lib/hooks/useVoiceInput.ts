import { useState, useEffect, useCallback, useRef } from 'react';

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface VoiceCommand {
  command: string;
  params: Record<string, string>;
}

const COMMAND_PATTERNS = {
  tooth_status: /(?:diente|tooth|zahn)\s+(\d{1,2})\s+(falta|fehlt|presente|ist da)/i,
  mobility: /(?:movilidad|mobility|lockerung)\s+(\d{1,2})\s+(?:grado|grade|grad)\s+(\d)/i,
  implant: /(?:implante|implant|implantat)\s+(\d{1,2})/i,
  furcation: /(\d{1,2})\s+furcaci[oó]n\s+grado\s+(\d)\s+(bucal|palatino|lingual|b|p|l|dp|mp)/i,
  bop_pi: /(sangrado|bop|placa|pi|m[áa]s|menos|plus|minus)/i,
  start_recording: /start\s+(\d{1,2})\s+(distobucal|mesiolingual|mesiobucal|distolingual|bucal|lingual|palatino|mesial|distal)/i,
  stop: /stop/i,
};

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [mode, setMode] = useState<'live' | 'batch'>('live');
  const [training, setTraining] = useState<Record<string, string>>({});

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const processCommand = useCallback((text: string) => {
    let correctedText = text;
    Object.entries(training).forEach(([wrong, correct]) => {
      correctedText = correctedText.replace(new RegExp(wrong, 'gi'), correct);
    });
    console.log('Voice command:', correctedText);
  }, [training]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript.trim());
          processCommand(finalTranscript.trim());
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
      };
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const startListening = useCallback(() => {
    recognitionRef.current?.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(m => m === 'live' ? 'batch' : 'live');
  }, []);

  return {
    isListening,
    transcript,
    mode,
    training,
    startListening,
    stopListening,
    toggleMode,
    addTraining: (wrong: string, correct: string) => setTraining(t => ({ ...t, [wrong]: correct })),
  };
}