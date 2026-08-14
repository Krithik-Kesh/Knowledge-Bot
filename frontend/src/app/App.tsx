import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Send, Volume2, VolumeX, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import logo from "../assets/MCA_LOGO_2024_ Red and White 1.png";

type BackendStatus = "online" | "offline" | "checking";

function StatusBadge({ status }: { status: BackendStatus }) {
  const dotClass = {
    online: "bg-emerald-400",
    offline: "bg-red-500",
    checking: "bg-muted-foreground",
  }[status];
  const textClass = {
    online: "text-emerald-400",
    offline: "text-red-500",
    checking: "text-muted-foreground",
  }[status];
  const label = { online: "Online", offline: "Offline", checking: "Checking…" }[status];
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-secondary/40">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
      <span
        className={`text-[10px] font-semibold tracking-wide ${textClass}`}
        style={{ fontFamily: "JetBrains Mono, monospace" }}
      >
        {label}
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
          ) : isUser ? (
            msg.content
          ) : (
            <ReactMarkdown
              components={{
                p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({ ...props }) => <ul className="list-disc pl-4 mb-2 last:mb-0" {...props} />,
                ol: ({ ...props }) => <ol className="list-decimal pl-4 mb-2 last:mb-0" {...props} />,
                li: ({ ...props }) => <li className="mb-0.5" {...props} />,
                strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
                a: ({ ...props }) => <a className="underline text-accent" target="_blank" rel="noreferrer" {...props} />,
              }}
            >
              {msg.content}
            </ReactMarkdown>
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
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [promptStyle, setPromptStyle] = useState<"concise" | "detailed">("concise");

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

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        await axios.get("http://localhost:8000/api/health", { timeout: 4000 });
        if (!cancelled) setBackendStatus("online");
      } catch {
        if (!cancelled) setBackendStatus("offline");
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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

      let response: string;
      try {
        const { data } = await axios.post<{ response: string }>(
          "http://localhost:8000/api/ask",
          { question: content, promptStyle }
        );
        response = data.response;
      } catch {
        response = "Backend error: Unable to get a response. Please try again later.";
      }

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id ? { ...m, content: response, isStreaming: false } : m
        )
      );
      setIsLoading(false);
      // Strip the "Sources:" footer and inline [S#] tags before speaking --
      // document codes read aloud by TTS are noise, not useful spoken content.
      const spokenText = response
        .replace(/\n\nSources:\n[\s\S]*$/, "")
        .replace(/\[S\d+(?:\s*,\s*S?\d+)*\]/g, "")
        .trim();
      speak(spokenText);
    },
    [speak, promptStyle]
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
          <img
            src={logo}
            alt="MCA logo"
            className="h-8 w-auto object-contain flex-shrink-0"
          />
          <div>
            <p
              className="text-foreground font-bold text-sm leading-tight tracking-wide"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              MCASPHALT KNOWLEDGEBOT
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-3">
              <StatusBadge status={backendStatus} />
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
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-accent/40 bg-accent/5">
                <span
                  className="text-[9px] font-semibold tracking-widest text-accent uppercase"
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  Mode: {promptStyle === "concise" ? "Concise" : "Detailed"}
                </span>
              </div>
            </div>
          </div>

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
                  HOW MAY I <br />
                  <span style={{ color: "#CE0404" }}>ASSIST YOU?</span>
                </h2>
                <p className="text-muted-foreground text-xs max-w-xs mx-auto leading-relaxed mb-6 font-mono uppercase tracking-widest">
                  Ask about safety, mix temps, equipment, or anything on site by voice or text.
                </p>

                <div className="flex flex-col gap-4 items-center mb-6">
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setPromptStyle("concise")}
                      className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-widest transition-all ${
                        promptStyle === "concise"
                          ? "bg-primary text-white border border-primary"
                          : "border border-border bg-card hover:border-accent"
                      }`}
                    >
                      Concise
                    </button>
                    <button
                      onClick={() => setPromptStyle("detailed")}
                      className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-widest transition-all ${
                        promptStyle === "detailed"
                          ? "bg-primary text-white border border-primary"
                          : "border border-border bg-card hover:border-accent"
                      }`}
                    >
                      Detailed
                    </button>
                  </div>
                </div>
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
                {isLoading && promptStyle === "detailed" && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mb-3 px-3 py-2 bg-accent/10 border border-accent/30 rounded-lg text-center"
                  >
                    <span className="text-accent text-xs italic">
                      Detailed responses will take longer to generate
                    </span>
                  </motion.div>
                )}
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
