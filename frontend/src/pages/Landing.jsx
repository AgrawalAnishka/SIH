import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'motion/react';
import { ArrowRight, Target, Rocket, TrendingUp, Award, Wallet, Trophy, ShieldCheck, BarChart2, Users, Lock, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { NumberTicker } from '../components/NumberTicker';
import Reveal from '../components/Reveal';
import LanguageSwitcher from '../components/LanguageSwitcher';

// ── Floating particle ─────────────────────────────────────────────────────────
function Particle({ x, y, size, duration, delay, color }) {
  return (
    <motion.div
      style={{
        position: 'absolute', left: `${x}%`, top: `${y}%`,
        width: size, height: size, borderRadius: '50%',
        background: color, opacity: 0, filter: 'blur(1px)',
        pointerEvents: 'none',
      }}
      animate={{
        y: [0, -80, 0],
        opacity: [0, 0.6, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ── Magnetic button ───────────────────────────────────────────────────────────
function MagneticButton({ children, onClick, style }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const x = useSpring(0, { stiffness: 150, damping: 15 });
  const y = useSpring(0, { stiffness: 150, damping: 15 });

  const onMove = useCallback((e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.35);
    y.set((e.clientY - cy) * 0.35);
  }, [x, y]);

  const onLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return (
    <motion.button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{ ...style, x, y, cursor: 'pointer' }}
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </motion.button>
  );
}

// ── 3D Tilt card ──────────────────────────────────────────────────────────────
function TiltCard({ children, style }) {
  const ref = useRef(null);
  const rotateX = useSpring(0, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 200, damping: 20 });
  const glowX   = useSpring(50, { stiffness: 200, damping: 20 });
  const glowY   = useSpring(50, { stiffness: 200, damping: 20 });

  const onMove = useCallback((e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotateX.set((py - 0.5) * -18);
    rotateY.set((px - 0.5) * 18);
    glowX.set(px * 100);
    glowY.set(py * 100);
  }, [rotateX, rotateY, glowX, glowY]);

  const onLeave = useCallback(() => {
    rotateX.set(0); rotateY.set(0);
    glowX.set(50); glowY.set(50);
  }, [rotateX, rotateY, glowX, glowY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        ...style,
        rotateX, rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Spotlight glare */}
      <motion.div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        background: useTransform(
          [glowX, glowY],
          ([gx, gy]) => `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.08) 0%, transparent 60%)`
        ),
      }} />
      {children}
    </motion.div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const WHY_ITEMS = [
  { icon: Award,      titleKey: 'landing.why1Title', descKey: 'landing.why1Desc' },
  { icon: Wallet,     titleKey: 'landing.why2Title', descKey: 'landing.why2Desc' },
  { icon: TrendingUp, titleKey: 'landing.why3Title', descKey: 'landing.why3Desc' },
  { icon: Trophy,     titleKey: 'landing.why4Title', descKey: 'landing.why4Desc' },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, labelKey: 'landing.trust1' },
  { icon: BarChart2,   labelKey: 'landing.trust2' },
  { icon: Users,       labelKey: 'landing.trust3' },
  { icon: Lock,        labelKey: 'landing.trust4' },
];

// Particles config
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 4 + 2,
  duration: Math.random() * 8 + 6,
  delay: Math.random() * 6,
  color: ['#FF9933', '#4F46E5', '#138808', '#000080', '#ffffff'][i % 5],
}));

const SECTOR_COLORS = {
  healthtech: '#4F46E5', 'defense-tech': '#475569',
  agritech: '#10B981', fintech: '#F59E0B', cleantech: '#0F766E',
};

