import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, Lock, CheckCircle, ArrowLeft, ClipboardCheck } from 'lucide-react';
import { api } from '../lib/api';
import AiAnalysisPanel from '../features/ai-assist/AiAnalysisPanel';
import TierBadge from '../components/TierBadge';
import ProofOfDisclosure from '../components/ProofOfDisclosure';
import { useToast } from '../components/ui/toast';
import Reveal, { StaggerReveal } from '../components/Reveal';

const getCriteria = (round) => [
  { key: 'score_problem_solution_fit', label: 'Problem–Solution Fit',           desc: 'How well does the solution address the stated problem?' },
  { key: 'score_innovation',           label: 'Innovation & Uniqueness',         desc: 'Is the approach genuinely novel or a known solution?' },
  { key: 'score_feasibility',          label: round === 'round2_prototype' ? 'Execution Quality'         : 'Feasibility & Technical Readiness', desc: round === 'round2_prototype' ? 'How well was the prototype executed?' : 'Is the solution technically viable within constraints?' },
  { key: 'score_impact_sustainability',label: 'Impact & Sustainability',         desc: 'Does it scale? Can outcomes be sustained long-term?' },
  { key: 'score_presentation',         label: round === 'round2_prototype' ? 'Demo & Results'             : 'Presentation & Supporting Evidence', desc: round === 'round2_prototype' ? 'How compelling is the demo and measured results?' : 'Is the brief clear and evidence-backed?' },
];

const BAND_COLORS = { weak: '#EF4444', adequate: '#F59E0B', strong: '#10B981' };
const getBand = (v) => v <= 3 ? 'weak' : v <= 7 ? 'adequate' : 'strong';

function Slider({ criterion, value, onChange, disabled }) {
  const pct = (value / 10) * 100;
  const band = getBand(value);
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 16px', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0B0F19', marginBottom: 2 }}>{criterion.label}</div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{criterion.desc}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: BAND_COLORS[band], lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 10, color: BAND_COLORS[band], fontWeight: 700, textTransform: 'uppercase' }}>
            {band === 'weak' ? 'Weak' : band === 'adequate' ? 'Adequate' : 'Strong'}
          </div>
        </div>
      </div>
      {/* Custom track */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <div style={{ height: 6, borderRadius: 100, background: '#F1F5F9' }} />
        <motion.div
          style={{ position: 'absolute', top: 0, left: 0, height: 6, borderRadius: 100, background: `linear-gradient(90deg, ${BAND_COLORS[band]}, ${BAND_COLORS[band]}88)` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25 }}
        />
        <input type="range" min={0} max={10} step={1} value={value} onChange={e => onChange(Number(e.target.value))} disabled={disabled}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 6, opacity: 0, cursor: disabled ? 'not-allowed' : 'pointer' }} />
      </div>
      <div style={{ fontSize: 10, color: '#CBD5E1', textAlign: 'right' }}>0–3 Weak · 4–7 Adequate · 8–10 Strong</div>
    </div>
  );
}

