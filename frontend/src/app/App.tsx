import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Send, Volume2, VolumeX, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function StatusBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-secondary/40">
      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-400" />
      <span
        className="text-[10px] font-semibold tracking-wide text-emerald-400"
        style={{ fontFamily: "JetBrains Mono, monospace" }}
      >
        Online
      </span>
    </div>
  );
}

type Role = "user" | "assistant";
type InputMode = "text" | "audio";

interface Message {
  id: string;
  role: Role;
  content: string;
  inputMode: InputMode;
  audioTranscript?: string;
  timestamp: Date;
  isStreaming?: boolean;
}

function getAIResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("safe") || lower.includes("ppe") || lower.includes("hazard"))
    return "Safety is our top priority at McAsphalt. Always wear full PPE near the drum — heat-resistant gloves, safety boots, hard hat, and hi-vis vest. Maintain safe distances from hot mix areas, ensure proper ventilation when working near fumes, and follow lockout/tagout procedures before any equipment maintenance.";
  if (lower.includes("temp") || lower.includes("heat") || lower.includes("celsius") || lower.includes("hot") || lower.includes("mix"))
    return "Asphalt mix temperatures are critical. Dense-graded mixes should be produced at 140–165°C (285–330°F). Polymer-modified mixes may require slightly higher temps. Monitor aggregate dryer outlet temp and mix discharge temp continuously. A temperature drop exceeding 15°C during transport can indicate compaction issues.";
  if (lower.includes("equipment") || lower.includes("machine") || lower.includes("drum") || lower.includes("fault") || lower.includes("conveyor"))
    return "For equipment issues: check power supply and hydraulic fluid levels first, then inspect wear components like paddles, flights, and burner nozzles. Log any fault codes displayed. Always follow lockout/tagout before physical inspection. Report persistent issues to maintenance immediately.";
  if (lower.includes("burner") || lower.includes("ignit"))
    return "If the burner won't ignite: verify fuel supply valves are open, check the UV flame scanner for contamination, inspect the ignition electrode gap (should be 3–4 mm), and confirm combustion air fan is running. If the issue persists after 3 attempts, shut down and call the maintenance team.";
  return "I'm your McAsphalt plant knowledge assistant. I can help with plant operations, safety protocols, equipment troubleshooting, mix design, and quality control. Ask me anything related to your work on site.";
}

function WaveformBars({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-5">
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-accent"
          animate={
            active
              ? { height: ["6px", `${10 + (i % 3) * 8}px`, "6px"] }
              : { height: "3px" }
          }
          transition={{
            duration: 0.45 + i * 0.06,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.07,
          }}
        />
      ))}
    </div>
  );
}

