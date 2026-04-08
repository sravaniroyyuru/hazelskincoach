import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2 } from "lucide-react";
import VoiceInputButton from "@/components/VoiceInputButton";
import { useCoachChat } from "@/hooks/use-coach-chat";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const starters = [
  "I feel like I'm back to square one — help",
  "Why is my skin worse even though I'm doing everything right?",
  "Should I add anything new?",
  "I picked last night. What do I do now?",
  "Is it normal to still break out after 6 weeks?",
];

const CoachTab = ({ userName }: { userName: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { streamChat, loading, error } = useCoachChat();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");

    let assistantSoFar = "";
    const updateAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    await streamChat({
      messages: newMessages,
      userContext: {
        name: userName,
        streakPercent: 72,
      },
      onDelta: updateAssistant,
      onDone: () => {},
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <div className="px-5 pt-2 pb-3">
        <h1 className="text-xl font-bold">Coach</h1>
        <p className="text-xs text-muted-foreground">Your calm, kind guide — powered by AI</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 space-y-4 pb-4">
        {/* Welcome message (not from AI, always shown) */}
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[85%]">
            <div className="rounded-2xl p-4 text-sm leading-relaxed card-warm font-serif italic text-foreground/80">
              Hey {userName} 🌿{"\n\n"}I'm Hazel — your skin coach. I'm here whenever you need to talk through something, vent about a rough day, or just check in.{"\n\n"}No judgment, no hype. Just honest, calm guidance rooted in your actual data.{"\n\n"}What's on your mind?
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`max-w-[85%] ${msg.role === "user" ? "ml-auto" : ""}`}
            >
              <div
                className={`rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "card-warm font-serif italic text-foreground/80"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs font-serif italic">Hazel is thinking...</span>
          </div>
        )}

        {error && (
          <div className="text-xs text-destructive text-center py-2">{error}</div>
        )}

        {messages.length === 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground font-semibold">Try saying:</p>
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="check-option text-left w-full text-xs"
              >
                "{s}"
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 border-t border-border bg-background">
        <div className="flex gap-2 items-center">
          <VoiceInputButton
            onResult={(text) => sendMessage(text)}
            disabled={loading}
            placeholder="Speak to Hazel"
          />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Talk to Hazel..."
            maxLength={2000}
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachTab;
