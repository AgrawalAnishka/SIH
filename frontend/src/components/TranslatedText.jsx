import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Component for dynamically translated database content.
 * Shows machine-translated text with option to view original.
 * 
 * Usage:
 * <TranslatedText 
 *   text={challenge.description} 
 *   sourceLang="en"
 * />
 */
export default function TranslatedText({ 
  text, 
  sourceLang = 'en',
  className = '',
  style = {} 
}) {
  const { i18n } = useTranslation();
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [source, setSource] = useState('');

  const currentLang = i18n.language;
  const needsTranslation = currentLang !== sourceLang;

  useEffect(() => {
    // If same language or showing original, no translation needed
    if (!needsTranslation || showOriginal) {
      setTranslatedText(text);
      return;
    }

    // Fetch translation
    const fetchTranslation = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/translate/`,
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              source_lang: sourceLang,
              target_lang: currentLang,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Translation failed');
        }

        const data = await response.json();
        setTranslatedText(data.translated_text);
        setSource(data.source);
      } catch (err) {
        console.error('Translation error:', err);
        setError(true);
        setTranslatedText(text); // Fallback to original
        setSource('error');
      } finally {
        setLoading(false);
      }
    };

    fetchTranslation();
  }, [text, sourceLang, currentLang, needsTranslation, showOriginal]);

  // If no translation needed, just render the text
  if (!needsTranslation) {
    return (
      <div className={className} style={style}>
        {text}
      </div>
    );
  }

  return (
    <div className={className} style={{ ...style, position: 'relative' }}>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#6B7280',
              fontSize: 14,
            }}
          >
            {/* Loading skeleton */}
            <div style={{
              width: '100%',
              height: '1em',
              background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              borderRadius: 4,
            }} />
            <style>{`
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {/* Translated/Original text */}
            <div style={{ marginBottom: 8 }}>
              {showOriginal ? text : translatedText}
            </div>

            {/* Translation indicator & toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid rgba(0,0,0,0.08)',
            }}>
              {!showOriginal && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#6B7280',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12.87 15.07L10.33 12.56L10.36 12.53C12.1 10.59 13.34 8.36 14.07 6H17V4H10V2H8V4H1V6H12.17C11.5 7.92 10.44 9.75 9 11.35C8.07 10.32 7.3 9.19 6.69 8H4.69C5.42 9.63 6.42 11.17 7.67 12.56L2.58 17.58L4 19L9 14L12.11 17.11L12.87 15.07ZM18.5 10H16.5L12 22H14L15.12 19H19.87L21 22H23L18.5 10ZM15.88 17L17.5 12.67L19.12 17H15.88Z" fill="currentColor"/>
                  </svg>
                  <span>
                    {error ? 'Translation unavailable' : 
                     source === 'cache' ? 'Machine translated (cached)' : 
                     source === 'bhashini' ? 'Machine translated (Bhashini)' : 
                     source === 'google' ? 'Machine translated (Google)' : 
                     'Machine translated'}
                  </span>
                </div>
              )}

              <button
                onClick={() => setShowOriginal(!showOriginal)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#4F46E5',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 4,
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(79, 70, 229, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {showOriginal ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                    </svg>
                    Hide Original
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                    </svg>
                    View Original
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
