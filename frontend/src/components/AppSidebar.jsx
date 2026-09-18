import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useSpring } from 'motion/react';
import {
  LayoutDashboard, Search, FileText, Database,
  Target, Plus, ShieldCheck, Eye, Shield, LogOut,
  ChevronRight, Sparkles
} from 'lucide-react';
import { api } from '../lib/api';
import LanguageSwitcher from './LanguageSwitcher';

// ── Role configuration ────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  startup: {
    accent:    '#6366F1',
    accentAlt: '#8B5CF6',
    glowColor: 'rgba(99,102,241,0.35)',
    meshA:     'rgba(99,102,241,0.15)',
    meshB:     'rgba(139,92,246,0.10)',
    portalLabel: 'Startup Portal',
    roleLabel:   'Startup',
    nav: [
      { path: '/dashboard',       label: 'Dashboard',           icon: LayoutDashboard, badge: null },
      { path: '/discover',        label: 'Discover Challenges', icon: Search,          badge: 'New' },
      { path: '/my-applications', label: 'My Applications',     icon: FileText,        badge: null },
      { path: '/catalog',         label: 'Scale-Up Catalog',    icon: Database,        badge: null },
    ],
  },
  department: {
    accent:    '#0D9488',
    accentAlt: '#0891B2',
    glowColor: 'rgba(13,148,136,0.35)',
    meshA:     'rgba(13,148,136,0.15)',
    meshB:     'rgba(8,145,178,0.10)',
    portalLabel: 'Government Portal',
    roleLabel:   'Department',
    nav: [
      { path: '/challenges',     label: 'My Challenges',    icon: Target,      badge: null },
      { path: '/challenges/new', label: 'Post Challenge',   icon: Plus,        badge: null },
      { path: '/catalog',        label: 'Scale-Up Catalog', icon: Database,    badge: null },
      { path: '/supervision',    label: 'Supervision',      icon: ShieldCheck, badge: null },
    ],
  },
  evaluator: {
    accent:    '#D97706',
    accentAlt: '#EA580C',
    glowColor: 'rgba(217,119,6,0.35)',
    meshA:     'rgba(217,119,6,0.15)',
    meshB:     'rgba(234,88,12,0.10)',
    portalLabel: 'Evaluator Portal',
    roleLabel:   'Evaluator',
    nav: [
      { path: '/evaluate', label: 'My Reviews',      icon: Eye,      badge: null },
      { path: '/catalog',  label: 'Scale-Up Catalog', icon: Database, badge: null },
    ],
  },
  admin: {
    accent:    '#DC2626',
    accentAlt: '#9333EA',
    glowColor: 'rgba(220,38,38,0.35)',
    meshA:     'rgba(220,38,38,0.15)',
    meshB:     'rgba(147,51,234,0.10)',
    portalLabel: 'Admin Portal',
    roleLabel:   'Admin',
    nav: [
      { path: '/audit',   label: 'Audit Trail',      icon: Shield,   badge: null },
      { path: '/catalog', label: 'Scale-Up Catalog', icon: Database, badge: null },
    ],
  },
};

