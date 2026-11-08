'use client';

import React from 'react';

export interface DeclarationRichTextEditorProps {
  value: string; // HTML or plain text string
  onChange: (htmlValue: string, plainText: string) => void;
  placeholder?: string;
  minHeight?: string;
  rows?: number;
  multiline?: boolean;
  className?: string;
  disabled?: boolean;
}

/**
 * Strips HTML tags so that entered or legacy formatted text strictly follows
 * one consistent, predefined plain text formatting.
 */
function stripHtml(str: string = ''): string {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '');
}

/**
 * Declaration Entry Field Editor for Goods Declaration Note
 *
 * Implements strict requirements:
 * 1. Formatting toolbar options (Bold, Underline, Font size, Alignment) are permanently removed.
 * 2. Formatting keyboard shortcuts (Ctrl+B, Ctrl+U, etc.) are permanently prevented.
 * 3. All entered and pasted content strictly follows one consistent, predefined font style,
 *    font size (12px / text-xs), normal weight, and left alignment.
 * 4. Pasted content is sanitized to pure plain text without external formatting.
 */
export default function DeclarationRichTextEditor({
  value,
  onChange,
  placeholder = 'Enter text...',
  minHeight = 'min-h-[40px]',
  rows = 2,
  multiline = false,
  className = '',
  disabled = false,
}: DeclarationRichTextEditorProps) {
  // Strip any legacy HTML formatting so the field strictly displays clean plain text
  const cleanDisplayValue = stripHtml(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const rawVal = e.target.value;
    const cleanVal = stripHtml(rawVal);
    onChange(cleanVal, cleanVal);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text/plain');
    const cleanPasteText = stripHtml(pasteText);
    const target = e.currentTarget;
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const current = target.value || '';
    const updated = current.substring(0, start) + cleanPasteText + current.substring(end);
    const cleanUpdated = stripHtml(updated);
    onChange(cleanUpdated, cleanUpdated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Intercept and prevent formatting shortcuts (Ctrl+B, Ctrl+U, Ctrl+I, etc.)
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (['b', 'u', 'i', 'e', 'l', 'r', 'j'].includes(key)) {
        e.preventDefault();
      }
    }
  };

  if (multiline) {
    return (
      <textarea
        value={cleanDisplayValue}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-normal text-slate-900 bg-white placeholder:text-slate-400 shadow-2xs transition-all resize-y ${minHeight} ${className}`}
      />
    );
  }

  return (
    <input
      type="text"
      value={cleanDisplayValue}
      onChange={handleChange}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-normal text-slate-900 bg-white placeholder:text-slate-400 shadow-2xs transition-all ${minHeight} ${className}`}
    />
  );
}
