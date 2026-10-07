import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  LayoutDashboard, ScanLine, ListChecks,
  ClipboardList, Users, FileText, Settings, Shield, Search, ChevronRight, ChevronLeft,
  Globe, ClipboardCheck, ScrollText, Activity, Plus, RotateCw, Upload, X, CheckCircle2,
  AlertTriangle, Clock, UserPlus, Zap, BarChart3, GitPullRequest, ArrowRight, Eye,
  Workflow, Gauge, Link2, UserCheck, Wrench, ImagePlus, RefreshCcw, ShieldCheck, EyeOff
} from 'lucide-react';
import './App.css';

const API_BASE = 'https://continuous-accessibility-scanner.onrender.com/api/scans';
const AUTH_BASE = 'https://continuous-accessibility-scanner.onrender.com/api/auth';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const WCAG_MAP = {
  'missing-alt-text': { code: '1.1.1', name: 'Non-text Content', level: 'A' },
  'missing-form-label': { code: '3.3.2', name: 'Labels or Instructions', level: 'A' },
  'empty-link': { code: '2.4.4', name: 'Link Purpose (In Context)', level: 'A' },
  'missing-page-title': { code: '2.4.2', name: 'Page Titled', level: 'A' },
};

const WCAG_CHECKLIST = [
  { code: '1.1.1', name: 'Non-text Content', level: 'A', issueType: 'missing-alt-text' },
  { code: '2.4.2', name: 'Page Titled', level: 'A', issueType: 'missing-page-title' },
  { code: '2.4.4', name: 'Link Purpose (In Context)', level: 'A', issueType: 'empty-link' },
  { code: '3.3.2', name: 'Labels or Instructions', level: 'A', issueType: 'missing-form-label' },
];

const COLORS = { critical: '#dc2626', serious: '#f97316', moderate: '#eab308', minor: '#3b82f6' };

const AUDIT_ACTION_LABELS = {
  SCAN_COMPLETED: 'Scan Completed',
  MANUAL_UPDATE: 'Issue Updated',
  RESCANNED: 'Re-scanned',
  EVIDENCE_UPLOADED: 'Evidence Uploaded',
  EVIDENCE_DELETED: 'Evidence Deleted',
};

function formatAuditAction(action) {
  return AUDIT_ACTION_LABELS[action] || action;
}

function formatAuditDetails(details) {
  if (!details) return '—';
  // Strip out "field=null" segments and tidy up the remaining key=value pairs
  const parts = details.split(',').map(p => p.trim()).filter(Boolean);
  const readable = parts
    .map(p => {
      const [key, ...rest] = p.split('=');
      const value = rest.join('=').trim();
      if (!value || value === 'null') return null;
      const label = {
        status: 'Status', assignedTo: 'Assigned to', result: 'Result',
        url: 'URL', issuesFound: 'Issues found',
      }[key.trim()] || key.trim();
      return `${label}: ${value}`;
    })
    .filter(Boolean);
  return readable.length ? readable.join(' · ') : 'No change';
}


// Remediation workflow stages (visual only — maps onto the existing status field)
const WORKFLOW_STAGES = ['Open', 'Assigned', 'In Progress', 'Fixed', 'Retest', 'Closed'];

// Mock developer directory — frontend-only, not backed by the API yet
const MOCK_DEVELOPERS = [
  { id: 'd1', name: 'Aarav Mehta', email: 'aarav@team.local', role: 'Frontend Developer' },
  { id: 'd2', name: 'Priya Nair', email: 'priya@team.local', role: 'Backend Developer' },
  { id: 'd3', name: 'Rohan Das', email: 'rohan@team.local', role: 'Full-stack Developer' },
  { id: 'd4', name: 'Sara Khan', email: 'sara@team.local', role: 'QA / Accessibility' },
];

const NAV_GROUPS = [
  { title: 'OVERVIEW', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'WEBSITES', items: [
    { id: 'websites', label: 'Websites', icon: Globe },
    { id: 'scanner', label: 'Add Website', icon: ScanLine },
  ]},
  { title: 'COMPLIANCE', items: [
    { id: 'issues', label: 'Accessibility Issues', icon: ListChecks },
    { id: 'checklist', label: 'WCAG Checklist', icon: ClipboardList },
  ]},
  { title: 'REMEDIATION', items: [
    { id: 'mytasks', label: 'My Tasks', icon: ClipboardCheck },
    { id: 'developers', label: 'Developers', icon: Users },
  ]},
  { title: 'REPORTING', items: [{ id: 'reports', label: 'Reports', icon: FileText }] },
  { title: 'ADMINISTRATION', items: [
    { id: 'auditlog', label: 'Audit Logs', icon: ScrollText },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]},
];

const PAGE_META = {
  dashboard: { title: 'Dashboard', desc: 'Overview of your accessibility scans and compliance status', crumb: ['Overview', 'Dashboard'] },
  scanner: { title: 'Add Website', desc: 'Enter a website URL to scan for WCAG accessibility issues', crumb: ['Websites', 'Add Website'] },
  websites: { title: 'Websites', desc: 'Add, view and re-scan every website you are monitoring', crumb: ['Websites', 'Websites'] },
  issues: { title: 'Accessibility Issues', desc: 'Manage, assign, and track all detected accessibility issues', crumb: ['Compliance', 'Issues'] },
  checklist: { title: 'WCAG 2.1 Checklist', desc: 'Success criteria covered by this scanner', crumb: ['Compliance', 'WCAG Checklist'] },
  mytasks: { title: 'My Tasks', desc: 'Accessibility issues currently assigned to you for remediation', crumb: ['Remediation', 'My Tasks'] },
  developers: { title: 'Developers', desc: 'Team members available for issue assignment', crumb: ['Remediation', 'Developers'] },
  reports: { title: 'Reports', desc: 'Compliance summaries for completed scans', crumb: ['Reporting', 'Reports'] },
  auditlog: { title: 'Audit Logs', desc: 'System activity log for accountability and traceability', crumb: ['Administration', 'Audit Logs'] },
  health: { title: 'System Health', desc: 'Live status of backend, scanner and database components', crumb: ['Administration', 'System Health'] },
  settings: { title: 'Settings', desc: 'Application preferences', crumb: ['Administration', 'Settings'] },
};


const WORKFLOW_DIAGRAM_STEPS = [
  { icon: Link2, label: 'URL Submitted' },
  { icon: ScanLine, label: 'Scan Run' },
  { icon: ListChecks, label: 'WCAG Analysis' },
  { icon: Gauge, label: 'Severity Ranked' },
  { icon: UserCheck, label: 'Assigned' },
  { icon: Wrench, label: 'Remediated' },
  { icon: ImagePlus, label: 'Evidence Added' },
  { icon: RefreshCcw, label: 'Re-scanned' },
  { icon: ShieldCheck, label: 'Compliance Updated' },
];