// ── Noise SVG overlay (subtle grain) ─────────────────────────────────────────
const NoiseSVG = () => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.025, pointerEvents: 'none', zIndex: 0 }}>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function AppSidebar() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem('user') || '{}');
  const cfg      = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.startup;
  const [time, setTime] = useState(new Date());

  // Live clock — subtle detail
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = () => {
    api.logout();
    localStorage.removeItem('user');
    navigate('/login');
  };

  const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: 264, height: '100vh',
      background: 'linear-gradient(160deg, #0D1117 0%, #0A0E1A 60%, #0C1020 100%)',
      display: 'flex', flexDirection: 'column',
      zIndex: 40,
      borderRight: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      <NoiseSVG />

      {/* Ambient mesh glow — top */}
      <div style={{
        position: 'absolute', top: -60, left: -60,
        width: 240, height: 240,
        background: `radial-gradient(circle, ${cfg.meshA} 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />
      {/* Ambient mesh glow — bottom */}
      <div style={{
        position: 'absolute', bottom: -40, right: -40,
        width: 180, height: 180,
        background: `radial-gradient(circle, ${cfg.meshB} 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Logo / Header ── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px 16px' }}>
        {/* Wordmark row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          {/* Tricolor globe mark */}
          <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #FF9933 0deg 120deg, #f8f8f8 120deg 240deg, #138808 240deg 360deg)',
              boxShadow: `0 0 0 1px rgba(255,255,255,0.12), 0 0 12px ${cfg.glowColor}`,
            }} />
            {/* Ashoka Chakra dot */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: '#000080',
              boxShadow: '0 0 0 1.5px rgba(255,255,255,0.3)',
            }} />
          </div>

          <div>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 17, fontWeight: 800, color: '#FAFAFA',
              letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              GovLaunch
            </div>
            <div style={{
              fontSize: 9.5, color: cfg.accent,
              fontWeight: 600, letterSpacing: '0.12em',
              marginTop: 2, textTransform: 'uppercase',
            }}>
              {cfg.portalLabel}
            </div>
          </div>
        </div>

        {/* Separator with gradient */}
        <div style={{
          height: 1, marginTop: 14,
          background: `linear-gradient(90deg, ${cfg.accent}55 0%, rgba(255,255,255,0.06) 100%)`,
        }} />
      </div>

      {/* ── Navigation ── */}
      <nav style={{ position: 'relative', zIndex: 1, flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        {/* Section label */}
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.12em', padding: '4px 10px 10px',
          textTransform: 'uppercase',
        }}>
          Navigation
        </div>

        {cfg.nav.map((item, i) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1 + i * 0.07, ease: 'easeOut' }}
          >
            <NavLink
              key={item.path}
              to={item.path}
              style={{ textDecoration: 'none', display: 'block', marginBottom: 3 }}
            >
              {({ isActive }) => (
                <NavItem item={item} isActive={isActive} cfg={cfg} />
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* ── Upgrade / Context card ── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 12px 10px' }}>
        <div style={{
          borderRadius: 12,
          background: `linear-gradient(135deg, ${cfg.accent}22 0%, ${cfg.accentAlt}18 100%)`,
          border: `1px solid ${cfg.accent}33`,
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${cfg.accent}44, ${cfg.accentAlt}33)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={14} color={cfg.accent} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
              Digital India
            </div>
            <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Startup India Platform
            </div>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: 1, margin: '0 16px', background: 'rgba(255,255,255,0.06)', position: 'relative', zIndex: 1 }} />

      {/* ── User footer ── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '12px 10px 16px' }}>
        {/* Clock + date pill */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 10px 8px',
        }}>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.2)', fontVariantNumeric: 'tabular-nums' }}>
            {timeStr}
          </span>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.2)' }}>
            {dateStr}
          </span>
        </div>

        {/* User card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 10px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          marginBottom: 4,
        }}>
          {/* Avatar with ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accentAlt})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 0 2px #0D1117, 0 0 0 3px ${cfg.accent}55`,
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>
                {(user.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Online indicator */}
            <div style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 9, height: 9, borderRadius: '50%',
              backgroundColor: '#22C55E',
              border: '2px solid #0D1117',
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#F1F5F9',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}>
              {user.name || cfg.roleLabel}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 600, color: cfg.accent,
              marginTop: 3,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                backgroundColor: cfg.accent, flexShrink: 0,
              }} />
              {cfg.roleLabel.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Logout */}
        <LanguageSwitcher variant="sidebar" />
        <div style={{ height: 8 }} /> {/* Spacer */}
        <LogoutButton onClick={handleLogout} />
      </div>
    </div>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({ item, isActive, cfg }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '9px 11px', borderRadius: 9,
        position: 'relative', cursor: 'pointer',
        transition: 'all 0.15s ease',
        background: isActive
          ? `linear-gradient(90deg, ${cfg.accent}22 0%, ${cfg.accentAlt}10 100%)`
          : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: isActive ? `1px solid ${cfg.accent}30` : '1px solid transparent',
      }}
    >
      {/* Active left bar — M3.8 */}
      {isActive && (
        <motion.div
          layoutId="sidebarActiveBar"
          style={{
            position: 'absolute', left: 0, top: '20%', bottom: '20%',
            width: 3,
            background: `linear-gradient(180deg, ${cfg.accent}, ${cfg.accentAlt})`,
            borderRadius: '0 3px 3px 0',
            boxShadow: `2px 0 8px ${cfg.glowColor}`,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}

      {/* Icon container */}
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isActive ? `${cfg.accent}25` : hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
        transition: 'background 0.15s',
      }}>
        <item.icon
          size={15}
          color={isActive ? cfg.accent : hovered ? '#D1D5DB' : '#6B7280'}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </div>

      <span style={{
        fontSize: 13.5, fontWeight: isActive ? 600 : 400,
        color: isActive ? '#F1F5F9' : hovered ? '#D1D5DB' : '#9CA3AF',
        lineHeight: 1, flex: 1,
        transition: 'color 0.15s',
      }}>
        {item.label}
      </span>

      {/* Badge pill */}
      {item.badge && (
        <span style={{
          fontSize: 9.5, fontWeight: 700,
          backgroundColor: cfg.accent, color: '#fff',
          padding: '2px 6px', borderRadius: 100,
          letterSpacing: '0.04em',
        }}>
          {item.badge}
        </span>
      )}

      {/* Chevron on hover */}
      <AnimatePresence>
        {hovered && !isActive && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12 }}
          >
            <ChevronRight size={13} color="#4B5563" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Logout button ─────────────────────────────────────────────────────────────
function LogoutButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
        padding: '8px 11px', borderRadius: 8,
        background: hovered ? 'rgba(239,68,68,0.08)' : 'transparent',
        border: hovered ? '1px solid rgba(239,68,68,0.18)' : '1px solid transparent',
        color: hovered ? '#F87171' : '#4B5563',
        fontSize: 13, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <LogOut size={14} strokeWidth={2} />
      <span style={{ fontWeight: 500 }}>Sign Out</span>
    </button>
  );
}
