import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Lightbulb, FileText, BadgeCheck, Rocket, Zap, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useToast } from '../components/ui/toast';
import GoogleAuthButton from '../components/GoogleAuthButton';
import LanguageSwitcher from '../components/LanguageSwitcher';

const SECTORS = [
  { id: 'healthtech',   label: 'Healthtech',   color: '#4F46E5' },
  { id: 'defense-tech', label: 'Defense-tech', color: '#475569' },
  { id: 'agritech',     label: 'Agritech',     color: '#10B981' },
  { id: 'fintech',      label: 'Fintech',       color: '#F59E0B' },
  { id: 'cleantech',    label: 'Cleantech',     color: '#0D9488' },
];

const REG_STATUSES = [
  { id: 'unregistered',     label: 'Idea Stage',       sublabel: 'No incorporation yet',  icon: Lightbulb, color: '#F59E0B' },
  { id: 'incorporated',     label: 'Incorporated',      sublabel: 'DPIIT pending',          icon: FileText,  color: '#4F46E5' },
  { id: 'dpiit_recognized', label: 'DPIIT Recognized',  sublabel: 'Fully registered',       icon: BadgeCheck,color: '#10B981' },
];

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
          borderColor: focused ? '#4F46E5' : '#E2E8F0',
          boxShadow: focused ? '0 0 0 3px rgba(79,70,229,0.12)' : 'none',
        }}
      />
    </div>
  );
}

