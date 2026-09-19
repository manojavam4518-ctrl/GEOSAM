import React from 'react';

interface OperatorAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// Deterministic high-contrast color themes for operator avatars
const BRAND_THEMES = [
  { bg: 'from-[#0F4C3A] to-[#1E8262]', text: 'text-white', border: 'border-emerald-700/30' }, // Deep Emerald (GEO Primary)
  { bg: 'from-[#0F3A4C] to-[#1E6282]', text: 'text-white', border: 'border-cyan-800/30' },   // Slate Cyan
  { bg: 'from-[#2A1B4E] to-[#4C1D95]', text: 'text-white', border: 'border-purple-800/30' }, // Deep Indigo
  { bg: 'from-[#7C2D12] to-[#C2410C]', text: 'text-white', border: 'border-amber-900/30' },  // Rust Amber
  { bg: 'from-[#1E3A8A] to-[#2563EB]', text: 'text-white', border: 'border-blue-800/30' },   // Cobalt
  { bg: 'from-[#065F46] to-[#059669]', text: 'text-white', border: 'border-emerald-800/30' },// Forest Mint
  { bg: 'from-[#111827] to-[#374151]', text: 'text-white', border: 'border-slate-800/40' },  // Charcoal Onyx
];

export default function OperatorAvatar({ name, size = 'md', className = '' }: OperatorAvatarProps) {
  const cleanName = (name || 'Courier').trim();
  const letter = cleanName.charAt(0).toUpperCase() || 'C';

  // Deterministic theme assignment by name
  let charSum = 0;
  for (let i = 0; i < cleanName.length; i++) {
    charSum += cleanName.charCodeAt(i);
  }
  const theme = BRAND_THEMES[charSum % BRAND_THEMES.length];

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs rounded-lg font-black',
    md: 'w-11 h-11 text-base rounded-xl font-black',
    lg: 'w-13 h-13 text-lg rounded-xl font-black',
    xl: 'w-16 h-16 text-2xl rounded-2xl font-black',
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 bg-gradient-to-br ${theme.bg} ${theme.text} ${theme.border} shadow-sm border select-none ${sizeClasses} ${className}`}
      title={cleanName}
      aria-label={`Brand mark for ${cleanName}`}
    >
      <span className="drop-shadow-xs font-black tracking-tight">{letter}</span>
    </div>
  );
}
