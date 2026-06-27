import { useState, useRef, useEffect } from "react";
import { Mic, Volume2 } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-GB";

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        setTranscript(interim || final);
        if (final) {
          onTranscript(final.trim());
          setTranscript("");
          setIsListening(false);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setTranscript("");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setTranscript("");
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-1.5">
      {transcript && (
        <div className="text-[10px] text-indigo-300 italic max-w-[120px] truncate px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full animate-pulse">
          {transcript}
        </div>
      )}

      <button
        onClick={toggleListening}
        disabled={disabled}
        title={isListening ? "Stop listening" : "Start voice input (Talk Mode)"}
        className={`
          relative flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 cursor-pointer group
          ${isListening
            ? "bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
            : "bg-white/[0.03] border-white/[0.08] text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/10"
          }
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
      >
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
            <span className="absolute -inset-1 rounded-full border border-rose-500/20 animate-ping" />
          </>
        )}

        {isListening ? (
          <Volume2 size={14} className="animate-pulse" />
        ) : (
          <Mic size={14} />
        )}
      </button>
    </div>
  );
}
