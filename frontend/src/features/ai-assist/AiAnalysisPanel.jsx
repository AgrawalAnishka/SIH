/**
 * AiAnalysisPanel.jsx
 * AI side-panel shown inside the existing ScoreApplication page.
 * Shows: summary, key points, category, severity, priority, flags, cleaned response,
 *        override controls, mark-reviewed, and Improve Response.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain, ChevronDown, ChevronUp, RefreshCw,
  Check, X, Edit3, AlertTriangle, Sparkles,
} from 'lucide-react';
import {
  PriorityBadge, SeverityBadge, FlagList, StatusDot,
  AiLabel, AiDisclaimer,
} from './AiBadges';
import { useAnalysis, applyOverride, markReviewed } from './useSahayak';
import { api } from '../../lib/api';

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px 0', marginBottom: open ? 8 : 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B',
          letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</span>
        {open ? <ChevronUp size={13} color="#94A3B8" /> : <ChevronDown size={13} color="#94A3B8" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Override picker ───────────────────────────────────────────────────────────
function OverridePicker({ field, current, options, analysisId, onDone }) {
  const [value, setValue]   = useState(current);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (value === current) { onDone(); return; }
    setSaving(true);
    try {
      await applyOverride(analysisId, field, value, reason);
      onDone(value);
    } catch (e) {
      alert('Override failed: ' + e.message);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '10px 12px', background: '#F8FAFC',
      border: '1px solid #E2E8F0', borderRadius: 8, marginTop: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {options.map(opt => (
          <button key={opt} onClick={() => setValue(opt)}
            style={{
              padding: '4px 10px', borderRadius: 100, fontSize: 11, cursor: 'pointer',
              background: value === opt ? '#4F46E5' : '#fff',
              color: value === opt ? '#fff' : '#475569',
              border: `1px solid ${value === opt ? '#4F46E5' : '#E2E8F0'}`,
            }}>{opt}</button>
        ))}
      </div>
      <input
        placeholder="Reason (optional)"
        value={reason}
        onChange={e => setReason(e.target.value)}
        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 12,
          border: '1px solid #E2E8F0', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={save} disabled={saving}
          style={{ flex: 1, padding: '6px', borderRadius: 6, fontSize: 12,
            background: '#4F46E5', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save Override'}
        </button>
        <button onClick={() => onDone()}
          style={{ padding: '6px 10px', borderRadius: 6, fontSize: 12,
            background: '#fff', border: '1px solid #E2E8F0', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Rewrite panel ─────────────────────────────────────────────────────────────
function RewritePanel({ appId, originalText, onClose }) {
  const MODES = [
    { value: 'professional', label: 'Professional' },
    { value: 'concise',      label: 'Concise' },
    { value: 'formal',       label: 'Formal' },
    { value: 'simple',       label: 'Simple' },
    { value: 'structured',   label: 'Structured' },
  ];
  const [mode, setMode]         = useState('professional');
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [editedText, setEditedText] = useState('');
  const [decided, setDecided]   = useState(false);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await api.aiImprove(appId, mode);
      setResult(r);
      setEditedText(r.ai_text);
    } catch (e) {
      alert('Rewrite failed: ' + e.message);
    } finally { setLoading(false); }
  };

  const decide = async (action) => {
    if (!result) return;
    await api.aiRewriteDecision(result.id, action, editedText);
    setDecided(true);
  };

  return (
    <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 12,
      border: '1px solid #E2E8F0', marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} color="#7C3AED" />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95' }}>Improve Response</span>
          <AiLabel />
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
          <X size={14} />
        </button>
      </div>

      {/* Mode picker */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {MODES.map(m => (
          <button key={m.value} onClick={() => setMode(m.value)}
            style={{
              padding: '4px 10px', borderRadius: 100, fontSize: 11, cursor: 'pointer',
              background: mode === m.value ? '#7C3AED' : '#fff',
              color: mode === m.value ? '#fff' : '#475569',
              border: `1px solid ${mode === m.value ? '#7C3AED' : '#E2E8F0'}`,
            }}>{m.label}</button>
        ))}
        <button onClick={generate} disabled={loading}
          style={{
            marginLeft: 'auto', padding: '4px 14px', borderRadius: 100, fontSize: 11,
            fontWeight: 600, cursor: 'pointer',
            background: loading ? '#F1F5F9' : '#4F46E5',
            color: loading ? '#94A3B8' : '#fff', border: 'none',
          }}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
      </div>

      {decided && (
        <div style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: 8,
          fontSize: 12, color: '#15803D', marginBottom: 8 }}>
          ✓ Decision recorded
        </div>
      )}

      {result && !decided && (
        <>
          {/* Validation warnings */}
          {result.validation_warnings?.length > 0 && (
            <div style={{ padding: '8px 12px', background: '#FFFBEB', borderRadius: 8,
              border: '1px solid #FDE68A', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                ⚠ Fact-drift warnings
              </div>
              {result.validation_warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 11, color: '#92400E' }}>• {w}</div>
              ))}
            </div>
          )}

          {/* Side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Original</div>
              <div style={{ padding: '10px', background: '#fff', borderRadius: 8,
                border: '1px solid #E2E8F0', fontSize: 12, color: '#475569',
                lineHeight: 1.6, maxHeight: 200, overflowY: 'auto' }}>
                {originalText}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                AI Suggestion
              </div>
              <textarea
                value={editedText}
                onChange={e => setEditedText(e.target.value)}
                style={{ width: '100%', padding: '10px', background: '#fff', borderRadius: 8,
                  border: '1px solid #DDD6FE', fontSize: 12, color: '#1E1B4B',
                  lineHeight: 1.6, maxHeight: 200, overflowY: 'auto', resize: 'vertical',
                  outline: 'none', boxSizing: 'border-box', minHeight: 120 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => decide('accept')}
              style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: '#22C55E', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Check size={13} /> Accept
            </button>
            <button onClick={() => decide('edit')}
              style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: '#4F46E5', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Edit3 size={13} /> Save Edit
            </button>
            <button onClick={() => decide('reject')}
              style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: '#fff', color: '#DC2626', border: '1px solid #FECACA',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <X size={13} /> Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AiAnalysisPanel({ appId, solutionBrief }) {
  const { data: analysis, loading, error, rerun } = useAnalysis(appId);
  const [showOverride, setShowOverride]   = useState(null);
  const [showRewrite, setShowRewrite]     = useState(false);
  const [localData, setLocalData]         = useState(null);
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const [isReviewed, setIsReviewed]       = useState(false);

  const a = localData || analysis;

  const handleOverrideDone = (field, newVal) => {
    setShowOverride(null);
    if (newVal !== undefined && a) {
      setLocalData({ ...a, [field]: newVal });
    }
  };

  const handleMarkReviewed = async () => {
    if (!a?.id) return;
    setMarkingReviewed(true);
    try {
      await markReviewed(a.id);
      setIsReviewed(true);
    } catch (e) { alert('Failed: ' + e.message); }
    finally { setMarkingReviewed(false); }
  };

  if (loading && !a) return (
    <div style={{
      padding: '24px 20px', background: '#FAFAFA', borderRadius: 16,
      border: '1px solid #E2E8F0', textAlign: 'center',
    }}>
      <Brain size={24} color="#7C3AED" style={{ marginBottom: 8 }} />
      <div style={{ fontSize: 13, color: '#94A3B8' }}>Sahayak is analysing…</div>
    </div>
  );

  if (error) return (
    <div style={{
      padding: '16px 20px', background: '#FEF2F2', borderRadius: 12,
      border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <AlertTriangle size={16} color="#DC2626" />
      <span style={{ fontSize: 13, color: '#DC2626', flex: 1 }}>{error}</span>
      <button onClick={rerun} style={{ fontSize: 12, color: '#DC2626',
        background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
        Retry
      </button>
    </div>
  );

  if (!a) return null;

  const reviewedAlready = isReviewed || !!a.reviewed_by_username;

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
      padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
        justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={18} color="#7C3AED" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0B0F19' }}>Sahayak Analysis</span>
          <AiLabel />
          <StatusDot status={a.status} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={rerun} title="Re-analyse"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {a.status === 'failed' && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', borderRadius: 8,
          fontSize: 12, color: '#DC2626', marginBottom: 12 }}>
          Analysis failed: {a.error_message || 'Unknown error'}
          <button onClick={rerun} style={{ marginLeft: 8, textDecoration: 'underline',
            background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {/* Priority + Severity row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <PriorityBadge priority={a.priority} score={a.priority_score} />
        <SeverityBadge severity={a.severity} />
        {reviewedAlready && (
          <span style={{ fontSize: 11, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Check size={12} /> Reviewed{a.reviewed_by_username ? ` by ${a.reviewed_by_username}` : ''}
          </span>
        )}
      </div>

      {/* Override row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {['priority', 'severity', 'category'].map(f => (
          <button key={f} onClick={() => setShowOverride(showOverride === f ? null : f)}
            style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
              background: showOverride === f ? '#EDE9FE' : '#F1F5F9',
              color: showOverride === f ? '#7C3AED' : '#64748B',
              border: `1px solid ${showOverride === f ? '#C4B5FD' : '#E2E8F0'}`,
            }}>
            Override {f}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showOverride === 'priority' && (
          <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OverridePicker field="priority" current={a.priority} analysisId={a.id}
              options={['critical', 'high', 'medium', 'low']}
              onDone={(v) => handleOverrideDone('priority', v)} />
          </motion.div>
        )}
        {showOverride === 'severity' && (
          <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OverridePicker field="severity" current={a.severity} analysisId={a.id}
              options={['normal', 'concerning', 'critical']}
              onDone={(v) => handleOverrideDone('severity', v)} />
          </motion.div>
        )}
        {showOverride === 'category' && (
          <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OverridePicker field="category" current={a.category} analysisId={a.id}
              options={['Healthcare Technology', 'Agricultural Technology', 'Clean Technology',
                'Defence Technology', 'Financial Technology', 'Education Technology',
                'Infrastructure', 'Other']}
              onDone={(v) => handleOverrideDone('category', v)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      <Section title="Summary">
        <p style={{ fontSize: 13, color: '#0B0F19', lineHeight: 1.7, margin: 0 }}>
          {a.short_summary || '—'}
        </p>
      </Section>

      {/* Key Points */}
      {a.key_points?.length > 0 && (
        <Section title="Key Points">
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {a.key_points.map((p, i) => (
              <li key={i} style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: 4 }}>{p}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Main Issue */}
      {a.main_issue && (
        <Section title="Main Issue">
          <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, margin: 0,
            padding: '8px 12px', background: '#F8FAFC', borderRadius: 8,
            borderLeft: '3px solid #7C3AED' }}>
            {a.main_issue}
          </p>
        </Section>
      )}

      {/* Category + Priority reason */}
      <Section title="Category & Priority">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {a.category && (
            <div style={{ fontSize: 12, color: '#475569' }}>
              <span style={{ fontWeight: 600, color: '#0B0F19' }}>Category: </span>
              {a.category}
              {a.category_confidence ? ` (${Math.round(a.category_confidence * 100)}% confidence)` : ''}
            </div>
          )}
          {a.priority_reason && (
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5,
              padding: '8px 10px', background: '#F8FAFC', borderRadius: 8 }}>
              {a.priority_reason}
            </div>
          )}
        </div>
      </Section>

      {/* Flags */}
      {a.flags?.length > 0 && (
        <Section title="Flags">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {a.flags.map((f, i) => {
              const code = typeof f === 'string' ? f : f.code;
              const expl = typeof f === 'string' ? '' : f.explanation;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                  <span style={{ fontSize: 13 }}>
                    {code === 'critical_red_flag' ? '🚨' : code === 'strong_fit' ? '⭐' :
                     code === 'ineligible' ? '🚫' : code === 'urgent' ? '🔔' : '🏷'}
                  </span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0B0F19',
                      textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {code.replace(/_/g, ' ')}
                    </div>
                    {expl && <div style={{ fontSize: 11, color: '#64748B' }}>{expl}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Cleaned response */}
      {a.cleaned_response && a.cleaned_response !== (solutionBrief || '') && (
        <Section title="AI Cleaned Response" defaultOpen={false}>
          <div style={{ padding: '10px 12px', background: '#F5F3FF', borderRadius: 8,
            border: '1px solid #DDD6FE', fontSize: 12, color: '#1E1B4B', lineHeight: 1.7 }}>
            {a.cleaned_response}
          </div>
        </Section>
      )}

      {/* Override history */}
      {a.overrides?.length > 0 && (
        <Section title="Override History" defaultOpen={false}>
          {a.overrides.map((o, i) => (
            <div key={i} style={{ fontSize: 11, color: '#64748B', padding: '4px 0',
              borderBottom: i < a.overrides.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <span style={{ fontWeight: 600, color: '#0B0F19' }}>{o.evaluator_username}</span>
              {' changed '}<span style={{ fontWeight: 600 }}>{o.field}</span>
              {' from '}<span style={{ color: '#DC2626' }}>{JSON.stringify(o.ai_value)}</span>
              {' to '}<span style={{ color: '#22C55E' }}>{JSON.stringify(o.new_value)}</span>
              {o.reason && <span style={{ color: '#94A3B8' }}> — {o.reason}</span>}
            </div>
          ))}
        </Section>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          onClick={handleMarkReviewed}
          disabled={reviewedAlready || markingReviewed}
          style={{
            flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: reviewedAlready ? 'default' : 'pointer',
            background: reviewedAlready ? '#F0FDF4' : '#22C55E',
            color: reviewedAlready ? '#15803D' : '#fff',
            border: reviewedAlready ? '1px solid #BBF7D0' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <Check size={13} />
          {reviewedAlready ? 'Reviewed' : markingReviewed ? 'Marking…' : 'Mark Reviewed'}
        </button>
        <button
          onClick={() => setShowRewrite(v => !v)}
          style={{
            flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
            background: showRewrite ? '#EDE9FE' : '#fff',
            color: showRewrite ? '#7C3AED' : '#4F46E5',
            border: `1px solid ${showRewrite ? '#C4B5FD' : '#C7D2FE'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
        >
          <Sparkles size={13} />
          Improve Response
        </button>
      </div>

      {/* Rewrite panel */}
      <AnimatePresence>
        {showRewrite && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}>
            <RewritePanel appId={appId} originalText={solutionBrief} onClose={() => setShowRewrite(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: 14 }}>
        <AiDisclaimer />
      </div>
    </div>
  );
}
