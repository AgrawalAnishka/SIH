/**
 * useSahayak.js
 * Data-fetching hook for the Sahayak AI Engine.
 * Uses the same plain-fetch api.js pattern as the rest of the app.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';

// ── Config ─────────────────────────────────────────────────────────────────

export function useSahayakConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    api.aiConfig().then(setConfig).catch(() => {});
  }, []);
  return config;
}

// ── PS Overview ────────────────────────────────────────────────────────────

export function usePsOverview(psId) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const load = useCallback(() => {
    if (!psId) return;
    setLoading(true);
    api.aiPsOverview(psId)
      .then(d => { setData(d); setError(''); })
      .catch(e => setError(e.message || 'Failed to load overview'))
      .finally(() => setLoading(false));
  }, [psId]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refresh: load };
}

// ── PS Queue ───────────────────────────────────────────────────────────────

export function usePsQueue(psId, filters = {}) {
  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  const load = useCallback(() => {
    if (!psId) return;
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setLoading(true);
    api.aiPsQueue(psId, params.toString())
      .then(d => {
        setItems(d.results || []);
        setTotal(d.count || 0);
        setError('');
      })
      .catch(e => setError(e.message || 'Failed to load queue'))
      .finally(() => setLoading(false));
  }, [psId, JSON.stringify(filters)]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);
  return { items, total, loading, error, refresh: load };
}

// ── Submission Analysis ────────────────────────────────────────────────────

export function useAnalysis(appId) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const pollRef = useRef(null);

  const load = useCallback(() => {
    if (!appId) return;
    api.aiGetAnalysis(appId)
      .then(d => {
        setData(d);
        setError('');
        // Poll while processing
        if (d?.status === 'pending' || d?.status === 'processing') {
          pollRef.current = setTimeout(load, 3000);
        }
      })
      .catch(e => {
        if (e.message?.includes('404')) {
          // Not analysed yet — trigger analysis
          api.aiRunAnalysis(appId).catch(() => {});
          pollRef.current = setTimeout(load, 3000);
        } else {
          setError(e.message || 'Failed to load analysis');
        }
      })
      .finally(() => setLoading(false));
  }, [appId]);

  useEffect(() => {
    load();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [load]);

  const rerun = () => {
    setLoading(true);
    api.aiRunAnalysis(appId)
      .then(() => { setTimeout(load, 1500); })
      .catch(e => setError(e.message));
  };

  return { data, loading, error, refresh: load, rerun };
}

// ── Override ───────────────────────────────────────────────────────────────

export async function applyOverride(analysisId, field, newValue, reason = '') {
  return api.aiOverride(analysisId, { field, new_value: newValue, reason });
}

// ── Mark Reviewed ──────────────────────────────────────────────────────────

export async function markReviewed(analysisId) {
  return api.aiMarkReviewed(analysisId);
}
