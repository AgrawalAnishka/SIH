import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Building2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from './ui/toast';

/**
 * GoogleAuthButton
 *
 * Props
 * ─────
 * role  {string}  'department' | 'startup' | undefined
 *   - Signup pages: pass the role explicitly
 *   - Login page: leave undefined — we auto-detect for existing users,
 *     and show a role-picker modal for brand-new users
 */
export default function GoogleAuthButton({ role }) {
  const navigate     = useNavigate();
  const { toast }    = useToast();
  const [loading, setLoading]       = useState(false);
  // pending credential held while user picks role in modal
  const [pendingCred, setPendingCred] = useState(null);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const ROLE_ROUTES = {
    department: '/challenges',
    startup:    '/dashboard',
    evaluator:  '/evaluate',
    admin:      '/audit',
  };

  // Core handler — called either directly (role known) or after modal pick
  const completeAuth = async (credential, resolvedRole) => {
    setLoading(true);
    setShowRolePicker(false);
    setPendingCred(null);
    try {
      const authRes = await api.googleAuth(credential, resolvedRole);
      const meRes   = await api.me();

      const userData = {
        role:                meRes.role,
        user_id:             meRes.user_id,
        username:            meRes.username,
        name:                meRes.name,
        preferred_language:  meRes.preferred_language,
        sector_tags:         meRes.sector_tags,
        registration_status: meRes.registration_status,
        ministry:            meRes.ministry,
        startup_id:          meRes.startup_id,
        department_id:       meRes.department_id,
      };
      localStorage.setItem('user', JSON.stringify(userData));

      const isNewUser    = authRes.is_new_user === true;
      const isIncomplete = userData.name && userData.name.startsWith('[INCOMPLETE]');

      if (isNewUser || isIncomplete) {
        // Send to the correct completion form
        const dest = (resolvedRole || meRes.role) === 'department'
          ? '/signup/department?oauth=complete'
          : '/signup/startup?oauth=complete';
        navigate(dest);
      } else {
        navigate(ROLE_ROUTES[userData.role] ?? '/');
      }
    } catch (err) {
      let msg = 'Google sign-in failed. Please try again.';
      try {
        const parsed = JSON.parse(err.message);
        msg = parsed.error || parsed.detail || msg;
      } catch (_) {
        if (err.message && !err.message.startsWith('{')) msg = err.message;
      }
      toast({ title: 'Google Sign-In Failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = async (credentialResponse) => {
    const credential = credentialResponse.credential;

    if (role) {
      // Role already known (signup pages) — go straight through
      await completeAuth(credential, role);
    } else {
      // Login page — try without a role first; backend will detect it for
      // existing users. For brand-new users the backend will return 400 asking
      // for a role, so we catch that and show the picker.
      setLoading(true);
      try {
        const authRes = await api.googleAuth(credential, undefined);
        const meRes   = await api.me();
        const userData = {
          role:                meRes.role,
          user_id:             meRes.user_id,
          username:            meRes.username,
          name:                meRes.name,
          preferred_language:  meRes.preferred_language,
          sector_tags:         meRes.sector_tags,
          registration_status: meRes.registration_status,
          ministry:            meRes.ministry,
          startup_id:          meRes.startup_id,
          department_id:       meRes.department_id,
        };
        localStorage.setItem('user', JSON.stringify(userData));

        const isNewUser    = authRes.is_new_user === true;
        const isIncomplete = userData.name && userData.name.startsWith('[INCOMPLETE]');

        if (isNewUser || isIncomplete) {
          // We don't know the role yet — show the picker
          setPendingCred(credential);
          setShowRolePicker(true);
        } else {
          navigate(ROLE_ROUTES[userData.role] ?? '/');
        }
      } catch (err) {
        // Backend returned 400 "role required" — show the picker
        let errBody = {};
        try { errBody = JSON.parse(err.message); } catch (_) {}
        const needsRole = errBody.error?.toLowerCase().includes('role') ||
                          errBody.detail?.toLowerCase().includes('role');

        if (needsRole) {
          setPendingCred(credential);
          setShowRolePicker(true);
        } else {
          let msg = 'Google sign-in failed. Please try again.';
          if (errBody.error || errBody.detail) msg = errBody.error || errBody.detail;
          toast({ title: 'Google Sign-In Failed', description: msg, variant: 'destructive' });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleError = () => {
    toast({
      title:       'Google Sign-In Cancelled',
      description: 'The sign-in popup was closed or failed to open.',
      variant:     'destructive',
    });
  };

  return (
    <>
      {/* ── Divider + button ── */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap' }}>
            or continue with Google
          </span>
          <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
        </div>

        <div style={{
          width: '100%', display: 'flex', justifyContent: 'center',
          opacity: loading ? 0.6 : 1,
          pointerEvents: loading ? 'none' : 'auto',
          transition: 'opacity 0.15s',
        }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            useOneTap={false}
            text="continue_with"
            shape="rectangular"
            size="large"
            width="360"
            logo_alignment="left"
          />
        </div>
      </div>

      {/* ── Role picker modal (shown only on login page for new users) ── */}
      <AnimatePresence>
        {showRolePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
            onClick={() => { setShowRolePicker(false); setPendingCred(null); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{    scale: 0.92, opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: 20,
                padding: '36px 32px',
                maxWidth: 420,
                width: '100%',
                boxShadow: '0 32px 80px rgba(0,0,0,0.28)',
                position: 'relative',
              }}
            >
              {/* Close */}
              <button
                onClick={() => { setShowRolePicker(false); setPendingCred(null); }}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: '#F1F5F9', border: 'none', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, marginBottom: 16,
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                  One more step
                </h2>
                <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
                  You're signing up for the first time. How would you like to join GovLaunch?
                </p>
              </div>

              {/* Role cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Startup */}
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(79,70,229,0.2)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => completeAuth(pendingCred, 'startup')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                    background: 'rgba(79,70,229,0.05)',
                    border: '2px solid rgba(79,70,229,0.25)',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Rocket size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                      I'm a Startup
                    </div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>
                      Apply to government challenges, compete on merit
                    </div>
                  </div>
                </motion.button>

                {/* Department */}
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(13,148,136,0.2)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => completeAuth(pendingCred, 'department')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                    background: 'rgba(13,148,136,0.05)',
                    border: '2px solid rgba(13,148,136,0.25)',
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, #0D9488, #0891B2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Building2 size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                      I'm a Government Department
                    </div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>
                      Post challenges, discover startup solutions
                    </div>
                  </div>
                </motion.button>
              </div>

              <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
                Department access requires a <strong>.gov.in</strong> or <strong>.nic.in</strong> email
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