const isNew = (d) => d && (Date.now() - new Date(d)) < 7 * 86400000;

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });

  // Parallax transforms
  const heroY      = useTransform(scrollYProgress, [0, 0.3], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const heroScale  = useTransform(scrollYProgress, [0, 0.25], [1, 0.95]);
  const meshScale  = useTransform(scrollYProgress, [0, 0.5], [1, 1.4]);

  const [stats, setStats]      = useState({ challenges: 0, startups: 0, pilots: 0 });
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [sd, cd] = await Promise.allSettled([api.getPublicStats(), api.getPublicChallenges()]);
        if (sd.status === 'fulfilled') {
          const d = sd.value;
          setStats({ challenges: d.open_challenges ?? 0, startups: d.startups ?? 0, pilots: d.pilots_scaled ?? 0 });
        }
        if (cd.status === 'fulfilled') {
          const list = Array.isArray(cd.value) ? cd.value : (cd.value?.results ?? []);
          setChallenges(list.slice(0, 3));
        }
      } catch (_) {}
    })();
  }, []);

  const fmt = (n) => n ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : 'N/A';
  const getSectorColor = (tags) => {
    const t = (Array.isArray(tags) ? tags[0] : String(tags || '').split(',')[0])?.trim();
    return SECTOR_COLORS[t?.toLowerCase()] ?? '#4F46E5';
  };

  return (
    <div ref={containerRef} style={{ backgroundColor: '#050810', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>

      {/* ── Fixed Nav ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 48px',
          background: 'rgba(5,8,16,0.7)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #FF9933 0deg 120deg, #ffffff 120deg 240deg, #138808 240deg 360deg)',
              boxShadow: '0 0 12px rgba(255,153,51,0.5)',
            }}
          />
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            GovLaunch
          </span>
        </div>

        <div style={{ display: 'flex', gap: 32 }}>
          {[
            { label: t('nav.home'), href: '#' },
            { label: t('nav.problemStatements'), href: '/discover' },
            { label: t('nav.howItWorks'), href: '#' },
          ].map((l, i) => (
            <motion.a
              key={l.label}
              href={l.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileHover={{ color: '#fff', y: -1 }}
              style={{ color: '#64748B', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
            >
              {l.label}
            </motion.a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageSwitcher variant="compact-dark" />
          <MagneticButton onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 8 }}>
            {t('landing.logIn')}
          </MagneticButton>
          <MagneticButton onClick={() => navigate('/login')}
            style={{
              background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.4)',
              color: '#2DD4BF', fontSize: 14, fontWeight: 600, padding: '8px 20px', borderRadius: 8,
              backdropFilter: 'blur(8px)',
            }}>
            {t('landing.govLogin')}
          </MagneticButton>
        </div>
      </motion.nav>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Floating particles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {PARTICLES.map(p => <Particle key={p.id} {...p} />)}
        </div>

        {/* Ambient orbs — much more vibrant */}
        <motion.div style={{ position: 'absolute', inset: 0, scale: meshScale, pointerEvents: 'none' }}>
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: '5%', left: '5%',
              width: 600, height: 600, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,100,0,0.45) 0%, rgba(255,153,51,0.25) 30%, transparent 65%)',
              filter: 'blur(30px)',
            }}
          />
          <motion.div
            animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
            style={{
              position: 'absolute', bottom: '5%', right: '5%',
              width: 500, height: 500, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(19,200,8,0.40) 0%, rgba(19,136,8,0.22) 35%, transparent 65%)',
              filter: 'blur(30px)',
            }}
          />
          <motion.div
            animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            style={{
              position: 'absolute', top: '35%', left: '35%',
              width: 450, height: 450, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,70,255,0.35) 0%, rgba(79,70,229,0.18) 40%, transparent 65%)',
              filter: 'blur(30px)',
            }}
          />
          {/* Extra punch — top-right cyan */}
          <motion.div
            animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
            style={{
              position: 'absolute', top: '10%', right: '15%',
              width: 300, height: 300, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,200,255,0.30) 0%, transparent 65%)',
              filter: 'blur(25px)',
            }}
          />
        </motion.div>

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)',
        }} />

        {/* Hero content — parallax scroll */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale, position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 780, padding: '0 24px' }}
        >
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 100, padding: '7px 18px', marginBottom: 36,
              backdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF9933', boxShadow: '0 0 8px #FF9933' }}
            />
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, letterSpacing: '0.1em' }}>
              {t('landing.badge')}
            </span>
          </motion.div>

          {/* Main headline — word by word reveal */}
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(42px,6vw,76px)', fontWeight: 800, lineHeight: 1.08, marginBottom: 28 }}>
            {t('landing.heroLine1').split(' ').map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40, rotateX: -40 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ display: 'inline-block', color: '#fff', marginRight: '0.25em', transformOrigin: 'bottom' }}
              >
                {word}
              </motion.span>
            ))}
            <br />
            {t('landing.heroLine2').split(' ').map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40, rotateX: -40 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  display: 'inline-block', marginRight: '0.25em', transformOrigin: 'bottom',
                  background: 'linear-gradient(90deg, #FF9933, #FF6B35, #138808)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}
              >
                {word}
              </motion.span>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            style={{ fontSize: 19, color: '#64748B', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 44px' }}
          >
            {t('landing.heroSub')}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <MagneticButton
              onClick={() => navigate('/login')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                padding: '15px 32px', borderRadius: 12, border: 'none',
                boxShadow: '0 8px 32px rgba(79,70,229,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              {t('landing.browseBtn')}
              <ArrowRight size={18} />
            </MagneticButton>
            <MagneticButton
              onClick={() => navigate('/login')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#E2E8F0', fontWeight: 600, fontSize: 15,
                padding: '15px 32px', borderRadius: 12,
                backdropFilter: 'blur(8px)',
              }}
            >
              {t('landing.govBtn')}
            </MagneticButton>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}
        >
          <ChevronDown size={24} color="rgba(255,255,255,0.3)" />
        </motion.div>
      </div>

      {/* ── STATS STRIP ── */}
      <div style={{ position: 'relative', padding: '80px 48px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {[
            { icon: Target,     value: stats.challenges, labelKey: 'landing.statOpenChallenges',    accent: '#FF9933', descKey: 'landing.statOpenDesc' },
            { icon: Rocket,     value: stats.startups,   labelKey: 'landing.statStartups', accent: '#138808', descKey: 'landing.statStartupsDesc' },
            { icon: TrendingUp, value: stats.pilots,     labelKey: 'landing.statPilots',      accent: '#4F46E5', descKey: 'landing.statPilotsDesc' },
          ].map((s, i) => (
            <Reveal key={s.labelKey} direction="up" delay={i * 0.1}>
              <TiltCard style={{ borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', padding: '32px 28px' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${s.accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <s.icon size={24} color={s.accent} />
                </div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 52, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 8 }}>
                  <NumberTicker value={s.value} className="" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#E2E8F0', marginBottom: 4 }}>{t(s.labelKey)}</div>
                <div style={{ fontSize: 13, color: '#475569' }}>{t(s.descKey)}</div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── ACTIVE CHALLENGES ── */}
      <div style={{ padding: '100px 48px', background: '#050810' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4F46E5', letterSpacing: '0.15em', marginBottom: 14, textTransform: 'uppercase' }}>
                {t('landing.liveSection')}
              </div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>
                {t('landing.activeProblem')}
              </h2>
              <p style={{ fontSize: 17, color: '#475569', maxWidth: 500, margin: '0 auto' }}>
                {t('landing.activeProblemSub')}
              </p>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
            {challenges.length === 0
              ? [0,1,2].map(i => (
                  /* Skeleton cards with visible structure */
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    style={{
                      borderRadius: 20, overflow: 'hidden', minHeight: 200,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ height: 3, background: ['#FF9933','#4F46E5','#138808'][i] }} />
                    <div style={{ padding: 24 }}>
                      <div style={{ height: 14, width: '65%', borderRadius: 6, background: 'rgba(255,255,255,0.08)', marginBottom: 10 }} />
                      <div style={{ height: 10, width: '45%', borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 20 }} />
                      <div style={{ height: 10, width: '80%', borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 6 }} />
                      <div style={{ height: 10, width: '60%', borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                  </motion.div>
                ))
              : challenges.map((c, i) => (
                  <Reveal key={c.id} direction="up" delay={i * 0.12}>
                    <TiltCard
                      style={{
                        borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        minHeight: 200,
                      }}
                    >
                      {/* Vibrant sector top bar */}
                      <motion.div
                        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                        transition={{ duration: 0.7, delay: 0.3 + i * 0.1 }}
                        style={{
                          height: 4, transformOrigin: 'left',
                          background: `linear-gradient(90deg, ${getSectorColor(c.sector_tags)}, ${getSectorColor(c.sector_tags)}88)`,
                          boxShadow: `0 0 12px ${getSectorColor(c.sector_tags)}88`,
                        }}
                      />

                      <div style={{ padding: '20px 24px 24px' }} onClick={() => navigate('/login')}>
                        {/* NEW badge */}
                        {isNew(c.created_at) && (
                          <motion.span
                            animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }}
                            style={{
                              display: 'inline-block', marginBottom: 12,
                              fontSize: 10, fontWeight: 800, background: '#FF9933', color: '#050810',
                              padding: '3px 9px', borderRadius: 100, letterSpacing: '0.08em',
                            }}
                          >
                            NEW
                          </motion.span>
                        )}

                        {/* Title */}
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', lineHeight: 1.4, marginBottom: 6 }}>
                          {c.title}
                        </div>

                        {/* Department */}
                        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          </svg>
                          {c.department_name}
                        </div>

                        {/* Sector tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                          {(Array.isArray(c.sector_tags) ? c.sector_tags : String(c.sector_tags || '').split(',')).filter(Boolean).map(t => (
                            <span key={t} style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
                              background: `${getSectorColor(t)}25`, color: getSectorColor(t),
                              border: `1px solid ${getSectorColor(t)}44`,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              {t.trim()}
                            </span>
                          ))}
                        </div>

                        {/* Budget + timeline row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                          <div>
                            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{t('landing.budget')}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: getSectorColor(c.sector_tags) }}>
                              {fmt(c.budget_ceiling)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{t('landing.timeline')}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#94A3B8' }}>{c.timeline_weeks}w</div>
                          </div>
                        </div>
                      </div>
                    </TiltCard>
                  </Reveal>
                ))
            }
          </div>
        </div>
      </div>

      {/* ── WHY PARTICIPATE ── */}
      <div id="why" style={{ padding: '100px 48px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal direction="up">
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#138808', letterSpacing: '0.15em', marginBottom: 14, textTransform: 'uppercase' }}>
                {t('landing.whyLabel')}
              </div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, color: '#fff' }}>
                {t('landing.whyTitle')}
              </h2>
            </div>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24 }}>
            {WHY_ITEMS.map((item, i) => (
              <Reveal key={item.titleKey} direction="up" delay={i * 0.1}>
                <TiltCard style={{
                  borderRadius: 20, padding: 28,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: 'rgba(79,70,229,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 20,
                    }}
                  >
                    <item.icon size={24} color="#6366F1" />
                  </motion.div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', marginBottom: 10 }}>{t(item.titleKey)}</div>
                  <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.65 }}>{t(item.descKey)}</div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── TRUST FOOTER ── */}
      <div style={{
        padding: '40px 48px', background: '#050810',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'center',
        flexWrap: 'wrap', gap: 40,
      }}>
        {TRUST_ITEMS.map((item, i) => (
          <Reveal key={item.labelKey} direction="up" delay={i * 0.07}>
            <motion.div
              whileHover={{ y: -3, color: '#94A3B8' }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151', cursor: 'default' }}
            >
              <item.icon size={16} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t(item.labelKey)}</span>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
