import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Building2, Shield, Globe, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useToast } from '../components/ui/toast';
import GoogleAuthButton from '../components/GoogleAuthButton';
import LanguageSwitcher from '../components/LanguageSwitcher';

const FIELD_STYLE = {
  width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
  border: '1.5px solid #E2E8F0', background: '#F8FAFC',
  fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Inter', sans-serif", transition: 'border-color 0.15s, box-shadow 0.15s',
};

function Field({ label, value, onChange, placeholder, type = 'text', required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          ...FIELD_STYLE,
          borderColor: focused ? '#0D9488' : '#E2E8F0',
          boxShadow: focused ? '0 0 0 3px rgba(13,148,136,0.12)' : 'none',
        }}
      />
    </div>
  );
}

export default function SignupDepartment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  const isOAuthCompletion = searchParams.get('oauth') === 'complete';

  const [formData, setFormData] = useState({ name: '', ministry: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setFormData(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isOAuthCompletion) {
        await api.completeOAuthProfile({ name: formData.name, ministry: formData.ministry });
        const meRes = await api.me();
        const userData = {
          role: meRes.role, user_id: meRes.user_id, username: meRes.username,
          name: meRes.name, ministry: meRes.ministry, department_id: meRes.department_id,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        toast({ title: 'Profile completed!', description: 'Welcome to GovLaunch.' });
        navigate('/challenges');
      } else {
        await api.signup({ ...formData, role: 'department' });
        toast({ title: 'Account created!', description: 'Please log in to continue.' });
        navigate('/login');
      }
    } catch (err) {
      let msg = 'Please try again';
      try { msg = JSON.parse(err.message).detail || err.message || msg; } catch (_) {}
      toast({ title: isOAuthCompletion ? 'Profile update failed' : 'Registration failed', description: msg, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const FEATURES = [
    { icon: Shield, textKey: 'landing.trust1' },
    { icon: Globe,  textKey: 'landing.trust2' },
    { icon: Users,  textKey: 'landing.trust3' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left: Form ── */}
      <div style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px' }}>
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}
          style={{ width: '100%', maxWidth: 440 }}>

          {/* Logo + Language switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%',
                background: 'conic-gradient(from 0deg, #FF9933 0deg 120deg, #ffffff 120deg 240deg, #138808 240deg 360deg)',
                boxShadow: '0 0 10px rgba(13,148,136,0.4)',
              }} />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800, color: '#0B0F19' }}>
                GovLaunch
              </span>
            </div>
            <LanguageSwitcher variant="compact" />
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0D9488', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              {t('signup.govPortal')}
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 800, color: '#0B0F19', margin: 0, lineHeight: 1.2 }}>
              {t('signup.registerDept')}
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', marginTop: 8 }}>
              {t('signup.joinGovlaunch')}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label={t('signup.deptName')} value={formData.name} onChange={set('name')}
              placeholder={t('signup.deptNamePlaceholder')} required />
            <Field label={t('signup.ministry')} value={formData.ministry} onChange={set('ministry')}
              placeholder={t('signup.ministryPlaceholder')} required />

            {!isOAuthCompletion && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label={t('auth.username')} value={formData.username} onChange={set('username')} placeholder={t('signup.choosePlaceholder')} required />
                <Field label={t('auth.password')} type="password" value={formData.password} onChange={set('password')} placeholder={t('signup.createPasswordPlaceholder')} required />
              </div>
            )}

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.01, boxShadow: '0 8px 24px rgba(13,148,136,0.35)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                height: 48, borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#94A3B8' : 'linear-gradient(135deg, #0D9488, #0891B2)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                boxShadow: '0 4px 16px rgba(13,148,136,0.3)', marginTop: 4,
              }}
            >
              {loading
                ? (isOAuthCompletion ? t('signup.savingProfile') : t('signup.creatingAccount'))
                : (isOAuthCompletion ? t('signup.completeProfile') : t('signup.createDeptAccount'))}
              {!loading && <ArrowRight size={18} />}
            </motion.button>

            {!isOAuthCompletion && <GoogleAuthButton role="department" />}
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', marginTop: 24 }}>
            {t('signup.alreadyRegistered')}{' '}
            <Link to="/login" style={{ color: '#0D9488', fontWeight: 600, textDecoration: 'none' }}>{t('auth.loginNow')}</Link>
          </p>
        </motion.div>
      </div>

      {/* ── Right: Dark hero ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0D1117 0%, #0A0E1A 60%, #0C1020 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>

        <motion.div animate={{ x: [0,20,0], y: [0,-20,0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(13,148,136,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <motion.div animate={{ x: [0,-15,0], y: [0,20,0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ position: 'absolute', bottom: -40, left: -40, width: 250, height: 250, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(8,145,178,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          style={{ position: 'relative', zIndex: 1, maxWidth: 380, textAlign: 'center' }}>

          <motion.div
            animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 28px',
              background: 'linear-gradient(135deg, rgba(13,148,136,0.3), rgba(8,145,178,0.2))',
              border: '1px solid rgba(13,148,136,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(13,148,136,0.2)' }}
          >
            <Building2 size={34} color="#2DD4BF" />
          </motion.div>

          <blockquote style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.4, marginBottom: 16 }}>
            "Post the outcome you need. Let merit find you the solution."
          </blockquote>
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 36 }}>
            Join India's leading platform for government-startup collaboration.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, padding: '10px 14px' }}>
                <f.icon size={16} color="#2DD4BF" />
                <span style={{ fontSize: 13, color: '#94A3B8' }}>{t(f.textKey)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
