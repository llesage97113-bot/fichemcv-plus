"use client";

import { InputHTMLAttributes, useEffect, useRef, useState } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  onVisibilityChange?: (visible: boolean) => void;
};

export default function PasswordInput({
  className = "",
  disabled,
  onVisibilityChange,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldRestoreFocusRef = useRef(false);
  const label = isVisible ? "Masquer le mot de passe" : "Afficher le mot de passe";

  useEffect(() => {
    if (!shouldRestoreFocusRef.current) {
      return;
    }

    shouldRestoreFocusRef.current = false;
    inputRef.current?.focus({ preventScroll: true });
  }, [isVisible]);

  const inputProps = {
    ...props,
    disabled,
    ref: inputRef,
    className:
      "min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-inherit outline-none placeholder:text-slate-500",
  };

  return (
    <div
      className={`${className} flex items-stretch overflow-hidden p-0 focus-within:border-sky-400`}
    >
      {isVisible ? (
        <input key="password-visible" type="text" {...inputProps} />
      ) : (
        <input key="password-hidden" type="password" {...inputProps} />
      )}
      <button
        type="button"
        aria-label={label}
        aria-pressed={isVisible}
        disabled={disabled}
        onClick={() => {
          const nextVisibility = !isVisible;
          shouldRestoreFocusRef.current = true;
          setIsVisible(nextVisibility);
          onVisibilityChange?.(nextVisibility);
        }}
        className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center self-stretch text-slate-400 transition hover:bg-slate-800 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isVisible ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.5 4.5A9.8 9.8 0 0 1 12 4c5 0 8.3 4 9.5 6a10.8 10.8 0 0 1-2.1 2.7" />
            <path d="M6.6 6.6A11.4 11.4 0 0 0 2.5 10c1.2 2 4.5 6 9.5 6a9.7 9.7 0 0 0 4-.9" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