export default function ScoreApplication() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coi, setCoi] = useState(false);
  const [round, setRound] = useState('round1_application');
  const [scores, setScores] = useState({
    score_problem_solution_fit: 5, score_innovation: 5,
    score_feasibility: 5, score_impact_sustainability: 5, score_presentation: 5,
  });
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getApplication(id).then(app => {
      setApplication(app);
      if (app.round) setRound(app.round);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const criteria = getCriteria(round);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const totalPct = (total / 50) * 100;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.createEvaluation({ application: id, round, ...scores, comments, conflict_of_interest: coi });
      toast({ title: 'Evaluation submitted!' });
      navigate('/evaluate');
    } catch (err) {
      let msg = 'Failed to submit';
      try { const p = JSON.parse(err.message); msg = p.detail || p.error || msg; } catch (_) { msg = err.message || msg; }
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const isRedacted = application && !['shortlisted','contracted'].includes(application.status);

  if (loading) return <div style={{ padding: 24, color: '#94A3B8', fontSize: 14 }}>Loading…</div>;
  if (!application) return <div style={{ padding: 24, color: '#94A3B8', fontSize: 14 }}>Application not found.</div>;

  return (
    <div style={{ fontFamily: "'Inter',sans-serif" }}>
      <motion.button onClick={() => navigate('/evaluate')} whileHover={{ x: -3 }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={16} /> Back to Reviews
      </motion.button>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* ── Left: context ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header */}
          <div style={{
            position: 'relative', overflow: 'hidden', borderRadius: 18,
            background: 'linear-gradient(135deg, #0D1117 0%, #0A0E1A 55%, #0C1020 100%)',
            border: '1px solid rgba(255,255,255,0.08)', padding: '22px 26px',
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(217,119,6,0.22) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(217,119,6,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardCheck size={18} color="#FCD34D" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>
                    {application.challenge_title}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{application.department_name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>{application.startup_name}</span>
                {application.startup_registration_status && <TierBadge registrationStatus={application.startup_registration_status} />}
              </div>
            </div>
          </div>

          {/* Solution brief */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', fontSize: 13, fontWeight: 700, color: '#0B0F19' }}>Solution Brief</div>
            <div style={{ padding: '16px 18px' }}>
              {isRedacted ? (
                <div style={{ position: 'relative' }}>
                  <div style={{ filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none', fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
                    {application.solution_brief}
                  </div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.75)' }}>
                    <Lock size={20} color="#94A3B8" />
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Unlocks once shortlisted</div>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.75, margin: 0 }}>{application.solution_brief}</p>
              )}
            </div>
          </div>

          <ProofOfDisclosure application={application} />
        </div>

        {/* ── Right: scoring panel ── */}
        <div style={{ width: 380, flexShrink: 0, position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Total score widget */}
          <motion.div
            style={{
              borderRadius: 16, padding: '20px 22px', overflow: 'hidden', position: 'relative',
              background: 'linear-gradient(135deg, #D97706, #F59E0B)',
              boxShadow: '0 8px 24px rgba(217,119,6,0.35)',
            }}
          >
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Total Score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <motion.div key={total}
                initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                {total}
              </motion.div>
              <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>/50</span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 5, background: 'rgba(255,255,255,0.25)', borderRadius: 100, marginTop: 12, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${totalPct}%` }} transition={{ duration: 0.5 }}
                style={{ height: '100%', background: '#fff', borderRadius: 100 }} />
            </div>
          </motion.div>

          {/* Round selector */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Round</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['round1_application','Round 1'],['round2_prototype','Round 2']].map(([v,l]) => (
                <motion.button key={v} onClick={() => setRound(v)} whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: round === v ? 'linear-gradient(135deg,#D97706,#F59E0B)' : '#F8FAFC',
                    color: round === v ? '#fff' : '#64748B',
                    boxShadow: round === v ? '0 3px 10px rgba(217,119,6,0.3)' : 'none',
                    transition: 'all 0.15s',
                  }}>
                  {l}
                </motion.button>
              ))}
            </div>
          </div>

          {/* COI toggle */}
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${coi ? '#FDE68A' : '#E2E8F0'}`, padding: '14px 16px', transition: 'border-color 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color={coi ? '#D97706' : '#CBD5E1'} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0B0F19' }}>Conflict of Interest</span>
              </div>
              <div onClick={() => setCoi(v => !v)} style={{ cursor: 'pointer', width: 42, height: 22, borderRadius: 100, background: coi ? '#F59E0B' : '#E2E8F0', position: 'relative', transition: 'background 0.2s' }}>
                <motion.div animate={{ x: coi ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
              </div>
            </div>
            {coi && <p style={{ fontSize: 12, color: '#D97706', margin: '8px 0 0' }}>Score will not be counted due to declared conflict of interest.</p>}
          </div>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: coi ? 0.4 : 1, pointerEvents: coi ? 'none' : 'auto' }}>
            {criteria.map(c => (
              <Slider key={c.key} criterion={c} value={scores[c.key]}
                onChange={v => setScores(p => ({ ...p, [c.key]: v }))} disabled={coi} />
            ))}
          </div>

          {/* Comments */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 16px' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Comments</label>
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} placeholder="Evaluation notes…" disabled={coi}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, color: '#0B0F19', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: "'Inter',sans-serif" }} />
          </div>

          {/* Submit */}
          <motion.button onClick={handleSubmit} disabled={coi || submitting}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(217,119,6,0.4)' }} whileTap={{ scale: 0.97 }}
            style={{
              padding: '14px', borderRadius: 12, border: 'none', cursor: coi || submitting ? 'not-allowed' : 'pointer',
              background: coi || submitting ? '#94A3B8' : 'linear-gradient(135deg,#D97706,#F59E0B)',
              color: '#fff', fontWeight: 700, fontSize: 15,
              boxShadow: coi || submitting ? 'none' : '0 4px 16px rgba(217,119,6,0.35)',
            }}>
            {submitting ? 'Submitting…' : 'Submit Evaluation'}
          </motion.button>
        </div>

        {/* ── Right: Sahayak AI Panel ── */}
        <div style={{ width: 340, flexShrink: 0, position: 'sticky', top: 24 }}>
          <AiAnalysisPanel
            appId={id}
            solutionBrief={application?.solution_brief}
          />
        </div>
      </div>
    </div>
  );
}
