'use client';

import React, { useState, useEffect } from 'react';
import { Mail, AlertCircle } from 'lucide-react';
import { validateEmail } from '@/utils/emailValidation';

export interface ValidatedEmailInputProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  fieldName?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onBlur?: () => void;
  onErrorChange?: (error: string | null) => void;
}

export default function ValidatedEmailInput({
  value,
  onChange,
  required = false,
  fieldName = 'E - Mail ID',
  placeholder = 'e.g. name@company.com',
  className = '',
  inputClassName = '',
  disabled = false,
  id,
  name,
  onBlur,
  onErrorChange,
}: ValidatedEmailInputProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState<boolean>(false);

  // Re-validate if touched and value changes
  useEffect(() => {
    if (touched) {
      const res = validateEmail(value, { required, fieldName });
      const err = res.isValid ? null : (res.errorMessage || 'Invalid email address');
      setErrorMessage(err);
      if (onErrorChange) onErrorChange(err);
    }
  }, [value, touched, required, fieldName, onErrorChange]);

  const handleBlur = () => {
    setTouched(true);
    const res = validateEmail(value, { required, fieldName });
    const err = res.isValid ? null : (res.errorMessage || 'Invalid email address');
    setErrorMessage(err);
    if (onErrorChange) onErrorChange(err);
    if (onBlur) onBlur();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    // If there was an error and user fixes it or clears it (if optional), dismiss immediately
    if (errorMessage) {
      const res = validateEmail(val, { required, fieldName });
      if (res.isValid) {
        setErrorMessage(null);
        if (onErrorChange) onErrorChange(null);
      }
    }
  };

  const hasError = Boolean(errorMessage);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          id={id}
          name={name}
          type="email"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="email"
          spellCheck={false}
          className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 transition-colors focus:outline-none ${
            hasError
              ? 'border-rose-400 bg-rose-50/20 text-rose-950 focus:ring-2 focus:ring-rose-500/30'
              : 'border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''} ${inputClassName}`}
        />
        {hasError && (
          <AlertCircle className="w-4 h-4 text-rose-500 absolute right-3 pointer-events-none" />
        )}
      </div>

      {hasError && (
        <p className="flex items-center gap-1 text-[10.5px] font-semibold text-rose-600 mt-1 animate-in fade-in duration-150">
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
