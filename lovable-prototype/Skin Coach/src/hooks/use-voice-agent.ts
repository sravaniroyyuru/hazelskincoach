import { useState, useCallback, useRef, useEffect } from "react";

interface VoiceAgentOptions {
  onTranscript?: (text: string) => void;
  onSpeaking?: (speaking: boolean) => void;
  lang?: string;
}

export function useVoiceAgent(options: VoiceAgentOptions = {}) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SpeechRecognition && !!window.speechSynthesis);
    synthRef.current = window.speechSynthesis || null;
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop any ongoing speech
    synthRef.current?.cancel();

    const recognition = new SpeechRecognition();
    recognition.lang = options.lang || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interim = t;
        }
      }
      const current = finalTranscript || interim;
      setTranscript(current);
      options.onTranscript?.(current);
    };

    recognition.onend = () => {
      setListening(false);
      if (finalTranscript) {
        setTranscript(finalTranscript);
        options.onTranscript?.(finalTranscript);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript("");
  }, [options.lang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Try to find a natural-sounding voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Natural"));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => {
      setSpeaking(true);
      options.onSpeaking?.(true);
    };
    utterance.onend = () => {
      setSpeaking(false);
      options.onSpeaking?.(false);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      options.onSpeaking?.(false);
    };

    synthRef.current.speak(utterance);
  }, [options.lang]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setSpeaking(false);
  }, []);

  return {
    listening,
    speaking,
    supported,
    transcript,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
