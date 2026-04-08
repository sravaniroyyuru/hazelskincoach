import { useState, useCallback, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVoiceAgent } from "@/hooks/use-voice-agent";

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

const VoiceInputButton = ({ onResult, disabled, className = "", placeholder = "Tap to speak" }: VoiceInputButtonProps) => {
  const [finalText, setFinalText] = useState("");
  const { listening, supported, transcript, startListening, stopListening } = useVoiceAgent({
    onTranscript: (text) => setFinalText(text),
  });

  const handleToggle = () => {
    if (listening) {
      stopListening();
      if (finalText.trim()) {
        onResult(finalText.trim());
        setFinalText("");
      }
    } else {
      setFinalText("");
      startListening();
    }
  };

  useEffect(() => {
    // When listening stops and we have text, send it
    if (!listening && finalText.trim()) {
      onResult(finalText.trim());
      setFinalText("");
    }
  }, [listening]);

  if (!supported) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleToggle}
        disabled={disabled}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          listening
            ? "bg-destructive text-destructive-foreground shadow-lg"
            : "bg-primary/10 text-primary hover:bg-primary/20"
        } disabled:opacity-40`}
        title={listening ? "Stop listening" : placeholder}
      >
        {listening ? <MicOff size={18} /> : <Mic size={18} />}
      </motion.button>

      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1 bg-destructive rounded-full"
                    animate={{ height: [4, 12, 4] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {transcript || "Listening..."}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceInputButton;
