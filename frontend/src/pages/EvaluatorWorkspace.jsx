/**
 * EvaluatorWorkspace.jsx
 * PS Review Workspace — the main Sahayak page for evaluators.
 * Route: /evaluate/ps/:psId
 *
 * Shows: AI overview, stats, clusters, priority queue.
 * Clicking a queue row navigates to /evaluate/:appId (existing ScoreApplication + AI panel).
 */
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain, RefreshCw, AlertTriangle, CheckCircle2, BarChart2,
  ChevronDown, ChevronUp, ArrowRight, Layers, Clock, Search,
} from 'lucide-react';
import { usePsOverview, usePsQueue } from '../features/ai-assist/useSahayak';
import {
  PriorityBadge, SeverityBadge, FlagList, StatusDot, AiLabel,
  DemoModeBanner, AiDisclaimer,
} from '../features/ai-assist/AiBadges';
import { api } from '../lib/api';

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent = '#4F46E5', icon: Icon }) {
  return (
    <div style={{
      padding: '16px 20px', borderRadius: 14,
      background: '#fff', border: '1px solid #E2E8F0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {Icon && <Icon size={16} color={accent} />}
        </div>
        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0B0F19',
        fontFamily: "'Space Grotesk', sans-serif" }}>{value ?? '—'}</div>
    </div>
  );
}

