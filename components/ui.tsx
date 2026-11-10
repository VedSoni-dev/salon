"use client";

import { useEffect, useRef, useState } from "react";
import type { LLMError } from "@/lib/llm";

export function ErrorBanner({ error, onDismiss, onSettings, onRetry }: {
  error: LLMError | Error; onDismiss: () => void; onSettings: () => void; onRetry?: () => void;
}) {
  const e = error as LLMError;
  return (
    <div role="alert" className="rise flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
      <span className="min-w-0 flex-1 basis-60">{e.message}</span>
      {e.kind === "balance" && e.link && (
        <a className="btn btn-primary" href={e.link} target="_blank" rel="noreferrer">{e.link.includes("/claim/") ? "Sign in with publik" : "Add credit"}</a>
      )}
      {(e.kind === "balance" || e.kind === "auth" || e.kind === "no_key" || e.kind === "consent") && (
        <button className="btn" onClick={onSettings}>{e.kind === "balance" ? "Use my own key" : "Open settings"}</button>
      )}
      {onRetry && e.kind !== "no_key" && <button className="btn" onClick={onRetry}>Try again</button>}
      <button className="btn btn-ghost" onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="screen-only fixed inset-0 z-50 grid place-items-end bg-black/50 backdrop-blur-sm sm:place-items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`rise max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 shadow-[var(--shadow)] sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="btn btn-ghost -mr-2" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A button with a small menu that closes on outside click or Escape. */
export function Menu({ label, children, align = "right", className = "btn", title }: {
  label: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; className?: string; title?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("mousedown", down); window.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button className={className} onClick={() => setOpen((o) => !o)} aria-expanded={open} title={title}>{label}</button>
      {open && (
        <div className={`rise absolute top-full z-40 mt-1.5 min-w-52 rounded-xl border border-line bg-panel p-1.5 shadow-[var(--shadow)] ${align === "right" ? "right-0" : "left-0"}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export const MenuItem = ({ children, onClick, hint, danger }: { children: React.ReactNode; onClick: () => void; hint?: string; danger?: boolean }) => (
  <button onClick={onClick} className={`flex w-full items-center justify-between gap-6 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-sunk ${danger ? "text-accent" : ""}`}>
    <span>{children}</span>
    {hint && <span className="text-xs text-mute">{hint}</span>}
  </button>
);

export const Logo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.5C4 4.1 5.1 3 6.5 3h7C14.9 3 16 4.1 16 5.5v5c0 1.4-1.1 2.5-2.5 2.5H9l-3.4 2.6c-.4.3-.9 0-.9-.4V13C4.3 12.7 4 12 4 11.2z" fill="var(--accent)" opacity="0.4" />
    <path d="M8 10.5C8 9.1 9.1 8 10.5 8h7c1.4 0 2.5 1.1 2.5 2.5v5c0 .8-.3 1.5-.9 1.8v2.3c0 .4-.5.7-.9.4L14.8 18h-4.3C9.1 18 8 16.9 8 15.5z" fill="var(--accent)" />
    <circle cx="11.6" cy="13" r="1" fill="var(--accent-fg)" /><circle cx="14" cy="13" r="1" fill="var(--accent-fg)" /><circle cx="16.4" cy="13" r="1" fill="var(--accent-fg)" />
  </svg>
);
