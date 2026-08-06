'use client';

import React, { useEffect, useRef } from 'react';

interface AutoResizeTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  rows?: number;
  required?: boolean;
}

export default function AutoResizeTextarea({
  value,
  onChange,
  placeholder = "Escribe un comentario opcional...",
  className = "input-field",
  style,
  rows = 1,
  required = false
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      // Minimum height of 44px for a clean single-line look, expanding automatically downward as text grows
      el.style.height = `${Math.max(44, el.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        adjustHeight();
      }}
      placeholder={placeholder}
      className={className}
      rows={rows}
      required={required}
      style={{
        width: '100%',
        minHeight: '44px',
        resize: 'vertical',
        overflowY: 'hidden',
        lineHeight: '1.4',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        ...style
      }}
    />
  );
}
