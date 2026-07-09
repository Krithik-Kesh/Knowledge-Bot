import { useState, useEffect, useRef } from "react";
import logoImg from "@/imports/Home1-1/b3587d2f40f699fe69613ac90a5845c929850121.png";
import micImg from "@/imports/Home1-1/79323499d2d11169443db3180c13e1ae042ad6fe.png";

type Page = "home" | "chat";

const MOCK_RESPONSE = `Thank you for reaching out. Here is the guidance for your situation.

**Step 1: Site Preparation**
Ensure the work area is clear of debris and any obstructions before beginning. Check that all equipment is properly calibrated and all safety protocols are confirmed before proceeding with any paving activity.

**Step 2: Temperature Check**
Verify that the asphalt mix temperature is within the acceptable range of 275 to 325 degrees Fahrenheit. Operating outside this range can significantly affect pavement quality and long-term surface durability.

**Step 3: Application**
Begin the paving process at the designated start point, maintaining consistent speed and pressure for uniform coverage across the entire surface area. Always work in the direction of traffic flow where possible, and ensure flaggers are in position before work begins.`;

function parseLine(line: string) {
  const parts = line.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>
  );
}

function renderBotText(text: string) {
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <div key={i} className="h-2" />;
    const isBold = /^\*\*.*\*\*$/.test(line.trim());
    return (
      <p
        key={i}
        className={`leading-[1.36] ${isBold ? "text-[20px] font-bold mt-4 mb-1" : "text-[18px]"}`}
      >
        {parseLine(line)}
      </p>
    );
  });
}

function TypeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-[35px] overflow-hidden flex-shrink-0"
      style={{
        width: 295,
        height: 49,
        boxShadow: "0px 4px 4px rgba(0,0,0,0.25)",
      }}
      aria-label="Tap to type"
    >
      <div
        className="absolute inset-0 rounded-[35px]"
        style={{ background: "rgba(72,72,72,0.29)" }}
      />
      <div
        className="absolute inset-0 rounded-[35px]"
        style={{ boxShadow: "inset 0px 4px 4px rgba(0,0,0,0.25)" }}
      />
      <span className="relative text-white font-semibold text-[24px] tracking-tight">
        Tap to type
      </span>
    </button>
  );
}

