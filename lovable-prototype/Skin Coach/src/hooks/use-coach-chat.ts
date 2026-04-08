import { useState, useCallback } from "react";

interface StreamMessage {
  role: "user" | "assistant";
  content: string;
}

interface UserContext {
  name?: string;
  skinType?: string;
  concerns?: string[];
  streakPercent?: number;
  recentCheckins?: any[];
  products?: { name: string }[];
}

export function useCoachChat() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamChat = useCallback(async ({
    messages,
    userContext,
    onDelta,
    onDone,
  }: {
    messages: StreamMessage[];
    userContext?: UserContext;
    onDelta: (text: string) => void;
    onDone: () => void;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages, userContext }),
      });

      if (resp.status === 429) {
        setError("Coach is taking a breather — try again in a moment.");
        onDone();
        return;
      }
      if (resp.status === 402) {
        setError("AI usage limit reached. Please add credits to continue.");
        onDone();
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error("Failed to connect to coach");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Flush remaining
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch { /* ignore */ }
        }
      }

      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      onDone();
    } finally {
      setLoading(false);
    }
  }, []);

  return { streamChat, loading, error };
}
