/**
 * AiBadges.jsx — reusable priority, severity, flag, and status badge components.
 */
import React from 'react';

const PRIORITY_COLORS = {
  critical: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  high:     { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', dot: '#F97316' },
  medium:   { bg: '#FEFCE8', text: '#A16207', border: '#FDE68A', dot: '#EAB308' },
  low:      { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', dot: '#22C55E' },
};

const SEVERITY_COLORS = {
  critical:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  concerning: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  normal:     { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
};

const FLAG_ICONS = {
  incomplete:                   '⚠️',
  off_topic:                    '🔀',
  duplicate_or_near_duplicate:  '🔁',
  missing_documents:            '📎',
  unrealistic_claims:           '⚡',
  unclear_response:             '❓',
  strong_fit:                   '⭐',
  urgent:                       '🔔',
  critical_red_flag:            '🚨',
  language_quality_low:         '📝',
  ineligible:                   '🚫',
  conflict_of_interest:         '⚖️',
};

export function PriorityBadge({ priority, score }) {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100,
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {priority}
      {score !== undefined && <span style={{ fontWeight: 400, opacity: 0.7 }}> {score}</span>}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.normal;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 100,
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
      fontSize: 11, fontWeight: 600,
    }}>
      {severity}
    </span>
  );
}

export function FlagIcon({ code, explanation }) {
  const icon = FLAG_ICONS[code] || '🏷️';
  const label = code.replace(/_/g, ' ');
  return (
    <span
      title={explanation || label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        padding: '2px 8px', borderRadius: 100,
        background: '#F1F5F9', border: '1px solid #E2E8F0',
        fontSize: 11, color: '#475569', cursor: 'default',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

export function FlagList({ flags, max = 3 }) {
  if (!flags?.length) return null;
  const visible = flags.slice(0, max);
  const rest    = flags.length - max;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {visible.map((f, i) => {
        const code = typeof f === 'string' ? f : f.code;
        const expl = typeof f === 'string' ? '' : f.explanation;
        return <FlagIcon key={i} code={code} explanation={expl} />;
      })}
      {rest > 0 && (
        <span style={{ fontSize: 11, color: '#94A3B8', padding: '2px 6px' }}>+{rest}</span>
      )}
    </div>
  );
}

export function StatusDot({ status }) {
  const colors = {
    done:       '#22C55E',
    processing: '#F59E0B',
    pending:    '#94A3B8',
    failed:     '#EF4444',
  };
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: colors[status] || '#94A3B8',
      boxShadow: status === 'processing' ? `0 0 6px ${colors.processing}` : 'none',
    }} />
  );
}

export function AiLabel() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      color: '#7C3AED', background: '#F5F3FF',
      border: '1px solid #DDD6FE', borderRadius: 4,
      padding: '2px 6px',
    }}>
      AI
    </span>
  );
}

export function DemoModeBanner({ mode }) {
  if (mode !== 'demo') return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 8,
      background: '#FFFBEB', border: '1px solid #FDE68A',
      fontSize: 12, color: '#92400E',
    }}>
      <span>🧪</span>
      <span><strong>Demo AI mode</strong> — responses are deterministic mock data. Configure <code>LLM_PROVIDER=gemini</code> for live AI.</span>
    </div>
  );
}

export function AiDisclaimer() {
  return (
    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
      ✦ AI-generated suggestions. Please verify against the original submission.
      Final evaluation decisions are yours.
    </p>
  );
}