function TypeInputRow({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex gap-2 w-full flex-shrink-0">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Type your question…"
        className="flex-1 rounded-full px-5 py-3 text-white text-base outline-none placeholder-white/40"
        style={{
          background: "rgba(72,72,72,0.5)",
          border: "1px solid rgba(255,255,255,0.25)",
          caretColor: "white",
          fontFamily: "Inter, sans-serif",
        }}
      />
      <button
        onClick={onSubmit}
        className="rounded-full px-5 py-3 bg-[#cf2128] text-white font-semibold text-base flex-shrink-0"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        Send
      </button>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [micActive, setMicActive] = useState(false);
  const [micPressed, setMicPressed] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [botResponse, setBotResponse] = useState("");
  const [typedInput, setTypedInput] = useState("");
  const [showTypeInput, setShowTypeInput] = useState(false);

  // Refs for DOM-driven animation (bypass React render cycle for smoothness)
  const containerRef = useRef<HTMLDivElement>(null);
  const micGlowRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<Page>("home");
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const responseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => cleanup(), []);

  const setGradient = (vol: number) => {
    const isChat = pageRef.current === "chat";
    const base = isChat ? 95 : 32;
    const floor = isChat ? 80 : 4;
    const growth = Math.min(vol * 3.5, 1);
    const stop = base - growth * (base - floor);
    if (containerRef.current) {
      containerRef.current.style.background = `linear-gradient(to bottom, #32363e ${stop}%, #cf2128 100%)`;
    }
    if (micGlowRef.current) {
      const blur = 35 + vol * 65;
      const spread = 15 + vol * 85;
      const alpha = Math.min(0.43 + vol * 0.45, 0.92);
      micGlowRef.current.style.boxShadow = `0 0 ${blur}px ${spread}px rgba(255,134,134,${alpha})`;
    }
  };

  const cleanup = () => {
    cancelAnimationFrame(animFrameRef.current);
    if (responseIntervalRef.current) clearInterval(responseIntervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    window.speechSynthesis?.cancel();
    setGradient(0);
  };

  const animateSimulatedMic = () => {
    cancelAnimationFrame(animFrameRef.current);
    let t = 0;
    const tick = () => {
      t += 0.05;
      const v =
        0.18 +
        Math.sin(t * 3.1) * 0.12 +
        Math.sin(t * 7.4) * 0.07 +
        Math.sin(t * 14) * 0.03;
      setGradient(Math.max(0, Math.min(0.9, v)));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  const startMicAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const vol = buf.reduce((s, v) => s + v, 0) / buf.length / 255;
        setGradient(vol);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    } catch {
      // Mic permission denied — fall back to simulated animation
      animateSimulatedMic();
    }
  };

  const stopMicAnalysis = () => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current = null;
    setGradient(0);
  };

  const startRecognition = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++)
        t += e.results[i][0].transcript;
      setUserPrompt(t);
    };
    r.onerror = (_e: any) => {};
    r.start();
    recognitionRef.current = r;
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const animateTTS = () => {
    cancelAnimationFrame(animFrameRef.current);
    let t = 0;
    const tick = () => {
      t += 0.04;
      const v =
        0.22 +
        Math.sin(t * 2.8) * 0.11 +
        Math.sin(t * 6.3) * 0.06 +
        Math.sin(t * 13) * 0.02;
      setGradient(Math.max(0, Math.min(0.9, v)));
      if (
        window.speechSynthesis.speaking ||
        window.speechSynthesis.pending
      ) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setGradient(0);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ""));
    u.rate = 0.95;
    u.onstart = () => animateTTS();
    u.onend = () => {
      cancelAnimationFrame(animFrameRef.current);
      setGradient(0);
    };
    u.onerror = () => {
      cancelAnimationFrame(animFrameRef.current);
      setGradient(0);
    };
    window.speechSynthesis.speak(u);
  };

  const startBotResponse = () => {
    setBotResponse("");
    let i = 0;
    const chars = MOCK_RESPONSE.split("");
    responseIntervalRef.current = setInterval(() => {
      if (i >= chars.length) {
        if (responseIntervalRef.current) clearInterval(responseIntervalRef.current);
        return;
      }
      setBotResponse((prev) => prev + chars[i++]);
    }, 11);
    speakText(MOCK_RESPONSE);
  };

  const handleMicClick = async () => {
    setMicPressed(true);
    setTimeout(() => setMicPressed(false), 150);

    if (micActive) {
      setMicActive(false);
      stopMicAnalysis();
      stopRecognition();
      pageRef.current = "chat";
      setPage("chat");
      startBotResponse();
    } else {
      setMicActive(true);
      setUserPrompt("");
      await startMicAnalysis();
      startRecognition();
    }
  };

  const handleTypeSubmit = () => {
    if (!typedInput.trim()) return;
    setUserPrompt(typedInput);
    setTypedInput("");
    setShowTypeInput(false);
    pageRef.current = "chat";
    setPage("chat");
    startBotResponse();
  };

  const handleBack = () => {
    cleanup();
    setBotResponse("");
    setUserPrompt("");
    setMicActive(false);
    setShowTypeInput(false);
    pageRef.current = "home";
    setPage("home");
    if (containerRef.current) {
      containerRef.current.style.background =
        "linear-gradient(to bottom, #32363e 32%, #cf2128 100%)";
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div
        ref={containerRef}
        className="relative w-full h-full flex flex-col overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #32363e 32%, #cf2128 100%)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 flex flex-col items-center pt-10 px-6 pb-3 gap-3">
          <img
            src={logoImg}
            alt="McAsphalt"
            className="h-[70px] object-contain"
          />
          <div className="w-full max-w-[560px]">
            <svg className="w-full" height="3">
              <line
                x1="2"
                y1="1.5"
                x2="99%"
                y2="1.5"
                stroke="white"
                strokeWidth="3"
                strokeDasharray="5 6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-white font-semibold text-[23px] tracking-[-0.46px] text-center leading-snug">
            McAsphalt Operations Assistant
          </p>
        </div>

        {/* ── Home Page ── */}
        {page === "home" && (
          <div className="flex-1 flex flex-col items-center justify-between pb-10 px-6 min-h-0">
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              {/* Microphone button */}
              <button
                onClick={handleMicClick}
                className="relative rounded-full outline-none select-none"
                style={{
                  width: 130,
                  height: 130,
                  transform: micPressed
                    ? "scale(0.87)"
                    : micActive
                    ? "scale(1.07)"
                    : "scale(1)",
                  transition:
                    "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
                aria-label={
                  micActive ? "Stop recording" : "Start recording"
                }
              >
                {/* Animated glow ring */}
                <div
                  ref={micGlowRef}
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    boxShadow:
                      "0px 0px 35px 15px rgba(255,134,134,0.43)",
                    transition: micActive ? "none" : "box-shadow 0.5s ease",
                  }}
                />
                {/* White circle face */}
                <div className="absolute inset-0 rounded-full bg-white border-4 border-[#cf2128]" />
                {/* Mic icon */}
                <img
                  src={micImg}
                  alt="Microphone"
                  className="absolute object-contain pointer-events-none"
                  style={{
                    width: "42%",
                    height: "62%",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
                {/* Active ping ring */}
                {micActive && (
                  <div
                    className="absolute rounded-full border-2 border-red-300 animate-ping opacity-40 pointer-events-none"
                    style={{ inset: "-10px" }}
                  />
                )}
              </button>

              <p
                className="text-white font-semibold text-[20px] tracking-[-0.4px] text-center"
                style={{
                  textShadow: "0px 4px 2px rgba(0,0,0,0.25)",
                }}
              >
                {micActive ? "Listening… tap to send" : "How can I help?"}
              </p>
            </div>

            {/* Bottom input area */}
            {showTypeInput ? (
              <TypeInputRow
                value={typedInput}
                onChange={setTypedInput}
                onSubmit={handleTypeSubmit}
              />
            ) : (
              <TypeButton onClick={() => setShowTypeInput(true)} />
            )}
          </div>
        )}

        {/* ── Chat Page ── */}
        {page === "chat" && (
          <div className="flex-1 flex flex-col px-5 pb-8 gap-3 min-h-0">
            {/* Back */}
            <button
              onClick={handleBack}
              className="self-start text-white/60 text-sm font-semibold hover:text-white transition-colors flex-shrink-0"
            >
              ← New question
            </button>

            {/* User prompt bubble */}
            {userPrompt ? (
              <div className="flex justify-end flex-shrink-0">
                <div
                  className="rounded-2xl px-4 py-3 max-w-[85%]"
                  style={{ background: "#141414" }}
                >
                  <p className="text-white text-base leading-snug">
                    {userPrompt}
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="self-end rounded-2xl px-4 py-3 flex-shrink-0"
                style={{ background: "#141414" }}
              >
                <p className="text-white/50 text-base italic">
                  Voice input received
                </p>
              </div>
            )}

            {/* Bot response — scrollable */}
            <div
              className="flex-1 overflow-y-auto text-white min-h-0"
              style={{ scrollbarWidth: "none" }}
            >
              {botResponse ? (
                <div>{renderBotText(botResponse)}</div>
              ) : (
                <div className="flex gap-1.5 pt-2">
                  {[0, 150, 300].map((d) => (
                    <div
                      key={d}
                      className="w-2 h-2 rounded-full bg-white/60 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom input area */}
            <div className="flex justify-center flex-shrink-0">
              {showTypeInput ? (
                <TypeInputRow
                  value={typedInput}
                  onChange={setTypedInput}
                  onSubmit={handleTypeSubmit}
                />
              ) : (
                <TypeButton onClick={() => setShowTypeInput(true)} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
