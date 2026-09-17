import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from './ui/toast';

/**
 * GoogleAuthButton
 *
 * Renders the Google Identity Services "Continue with Google" button plus a
 * visual "or" divider above it.  After a successful sign-in the component:
 *   1. Sends the GIS credential JWT + role (optional) to /api/auth/google/
 *   2. Backend auto-detects role for existing users, requires it for new users
 *   3. Calls /api/auth/me/ to retrieve the full user profile.
 *   4. Persists the profile to localStorage (same shape as password login).
 *   5. Navigates to the role-appropriate dashboard.
 *
 * Props
 * ─────
 * role  {string}  'department' | 'startup' | undefined
 *                 - For signup pages: REQUIRED (enforces domain rules)
 *                 - For login page: OPTIONAL (auto-detected from account)
 */
export default function GoogleAuthButton({ role }) {
  const navigate     = useNavigate();
  const { toast }    = useToast();
  const [loading, setLoading] = useState(false);

  const ROLE_ROUTES = {
    department: '/challenges',
    startup:    '/dashboard',
  };

  const handleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      // 1. Verify token server-side and establish Django session
      const authRes = await api.googleAuth(credentialResponse.credential, role);

      // 2. Fetch full profile (same as handleLogin in Login.jsx)
      const meRes = await api.me();
      const userData = {
        role:                meRes.role,
        user_id:             meRes.user_id,
        username:            meRes.username,
        name:                meRes.name,
        sector_tags:         meRes.sector_tags,
        registration_status: meRes.registration_status,
        ministry:            meRes.ministry,
        startup_id:          meRes.startup_id,
        department_id:       meRes.department_id,
      };

      // 3. Persist to localStorage (ProtectedRoute reads this)
      localStorage.setItem('user', JSON.stringify(userData));

      // 4. Check if this is a new user OR profile is still incomplete
      const isNewUser = authRes.is_new_user === true;
      const isIncomplete = userData.name && userData.name.startsWith('[INCOMPLETE]');
      
      if (isNewUser || isIncomplete) {
        // Redirect to profile completion page
        if (role === 'startup') {
          navigate('/signup/startup?oauth=complete');
        } else {
          navigate('/signup/department?oauth=complete');
        }
      } else {
        // Navigate to role dashboard
        navigate(ROLE_ROUTES[userData.role] ?? '/');
      }

    } catch (err) {
      // Parse the error message from the api wrapper (throws Error with JSON body)
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

  const handleError = () => {
    toast({
      title:       'Google Sign-In Cancelled',
      description: 'The sign-in popup was closed or failed to open.',
      variant:     'destructive',
    });
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ── Divider ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        margin: '16px 0',
      }}>
        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
        <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap' }}>
          or continue with Google
        </span>
        <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
      </div>

      {/* ── Google Login button ── */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
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
  );
}
