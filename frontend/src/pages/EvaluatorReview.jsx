import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'motion/react';
import { ClipboardCheck, Clock, CheckCircle, AlertCircle, ArrowRight, Star, Brain } from 'lucide-react';
import { api } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import Reveal, { StaggerReveal } from '../components/Reveal';

function Stat({ icon: Icon, value, label, accent }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5 }}
      style={{
        borderRadius: 16, padding: '20px', background: '#fff',
        border: `1px solid ${accent}22`,
        boxShadow: `0 4px 20px ${accent}12`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon size={20} color={accent} />
      </div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 36, fontWeight: 800, color: '#0B0F19', lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: '#64748B' }}>{label}</div>
      <motion.div
        initial={{ scaleX: 0 }} animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${accent}, ${accent}44)`, transformOrigin: 'left' }}
      />
    </motion.div>
  );
}

export default function EvaluatorReview() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getApplications().then(d => {
      setApplications(Array.isArray(d) ? d : d?.results ?? []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const pending   = applications.filter(a => a.status === 'under_evaluation');
  const shortlist = applications.filter(a => a.status === 'shortlisted');
  const rejected  = applications.filter(a => a.status === 'rejected');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94A3B8', fontSize: 14 }}>
      Loading…
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{
          position: 'relative', overflow: 'hidden', borderRadius: 20, marginBottom: 28,
          background: 'linear-gradient(135deg, #0D1117 0%, #0A0E1A 55%, #0C1020 100%)',
          border: '1px solid rgba(255,255,255,0.08)', padding: '28px 32px',
        }}
      >
        <motion.div animate={{ x: [0,18,0], y: [0,-12,0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: -50, right: -50, width: 240, height: 240, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(217,119,6,0.22) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(217,119,6,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(217,119,6,0.3)' }}>
              <ClipboardCheck size={22} color="#FCD34D" />
            </div>
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>
                Assessment Hub
              </h1>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                Review and score startup applications
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <StaggerReveal stagger={0.09} direction="up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        <Stat icon={Clock}        value={pending.length}   label="Pending Review"  accent="#D97706" />
        <Stat icon={CheckCircle}  value={shortlist.length} label="Shortlisted"     accent="#10B981" />
        <Stat icon={AlertCircle}  value={rejected.length}  label="Not Selected"   accent="#EF4444" />
      </StaggerReveal>

      {/* Applications list */}
      <Reveal direction="up" delay={0.2}>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={16} color="#D97706" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0B0F19' }}>Applications for Review</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8', background: '#F8FAFC',
            border: '1px solid #E2E8F0', borderRadius: 100, padding: '2px 10px' }}>
            {pending.length} pending
          </span>
        </div>

        {pending.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <CheckCircle size={26} color="#10B981" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0B0F19', marginBottom: 4 }}>All caught up!</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>No applications pending review.</div>
          </div>
        ) : (
          pending.map((app, i) => (
            <motion.div key={app.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              onClick={() => navigate(`/evaluate/${app.id}`)}
              whileHover={{ background: '#F8FAFC' }}
              style={{
                display: 'flex', alignItems: 'center', padding: '16px 20px',
                borderBottom: i < pending.length - 1 ? '1px solid #F1F5F9' : 'none',
                cursor: 'pointer', transition: 'background 0.12s',
              }}
            >
              {/* Score indicator */}
              <div style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 }}>
                <ClipboardCheck size={19} color="#D97706" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0B0F19', marginBottom: 3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {app.challenge_title || `Application #${app.id}`}
                </div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  {app.startup_name || `Startup #${app.startup}`}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <StatusBadge status={app.status} />
                <div style={{ fontSize: 12, color: '#94A3B8' }}>
                  {new Date(app.created_at || app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
                <ArrowRight size={16} color="#CBD5E1" />
              </div>
            </motion.div>
          ))
        )}
      </div>
      </Reveal>

      {/* ── Sahayak AI Workspace CTA ── */}
      <Reveal direction="up" delay={0.3}>
        <div style={{
          marginTop: 20, padding: '20px 24px', borderRadius: 16,
          background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
          border: '1px solid #DDD6FE',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#4C1D95' }}>Sahayak AI Workspace</div>
              <div style={{ fontSize: 12, color: '#6D28D9' }}>
                AI priority queue, clusters, and insights for each challenge
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Show workspace button for each unique challenge */}
            {[...new Map(applications.map(a => [a.challenge, a])).values()]
              .slice(0, 4)
              .map(app => (
                <motion.button
                  key={app.challenge}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/evaluate/ps/${app.challenge}`)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    background: '#7C3AED', color: '#fff',
                    border: 'none', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Brain size={13} />
                  {app.challenge_title
                    ? app.challenge_title.slice(0, 28) + (app.challenge_title.length > 28 ? '…' : '')
                    : `Challenge #${app.challenge}`}
                </motion.button>
              ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