// ── Dist bar ──────────────────────────────────────────────────────────────────
function DistBar({ dist, colors }) {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (!total) return <span style={{ fontSize: 12, color: '#94A3B8' }}>No data</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Object.entries(dist).map(([key, count]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 80, fontSize: 11, color: '#64748B', textTransform: 'capitalize' }}>{key}</div>
          <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${(count / total) * 100}%`,
              background: colors?.[key] || '#4F46E5',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ width: 28, fontSize: 11, color: '#64748B', textAlign: 'right' }}>{count}</div>
        </div>
      ))}
    </div>
  );
}

// ── Cluster card ──────────────────────────────────────────────────────────────
function ClusterCard({ cluster, onFilter, active }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(79,70,229,0.12)' }}
      onClick={() => onFilter(cluster.id)}
      style={{
        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
        background: active ? 'rgba(79,70,229,0.06)' : '#fff',
        border: active ? '1px solid rgba(79,70,229,0.35)' : '1px solid #E2E8F0',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0B0F19', flex: 1 }}>{cluster.label}</span>
        <span style={{
          fontSize: 11, background: '#F1F5F9', border: '1px solid #E2E8F0',
          borderRadius: 100, padding: '2px 8px', color: '#475569', flexShrink: 0, marginLeft: 8,
        }}>{cluster.member_count} submissions</span>
      </div>
      {cluster.representative_summary && (
        <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
          {cluster.representative_summary.slice(0, 120)}…
        </p>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: '#7C3AED' }}>
        Avg priority: {Math.round(cluster.avg_priority_score)}/100
      </div>
    </motion.div>
  );
}

// ── Queue row ─────────────────────────────────────────────────────────────────
function QueueRow({ item, index, onClick }) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onClick(item.application_id)}
      style={{ cursor: 'pointer' }}
      whileHover={{ background: '#F8FAFC' }}
    >
      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot status={item.status} />
          <PriorityBadge priority={item.priority} score={item.priority_score} />
        </div>
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
        <SeverityBadge severity={item.severity} />
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle', maxWidth: 200 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0B0F19' }}>{item.startup_name}</div>
        <div style={{ fontSize: 11, color: '#94A3B8' }}>{item.app_status}</div>
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle', maxWidth: 280 }}>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' }}>
          {item.short_summary || '—'}
        </div>
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
        <span style={{ fontSize: 11, color: '#64748B' }}>{item.category || '—'}</span>
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
        <FlagList flags={item.flags} max={2} />
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
        {item.is_reviewed
          ? <CheckCircle2 size={16} color="#22C55E" />
          : <Clock size={16} color="#94A3B8" />}
      </td>
      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
        <ArrowRight size={15} color="#CBD5E1" />
      </td>
    </motion.tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EvaluatorWorkspace() {
  const { psId } = useParams();
  const navigate = useNavigate();

  const { data: overview, loading: ovLoading, error: ovError, refresh: ovRefresh } = usePsOverview(psId);

  const [filters, setFilters] = useState({});
  const [activeCluster, setActiveCluster] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [search, setSearch] = useState('');

  const { items, total, loading: qLoading, refresh: qRefresh } = usePsQueue(psId, filters);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await api.aiPsRegenerate(psId);
      setTimeout(() => { ovRefresh(); qRefresh(); setRegenerating(false); }, 2000);
    } catch { setRegenerating(false); }
  };

  const handleClusterFilter = (clusterId) => {
    if (activeCluster === clusterId) {
      setActiveCluster(null);
      setFilters(f => { const n = { ...f }; delete n.cluster; return n; });
    } else {
      setActiveCluster(clusterId);
      setFilters(f => ({ ...f, cluster: clusterId }));
    }
  };

  const insight  = overview?.insight;
  const stats    = insight?.stats || {};
  const clusters = overview?.clusters || [];

  // Filtered items by search
  const displayItems = search
    ? items.filter(i =>
        (i.startup_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.short_summary || '').toLowerCase().includes(search.toLowerCase())
      )
    : items;

  if (ovLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 300, color: '#94A3B8', fontSize: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <Brain size={32} color="#7C3AED" style={{ marginBottom: 12 }} />
        <div>Loading Sahayak AI workspace…</div>
      </div>
    </div>
  );

  if (ovError) return (
    <div style={{ padding: 32, color: '#EF4444', fontSize: 14 }}>
      <AlertTriangle size={20} style={{ marginRight: 8 }} />
      {ovError}
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 1200 }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 24, gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={20} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20,
                  fontWeight: 800, color: '#0B0F19', margin: 0 }}>
                  Sahayak AI Workspace
                </h1>
                <AiLabel />
              </div>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                {overview?.challenge_title || `Challenge #${psId}`}
              </p>
            </div>
          </div>
          {insight?.is_stale && (
            <div style={{ fontSize: 12, color: '#92400E', background: '#FFFBEB',
              border: '1px solid #FDE68A', borderRadius: 6, padding: '4px 10px',
              display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>⚠</span> Insight is stale — new submissions added
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              background: regenerating ? '#F1F5F9' : '#4F46E5',
              color: regenerating ? '#94A3B8' : '#fff',
              border: 'none', fontSize: 13, fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={14} style={{ animation: regenerating ? 'spin 1s linear infinite' : 'none' }} />
            {regenerating ? 'Regenerating…' : 'Regenerate Insight'}
          </button>
          <button
            onClick={() => navigate('/evaluate')}
            style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              background: '#fff', border: '1px solid #E2E8F0',
              color: '#475569', fontSize: 13,
            }}
          >
            ← All Challenges
          </button>
        </div>
      </div>

      {/* Demo mode banner */}
      {overview && <div style={{ marginBottom: 16 }}>
        <DemoModeBanner mode={insight ? 'live' : 'demo'} />
      </div>}

      {/* ── AI Overview panel ── */}
      {insight?.overall_summary && (
        <div style={{
          padding: '20px 24px', borderRadius: 16, marginBottom: 24,
          background: 'linear-gradient(135deg, #FAFAFA, #F5F3FF)',
          border: '1px solid #DDD6FE',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AiLabel />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4C1D95' }}>AI Overview</span>
            </div>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              {insight.generated_at
                ? new Date(insight.generated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : ''}
            </span>
          </div>
          <p style={{ fontSize: 14, color: '#1E1B4B', lineHeight: 1.7, margin: '0 0 8px' }}>
            {insight.overall_summary}
          </p>
          <AiDisclaimer />
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setShowStats(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none',
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            color: '#0B0F19', marginBottom: 12, padding: 0 }}
        >
          <BarChart2 size={15} color="#4F46E5" />
          Statistics
          {showStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                <StatCard label="Total Submissions" value={stats.total_applications} accent="#4F46E5" icon={Layers} />
                <StatCard label="Analysed" value={stats.analysed_count} accent="#7C3AED" icon={Brain} />
                <StatCard label="Reviewed" value={stats.reviewed_count} accent="#22C55E" icon={CheckCircle2} />
                <StatCard label="Needs Attention" value={stats.needs_attention_ids?.length || 0} accent="#EF4444" icon={AlertTriangle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {stats.priority_distribution && Object.keys(stats.priority_distribution).length > 0 && (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}>Priority Distribution</div>
                    <DistBar dist={stats.priority_distribution} colors={{
                      critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#22C55E'
                    }} />
                  </div>
                )}
                {stats.severity_distribution && Object.keys(stats.severity_distribution).length > 0 && (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}>Severity Distribution</div>
                    <DistBar dist={stats.severity_distribution} colors={{
                      critical: '#EF4444', concerning: '#F97316', normal: '#22C55E'
                    }} />
                  </div>
                )}
                {stats.category_distribution && Object.keys(stats.category_distribution).length > 0 && (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}>Category Distribution</div>
                    <DistBar dist={stats.category_distribution} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Clusters ── */}
      {clusters.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0B0F19', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={15} color="#4F46E5" />
            Submission Clusters
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>— click to filter queue</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {clusters.map(cl => (
              <ClusterCard
                key={cl.id}
                cluster={cl}
                onFilter={handleClusterFilter}
                active={activeCluster === cl.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Priority Queue ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
        overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

        {/* Queue toolbar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 200,
            background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 12px' }}>
            <Search size={13} color="#94A3B8" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by startup or summary…"
              style={{ border: 'none', background: 'transparent', outline: 'none',
                fontSize: 13, color: '#0B0F19', flex: 1 }}
            />
          </div>
          {['critical', 'high', 'medium', 'low'].map(p => (
            <button key={p} onClick={() => setFilters(f => ({ ...f, priority: f.priority === p ? undefined : p }))}
              style={{
                padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', textTransform: 'uppercase',
                background: filters.priority === p ? '#4F46E5' : '#F1F5F9',
                color: filters.priority === p ? '#fff' : '#475569',
                border: 'none', transition: 'all 0.12s',
              }}>
              {p}
            </button>
          ))}
          {(filters.priority || filters.severity || activeCluster) && (
            <button onClick={() => { setFilters({}); setActiveCluster(null); }}
              style={{ padding: '5px 12px', borderRadius: 100, fontSize: 11, cursor: 'pointer',
                background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              ✕ Clear
            </button>
          )}
          <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>
            {displayItems.length} of {total}
          </span>
        </div>

        {/* Table */}
        {qLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            Loading queue…
          </div>
        ) : displayItems.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <CheckCircle2 size={32} color="#22C55E" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0B0F19' }}>All caught up!</div>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>No submissions match the current filters.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Priority', 'Severity', 'Startup', 'Summary', 'Category', 'Flags', 'Reviewed', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11,
                      fontWeight: 700, color: '#64748B', letterSpacing: '0.06em',
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                      borderBottom: '1px solid #F1F5F9' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, i) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    index={i}
                    onClick={(appId) => navigate(`/evaluate/${appId}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending analyses notice */}
      {overview?.pending_analyses > 0 && (
        <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8,
          background: '#EFF6FF', border: '1px solid #BFDBFE',
          fontSize: 12, color: '#1D4ED8',
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={13} />
          {overview.pending_analyses} submission(s) still being analysed — queue will update automatically.
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