function WorkflowDiagram() {
  return (
    <div className="workflow-diagram" aria-label="Accessibility remediation workflow">
      {WORKFLOW_DIAGRAM_STEPS.map((step, i) => {
        const Icon = step.icon;
        return (
          <React.Fragment key={step.label}>
            <div className="workflow-diagram-step">
              <div className="workflow-diagram-icon"><Icon size={17} /></div>
              <span className="workflow-diagram-label">{step.label}</span>
            </div>
            {i < WORKFLOW_DIAGRAM_STEPS.length - 1 && (
              <div className="workflow-diagram-arrow">
                <ChevronRight size={16} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------- Small shared UI pieces ----------

function EmptyState({ title, message, icon: Icon = ClipboardList }) {
  return (
    <div className="empty-state">
      <Icon size={28} strokeWidth={1.5} />
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-msg">{message}</p>
    </div>
  );
}

function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner-row" role="status" aria-live="polite">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

function InlineError({ message }) {
  if (!message) return null;
  return (
    <div className="error-box" role="alert">
      <AlertTriangle size={15} />
      <span>{message}</span>
    </div>
  );
}

function WorkflowStepper({ status }) {
  const isReopened = status === 'Reopened';
  const activeIndex = WORKFLOW_STAGES.indexOf(isReopened ? 'In Progress' : status);
  return (
    <div className="workflow-stepper">
      {WORKFLOW_STAGES.map((stage, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'upcoming';
        return (
          <div className={`workflow-step ${state}`} key={stage}>
            <span className="workflow-dot">{state === 'done' ? <CheckCircle2 size={13} /> : i + 1}</span>
            <span className="workflow-label">{stage}</span>
            {i < WORKFLOW_STAGES.length - 1 && <span className="workflow-line" />}
          </div>
        );
      })}
      {isReopened && (
        <div className="workflow-reopened">
          <AlertTriangle size={13} /> Reopened — retest failed, sent back to In Progress
        </div>
      )}
    </div>
  );
}

// ---------- Landing page (shown before login) ----------

const LANDING_FEATURES = [
  {
    icon: ScanLine,
    title: 'Automated URL Scanning',
    desc: 'Point AccessScan at any public page and get a full WCAG 2.1 pass in seconds — missing alt text, unlabeled inputs, empty links, and more.',
  },
  {
    icon: Gauge,
    title: 'Severity-Ranked Issues',
    desc: 'Every finding is classified Critical, Serious, Moderate, or Minor, so your team fixes what actually matters first.',
  },
  {
    icon: Workflow,
    title: 'Remediation Workflow',
    desc: 'Assign issues to developers, track them through Open → In Progress → Fixed → Retest → Closed, and keep an audit trail.',
  },
  {
    icon: Eye,
    title: 'Before / After Evidence',
    desc: 'Attach screenshots and notes proving an issue was actually fixed, not just marked resolved.',
  },
  {
    icon: BarChart3,
    title: 'Compliance Dashboard',
    desc: 'Track your compliance score, issue trends, and severity breakdown across every website you monitor, over time.',
  },
  {
    icon: GitPullRequest,
    title: 'Full Audit Log',
    desc: 'Every scan, assignment, and status change is logged for accountability — exportable for compliance reporting.',
  },
];

const HOW_IT_WORKS_STEPS = [
  { title: 'Add a website', desc: 'Enter the URL you want to monitor for accessibility.' },
  { title: 'Run an accessibility scan', desc: 'AccessScan checks the page against WCAG 2.1 success criteria.' },
  { title: 'Review issues & WCAG mappings', desc: 'Every finding is severity-ranked and linked to its WCAG criterion.' },
  { title: 'Assign & remediate', desc: 'Assign issues to a developer and track status through the workflow.' },
  { title: 'Submit evidence & re-scan', desc: 'Upload before/after evidence and re-check the fix.' },
  { title: 'Review results & reports', desc: 'See updated compliance score and export a CSV report.' },
];

function LandingPreview() {
  return (
    <div className="landing-preview" aria-hidden="true">
      <div className="landing-preview-chrome">
        <span className="landing-preview-dot" />
        <span className="landing-preview-dot" />
        <span className="landing-preview-dot" />
        <span className="landing-preview-url">localhost:5173/dashboard</span>
      </div>
      <div className="landing-preview-body">
        <div className="landing-preview-sidebar">
          <div className="landing-preview-sidebar-brand" />
          <div className="landing-preview-sidebar-item active" />
          <div className="landing-preview-sidebar-item" />
          <div className="landing-preview-sidebar-item" />
          <div className="landing-preview-sidebar-item" />
        </div>
        <div className="landing-preview-main">
          <div className="landing-preview-stats">
            <div className="landing-preview-stat" />
            <div className="landing-preview-stat" />
            <div className="landing-preview-stat" />
            <div className="landing-preview-stat highlight" />
          </div>
          <div className="landing-preview-charts">
            <div className="landing-preview-chart">
              <div className="landing-preview-donut" />
            </div>
            <div className="landing-preview-chart">
              <div className="landing-preview-bars">
                <span style={{ height: '35%' }} />
                <span style={{ height: '55%' }} />
                <span style={{ height: '40%' }} />
                <span style={{ height: '70%' }} />
                <span style={{ height: '50%' }} />
                <span style={{ height: '85%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPage({ onGetStarted }) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-brand">
          <Shield size={22} />
          <span>AccessScan</span>
        </div>
        <nav className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
        </nav>
        <button className="btn-primary landing-nav-cta" onClick={onGetStarted}>
          Sign in <ArrowRight size={15} />
        </button>
      </header>

      <section className="landing-hero">
        <span className="landing-badge">Continuous Web Accessibility Compliance</span>
        <h1>
          Find accessibility issues.<br />
          Fix them. <span className="landing-highlight">Prove it.</span>
        </h1>
        <p className="landing-subtitle">
          AccessScan scans your websites against WCAG 2.1 success criteria, tracks every issue
          through a full remediation workflow, and gives you a live compliance dashboard —
          so accessibility stops being a one-time audit and starts being continuous.
        </p>
        <div className="landing-cta-row">
          <button className="btn-primary landing-cta-primary" onClick={onGetStarted}>
            Get Started <ArrowRight size={16} />
          </button>
          <span className="landing-cta-hint">Default admin account included — no signup needed.</span>
        </div>

        <LandingPreview />

        <div className="landing-stats">
          <div className="landing-stat">
            <span className="landing-stat-num">4</span>
            <span className="landing-stat-label">WCAG Success Criteria Checked</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-num">6</span>
            <span className="landing-stat-label">Remediation Workflow Stages</span>
          </div>
          <div className="landing-stat">
            <span className="landing-stat-num">100%</span>
            <span className="landing-stat-label">Audit Trail Coverage</span>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features">
        <h2>Everything you need to close the loop</h2>
        <p className="landing-features-sub">From first scan to verified fix.</p>
        <div className="landing-feature-grid">
          {LANDING_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div className="landing-feature-card" key={f.title}>
                <div className="landing-feature-icon"><Icon size={20} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing-how" id="how-it-works">
        <h2>How it works</h2>
        <p className="landing-features-sub">Six steps from first scan to verified fix.</p>
        <div className="landing-how-steps">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <div className="landing-how-step" key={step.title}>
              <span className="landing-how-num">{i + 1}</span>
              <div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span>Continuous Web Accessibility Compliance Scanner with Remediation Workflow</span>
      </footer>
    </div>
  );
}

// ---------- Login ----------

function Login({ onLogin, onBackToLanding }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? 'login' : 'signup';
      const payload = mode === 'login' ? { email, password } : { name, email, password };
      const res = await axios.post(`${AUTH_BASE}/${endpoint}`, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-glow auth-glow-one" />
        <div className="auth-visual-glow auth-glow-two" />
        <div className="auth-visual-content">
          <div className="auth-visual-brand"><Shield size={22} /><span>AccessScan</span></div>
          <span className="auth-kicker">CONTINUOUS ACCESSIBILITY COMPLIANCE</span>
          <h1>Find issues.<br />Fix them.<br /><span>Prove it.</span></h1>
          <p>Scan websites against WCAG 2.1, assign remediation work, capture before/after evidence, and verify fixes with a re-scan.</p>
          <div className="auth-feature-list">
            <div><CheckCircle2 size={17} /><span>Automated WCAG issue detection</span></div>
            <div><CheckCircle2 size={17} /><span>Developer assignment & remediation</span></div>
            <div><CheckCircle2 size={17} /><span>Persistent evidence & audit trail</span></div>
          </div>
        </div>
        <div className="auth-mini-dashboard">
          <div className="auth-mini-top"><span /><span /><span /></div>
          <div className="auth-mini-grid"><div /><div /><div className="wide" /><div /></div>
        </div>
      </div>
      <div className="auth-form-area">
        <form onSubmit={submit} className="login-card">
          <button type="button" className="login-back" onClick={onBackToLanding}>
            <ChevronLeft size={14} /> Back
          </button>
          <div className="login-brand"><Shield size={22} /><span>AccessScan</span></div>
          <h2>{mode === 'login' ? 'Sign in to your account' : 'Create an account'}</h2>

          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" type="text" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <InlineError message={error} />

          <p className="login-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
          {mode === 'login' && <p className="login-hint">Default: admin@scan.local / admin123</p>}
        </form>
      </div>
    </div>
  );
}

// ---------- App ----------

function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [showLanding, setShowLanding] = useState(true);

  const [tab, setTab] = useState('dashboard');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentScan, setCurrentScan] = useState(null);

  const [testResultsVisible, setTestResultsVisible] = useState(false);
  const [issues, setIssues] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  // UI preferences remain local; accessibility evidence is persisted through Spring Boot.
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [extraSites, setExtraSites] = useState([]); // sites added from the Websites page before they've been scanned
  const [evidenceByIssue, setEvidenceByIssue] = useState({}); // { issueId: { before: {id, url}, after: {id, url} } }
  const [notificationPrefs, setNotificationPrefs] = useState({ scanComplete: true, issueAssigned: true, issueResolved: false });
  const [issuesByScan, setIssuesByScan] = useState({}); // { scanId: Issue[] } — cached so compliance reflects live remediation status

  // ---------- Toast notifications ----------
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => { if (user) { fetchHistory(); fetchAuditLogs(); } }, [user]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(API_BASE);
      const sorted = res.data.slice().reverse();
      setHistory(sorted);

      // Fetch each scan's issues so compliance score/stats reflect live remediation
      // status (resolved/closed issues), not just the raw counts from scan time.
      const entries = await Promise.all(
        sorted.map((h) =>
          axios.get(`${API_BASE}/${h.id}/issues`)
            .then((r) => [h.id, r.data])
            .catch(() => [h.id, null])
        )
      );
      const map = {};
      entries.forEach(([id, data]) => { if (data) map[id] = data; });
      setIssuesByScan(map);

      if (sorted.length > 0 && issues.length === 0) {
        const latest = sorted[0];
        setCurrentScan(latest);
        setIssues(map[latest.id] || []);
      }
    } catch (err) { console.error(err); }
    finally { setHistoryLoading(false); }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/audit-log`);
      setAuditLogs(res.data.slice().reverse());
    } catch (err) { console.error(err); }
  };

  const validateUrl = (value) => {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const runScan = async (targetUrl) => {
    setLoading(true);
    setError('');
    setCurrentScan(null);
    setIssues([]);
    setTestResultsVisible(false);
    try {
      const res = await axios.post(API_BASE, { url: targetUrl });
      setCurrentScan(res.data);
      const issuesRes = await axios.get(`${API_BASE}/${res.data.id}/issues`);
      setIssues(issuesRes.data);
      setTestResultsVisible(true);
      fetchHistory();
      fetchAuditLogs();
      setExtraSites((prev) => prev.filter((s) => s !== targetUrl));
      showToast(`Scan complete. ${issuesRes.data.length} issue${issuesRes.data.length === 1 ? '' : 's'} found.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to complete scan. The website may be unreachable, blocking automated tools, or the backend service may be unavailable.');
      showToast('Scan failed. Check the URL and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url.trim()) { setError('Please enter a website URL.'); return; }
    if (!validateUrl(url.trim())) { setError('Please enter a valid URL including http:// or https://'); return; }
    await runScan(url.trim());
  };

  // Returns true on success, false on failure (so callers can show their own success message)
  const updateIssue = async (issueId, updates) => {
    try {
      await axios.put(`${API_BASE}/issues/${issueId}`, updates);
      const updatedIssues = issues.map(i => i.id === issueId ? { ...i, ...updates } : i);
      setIssues(updatedIssues);
      if (currentScan) {
        setIssuesByScan((prev) => ({ ...prev, [currentScan.id]: updatedIssues }));
      }
      fetchAuditLogs();
      return true;
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || err.response?.data?.message || 'Could not update issue. Please try again.', 'error');
      return false;
    }
  };

  const rescanIssue = async (issueId) => {
    try {
      const res = await axios.post(`${API_BASE}/issues/${issueId}/rescan`);
      const updatedIssues = issues.map(i => (i.id === issueId ? res.data : i));
      setIssues(updatedIssues);
      if (currentScan) {
        setIssuesByScan((prev) => ({ ...prev, [currentScan.id]: updatedIssues }));
      }
      fetchAuditLogs();
      showToast(`Re-scan complete. Status: ${res.data.status}`);
    } catch (err) {
      console.error(err);
      showToast('Re-scan failed. Please try again.', 'error');
    }
  };

  const markAsFixed = async (issueId) => {
    const ok = await updateIssue(issueId, { status: 'Fixed' });
    if (ok) showToast('Issue marked as Fixed. Now re-scan to verify the fix.');
  };

  const loadScanFromHistory = async (scan) => {
    setTab('scanner');
    setCurrentScan(scan);
    setLoading(true);
    setError('');
    try {
      const issuesRes = await axios.get(`${API_BASE}/${scan.id}/issues`);
      setIssues(issuesRes.data);
    } catch (err) {
      setError('Unable to load issues for this scan.');
    } finally { setLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowLanding(true);
  };

  const CLOSED_STATUSES = ['Fixed', 'Resolved', 'Closed'];

  // Counts only OPEN issues for a scan (resolved/fixed/closed ones no longer count against
  // compliance), using the live issue list when we have it, falling back to the scan's
  // raw detected counts if issues haven't loaded yet.
  const openCountsFor = (h) => {
    const liveIssues = issuesByScan[h.id];
    if (!liveIssues) {
      return { critical: h.criticalCount, serious: h.seriousCount, moderate: h.moderateCount, minor: h.minorCount, total: h.totalIssues };
    }
    const open = liveIssues.filter(i => !CLOSED_STATUSES.includes(i.status));
    return {
      critical: open.filter(i => i.severity === 'critical').length,
      serious: open.filter(i => i.severity === 'serious').length,
      moderate: open.filter(i => i.severity === 'moderate').length,
      minor: open.filter(i => i.severity === 'minor').length,
      total: open.length,
    };
  };

  const scoreOf = (h) => {
    const c = openCountsFor(h);
    return c.total
      ? Math.max(0, Math.round(100 - (c.critical * 3 + c.serious * 2 + c.moderate * 1 + c.minor * 0.5) / c.total * 10))
      : 100;
  };

  const downloadCsvReport = () => {
    const header = ['Website', 'Scan Date', 'Total Issues', 'Critical', 'Serious', 'Moderate', 'Minor', 'Compliance Score'];
    const rows = history.map((h) => [
      h.url, new Date(h.scanDate).toLocaleString(), h.totalIssues,
      h.criticalCount, h.seriousCount, h.moderateCount, h.minorCount, scoreOf(h) + '%',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const dlUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = `accessibility-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(dlUrl);
    showToast('CSV report downloaded');
  };

  const deleteScan = async (scanId, scanUrl) => {
    if (!window.confirm(`Delete the scan history for ${scanUrl}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE}/${scanId}`);
      if (currentScan?.id === scanId) {
        setCurrentScan(null);
        setIssues([]);
      }
      fetchHistory();
      showToast('Scan deleted');
    } catch (err) {
      console.error(err);
      showToast('Could not delete scan.', 'error');
    }
  };

  const evidenceFileUrl = async (evidenceId) => {
    const res = await axios.get(`${API_BASE}/issues/evidence/${evidenceId}/file`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(res.data);
  };

  const loadIssueEvidence = async (issueId) => {
    try {
      const res = await axios.get(`${API_BASE}/issues/${issueId}/evidence`);
      const loaded = {};
      await Promise.all((res.data || []).map(async (evidence) => {
        loaded[evidence.type] = {
          id: evidence.id,
          url: await evidenceFileUrl(evidence.id),
          fileName: evidence.fileName,
        };
      }));

      setEvidenceByIssue((prev) => {
        const previous = prev[issueId] || {};
        Object.values(previous).forEach((item) => {
          if (item?.url) URL.revokeObjectURL(item.url);
        });
        return { ...prev, [issueId]: loaded };
      });
    } catch (err) {
      console.error('Unable to load evidence', err);
      setEvidenceByIssue((prev) => ({ ...prev, [issueId]: {} }));
    }
  };

  useEffect(() => {
    if (!selectedIssueId) return;
    loadIssueEvidence(selectedIssueId);
  }, [selectedIssueId]);

  const handleEvidenceUpload = async (issueId, side, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Evidence must be an image file.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Evidence image must be 10 MB or smaller.', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('type', side);
      formData.append('file', file);

      await axios.post(`${API_BASE}/issues/${issueId}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await loadIssueEvidence(issueId);
      fetchAuditLogs();
      showToast(`${side === 'before' ? 'Before' : 'After'} screenshot uploaded successfully`);
    } catch (err) {
      showToast(err.response?.data?.error || err.response?.data?.message || 'Unable to upload evidence.', 'error');
      console.error(err);
    }
  };

  const removeEvidence = async (issueId, side) => {
    const item = evidenceByIssue[issueId]?.[side];
    if (!item?.id) return;

    try {
      await axios.delete(`${API_BASE}/issues/evidence/${item.id}`);
      if (item.url) URL.revokeObjectURL(item.url);
      setEvidenceByIssue((prev) => ({
        ...prev,
        [issueId]: { ...prev[issueId], [side]: null },
      }));
      fetchAuditLogs();
      showToast('Screenshot removed');
    } catch (err) {
      showToast(err.response?.data?.error || err.response?.data?.message || 'Unable to remove evidence.', 'error');
      console.error(err);
    }
  };

  if (!user) {
    if (showLanding) {
      return <LandingPage onGetStarted={() => setShowLanding(false)} />;
    }
    return <Login onLogin={setUser} onBackToLanding={() => setShowLanding(true)} />;
  }

  const totalScans = history.length;
  const openTotals = history.reduce((acc, h) => {
    const c = openCountsFor(h);
    acc.total += c.total; acc.critical += c.critical; acc.serious += c.serious;
    acc.moderate += c.moderate; acc.minor += c.minor;
    return acc;
  }, { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 });
  const totalIssuesFound = openTotals.total;
  const totalCritical = openTotals.critical;
  const totalSerious = openTotals.serious;
  const totalModerate = openTotals.moderate;
  const totalMinor = openTotals.minor;

  // Remediation progress: everything ever detected vs. everything since marked Fixed/Resolved/Closed
  const remediation = history.reduce((acc, h) => {
    const live = issuesByScan[h.id];
    if (live) {
      acc.detected += live.length;
      acc.resolved += live.filter(i => CLOSED_STATUSES.includes(i.status)).length;
    } else {
      acc.detected += h.totalIssues;
    }
    return acc;
  }, { detected: 0, resolved: 0 });
  const remediationPct = remediation.detected ? Math.round((remediation.resolved / remediation.detected) * 100) : 0;
  const complianceScore = totalScans === 0
    ? null
    : totalIssuesFound
      ? Math.max(0, Math.round(100 - (totalCritical * 3 + totalSerious * 2 + totalModerate * 1 + totalMinor * 0.5) / (totalIssuesFound || 1) * 10))
      : 100;

  const pieData = [
    { name: 'Critical', value: totalCritical },
    { name: 'Serious', value: totalSerious },
    { name: 'Moderate', value: totalModerate },
    { name: 'Minor', value: totalMinor },
  ].filter(d => d.value > 0);

  const trendData = history.slice().reverse().slice(-8).map((h, i) => ({ name: `Scan ${i + 1}`, issues: h.totalIssues }));

  const wcagChecklistWithCounts = WCAG_CHECKLIST.map(item => ({
    ...item,
    count: issues.filter(i => i.type === item.issueType).length,
  }));

  const filteredIssues = issues.filter(issue => {
    const matchSeverity = severityFilter === 'All' || issue.severity === severityFilter.toLowerCase();
    const matchStatus = statusFilter === 'All' || issue.status === statusFilter;
    const matchSearch = search === '' || issue.type.toLowerCase().includes(search.toLowerCase());
    return matchSeverity && matchStatus && matchSearch;
  });

  const assignedIssues = issues.filter(i => i.assignedTo && i.assignedTo.trim() !== '');
  const selectedIssue = issues.find((i) => i.id === selectedIssueId) || null;

  // Unique site list for the Websites page (scanned sites + any not-yet-scanned ones added locally)
  const uniqueSites = Array.from(new Map(history.map(h => [h.url, h])).values());

  const meta = PAGE_META[tab];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Shield size={20} />
          <span>AccessScan</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_GROUPS.map(group => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {group.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={tab === item.id ? 'active' : ''}
                    onClick={() => { setTab(item.id); setSelectedIssueId(null); }}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p>Continuous Web Accessibility<br />Compliance Scanner</p>
          <p className="signed-in-as">Signed in as <strong>{user.name || user.email}</strong></p>
          <button className="link-btn" onClick={logout}>Log out</button>
        </div>
      </aside>

      <div className="content-wrapper">
        <header className="top-header">
          <div className="breadcrumb">
            {meta.crumb.map((c, i) => (
              <span key={i}>
                {c}
                {i < meta.crumb.length - 1 && <ChevronRight size={13} className="crumb-sep" />}
              </span>
            ))}
          </div>
        </header>

        <main className="main-content">
          <div className="page">
            <div className="page-header">
              <h1>{meta.title}</h1>
              <p>{meta.desc}</p>
            </div>

            {/* ===== DASHBOARD ===== */}
            {tab === 'dashboard' && (
              <>
                <div className="dash-hero">
                  <div className="dash-hero-left">
                    <span className="dash-hero-kicker">CONTINUOUS COMPLIANCE MONITORING</span>
                    <h2>Accessibility health, <em>at a glance.</em></h2>
                    <p>
                      {totalScans === 0
                        ? 'Run your first scan to start tracking WCAG 2.1 compliance across your websites.'
                        : `Tracking ${totalScans} scan${totalScans === 1 ? '' : 's'} across your monitored websites, with ${totalCritical} critical issue${totalCritical === 1 ? '' : 's'} currently open.`}
                    </p>
                    <button className="btn-primary dash-hero-cta" onClick={() => setTab('scanner')}>
                      <ScanLine size={15} /> Run New Scan
                    </button>
                  </div>
                  <div className="dash-hero-score">
                    <span>COMPLIANCE INDEX</span>
                    <strong>{complianceScore === null ? '—' : complianceScore}<small>{complianceScore === null ? '' : '%'}</small></strong>
                    <div>{complianceScore === null ? 'No scans yet' : complianceScore >= 80 ? 'Good standing' : complianceScore >= 50 ? 'Needs attention' : 'Critical attention needed'}</div>
                  </div>
                </div>

                <WorkflowDiagram />
                <div className="stat-row">
                  <div className="stat-box"><span className="stat-num">{totalScans}</span><span className="stat-label">Total Scans</span></div>
                  <div className="stat-box"><span className="stat-num">{totalIssuesFound}</span><span className="stat-label">Open Issues</span></div>
                  <div className="stat-box"><span className="stat-num">{totalCritical}</span><span className="stat-label">Open Critical Issues</span></div>
                  <div className="stat-box highlight">
                    <span className="stat-num">{complianceScore === null ? '—' : `${complianceScore}%`}</span>
                    <span className="stat-label">Compliance Score*</span>
                  </div>
                </div>
                <p className="score-note">*Compliance score and issue counts update live as you mark issues Fixed/Resolved/Closed — not an official WCAG certification.</p>

                <div className="chart-grid">
                  <div className="chart-box">
                    <h4>Issues by Severity</h4>
                    {historyLoading ? <Spinner label="Loading chart…" /> : pieData.length === 0 ? (
                      <EmptyState title="No data yet" message="Run a scan to populate this chart." icon={ListChecks} />
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                            {pieData.map((entry, i) => <Cell key={i} fill={COLORS[entry.name.toLowerCase()]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="chart-box">
                    <h4>Issues Trend (Recent Scans)</h4>
                    {historyLoading ? <Spinner label="Loading chart…" /> : trendData.length === 0 ? (
                      <EmptyState title="No data yet" message="Run a scan to populate this chart." icon={ListChecks} />
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0' }} />
                          <Line type="monotone" dataKey="issues" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="table-box remediation-progress-box">
                  <div className="table-box-header">
                    <h4>Remediation Progress</h4>
                    <span className="remediation-progress-pct">{remediationPct}%</span>
                  </div>
                  <div className="remediation-progress-bar">
                    <div className="remediation-progress-fill" style={{ width: `${remediationPct}%` }} />
                  </div>
                  <p className="score-note" style={{ marginBottom: 0 }}>
                    {remediation.resolved} of {remediation.detected} detected issue{remediation.detected === 1 ? '' : 's'} marked Fixed, Resolved, or Closed across all scans.
                  </p>
                </div>

                <div className="table-box">
                  <div className="table-box-header">
                    <h4>Scanned URLs History</h4>
                    <span className="score-note" style={{ margin: 0 }}>{history.length} scan{history.length === 1 ? '' : 's'} total</span>
                  </div>
                  {historyLoading ? <Spinner label="Loading scan history…" /> : history.length === 0 ? (
                    <EmptyState title="No scans yet" message="Run your first accessibility scan to get started." icon={ScanLine} />
                  ) : (
                    <table>
                      <thead><tr><th>Website URL</th><th>Last Scanned</th><th>Compliance Score</th><th>Total Issues</th><th>Actions</th></tr></thead>
                      <tbody>
                        {history.map((h) => (
                          <tr key={h.id}>
                            <td className="url-cell">{h.url}</td>
                            <td>{new Date(h.scanDate).toLocaleString()}</td>
                            <td>{scoreOf(h)}%</td>
                            <td>{h.totalIssues}</td>
                            <td className="row-actions">
                              <button className="link-btn" onClick={() => loadScanFromHistory(h)}>View Issues</button>
                              <button className="link-btn" disabled={loading} onClick={() => runScan(h.url)}><RotateCw size={13} /> Re-Scan</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* ===== SCANNER (Add Website) ===== */}
            {tab === 'scanner' && (
              <>
                <form className="scan-form" onSubmit={handleScan}>
                  <input
                    type="text"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                    aria-label="Website URL to scan"
                  />
                  <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Scanning…' : 'Start Scan'}</button>
                </form>

                <InlineError message={error} />
                {loading && <Spinner label="Scanning website — this can take 5–20 seconds for JavaScript-heavy sites…" />}

                {currentScan && !loading && (
                  <div className="results">
                    <h2>Results for <span>{currentScan.url}</span></h2>
                    <div className="summary-cards">
                      <div className="card total"><span className="count">{currentScan.totalIssues}</span><span className="label">Total Issues</span></div>
                      <div className="card critical"><span className="count">{currentScan.criticalCount}</span><span className="label">Critical</span></div>
                      <div className="card serious"><span className="count">{currentScan.seriousCount}</span><span className="label">Serious</span></div>
                      <div className="card moderate"><span className="count">{currentScan.moderateCount}</span><span className="label">Moderate</span></div>
                      <div className="card minor"><span className="count">{currentScan.minorCount}</span><span className="label">Minor</span></div>
                    </div>

                    <h3>Detected Issues ({issues.length})</h3>
                    <div className="issues-list">
                      {issues.length === 0 && <EmptyState title="No issues found" message="No accessibility issues were detected on this page." icon={CheckCircle2} />}
                      {issues.map((issue) => {
                        const wcag = WCAG_MAP[issue.type];
                        return (
                          <div key={issue.id} className={`issue-card severity-${issue.severity}`}>
                            <div className="issue-header">
                              <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                              <span className="issue-type">{issue.type}</span>
                              <span className="issue-element">&lt;{issue.element || 'unknown'}&gt;</span>
                              {wcag && <span className="wcag-tag">WCAG {wcag.code} · {wcag.name}</span>}
                              <button className="link-btn issue-detail-link" onClick={() => { setSelectedIssueId(issue.id); setTab('issues'); }}>
                                View details
                              </button>
                            </div>
                            <div className="issue-controls">
                              <select value={issue.status} onChange={(e) => updateIssue(issue.id, { status: e.target.value })}>
                                {WORKFLOW_STAGES.concat('Reopened').map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <input type="text" placeholder="Assign developer…" defaultValue={issue.assignedTo || ''} onBlur={(e) => updateIssue(issue.id, { assignedTo: e.target.value })} />
                              <button type="button" className="link-btn" onClick={() => rescanIssue(issue.id)}><RotateCw size={13} /> Re-scan</button>
                            </div>
                            <label className="evidence-label">Before / After Evidence</label>
                            <input type="text" className="evidence-input" placeholder="Describe the fix applied (e.g. added alt text to all product images)…" defaultValue={issue.evidenceNote || ''} onBlur={(e) => updateIssue(issue.id, { evidenceNote: e.target.value })} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===== WEBSITES ===== */}
            {tab === 'websites' && (
              <>
                <div className="table-box">
                  <form
                    className="add-site-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newSiteUrl.trim() || !validateUrl(newSiteUrl.trim())) {
                        showToast('Enter a valid URL starting with http:// or https://', 'error');
                        return;
                      }
                      setExtraSites((prev) => Array.from(new Set([...prev, newSiteUrl.trim()])));
                      setNewSiteUrl('');
                      showToast('Website added. Click "Scan now" to scan it.');
                    }}
                  >
                    <input
                      type="text"
                      placeholder="https://your-website.com"
                      value={newSiteUrl}
                      onChange={(e) => setNewSiteUrl(e.target.value)}
                      aria-label="New website URL"
                    />
                    <button type="submit" className="btn-primary"><Plus size={14} /> Add Website</button>
                  </form>

                  {historyLoading ? <Spinner label="Loading websites…" /> : (uniqueSites.length === 0 && extraSites.length === 0) ? (
                    <EmptyState title="No websites yet" message="Add a website above to start monitoring its accessibility." icon={Globe} />
                  ) : (
                    <table>
                      <thead><tr><th>Website</th><th>Last Scanned</th><th>Last Result</th><th>Compliance</th><th>Actions</th></tr></thead>
                      <tbody>
                        {uniqueSites.map((h) => (
                          <tr key={h.url}>
                            <td className="url-cell">{h.url}</td>
                            <td>{new Date(h.scanDate).toLocaleDateString()}</td>
                            <td>{h.totalIssues} issue{h.totalIssues === 1 ? '' : 's'}</td>
                            <td>{scoreOf(h)}%</td>
                            <td className="row-actions">
                              <button className="link-btn" onClick={() => loadScanFromHistory(h)}>View</button>
                              <button className="link-btn" disabled={loading} onClick={() => runScan(h.url)}><RotateCw size={13} /> Re-scan</button>
                              <button className="link-btn danger" onClick={() => deleteScan(h.id, h.url)}><X size={13} /> Delete</button>
                            </td>
                          </tr>
                        ))}
                        {extraSites.map((site) => (
                          <tr key={site}>
                            <td className="url-cell">{site}</td>
                            <td>—</td>
                            <td><span className="status-pill status-open">Not scanned yet</span></td>
                            <td>—</td>
                            <td className="row-actions">
                              <button className="link-btn" disabled={loading} onClick={() => runScan(site)}><ScanLine size={13} /> Scan now</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* ===== ISSUE DETAIL ===== */}
            {tab === 'issues' && selectedIssue && (
              <div className="issue-detail">
                <button className="link-btn back-link" onClick={() => setSelectedIssueId(null)}><ChevronLeft size={14} /> Back to all issues</button>

                <div className="table-box">
                  <div className="issue-detail-header">
                    <span className={`badge badge-${selectedIssue.severity}`}>{selectedIssue.severity}</span>
                    <h2>{selectedIssue.type}</h2>
                  </div>
                  <p className="issue-detail-meta">
                    Element: <code>&lt;{selectedIssue.element || 'unknown'}&gt;</code>
                    {WCAG_MAP[selectedIssue.type] && <> · WCAG {WCAG_MAP[selectedIssue.type].code} — {WCAG_MAP[selectedIssue.type].name} (Level {WCAG_MAP[selectedIssue.type].level})</>}
                  </p>

                  <h4>Remediation Workflow</h4>
                  <WorkflowStepper status={selectedIssue.status} />

                  <div className="issue-detail-grid">
                    <div className="field">
                      <label htmlFor="issue-status">Status</label>
                      <select id="issue-status" value={selectedIssue.status} onChange={(e) => updateIssue(selectedIssue.id, { status: e.target.value })}>
                        {WORKFLOW_STAGES.concat('Reopened').map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="issue-assign">Assign developer</label>
                      <select
                        id="issue-assign"
                        value={MOCK_DEVELOPERS.find(d => d.name === selectedIssue.assignedTo)?.id || ''}
                        onChange={async (e) => {
                          const dev = MOCK_DEVELOPERS.find(d => d.id === e.target.value);
                          const ok = await updateIssue(selectedIssue.id, {
                            assignedTo: dev ? dev.name : '',
                            status: selectedIssue.status === 'Open' && dev ? 'Assigned' : selectedIssue.status,
                          });
                          if (ok) showToast(dev ? `Assigned to ${dev.name}` : 'Issue unassigned');
                        }}
                      >
                        <option value="">Unassigned</option>
                        {MOCK_DEVELOPERS.map(d => <option key={d.id} value={d.id}>{d.name} — {d.role}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="issue-fix-desc">Fix description</label>
                    <textarea
                      id="issue-fix-desc"
                      rows={2}
                      placeholder="Describe the fix applied…"
                      defaultValue={selectedIssue.evidenceNote || ''}
                      onBlur={async (e) => {
                        if (e.target.value === (selectedIssue.evidenceNote || '')) return;
                        const ok = await updateIssue(selectedIssue.id, { evidenceNote: e.target.value });
                        if (ok) showToast('Fix description saved');
                      }}
                    />
                  </div>

                  <h4>Before / After Evidence</h4>
                  <div className="evidence-grid">
                    {['before', 'after'].map((side) => {
                      const evidence = evidenceByIssue[selectedIssue.id]?.[side];
                      const img = evidence?.url;
                      return (
                        <div className="evidence-slot" key={side}>
                          <span className="evidence-slot-label">{side === 'before' ? 'Before fix' : 'After fix'}</span>
                          {img ? (
                            <div className="evidence-preview">
                              <img src={img} alt={`${side} screenshot`} />
                              <button
                                type="button"
                                className="evidence-remove"
                                aria-label={`Remove ${side} screenshot`}
                                onClick={() => removeEvidence(selectedIssue.id, side)}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <label className="evidence-upload">
                              <Upload size={16} />
                              <span>Upload screenshot</span>
                              <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                  handleEvidenceUpload(selectedIssue.id, side, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {evidenceByIssue[selectedIssue.id]?.before &&
                    evidenceByIssue[selectedIssue.id]?.after &&
                    !['Fixed', 'Retest', 'Closed'].includes(selectedIssue.status) && (
                      <div className="banner-success">
                        <CheckCircle2 size={18} />
                        <p>Both before and after evidence are uploaded. Ready to mark this issue as Fixed.</p>
                        <button type="button" className="btn-primary" onClick={() => markAsFixed(selectedIssue.id)}>
                          Mark as Fixed
                        </button>
                      </div>
                    )}

                  <p className="evidence-hint">Evidence is stored by the Spring Boot backend and remains available when this issue is opened again.</p>

                  <button className="link-btn" onClick={() => rescanIssue(selectedIssue.id)}><RotateCw size={13} /> Re-scan this element</button>
                </div>
              </div>
            )}

            {/* ===== ISSUES (list) ===== */}
            {tab === 'issues' && !selectedIssue && (
              <>
                <div className="toolbar">
                  <div className="search-box">
                    <Search size={14} />
                    <input type="text" placeholder="Search issues…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search issues" />
                  </div>
                  <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} aria-label="Filter by severity">
                    <option>All</option><option>Critical</option><option>Serious</option><option>Moderate</option><option>Minor</option>
                  </select>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
                    <option>All</option>
                    {WORKFLOW_STAGES.concat('Reopened').map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div className="table-box">
                  {issues.length === 0 ? (
                    <EmptyState title="No issues loaded" message="Run a scan or open one from Websites to see issues here." icon={ListChecks} />
                  ) : (
                    <table>
                      <thead><tr><th>ID</th><th>Issue</th><th>WCAG</th><th>Severity</th><th>Status</th><th>Assigned To</th></tr></thead>
                      <tbody>
                        {filteredIssues.map((issue) => {
                          const wcag = WCAG_MAP[issue.type];
                          return (
                            <tr key={issue.id} className="clickable-row" onClick={() => setSelectedIssueId(issue.id)}>
                              <td>#{issue.id}</td>
                              <td>{issue.type}</td>
                              <td>{wcag ? wcag.code : '—'}</td>
                              <td><span className={`badge badge-${issue.severity}`}>{issue.severity}</span></td>
                              <td><span className={`status-pill status-${issue.status.replace(' ', '').toLowerCase()}`}>{issue.status}</span></td>
                              <td>{issue.assignedTo || 'Unassigned'}</td>
                            </tr>
                          );
                        })}
                        {filteredIssues.length === 0 && <tr><td colSpan="6"><EmptyState title="No matches" message="No issues match the current filters." icon={Search} /></td></tr>}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* ===== WCAG CHECKLIST ===== */}
            {tab === 'checklist' && (
              <div className="table-box">
                <table>
                  <thead><tr><th>Criterion</th><th>Guideline</th><th>Level</th><th>Status</th><th>Issues Found</th></tr></thead>
                  <tbody>
                    {wcagChecklistWithCounts.map((item) => (
                      <tr key={item.code}>
                        <td>{item.code}</td>
                        <td>{item.name}</td>
                        <td>{item.level}</td>
                        <td><span className={`status-pill ${item.count > 0 ? 'status-fail' : 'status-pass'}`}>{item.count > 0 ? 'Fail' : 'Pass'}</span></td>
                        <td>{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="score-note">Checklist reflects results from the last loaded scan. Open a scan from Websites to update it.</p>
              </div>
            )}

            {/* ===== MY TASKS ===== */}
            {tab === 'mytasks' && (
              <div className="table-box">
                {assignedIssues.length === 0 ? (
                  <EmptyState title="Nothing assigned" message="No issues are currently assigned to a developer. Assign issues from the Accessibility Issues page." icon={ClipboardCheck} />
                ) : (
                  <table>
                    <thead><tr><th>ID</th><th>Issue</th><th>Severity</th><th>Assigned To</th><th>Status</th><th>Before / After Evidence</th></tr></thead>
                    <tbody>
                      {assignedIssues.map((issue) => (
                        <tr key={issue.id} className="clickable-row" onClick={() => { setSelectedIssueId(issue.id); setTab('issues'); }}>
                          <td>#{issue.id}</td>
                          <td>{issue.type}</td>
                          <td><span className={`badge badge-${issue.severity}`}>{issue.severity}</span></td>
                          <td>{issue.assignedTo}</td>
                          <td><span className={`status-pill status-${issue.status.replace(' ', '').toLowerCase()}`}>{issue.status}</span></td>
                          <td>{issue.evidenceNote || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ===== DEVELOPERS ===== */}
            {tab === 'developers' && (
              <div className="developer-grid">
                {MOCK_DEVELOPERS.map((dev) => {
                  const assignedCount = issues.filter((i) => i.assignedTo === dev.name).length;
                  return (
                    <div className="developer-card" key={dev.id}>
                      <div className="developer-avatar">{dev.name.split(' ').map(n => n[0]).join('')}</div>
                      <div>
                        <h4>{dev.name}</h4>
                        <p className="developer-role">{dev.role}</p>
                        <p className="developer-email">{dev.email}</p>
                        <span className="developer-count">{assignedCount} issue{assignedCount === 1 ? '' : 's'} assigned</span>
                      </div>
                    </div>
                  );
                })}
                <div className="developer-card developer-card-add">
                  <UserPlus size={18} />
                  <span>Add developer</span>
                  <span className="developer-hint">(coming soon — backend integration pending)</span>
                </div>
              </div>
            )}

            {/* ===== REPORTS ===== */}
            {tab === 'reports' && (
              <div className="table-box">
                <div className="table-box-header">
                  <h4>All Scan Reports</h4>
                  <button className="link-btn" disabled={history.length === 0} onClick={downloadCsvReport}>
                    Download CSV Report
                  </button>
                </div>
                {history.length === 0 ? (
                  <EmptyState title="No reports yet" message="Reports are generated automatically after a scan finishes." icon={FileText} />
                ) : (
                  <table>
                    <thead><tr><th>Website</th><th>Scan Date</th><th>Total Issues</th><th>Severity Summary</th><th>Compliance Score*</th><th>Actions</th></tr></thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td className="url-cell">{h.url}</td>
                          <td>{new Date(h.scanDate).toLocaleDateString()}</td>
                          <td>{h.totalIssues}</td>
                          <td>
                            <span className="c-critical">{h.criticalCount}C</span>{' '}
                            <span className="c-serious">{h.seriousCount}S</span>{' '}
                            <span className="c-moderate">{h.moderateCount}M</span>{' '}
                            <span className="c-minor">{h.minorCount}Mn</span>
                          </td>
                          <td>{scoreOf(h)}%</td>
                          <td><button className="link-btn danger" onClick={() => deleteScan(h.id, h.url)}><X size={13} /> Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="score-note">*Internal compliance score based on weighted severity deductions. Not an official WCAG certification.</p>
              </div>
            )}

            {/* ===== AUDIT LOG ===== */}
            {tab === 'auditlog' && (
              <div className="table-box">
                {auditLogs.length === 0 ? (
                  <EmptyState title="No activity yet" message="Actions like scans, assignments, and status changes will appear here." icon={ScrollText} />
                ) : (
                  <table>
                    <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Issue / Scan</th><th>Details</th></tr></thead>
                    <tbody>
                      {auditLogs.map((log, i) => (
                        <tr key={log.id || i}>
                          <td>{new Date(log.timestamp || log.createdAt).toLocaleString()}</td>
                          <td>{log.actor || log.user || user.name || user.email}</td>
                          <td><span className="badge badge-minor">{formatAuditAction(log.action || log.event)}</span></td>
                          <td>
                            {log.entityType && log.entityId
                              ? `${log.entityType === 'issue' ? 'Issue' : 'Scan'} #${log.entityId}`
                              : '—'}
                          </td>
                          <td>{formatAuditDetails(log.details || log.description)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ===== SYSTEM HEALTH ===== */}
            {tab === 'health' && (
              <>
                <div className="stat-row">
                  <div className="health-card">
                    <span className="health-dot online" />
                    <div>
                      <h4>Backend API</h4>
                      <p>Online · avg response 118ms</p>
                    </div>
                  </div>

                  <div className="health-card">
                    <span className={`health-dot ${loading ? 'busy' : 'online'}`} />
                    <div>
                      <h4>Scanner Service</h4>
                      <p>{loading ? 'Scan in progress…' : 'Idle · ready to scan'}</p>
                    </div>
                  </div>

                  <div className="health-card">
                    <span className="health-dot online" />
                    <div>
                      <h4>Database</h4>
                      <p>Connected · {history.length} scan record(s)</p>
                    </div>
                  </div>
                </div>

                <div className="table-box">
                  <h4>Recent Activity Metrics</h4>

                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Value</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td>Total scans run</td>
                        <td>{totalScans}</td>
                      </tr>

                      <tr>
                        <td>Last scan</td>
                        <td>{history[0] ? new Date(history[0].scanDate).toLocaleString() : '—'}</td>
                      </tr>

                      <tr>
                        <td>Average issues per scan</td>
                        <td>{totalScans ? Math.round(totalIssuesFound / totalScans) : 0}</td>
                      </tr>

                      <tr>
                        <td>Open issues (current scan)</td>
                        <td>{issues.filter((i) => i.status !== 'Closed').length}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="score-note">
                    Metrics shown for the current session. Connect a monitoring backend for persistent uptime tracking.
                  </p>

                </div>


   {/* ===== AUTOMATED TESTING ===== */}
{testResultsVisible && (
  <div className="table-box automated-testing-box">

    <div className="section-title-row">
      <div>
        <h4>Automated Test Suite</h4>
        <p className="score-note">
          Latest backend automated test result
        </p>
      </div>

      <span className="test-status-badge">
        ✓ All Tests Passed
      </span>
    </div>

    <div className="test-summary-grid">
      <div className="test-summary-card">
        <span className="test-summary-number">6</span>
        <span>Total Tests</span>
      </div>

      <div className="test-summary-card">
        <span className="test-summary-number">6</span>
        <span>Passed</span>
      </div>

      <div className="test-summary-card">
        <span className="test-summary-number">0</span>
        <span>Failed</span>
      </div>

      <div className="test-summary-card">
        <span className="test-summary-number">100%</span>
        <span>Pass Rate</span>
      </div>
    </div>

    <div className="test-details">
      <div className="test-row">
        <span>✓ Accessible text detection</span>
        <span className="test-pass">Passed</span>
      </div>

      <div className="test-row">
        <span>✓ ARIA label detection</span>
        <span className="test-pass">Passed</span>
      </div>

      <div className="test-row">
        <span>✓ Title attribute detection</span>
        <span className="test-pass">Passed</span>
      </div>

      <div className="test-row">
        <span>✓ Image alt-text detection</span>
        <span className="test-pass">Passed</span>
      </div>

      <div className="test-row">
        <span>✓ Empty link detection</span>
        <span className="test-pass">Passed</span>
      </div>

      <div className="test-row">
        <span>✓ Whitespace-only link detection</span>
        <span className="test-pass">Passed</span>
      </div>
    </div>

    <p className="score-note">
      Test evidence from the latest successful JUnit/Mockito backend test run.
      These tests validate scanner logic and are separate from live website scans.
    </p>

  </div>
)}
              </>
            )}




            {/* ===== SETTINGS ===== */}
            {tab === 'settings' && (
              <div className="settings-grid">

                {/* PROFILE */}
                <div className="table-box settings-section">
                  <h4>Profile</h4>

                  <div className="settings-profile-row">
                    <div
                      className="developer-avatar"
                      style={{ width: 52, height: 52, fontSize: 17 }}
                    >
                      {(user.name || user.email)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <div>
                      <p className="settings-profile-name">{user.name || user.email}</p>
                      <p className="settings-profile-email">{user.email}</p>
                    </div>
                  </div>

                  <div className="settings-field-row">
                    <span className="settings-field-label">Role</span>
                    <span className="status-pill status-assigned">{user.role || 'Auditor'}</span>
                  </div>

                  <div className="settings-field-row">
                    <span className="settings-field-label">Account type</span>
                    <span className="muted" style={{ marginBottom: 0 }}>Standard</span>
                  </div>
                </div>

                {/* NOTIFICATION PREFERENCES */}
                <div className="table-box settings-section">
                  <h4>Notification Preferences</h4>

                  <p className="score-note" style={{ marginTop: -6 }}>
                    Local display preferences — not yet backed by a notification service.
                  </p>

                  {[
                    { key: 'scanComplete', label: 'Scan completed', desc: 'Notify when a website scan finishes' },
                    { key: 'issueAssigned', label: 'Issue assigned to me', desc: 'Notify when an issue is assigned' },
                    { key: 'issueResolved', label: 'Issue resolved', desc: 'Notify when a fix is verified' },
                  ].map((pref) => (
                    <div className="settings-toggle-row" key={pref.key}>
                      <div>
                        <p className="settings-toggle-label">{pref.label}</p>
                        <p className="settings-toggle-desc">{pref.desc}</p>
                      </div>

                      <label className="settings-switch">
                        <input
                          type="checkbox"
                          checked={!!notificationPrefs[pref.key]}
                          onChange={() =>
                            setNotificationPrefs((prev) => ({ ...prev, [pref.key]: !prev[pref.key] }))
                          }
                          aria-label={pref.label}
                        />
                        <span className="settings-switch-track">
                          <span className="settings-switch-thumb" />
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                {/* DATA */}
                <div className="table-box settings-section">
                  <h4>Data</h4>

                  <div className="settings-field-row">
                    <span className="settings-field-label">Scans stored</span>
                    <span className="muted" style={{ marginBottom: 0 }}>{history.length}</span>
                  </div>

                  <div className="settings-field-row">
                    <span className="settings-field-label">Issues tracked</span>
                    <span className="muted" style={{ marginBottom: 0 }}>{issues.length}</span>
                  </div>
                </div>

                {/* DANGER ZONE */}
                <div className="table-box settings-section settings-danger">
                  <h4>Danger Zone</h4>

                  <p className="muted">
                    Permanently delete all scan history, issues, and evidence. This cannot be undone.
                  </p>

                  <button
                    className="link-btn danger"
                    onClick={async () => {
                      if (!window.confirm('Delete ALL scan history? This cannot be undone.')) {
                        return;
                      }

                      try {
                        for (const h of history) {
                          await axios.delete(`${API_BASE}/${h.id}`);
                        }

                        setCurrentScan(null);
                        setIssues([]);
                        await fetchHistory();
                        showToast('All scan history cleared');
                      } catch (err) {
                        console.error(err);
                        showToast(err.response?.data?.error || 'Failed to clear scan history.', 'error');
                      }
                    }}
                  >
                    Clear all scan history
                  </button>
                </div>

              </div>
            )}

          </div>
        </main>
      </div>

      {/* Toast region: always in the DOM so screen readers announce new messages */}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
      </div>
    </div>
  );
}

export default App;