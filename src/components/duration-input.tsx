"use client";

import { useState } from "react";

export function secondsToMMSS(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseMMSS(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  }

  // Allow plain number as minutes
  const plain = parseInt(trimmed, 10);
  if (!isNaN(plain)) return plain * 60;

  return null;
}

interface DurationInputProps {
  value: number | null;
  onChange: (seconds: number | null) => void;
  className?: string;
}

export function DurationInput({ value, onChange, className }: DurationInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);

  const display = editing ? draft : secondsToMMSS(value);

  function handleFocus() {
    setEditing(true);
    setDraft(secondsToMMSS(value));
    setError(false);
  }

  function handleBlur() {
    setEditing(false);

    if (!draft.trim()) {
      onChange(null);
      setError(false);
      return;
    }

    const parsed = parseMMSS(draft);
    if (parsed !== null) {
      onChange(parsed);
      setError(false);
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        type="text"
        value={display}
        onFocus={handleFocus}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(false);
        }}
        onBlur={handleBlur}
        placeholder="MM:SS"
        className={`rounded border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none ${
          error ? "border-accent-negative" : "border-border-subtle"
        } ${className ?? ""}`}
      />
      {error && (
        <span className="text-xs text-accent-negative">
          Invalid format. Use MM:SS (e.g. 65:30)
        </span>
      )}
    </div>
  );
}
