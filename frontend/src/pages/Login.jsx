import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Target, TrendingUp, Rocket, ChevronDown, Building2, Zap, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/ui/toast';
import { NumberTicker } from '../components/NumberTicker';
import { ShimmerButton } from '../components/ShimmerButton';
import GoogleAuthButton from '../components/GoogleAuthButton';

const DEMO = [
  { role: 'startup',    username: 'meditriage-ai' },
  { role: 'startup',    username: 'agrosense-labs' },
  { role: 'startup',    username: 'securegrid-systems' },
  { role: 'startup',    username: 'ruralpay-connect' },
  { role: 'startup',    username: 'cleanair-sensors' },
  { role: 'startup',    username: 'diagnoai' },
  { role: 'startup',    username: 'dronewatch-defence' },
  { role: 'startup',    username: 'watergrid-analytics' },
  { role: 'startup',    username: 'greenbridge-robotics' },
  { role: 'startup',    username: 'neuropath-diagnostics' },
  { role: 'department', username: 'health.dept' },
  { role: 'department', username: 'defence.dept' },
  { role: 'department', username: 'niti.dept' },
  { role: 'evaluator',  username: 'evaluator1' },
  { role: 'evaluator',  username: 'evaluator2' },
  { role: 'admin',      username: 'admin' },
];

const ROLE_DOT = { startup: '#4F46E5', department: '#0F766E', evaluator: '#F59E0B', admin: '#71717A' };

