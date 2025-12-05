import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface HelpIconProps {
  text: string;
}

export function HelpIcon({ text }: HelpIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: none)');
    setIsTouchDevice(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsTouchDevice(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 150;
      const padding = 8;

      let top = rect.bottom + padding;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
      }
      if (left < padding) {
        left = padding;
      }

      if (top + tooltipHeight > window.innerHeight - padding) {
        top = rect.top - tooltipHeight - padding;
      }

      setPosition({ top, left });
    }
  }, [isOpen]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'var(--chip)';
    e.currentTarget.style.borderColor = 'var(--ink)';
    e.currentTarget.style.color = 'var(--ink)';

    if (!isTouchDevice) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsOpen(true);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.borderColor = 'var(--muted)';
    e.currentTarget.style.color = 'var(--muted)';

    if (!isTouchDevice) {
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 150);
    }
  };

  const handleClick = () => {
    if (isTouchDevice) {
      setIsOpen(!isOpen);
    }
  };

  const handleBlur = () => {
    if (isTouchDevice) {
      setTimeout(() => setIsOpen(false), 200);
    }
  };

  const tooltip = isOpen ? (
    <div
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: 12,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 2147483647,
        width: 320,
        maxWidth: '90vw',
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--muted)',
        whiteSpace: 'normal',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif',
        wordBreak: 'normal',
      }}
    >
      {text}
    </div>
  ) : null;

  return (
    <div style={{ position: 'relative', display: 'inline-block', marginLeft: 6 }}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onBlur={handleBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '1px solid var(--muted)',
          background: 'transparent',
          color: 'var(--muted)',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 'bold',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          verticalAlign: 'middle',
          transition: 'all 0.15s ease',
        }}
      >
        ?
      </button>
      {tooltip && createPortal(tooltip, document.body)}
    </div>
  );
}
