"use client";

import { useState, useRef, useEffect } from "react";

type PingStatus = "checking" | "live" | "slow" | "offline";

function StatusBadge() {
  const [status, setStatus] = useState<PingStatus>("checking");
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      setStatus("checking");
      const start = Date.now();
      try {
        await fetch("/api/ping", { cache: "no-store" });
        const elapsed = Date.now() - start;
        setMs(elapsed);
        setStatus(elapsed < 1500 ? "live" : "slow");
      } catch {
        setStatus("offline");
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  const config = {
    checking: { dot: "bg-gray-400 animate-pulse", label: "Prüfe Status...", text: "text-gray-500" },
    live:     { dot: "bg-green-500",              label: `Live${ms ? ` · ${ms} ms` : ""}`, text: "text-green-700" },
    slow:     { dot: "bg-yellow-400",             label: `Gestartet${ms ? ` · ${ms} ms` : ""}`, text: "text-yellow-700" },
    offline:  { dot: "bg-red-500",                label: "Offline", text: "text-red-700" },
  }[status];

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </div>
  );
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function caesarShift(text: string, shift: number, decrypt = false): string {
  const s = decrypt ? (26 - (shift % 26)) % 26 : shift % 26;
  return text
    .toUpperCase()
    .split("")
    .map((char) => {
      const idx = ALPHABET.indexOf(char);
      if (idx === -1) return char;
      return ALPHABET[(idx + s) % 26];
    })
    .join("");
}

function CaesarWheel({ shift, onShiftChange }: { shift: number; onShiftChange: (s: number) => void }) {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 155;
  const innerR = 112;
  const markerR = 168;

  const dragging = useRef(false);

  function angleForIndex(i: number) {
    return (i * 360) / 26 - 90; // start at top
  }

  function polarToXY(angleDeg: number, r: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    let angleDeg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;
    const newShift = Math.round((angleDeg / 360) * 26) % 26;
    onShiftChange(newShift === 0 ? 0 : newShift);
  }

  const innerRotation = (shift * 360) / 26;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="cursor-grab active:cursor-grabbing select-none touch-none"
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerLeave={() => { dragging.current = false; }}
        onPointerMove={handlePointerMove}
      >
        {/* Outer ring background */}
        <circle cx={cx} cy={cy} r={outerR} fill="#dbeafe" stroke="#93c5fd" strokeWidth={2} />

        {/* Outer letters (plain, fixed) */}
        {ALPHABET.split("").map((letter, i) => {
          const angle = angleForIndex(i);
          const pos = polarToXY(angle, outerR - 18);
          const isTop = i === 0;
          return (
            <text
              key={`outer-${letter}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={13}
              fontWeight={isTop ? "900" : "700"}
              fill={isTop ? "#1d4ed8" : "#1e40af"}
              fontFamily="monospace"
            >
              {letter}
            </text>
          );
        })}

        {/* Separator ring */}
        <circle cx={cx} cy={cy} r={innerR + 6} fill="white" stroke="#cbd5e1" strokeWidth={1} />

        {/* Inner ring (cipher, rotates) */}
        <g transform={`rotate(${innerRotation}, ${cx}, ${cy})`}>
          <circle cx={cx} cy={cy} r={innerR} fill="#fef3c7" stroke="#fbbf24" strokeWidth={2} />
          {ALPHABET.split("").map((letter, i) => {
            const angle = angleForIndex(i);
            const pos = polarToXY(angle, innerR - 18);
            const isTop = i === 0;
            return (
              <text
                key={`inner-${letter}`}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={isTop ? "900" : "700"}
                fill={isTop ? "#b45309" : "#92400e"}
                fontFamily="monospace"
                transform={`rotate(${-innerRotation}, ${pos.x}, ${pos.y})`}
              >
                {letter}
              </text>
            );
          })}
        </g>

        {/* Center circle */}
        <circle cx={cx} cy={cy} r={38} fill="white" stroke="#e2e8f0" strokeWidth={2} />
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fill="#64748b"
          fontFamily="sans-serif"
        >
          Versatz
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={22}
          fontWeight="900"
          fill="#1d4ed8"
          fontFamily="monospace"
        >
          {shift}
        </text>

        {/* Top marker arrow */}
        <polygon
          points={`${cx},${cy - markerR - 12} ${cx - 6},${cy - markerR + 2} ${cx + 6},${cy - markerR + 2}`}
          fill="#ef4444"
        />
      </svg>

      <div className="flex gap-3 items-center">
        <button
          onClick={() => onShiftChange((shift - 1 + 26) % 26)}
          className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-xl hover:bg-blue-200 transition-colors"
        >
          ‹
        </button>
        <input
          type="range"
          min={0}
          max={25}
          value={shift}
          onChange={(e) => onShiftChange(Number(e.target.value))}
          className="w-40 accent-blue-600"
        />
        <button
          onClick={() => onShiftChange((shift + 1) % 26)}
          className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-xl hover:bg-blue-200 transition-colors"
        >
          ›
        </button>
      </div>

      <div className="flex gap-8 text-sm font-semibold">
        <span className="text-blue-700">Außen = Klartext</span>
        <span className="text-amber-600">Innen = Geheimtext</span>
      </div>
      <p className="text-xs text-gray-400">Rad drehen oder Pfeile klicken</p>
    </div>
  );
}

function HighlightedText({ original, cipher }: { original: string; cipher: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {original.split("").map((char, i) => {
        const isLetter = ALPHABET.includes(char.toUpperCase());
        return (
          <div key={i} className="flex flex-col items-center">
            <span className={`font-mono text-lg font-bold ${isLetter ? "text-blue-700" : "text-gray-400"}`}>
              {char.toUpperCase()}
            </span>
            <span className="text-xs text-gray-400">↓</span>
            <span className={`font-mono text-lg font-bold ${isLetter ? "text-amber-600" : "text-gray-400"}`}>
              {cipher[i] ?? char}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CaesarPage() {
  const [shift, setShift] = useState(3);
  const [input, setInput] = useState("HALLO ANTON");
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");

  const output = caesarShift(input, shift, mode === "decrypt");

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-amber-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-1 pt-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-400">Antons GFS Referat</p>
          <h1 className="text-4xl font-black text-blue-900">Caesar-Verschlüsselung</h1>
          <p className="text-lg text-gray-600">Lerne, wie Julius Caesar geheime Nachrichten schrieb!</p>
          <div className="flex justify-center pt-1">
            <StatusBadge />
          </div>
        </div>

        {/* Erklärungsbox */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-3">
          <h2 className="text-xl font-bold text-blue-800">Wie funktioniert das?</h2>
          <p className="text-gray-700">
            Vor über 2000 Jahren nutzte Julius Caesar einen einfachen Trick: Er verschob jeden
            Buchstaben im Alphabet um eine feste Anzahl an Stellen. Mit Versatz{" "}
            <strong>3</strong> wird aus <strong className="text-blue-700">A</strong> ein{" "}
            <strong className="text-amber-600">D</strong>, aus{" "}
            <strong className="text-blue-700">B</strong> ein{" "}
            <strong className="text-amber-600">E</strong> — und so weiter!
          </p>
          <p className="text-gray-700">
            Nur wer den Versatz kennt, kann die Nachricht lesen. Das ist dein &bdquo;Schlüssel&ldquo;.
          </p>
        </div>

        {/* Caesar Wheel */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-4">
          <h2 className="text-xl font-bold text-blue-800">Das Caesar-Rad</h2>
          <p className="text-sm text-gray-500">
            Dreh das Rad oder nutze den Slider — der innere Ring verschiebt sich und zeigt dir
            immer, welcher Buchstabe zu welchem wird.
          </p>
          <div className="flex justify-center">
            <CaesarWheel shift={shift} onShiftChange={setShift} />
          </div>
        </div>

        {/* Encoder */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 space-y-6">
          <h2 className="text-xl font-bold text-blue-800">Nachricht verschlüsseln</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("encrypt")}
              className={`flex-1 py-2 rounded-xl font-semibold transition-colors ${
                mode === "encrypt" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              Verschlüsseln
            </button>
            <button
              onClick={() => setMode("decrypt")}
              className={`flex-1 py-2 rounded-xl font-semibold transition-colors ${
                mode === "decrypt" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              Entschlüsseln
            </button>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-gray-700">
              {mode === "encrypt" ? "Deine Nachricht:" : "Geheimtext:"}
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 font-mono text-lg focus:outline-none focus:border-blue-500 uppercase"
              placeholder={mode === "encrypt" ? "Schreib etwas..." : "Geheimtext eingeben..."}
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-gray-700">
              {mode === "encrypt" ? "Geheimtext:" : "Entschlüsselte Nachricht:"}
            </label>
            <div className="w-full border-2 border-amber-200 rounded-xl px-4 py-3 bg-amber-50 font-mono text-lg font-bold text-amber-700 min-h-[3rem] break-all">
              {output || "—"}
            </div>
          </div>

          {input.trim() && (
            <div className="space-y-2">
              <label className="font-semibold text-gray-700">Buchstabe für Buchstabe:</label>
              <div className="bg-gray-50 rounded-xl p-4 overflow-x-auto">
                <HighlightedText original={input} cipher={output} />
              </div>
            </div>
          )}
        </div>

        {/* Fun fact */}
        <div className="bg-blue-600 text-white rounded-2xl p-6 space-y-2">
          <h2 className="text-xl font-bold">Wusstest du?</h2>
          <p>
            Die Caesar-Verschlüsselung ist zwar einfach, aber heute nicht mehr sicher —
            es gibt nur <strong>25 mögliche Schlüssel</strong>, die ein Computer in
            Sekundenbruchteilen durchprobieren kann.
          </p>
          <p className="text-blue-200 text-sm">
            ROT13 (Versatz 13) ist ein Spezialfall: zweimal anwenden ergibt wieder den
            Originaltext — stell den Versatz auf 13 und probier es aus!
          </p>
        </div>

        <footer className="text-center text-gray-400 text-sm pb-4">
          von Anton — gebaut mit Next.js & Tailwind
        </footer>
      </div>
    </main>
  );
}
