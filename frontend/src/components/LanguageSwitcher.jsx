import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

const LANGUAGES = [
  { code: 'en', name: 'English',   nativeName: 'English'   },
  { code: 'hi', name: 'Hindi',     nativeName: 'हिंदी'     },
  { code: 'mr', name: 'Marathi',   nativeName: 'मराठी'     },
  { code: 'bn', name: 'Bengali',   nativeName: 'বাংলা'     },
  { code: 'ta', name: 'Tamil',     nativeName: 'தமிழ்'     },
  { code: 'te', name: 'Telugu',    nativeName: 'తెలుగు'    },
  { code: 'kn', name: 'Kannada',   nativeName: 'ಕನ್ನಡ'    },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം'   },
];

const GLOBE_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.87 15.07L10.33 12.56L10.36 12.53C12.1 10.59 13.34 8.36 14.07 6H17V4H10V2H8V4H1V6H12.17C11.5 7.92 10.44 9.75 9 11.35C8.07 10.32 7.3 9.19 6.69 8H4.69C5.42 9.63 6.42 11.17 7.67 12.56L2.58 17.58L4 19L9 14L12.11 17.11L12.87 15.07ZM18.5 10H16.5L12 22H14L15.12 19H19.87L21 22H23L18.5 10ZM15.88 17L17.5 12.67L19.12 17H15.88Z"/>
  </svg>
);

export default function LanguageSwitcher({ variant = 'sidebar' }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSelect = async (code) => {
    await i18n.changeLanguage(code);
    setIsOpen(false);

    // Persist to backend if logged in
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/users/${user.id}/`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferred_language: code }),
          }
        );
        if (res.ok) {
          localStorage.setItem('user', JSON.stringify({ ...user, preferred_language: code }));
        }
      } catch (e) {
        // Non-fatal — localStorage still preserves it locally
      }
    }
  };

  // ── Dropdown list (shared between variants) ──────────────────────────────
  const DropdownList = ({ align = 'left' }) => (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            background: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.08)',
            overflow: 'hidden',
            zIndex: 9999,
            minWidth: 180,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {LANGUAGES.map((lang) => {
            const active = lang.code === currentLang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: active ? 'rgba(79,70,229,0.09)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                  transition: 'background 0.12s',
                  borderLeft: active ? '3px solid #4F46E5' : '3px solid transparent',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(79,70,229,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(79,70,229,0.09)' : 'transparent'; }}
              >
                <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? '#4F46E5' : '#111827' }}>
                  {lang.nativeName}
                </span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{lang.name}</span>
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Sidebar variant ───────────────────────────────────────────────────────
  if (variant === 'sidebar') {
    return (
      <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
        <button
          onClick={() => setIsOpen(o => !o)}
          style={{
            width: '100%',
            padding: '10px 11px',
            background: isOpen ? 'rgba(79,70,229,0.12)' : 'transparent',
            border: isOpen ? '1px solid rgba(79,70,229,0.25)' : '1px solid transparent',
            borderRadius: 9,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            transition: 'all 0.15s',
            color: '#9CA3AF',
          }}
          onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          {/* Globe icon */}
          <div style={{
            width: 30, height: 30, borderRadius: 7, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isOpen ? 'rgba(79,70,229,0.25)' : 'rgba(255,255,255,0.04)',
            color: isOpen ? '#818CF8' : '#6B7280',
            transition: 'all 0.15s',
          }}>
            {GLOBE_ICON}
          </div>
          <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 400, color: isOpen ? '#F1F5F9' : '#9CA3AF' }}>
            {currentLang.nativeName}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#4B5563', flexShrink: 0 }}>
            <path d="M7 10L12 15L17 10H7Z"/>
          </svg>
        </button>
        <DropdownList align="left" />
      </div>
    );
  }

  // ── Compact-dark variant (for dark navbars like Landing page) ──────────────
  if (variant === 'compact-dark') {
    return (
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setIsOpen(o => !o)}
          style={{
            padding: '7px 12px',
            background: isOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${isOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 13,
            fontWeight: 500,
            color: '#CBD5E1',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#CBD5E1'; } }}
        >
          {GLOBE_ICON}
          <span>{currentLang.nativeName}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M7 10L12 15L17 10H7Z"/>
          </svg>
        </button>
        <DropdownList align="right" />
      </div>
    );
  }

  // ── Compact variant (for light navbars / login page) ──────────────────────
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          padding: '7px 12px',
          background: isOpen ? 'rgba(79,70,229,0.06)' : 'white',
          border: `1px solid ${isOpen ? 'rgba(79,70,229,0.35)' : 'rgba(0,0,0,0.12)'}`,
          borderRadius: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 13,
          fontWeight: 500,
          color: '#374151',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(79,70,229,0.35)'; e.currentTarget.style.background = 'rgba(79,70,229,0.03)'; }}
        onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.background = 'white'; } }}
      >
        {GLOBE_ICON}
        <span>{currentLang.nativeName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M7 10L12 15L17 10H7Z"/>
        </svg>
      </button>
      <DropdownList align="right" />
    </div>
  );
}
