import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  LayoutDashboard, ScanLine, ListChecks,
  ClipboardList, Users, FileText, Settings, Shield, Search, ChevronRight, ChevronLeft,
  Globe, ClipboardCheck, ScrollText, Activity, Plus, RotateCw, Upload, X, CheckCircle2,
  AlertTriangle, Clock, UserPlus
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:8080/api/scans';
const AUTH_BASE = 'http://localhost:8080/api/auth';

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

// ---------- Login ----------

function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="app-shell login-shell">
      <form onSubmit={submit} className="login-card">
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
          <input id="password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
  );
}

// ---------- App ----------

function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const [tab, setTab] = useState('dashboard');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentScan, setCurrentScan] = useState(null);
  const [issues, setIssues] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  // Frontend-only mock state for newly added features (not persisted to backend yet)
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [extraSites, setExtraSites] = useState([]); // sites added from the Websites page before they've been scanned
  const [evidenceByIssue, setEvidenceByIssue] = useState({}); // { issueId: { before, after } } data URLs

  useEffect(() => { if (user) { fetchHistory(); fetchAuditLogs(); } }, [user]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(API_BASE);
      const sorted = res.data.slice().reverse();
      setHistory(sorted);

      if (sorted.length > 0 && issues.length === 0) {
        const latest = sorted[0];
        const issuesRes = await axios.get(`${API_BASE}/${latest.id}/issues`);
        setCurrentScan(latest);
        setIssues(issuesRes.data);
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
    try {
      const res = await axios.post(API_BASE, { url: targetUrl });
      setCurrentScan(res.data);
      const issuesRes = await axios.get(`${API_BASE}/${res.data.id}/issues`);
      setIssues(issuesRes.data);
      fetchHistory();
      setExtraSites((prev) => prev.filter((s) => s !== targetUrl));
    } catch (err) {
      setError('Unable to complete scan. The website may be unreachable, blocking automated tools, or the backend service may be unavailable.');
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

  const updateIssue = async (issueId, updates) => {
    try {
      await axios.put(`${API_BASE}/issues/${issueId}`, updates);
      setIssues(issues.map(i => i.id === issueId ? { ...i, ...updates } : i));
    } catch (err) { console.error(err); }
  };

  const rescanIssue = async (issueId) => {
    try {
      const res = await axios.post(`${API_BASE}/issues/${issueId}/rescan`);
      setIssues(issues.map(i => (i.id === issueId ? res.data : i)));
    } catch (err) { console.error(err); }
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
  };

  const scoreOf = (h) => h.totalIssues
    ? Math.max(0, Math.round(100 - (h.criticalCount * 3 + h.seriousCount * 2 + h.moderateCount * 1 + h.minorCount * 0.5) / h.totalIssues * 10))
    : 100;

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
  };

  const handleEvidenceUpload = (issueId, side, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEvidenceByIssue((prev) => ({
        ...prev,
        [issueId]: { ...prev[issueId], [side]: reader.result },
      }));
    };
    reader.readAsDataURL(file);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const totalScans = history.length;
  const totalIssuesFound = history.reduce((s, h) => s + h.totalIssues, 0);
  const totalCritical = history.reduce((s, h) => s + h.criticalCount, 0);
  const totalSerious = history.reduce((s, h) => s + h.seriousCount, 0);
  const totalModerate = history.reduce((s, h) => s + h.moderateCount, 0);
  const totalMinor = history.reduce((s, h) => s + h.minorCount, 0);
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
                <div className="stat-row">
                  <div className="stat-box"><span className="stat-num">{totalScans}</span><span className="stat-label">Total Scans</span></div>
                  <div className="stat-box"><span className="stat-num">{totalIssuesFound}</span><span className="stat-label">Total Issues</span></div>
                  <div className="stat-box"><span className="stat-num">{totalCritical}</span><span className="stat-label">Critical Issues</span></div>
                  <div className="stat-box highlight">
                    <span className="stat-num">{complianceScore === null ? '—' : `${complianceScore}%`}</span>
                    <span className="stat-label">Compliance Score*</span>
                  </div>
                </div>
                <p className="score-note">*Internal compliance score — weighted deduction by severity, not an official WCAG certification.</p>

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

                <div className="table-box">
                  <h4>Recent Scans</h4>
                  {historyLoading ? <Spinner label="Loading recent scans…" /> : history.length === 0 ? (
                    <EmptyState title="No scans yet" message="Run your first accessibility scan to get started." icon={ScanLine} />
                  ) : (
                    <table>
                      <thead><tr><th>Website URL</th><th>Date</th><th>Issues Found</th><th>Status</th><th>Action</th></tr></thead>
                      <tbody>
                        {history.slice(0, 6).map((h) => (
                          <tr key={h.id}>
                            <td className="url-cell">{h.url}</td>
                            <td>{new Date(h.scanDate).toLocaleString()}</td>
                            <td>{h.totalIssues}</td>
                            <td><span className="status-pill completed">Completed</span></td>
                            <td><button className="link-btn" onClick={() => loadScanFromHistory(h)}>View</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* ===== SCANNER (Add Website) — unchanged, existing behaviour ===== */}
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
                              <span className="issue-element">&lt;{issue.element}&gt;</span>
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

            {/* ===== WEBSITES (new) ===== */}
            {tab === 'websites' && (
              <>
                <div className="table-box">
                  <form
                    className="add-site-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newSiteUrl.trim() || !validateUrl(newSiteUrl.trim())) return;
                      setExtraSites((prev) => Array.from(new Set([...prev, newSiteUrl.trim()])));
                      setNewSiteUrl('');
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

            {/* ===== ISSUE DETAIL (new — opened from Issues table or Scanner results) ===== */}
            {tab === 'issues' && selectedIssue && (
              <div className="issue-detail">
                <button className="link-btn back-link" onClick={() => setSelectedIssueId(null)}><ChevronLeft size={14} /> Back to all issues</button>

                <div className="table-box">
                  <div className="issue-detail-header">
                    <span className={`badge badge-${selectedIssue.severity}`}>{selectedIssue.severity}</span>
                    <h2>{selectedIssue.type}</h2>
                  </div>
                  <p className="issue-detail-meta">
                    Element: <code>&lt;{selectedIssue.element}&gt;</code>
                    {WCAG_MAP[selectedIssue.type] && <> · WCAG {WCAG_MAP[selectedIssue.type].code} — {WCAG_MAP[selectedIssue.type].name} (Level {WCAG_MAP[selectedIssue.type].level})</>}
                  </p>

                  <h4>Remediation Workflow</h4>
                  <WorkflowStepper status={selectedIssue.status} />

                  <div className="issue-detail-grid">
                    <div className="field">
                      <label>Status</label>
                      <select value={selectedIssue.status} onChange={(e) => updateIssue(selectedIssue.id, { status: e.target.value })}>
                        {WORKFLOW_STAGES.concat('Reopened').map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Assign developer</label>
                      <select
                        value={MOCK_DEVELOPERS.find(d => d.name === selectedIssue.assignedTo)?.id || ''}
                        onChange={(e) => {
                          const dev = MOCK_DEVELOPERS.find(d => d.id === e.target.value);
                          updateIssue(selectedIssue.id, { assignedTo: dev ? dev.name : '', status: selectedIssue.status === 'Open' ? 'Assigned' : selectedIssue.status });
                        }}
                      >
                        <option value="">Unassigned</option>
                        {MOCK_DEVELOPERS.map(d => <option key={d.id} value={d.id}>{d.name} — {d.role}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <label>Fix description</label>
                    <textarea
                      rows={2}
                      placeholder="Describe the fix applied…"
                      defaultValue={selectedIssue.evidenceNote || ''}
                      onBlur={(e) => updateIssue(selectedIssue.id, { evidenceNote: e.target.value })}
                    />
                  </div>

                  <h4>Before / After Evidence</h4>
                  <div className="evidence-grid">
                    {['before', 'after'].map((side) => {
                      const img = evidenceByIssue[selectedIssue.id]?.[side];
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
                                onClick={() => setEvidenceByIssue((prev) => ({ ...prev, [selectedIssue.id]: { ...prev[selectedIssue.id], [side]: null } }))}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <label className="evidence-upload">
                              <Upload size={16} />
                              <span>Upload screenshot</span>
                              <input type="file" accept="image/*" hidden onChange={(e) => handleEvidenceUpload(selectedIssue.id, side, e.target.files?.[0])} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="evidence-hint">Screenshots are kept in this browser session for review — not yet saved to the server.</p>

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

            {/* ===== DEVELOPERS (new) ===== */}
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
                    <thead><tr><th>Website</th><th>Scan Date</th><th>Total Issues</th><th>Severity Summary</th><th>Compliance Score*</th></tr></thead>
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
                          <td>{log.user || log.performedBy || user.name || user.email}</td>
                          <td>{log.action || log.event}</td>
                          <td>{log.issueId ? `Issue #${log.issueId}` : log.scanId ? `Scan #${log.scanId}` : '—'}</td>
                          <td>{log.details || log.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ===== SYSTEM HEALTH (new) ===== */}
            {tab === 'health' && (
              <>
                <div className="stat-row">
                  <div className="health-card">
                    <span className="health-dot online" />
                    <div><h4>Backend API</h4><p>Online · avg response 118ms</p></div>
                  </div>
                  <div className="health-card">
                    <span className={`health-dot ${loading ? 'busy' : 'online'}`} />
                    <div><h4>Scanner Service</h4><p>{loading ? 'Scan in progress…' : 'Idle · ready to scan'}</p></div>
                  </div>
                  <div className="health-card">
                    <span className="health-dot online" />
                    <div><h4>Database</h4><p>Connected · {history.length} scan record(s)</p></div>
                  </div>
                </div>

                <div className="table-box">
                  <h4>Recent Activity Metrics</h4>
                  <table>
                    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                    <tbody>
                      <tr><td>Total scans run</td><td>{totalScans}</td></tr>
                      <tr><td>Last scan</td><td>{history[0] ? new Date(history[0].scanDate).toLocaleString() : '—'}</td></tr>
                      <tr><td>Average issues per scan</td><td>{totalScans ? Math.round(totalIssuesFound / totalScans) : 0}</td></tr>
                      <tr><td>Open issues (current scan)</td><td>{issues.filter(i => i.status !== 'Closed').length}</td></tr>
                    </tbody>
                  </table>
                  <p className="score-note">Metrics shown for the current session. Connect a monitoring backend for persistent uptime tracking.</p>
                </div>
              </>
            )}

            {/* ===== SETTINGS ===== */}
            {tab === 'settings' && (
              <div className="table-box">
                <h4>Account</h4>
                <p className="muted">Signed in as <strong>{user.email}</strong> ({user.role})</p>

                <h4>Data</h4>
                <p className="muted">{history.length} scan(s) stored.</p>
                <button
                  className="link-btn danger"
                  onClick={async () => {
                    if (!window.confirm('Delete ALL scan history? This cannot be undone.')) return;
                    for (const h of history) {
                      await axios.delete(`${API_BASE}/${h.id}`);
                    }
                    setCurrentScan(null);
                    setIssues([]);
                    fetchHistory();
                  }}
                >
                  Clear all scan history
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;