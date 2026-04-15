'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { APP_VERSION } from '@/lib/version';

const PIN_LENGTH = 4;

const BOOT_LINES = [
  '> SYSTEM INITIALIZING...',
  '> CONNECTING TO MARKETS...',
  '> LOADING WIDGET ENGINE...',
  '> AUTHENTICATION REQUIRED',
];

const TITLE_CHARS = 'FELSWERKE TERMINAL'.split('');

const shakeVariants = {
  idle: { x: 0 },
  shake: {
    x: [0, -10, 10, -10, 10, -6, 6, 0],
    transition: { duration: 0.4 },
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootDone, setBoot] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [errorBorder, setErrorBorder] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first box after boot animation completes
  useEffect(() => {
    if (bootDone) {
      inputRefs.current[0]?.focus();
    }
  }, [bootDone]);

  const submitPin = useCallback(async (pinDigits: string[]) => {
    const pin = pinDigits.join('');
    if (pin.length !== PIN_LENGTH || loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error === 'Too many attempts' ? 'TOO MANY ATTEMPTS — WAIT 30s' : 'ACCESS DENIED — INVALID PIN');
        setShaking(true);
        setErrorBorder(true);
        setTimeout(() => setShaking(false), 400);
        setTimeout(() => setErrorBorder(false), 800);
        // Clear digits and re-focus first box
        setDigits(Array(PIN_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 500);
      }
    } catch {
      setError('CONNECTION ERROR');
    } finally {
      setLoading(false);
    }
  }, [loading, router]);

  const handleChange = useCallback((index: number, value: string) => {
    // Only allow single digit 0-9
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    if (!digit) return;

    setError('');
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (index < PIN_LENGTH - 1) {
      // Auto-focus next box
      inputRefs.current[index + 1]?.focus();
    } else {
      // Last digit entered → auto-submit
      inputRefs.current[index]?.blur();
      submitPin(next);
    }
  }, [digits, submitPin]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        // Clear current box
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        // Box is empty → move to previous and clear it
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submitPin(digits);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits, submitPin]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
    if (!pasted) return;

    setError('');
    const next = Array(PIN_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);

    if (pasted.length === PIN_LENGTH) {
      submitPin(next);
    } else {
      inputRefs.current[Math.min(pasted.length, PIN_LENGTH - 1)]?.focus();
    }
  }, [submitPin]);

  const pinComplete = digits.join('').length === PIN_LENGTH;

  const boxBorderClass = (index: number) => {
    if (errorBorder) return 'border-terminal-red shadow-[0_0_8px_rgba(255,51,102,0.3)]';
    if (digits[index]) return 'border-terminal-accent/60';
    if (focusedIndex === index) return 'border-terminal-accent shadow-[0_0_8px_rgba(0,212,255,0.3)]';
    return 'border-terminal-border';
  };

  return (
    <div className="fixed inset-0 bg-terminal-bg flex items-center justify-center overflow-hidden">
      {/* Scan-line overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 w-full max-w-[460px] mx-4 p-8 bg-terminal-panel border border-terminal-border rounded-xl"
      >
        {/* Title */}
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex justify-center gap-[1px] mb-1">
              {TITLE_CHARS.map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04, duration: 0.3 }}
                  className="text-xl font-bold text-terminal-accent tracking-[0.3em] font-mono"
                >
                  {char}
                </motion.span>
              ))}
            </div>
            <div className="border-t border-terminal-accent/30 w-16 mx-auto mt-2" />
          </motion.div>
        </div>

        {/* Boot sequence lines */}
        <motion.div
          className="mt-6 space-y-1"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
        >
          {BOOT_LINES.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.15, duration: 0.3 }}
              onAnimationComplete={() => {
                if (i === BOOT_LINES.length - 1) setBoot(true);
              }}
              className={`text-xs font-mono ${
                i === BOOT_LINES.length - 1
                  ? 'text-terminal-accent'
                  : 'text-terminal-green'
              }`}
            >
              {line}
            </motion.div>
          ))}
        </motion.div>

        {/* PIN input area */}
        <AnimatePresence>
          {bootDone && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.4 }}
            >
              {/* Label */}
              <div className="text-terminal-muted text-[10px] tracking-[0.2em] font-mono uppercase mt-6 mb-3 text-center">
                ENTER ACCESS PIN
              </div>

              {/* 4 PIN Boxes */}
              <motion.div
                variants={shakeVariants}
                animate={shaking ? 'shake' : 'idle'}
                className="flex gap-3 justify-center"
                onPaste={handlePaste}
              >
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <div
                    key={i}
                    className={`relative w-14 h-14 bg-terminal-bg border-2 rounded-md transition-all duration-200 ${boxBorderClass(i)}`}
                  >
                    <input
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digits[i]}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onFocus={() => setFocusedIndex(i)}
                      onBlur={() => setFocusedIndex(null)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      autoComplete="off"
                      className="w-full h-full bg-transparent text-transparent text-center text-2xl font-mono focus:outline-none caret-transparent select-none"
                    />
                    {/* Visual bullet or cursor overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {digits[i] ? (
                        <span className="text-2xl text-terminal-text">●</span>
                      ) : focusedIndex === i ? (
                        <span className="text-2xl text-terminal-accent animate-pulse">|</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-terminal-red text-xs font-mono text-center mt-3"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AUTHENTICATE button */}
              <motion.button
                onClick={() => submitPin(digits)}
                disabled={!pinComplete || loading}
                whileHover={pinComplete && !loading ? { scale: 1.01 } : undefined}
                className="w-full py-2.5 mt-5 bg-terminal-accent/10 text-terminal-accent border border-terminal-accent/30 rounded text-xs tracking-[0.2em] font-mono font-semibold hover:bg-terminal-accent/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-terminal-muted text-[10px] font-mono text-center mt-6">
          {APP_VERSION} · LOCAL MODE
        </div>
      </motion.div>
    </div>
  );
}