export default function SignupStartup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  const isOAuthCompletion = searchParams.get('oauth') === 'complete';

  const [formData, setFormData] = useState({
    name: '', sector_tags: [], team_size: '', founded_year: '',
    pitch_summary: '', registration_status: '', username: '', password: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setFormData(p => ({ ...p, [key]: e.target.value }));
  const toggleSector = (id) => setFormData(p => ({
    ...p,
    sector_tags: p.sector_tags.includes(id) ? p.sector_tags.filter(s => s !== id) : [...p.sector_tags, id],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isOAuthCompletion) {
        await api.completeOAuthProfile({
          name: formData.name,
          sector_tags: formData.sector_tags,
          team_size: parseInt(formData.team_size) || 1,
          founded_year: parseInt(formData.founded_year) || 2024,
          pitch_summary: formData.pitch_summary,
          registration_status: formData.registration_status,
        });
        const meRes = await api.me();
        const userData = {
          role: meRes.role, user_id: meRes.user_id, username: meRes.username,
          name: meRes.name, sector_tags: meRes.sector_tags,
          registration_status: meRes.registration_status, startup_id: meRes.startup_id,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        toast({ title: 'Profile completed!', description: 'Welcome to GovLaunch.' });
        navigate('/dashboard');
      } else {
        await api.signup({ ...formData, role: 'startup', team_size: parseInt(formData.team_size) || 1, founded_year: parseInt(formData.founded_year) || 2024 });
        toast({ title: 'Account created!', description: 'Please log in.' });
        navigate('/login');
      }
    } catch (err) {
      let msg = 'Please try again';
      try { msg = JSON.parse(err.message).detail || err.message || msg; } catch (_) {}
      toast({ title: isOAuthCompletion ? 'Profile update failed' : 'Registration failed', description: msg, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const PERKS = [
    { icon: Zap,        textKey: 'signup.perk1' },
    { icon: Star,       textKey: 'signup.perk2' },
    { icon: BadgeCheck, textKey: 'signup.perk3' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left: Dark hero ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0D1117 0%, #0A0E1A 60%, #0C1020 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>

        <motion.div animate={{ x: [0,25,0], y: [0,-20,0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: -60, left: -60, width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <motion.div animate={{ x: [0,-18,0], y: [0,22,0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ position: 'absolute', bottom: -50, right: -50, width: 260, height: 260, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          style={{ position: 'relative', zIndex: 1, maxWidth: 380 }}>

          {/* Logo + Language switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%',
                background: 'conic-gradient(from 0deg, #FF9933 0deg 120deg, #ffffff 120deg 240deg, #138808 240deg 360deg)',
                boxShadow: '0 0 12px rgba(99,102,241,0.5)' }} />
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>GovLaunch</span>
            </div>
            <LanguageSwitcher variant="compact-dark" />
          </div>

          <motion.div animate={{ y: [0,-10,0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 72, height: 72, borderRadius: 20, marginBottom: 28,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(99,102,241,0.2)' }}>
            <Rocket size={34} color="#818CF8" />
          </motion.div>

          <blockquote style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.4, marginBottom: 16 }}>
            {t('signup.startupQuote')}
          </blockquote>
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 36, lineHeight: 1.6 }}>
            {t('signup.equalOpportunity')}
          </p>

          {PERKS.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
              <f.icon size={16} color="#818CF8" />
              <span style={{ fontSize: 13, color: '#94A3B8' }}>{t(f.textKey)}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Right: Form ── */}
      <div style={{ flex: 1.2, background: '#fff', overflowY: 'auto',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 32px' }}>
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}
          style={{ width: '100%', maxWidth: 460 }}>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              {t('signup.startupPortal')}
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 800, color: '#0B0F19', margin: 0 }}>
              {t('signup.registerStartup')}
            </h1>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <Field label={t('signup.startupName')} value={formData.name} onChange={set('name')}
              placeholder={t('signup.startupNamePlaceholder')} required />

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                {t('signup.sector')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SECTORS.map(s => {
                  const active = formData.sector_tags.includes(s.id);
                  return (
                    <motion.button key={s.id} type="button" onClick={() => toggleSector(s.id)}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                      style={{
                        padding: '6px 14px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: active ? s.color : '#F1F5F9',
                        color: active ? '#fff' : '#475569',
                        border: `1.5px solid ${active ? s.color : '#E2E8F0'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      {s.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label={t('signup.teamSize')} type="number" value={formData.team_size} onChange={set('team_size')} placeholder={t('signup.teamSizePlaceholder')} />
              <Field label={t('signup.foundedYear')} type="number" value={formData.founded_year} onChange={set('founded_year')} placeholder={t('signup.foundedYearPlaceholder')} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                {t('signup.pitchSummary')}
              </label>
              <textarea value={formData.pitch_summary} onChange={set('pitch_summary')}
                placeholder={t('signup.pitchSummaryPlaceholder')}
                rows={3} style={{ ...FIELD_STYLE, height: 'auto', padding: '10px 14px', resize: 'vertical', borderColor: '#E2E8F0', lineHeight: 1.6 }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                {t('signup.registrationStatus')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {REG_STATUSES.map(st => {
                  const active = formData.registration_status === st.id;
                  return (
                    <motion.button key={st.id} type="button" onClick={() => setFormData(p => ({ ...p, registration_status: st.id }))}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      style={{
                        padding: '12px 10px', borderRadius: 12, border: `2px solid ${active ? st.color : '#E2E8F0'}`,
                        background: active ? `${st.color}0f` : '#F8FAFC',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <st.icon size={18} color={active ? st.color : '#94A3B8'} style={{ marginBottom: 6 }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? st.color : '#374151' }}>{st.label}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{st.sublabel}</div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {!isOAuthCompletion && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label={t('auth.username')} value={formData.username} onChange={set('username')} placeholder={t('signup.choosePlaceholder')} required />
                <Field label={t('auth.password')} type="password" value={formData.password} onChange={set('password')} placeholder={t('signup.createPasswordPlaceholder')} required />
              </div>
            )}

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.01, boxShadow: '0 8px 24px rgba(79,70,229,0.35)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                height: 48, borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                boxShadow: '0 4px 16px rgba(79,70,229,0.3)', marginTop: 4,
              }}
            >
              {loading
                ? (isOAuthCompletion ? t('signup.savingProfile') : t('signup.creatingAccount'))
                : (isOAuthCompletion ? t('signup.completeProfile') : t('signup.createStartupAccount'))}
              {!loading && <ArrowRight size={18} />}
            </motion.button>

            {!isOAuthCompletion && <GoogleAuthButton role="startup" />}
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', marginTop: 24 }}>
            {t('signup.alreadyRegistered')}{' '}
            <Link to="/login" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>{t('auth.loginNow')}</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