function MicButton({
  isRecording,
  onToggle,
  size = "lg",
}: {
  isRecording: boolean;
  onToggle: () => void;
  size?: "sm" | "lg";
}) {
  const isLg = size === "lg";
  return (
    <motion.button
      onClick={onToggle}
      className={`relative rounded-full flex items-center justify-center cursor-pointer select-none ${
        isLg ? "w-32 h-32" : "w-12 h-12"
      }`}
      style={{
        backgroundColor: isRecording ? "#EEB902" : "#CE0404",
        transition: "background-color 0.25s ease",
      }}
      whileTap={{ scale: 0.92 }}
      animate={
        isRecording
          ? {
              boxShadow: [
                "0 0 0 0px rgba(238,185,2,0.35)",
                "0 0 0 20px rgba(238,185,2,0)",
                "0 0 0 0px rgba(238,185,2,0.35)",
              ],
            }
          : { boxShadow: "0 0 0 0px rgba(206,4,4,0)" }
      }
      transition={
        isRecording
          ? { duration: 1.5, repeat: Infinity, ease: "easeOut" }
          : {}
      }
    >
      <Mic
        className={`${isLg ? "w-12 h-12" : "w-5 h-5"}`}
        style={{ color: isRecording ? "#1a1d22" : "#ffffff" }}
      />
      {isRecording && isLg && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 1.55, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </motion.button>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 px-4`}
    >
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center mr-2 mt-1 flex-shrink-0"
        >
          <span
            className="text-white text-[10px] font-bold"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            AI
          </span>
        </div>
      )}
      <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {msg.inputMode === "audio" && isUser && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
            <Volume2 className="w-3 h-3 text-accent" />
            <span style={{ fontFamily: "JetBrains Mono, monospace" }}>Voice input</span>
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-white rounded-br-sm"
              : "bg-card text-card-foreground border border-border rounded-bl-sm"
          }`}
          style={{ fontFamily: "Barlow, sans-serif" }}
        >
          {msg.isStreaming ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              <span className="text-muted-foreground text-xs">Thinking…</span>
            </span>
          ) : (
            msg.content
          )}
        </div>
        <span
          className="text-[10px] text-muted-foreground px-1"
          style={{ fontFamily: "JetBrains Mono, monospace" }}
        >
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled || !synthRef.current) return;
      synthRef.current.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(utter);
    },
    [ttsEnabled]
  );

  const sendMessage = useCallback(
    async (content: string, mode: InputMode) => {
      if (!content.trim()) return;
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: content.trim(),
        inputMode: mode,
        audioTranscript: mode === "audio" ? content : undefined,
        timestamp: new Date(),
      };
      const loadingMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        inputMode: "text",
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages(prev => [...prev, userMsg, loadingMsg]);
      setInputText("");
      setTranscript("");
      setIsLoading(true);

      await new Promise(r => setTimeout(r, 900 + Math.random() * 700));

      const response = getAIResponse(content);
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id ? { ...m, content: response, isStreaming: false } : m
        )
      );
      setIsLoading(false);
      speak(response);
    },
    [speak]
  );

  const toggleRecording = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) {
      setMicError("Speech recognition not supported. Try Chrome on Android.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
      setMicError(null);
      setTranscript("");
    };
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
      if (final) {
        recognition.stop();
        sendMessage(final, "audio");
      }
    };
    recognition.onerror = (e: any) => {
      setIsRecording(false);
      if (e.error === "not-allowed")
        setMicError("Microphone access denied. Allow mic in browser settings.");
      else setMicError("Mic error: " + e.error);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  }, [isRecording, sendMessage]);

  const handleSend = () => {
    sendMessage(inputText, "text");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      className="w-full h-full flex flex-col overflow-hidden"
      animate={
        isRecording
          ? { opacity: [1, 0.82, 1] }
          : { opacity: 1 }
      }
      transition={
        isRecording
          ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.4 }
      }
      style={{
        background: hasMessages
          ? "linear-gradient(170deg, #111316 0%, #1e2128 100%)"
          : "linear-gradient(160deg, #0d0e10 0%, #1a1d22 35%, #2c1111 68%, #CE0404 100%)",
        fontFamily: "Barlow, sans-serif",
        transition: "background 0.9s ease",
      }}
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
            <span
              className="text-white font-bold text-xs"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              MC
            </span>
          </div>
          <div>
            <p
              className="text-foreground font-bold text-sm leading-tight tracking-wide"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              MCASPHALT KNOWLEDGEBOT
            </p>
            <p
              className="text-muted-foreground text-[10px] tracking-widest uppercase"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              Plant Operations AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge />
          {isSpeaking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center">
              <WaveformBars active />
            </motion.div>
          )}
          <button
            onClick={() => {
              setTtsEnabled(p => !p);
              if (isSpeaking) { synthRef.current?.cancel(); setIsSpeaking(false); }
            }}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {hasMessages && (
            <button
              onClick={() => { setMessages([]); setTranscript(""); synthRef.current?.cancel(); }}
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors font-mono uppercase tracking-widest"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">

          {/* START PAGE */}
          {!hasMessages && (
            <motion.div
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="h-full flex flex-col items-center justify-between py-10 px-6"
            >
              {/* Top copy */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center pt-4"
              >
                <h2
                  className="text-4xl font-extrabold text-foreground tracking-tight leading-none mb-3"
                  style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                >
                  WHAT DO YOU <br />
                  <span style={{ color: "#CE0404" }}>NEED TO KNOW?</span>
                </h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                  Ask about safety, mix temps, equipment, or anything on site — by voice or text.
                </p>
              </motion.div>

              {/* Big mic */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 180 }}
                className="flex flex-col items-center gap-6"
              >
                <MicButton isRecording={isRecording} onToggle={toggleRecording} size="lg" />

                <AnimatePresence mode="wait">
                  {isRecording ? (
                    <motion.div
                      key="listening"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <WaveformBars active />
                        <span
                          className="text-accent text-sm font-semibold tracking-widest uppercase"
                          style={{ fontFamily: "JetBrains Mono, monospace" }}
                        >
                          Listening…
                        </span>
                      </div>
                      {transcript && (
                        <p className="text-foreground text-sm max-w-[260px] text-center italic opacity-75">
                          &ldquo;{transcript}&rdquo;
                        </p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.p
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-muted-foreground text-xs tracking-widest uppercase"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      Tap mic to speak
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Text input */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="w-full"
              >
                {micError && (
                  <p className="text-primary text-xs text-center mb-3 font-mono">{micError}</p>
                )}
                <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Or type your question…"
                    className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-30 hover:bg-red-700 transition-colors flex-shrink-0"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* CONVERSATION PAGE */}
          {hasMessages && (
            <motion.div
              key="convo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="h-full flex flex-col"
            >
              {/* Scrollable messages */}
              <div
                className="flex-1 overflow-y-auto py-4"
                style={{ scrollbarWidth: "none" }}
              >
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Live transcript strip */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="mx-4 mb-2 px-4 py-2.5 bg-accent/10 border border-accent/30 rounded-xl flex items-center gap-3"
                  >
                    <WaveformBars active />
                    <span className="text-accent text-sm flex-1 italic">
                      {transcript || "Listening…"}
                    </span>
                    <span
                      className="text-accent/60 text-[10px] uppercase tracking-widest"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      Recording
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {micError && (
                <p className="text-primary text-xs text-center mx-4 mb-2 font-mono">{micError}</p>
              )}

              {/* Input bar */}
              <div className="px-4 pb-6 pt-1 flex-shrink-0">
                <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3 py-2.5">
                  <MicButton isRecording={isRecording} onToggle={toggleRecording} size="sm" />

                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type or use mic…"
                    rows={1}
                    className="flex-1 bg-transparent text-foreground text-sm outline-none resize-none placeholder:text-muted-foreground leading-relaxed py-1.5"
                    style={{ maxHeight: "88px", overflowY: "auto", scrollbarWidth: "none" }}
                    onInput={e => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = Math.min(t.scrollHeight, 88) + "px";
                    }}
                  />

                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() || isLoading}
                    className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 disabled:opacity-30 hover:bg-red-700 transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2.5 px-1">
                  <span
                    className="text-muted-foreground text-[10px] tracking-widest uppercase"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    McAsphalt · Plant AI
                  </span>
                  <button
                    onClick={() => {
                      setTtsEnabled(p => !p);
                      if (isSpeaking) { synthRef.current?.cancel(); setIsSpeaking(false); }
                    }}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {ttsEnabled
                      ? <><Volume2 className="w-3 h-3 text-accent" /> Voice on</>
                      : <><VolumeX className="w-3 h-3" /> Voice off</>
                    }
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