export default function Login() {
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [tab,      setTab]      = useState('login');   // 'login' | 'create'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [stats,    setStats]    = useState({ challenges: 0, startups: 0, pilots: 0 });

  useEffect(() => {
    api.getPublicStats()
      .then(d => setStats({ challenges: d.open_challenges ?? 0, startups: d.startups ?? 0, pilots: d.pilots_scaled ?? 0 }))
      .catch(() => {});
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loginRes = await api.login(username, password);
      const meRes    = await api.me();
      const userData = { ...loginRes, name: meRes.name, sector_tags: meRes.sector_tags,
        registration_status: meRes.registration_status, ministry: meRes.ministry,
        startup_id: meRes.startup_id };
      localStorage.setItem('user', JSON.stringify(userData));
      const routes = { department: '/challenges', startup: '/dashboard', evaluator: '/evaluate', admin: '/audit' };
      navigate(routes[userData.role] ?? '/');
    } catch (err) {
      let msg = 'Invalid username or password';
      try { const p = JSON.parse(err.message); msg = p.detail || p.error || msg; } catch (_) { if (!err.message?.startsWith('{')) msg = err.message || msg; }
      toast({ title: 'Login failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (u) => { setUsername(u); setPassword('demo1234'); setTab('login'); };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Left — dark hero ── */}
      <div className="relative flex-1 flex flex-col justify-between overflow-hidden bg-[#0A0E17] px-10 py-12 min-h-[320px] md:min-h-screen">
        <motion.div aria-hidden className="absolute inset-0 pointer-events-none"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 18, repeat: Infinity, repeatType: 'mirror', ease: 'linear' }}
          style={{
            backgroundImage: `radial-gradient(circle at 15% 20%, rgba(255,153,51,0.22) 0%, transparent 45%),
              radial-gradient(circle at 82% 75%, rgba(19,136,8,0.20) 0%, transparent 45%),
              radial-gradient(circle at 50% 50%, rgba(0,0,128,0.18) 0%, transparent 55%)`,
            backgroundSize: '200% 200%',
          }}
        />

        {/* Logo + back to home */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full shadow-lg" style={{
              background: 'conic-gradient(from 0deg, #FF9933 0deg 120deg, #ffffff 120deg 240deg, #138808 240deg 360deg)',
              boxShadow: '0 0 12px rgba(255,153,51,0.5)',
            }} />
            <span className="font-space-grotesk text-xl font-bold text-white tracking-tight">GovLaunch</span>
          </div>
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ x: -3 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '6px 12px', color: '#94A3B8',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Home
          </motion.button>
        </div>

        {/* Headline */}
        <div className="relative z-10 mt-auto mb-auto py-10 max-w-md">
          <h1 className="font-space-grotesk text-4xl font-bold text-white leading-[1.15] mb-4">
            Merit gets you evaluated.{' '}
            <span style={{ background: 'linear-gradient(90deg,#FF9933,#138808)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Registration gets you paid.
            </span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            One platform. Two sides. Every application timestamped, every view logged, every contract auto-drafted.
          </p>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4 mt-auto">
          {[
            { icon: Target,     value: stats.challenges, label: 'Open Challenges' },
            { icon: Rocket,     value: stats.startups,   label: 'Startups' },
            { icon: TrendingUp, value: stats.pilots,     label: 'Pilots Scaled' },
          ].map(s => (
            <div key={s.label} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <s.icon size={13} style={{ color: '#FF9933' }} />
                <span className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</span>
              </div>
              <div className="text-2xl font-space-grotesk font-bold text-white">
                <NumberTicker value={s.value} className="text-2xl font-space-grotesk font-bold text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right — glass card ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] px-6 py-12">
        <div className="w-full max-w-sm space-y-4">

          {/* Card */}
          <div className="relative bg-white rounded-2xl shadow-xl p-8 border border-slate-200/80">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                 style={{ background: 'linear-gradient(90deg,#FF9933 0%,#000080 50%,#138808 100%)' }} />

            {/* Tab header */}
            <div className="flex border-b border-slate-200 mb-6">
              {['login', 'create'].map(t => (
                <button key={t} type="button" onClick={() => setTab(t)}
                  className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                    tab === t ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  style={{ marginBottom: -1 }}
                >
                  {t === 'login' ? 'Log In' : 'Create Account'}
                </button>
              ))}
            </div>

            {tab === 'login' && (
              <>
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-0.5">Welcome back</p>
                  <h2 className="text-2xl font-bold text-slate-900">Log in to GovLaunch</h2>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. meditriage-ai" required
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9933] focus:border-[#FF9933] transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9933] focus:border-[#FF9933] transition" />
                  </div>
                  <ShimmerButton type="submit" disabled={loading}
                    background="rgba(15,12,30,1)" shimmerColor="#FF9933"
                    shimmerDuration="2.5s" borderRadius="10px"
                    className="w-full h-11 text-sm font-semibold text-white mt-1">
                    {loading ? 'Logging in…' : 'Log In'}
                  </ShimmerButton>
                </form>
                {/* Google OAuth — role inferred at login time from existing account */}
                <GoogleAuthButton role="startup" />
                <GoogleAuthButton role="department" />
                {/* Trust line */}
                <p className="text-xs text-center text-slate-400 mt-4">
                  DPIIT registration not required to apply — compete on merit first.
                </p>
              </>
            )}

            {tab === 'create' && (
              <div className="space-y-3">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Join GovLaunch</h2>
                <button onClick={() => navigate('/signup/startup')}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-xl border-2 border-[#4F46E5]/30 bg-[#4F46E5]/5 hover:bg-[#4F46E5]/10 transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#4F46E5] flex items-center justify-center">
                      <Rocket size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-slate-900">I'm a Startup</div>
                      <div className="text-xs text-slate-500">Apply to government challenges</div>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-[#4F46E5]" />
                </button>
                {/* Google sign-up for startups */}
                <GoogleAuthButton role="startup" />
                <button onClick={() => navigate('/signup/department')}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-xl border-2 border-[#0F766E]/30 bg-[#0F766E]/5 hover:bg-[#0F766E]/10 transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0F766E] flex items-center justify-center">
                      <Building2 size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-slate-900">I'm a Government Department</div>
                      <div className="text-xs text-slate-500">Post challenges and find solutions</div>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-[#0F766E]" />
                </button>
                {/* Google sign-up for departments — requires .gov.in / .nic.in email */}
                <GoogleAuthButton role="department" />
                {/* Trust line */}
                <p className="text-xs text-center text-slate-400 mt-2">
                  Authorized government department access only.
                </p>
              </div>
            )}
          </div>

          {/* Demo accounts accordion */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <button type="button" onClick={() => setDemoOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              <span>Demo Accounts</span>
              <motion.span animate={{ rotate: demoOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} className="text-slate-400" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {demoOpen && (
                <motion.div key="demo"
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden">
                  <div className="px-5 pb-4 pt-1 max-h-64 overflow-y-auto space-y-0.5">
                    {['startup','department','evaluator','admin'].map(group => (
                      <div key={group} className="mb-3">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">
                          {group === 'department' ? 'Government' : group}
                        </div>
                        {DEMO.filter(d => d.role === group).map(d => (
                          <button key={d.username} type="button" onClick={() => fillDemo(d.username)}
                            className="flex items-center gap-2.5 w-full py-1.5 px-2 rounded-lg hover:bg-slate-50 transition text-left group">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ROLE_DOT[d.role] }} />
                            <span className="text-xs font-mono text-slate-800 group-hover:text-slate-900">{d.username}</span>
                            <span className="text-xs font-mono text-slate-400 ml-auto">demo1234</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
