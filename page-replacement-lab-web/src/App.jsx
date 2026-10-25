import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowRight, Check, ChevronRight, CircleHelp, Cpu, Gauge, Layers3, Pause, Play, RotateCcw, SkipForward, Sparkles, Timer, Trophy, Zap } from 'lucide-react';

const ORDER = ['FIFO', 'LRU', 'Optimal'];
const EXAMPLES = [
  { refs: '7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1', frames: 3 },
  { refs: '1, 2, 3, 1, 4, 2, 5', frames: 3 },
];
const FULL = { FIFO: 'First In, First Out', LRU: 'Least Recently Used', Optimal: 'Optimal Replacement' };
const DESC = {
  FIFO: 'Removes the page that entered memory earliest. A hit does not change its arrival order.',
  LRU: 'Removes the page that has not been used for the longest time.',
  Optimal: 'Removes the page whose next use is farthest in the future. A theoretical benchmark.',
};

function parseInput(raw, frameRaw) {
  if (!raw.trim()) throw new Error('Enter a page reference string first.');
  if (raw.length > 600) throw new Error('Keep the reference string under 600 characters.');
  const tokens = raw.trim().split(/[\s,]+/).filter(Boolean);
  if (tokens.length > 100) throw new Error('Use no more than 100 page references.');
  const refs = tokens.map(t => {
    if (!/^\d+$/.test(t)) throw new Error(`“${t}” is not valid. Use whole page numbers from 0 to 99.`);
    const n = Number(t);
    if (n > 99) throw new Error('Page numbers must be between 0 and 99.');
    return n;
  });
  const frames = Number(frameRaw);
  if (!Number.isInteger(frames) || frames < 1 || frames > 8) throw new Error('Choose between 1 and 8 RAM frames.');
  return { refs, frames };
}

function simulate(name, refs, frameCount) {
  const frames = Array(frameCount).fill(null);
  const history = [];
  const loadedAt = new Map();
  const lastUsed = new Map();
  let arrival = 0;
  refs.forEach((page, index) => {
    const before = [...frames];
    const hitIndex = frames.indexOf(page);
    let hit = hitIndex !== -1;
    let victim = null;
    let victimFrame = -1;
    let reason = '';
    if (hit) {
      reason = `Page ${page} is already in frame ${hitIndex + 1}; no replacement is needed.`;
      lastUsed.set(page, index);
    } else {
      let target = frames.indexOf(null);
      if (target === -1) {
        if (name === 'FIFO') {
          target = frames.reduce((best, p, i) => loadedAt.get(p) < loadedAt.get(frames[best]) ? i : best, 0);
          reason = `Page ${victim = frames[target]} arrived earliest, so FIFO evicts it.`;
        } else if (name === 'LRU') {
          target = frames.reduce((best, p, i) => lastUsed.get(p) < lastUsed.get(frames[best]) ? i : best, 0);
          reason = `Page ${victim = frames[target]} was used least recently, so LRU evicts it.`;
        } else {
          let farthest = -1;
          frames.forEach((p, i) => {
            const next = refs.indexOf(p, index + 1);
            if (next === -1) { if (farthest !== Infinity) target = i; farthest = Infinity; }
            else if (farthest !== Infinity && next > farthest) { farthest = next; target = i; }
          });
          victim = frames[target];
          const next = refs.indexOf(victim, index + 1);
          reason = next === -1 ? `Page ${victim} is never used again, so Optimal evicts it.` : `Page ${victim} is needed farthest in the future (reference ${next + 1}), so Optimal evicts it.`;
        }
        victimFrame = target;
      } else reason = `Frame ${target + 1} is empty, so page ${page} can be loaded without evicting anything.`;
      if (victim !== null) { loadedAt.delete(victim); lastUsed.delete(victim); }
      frames[target] = page;
      loadedAt.set(page, arrival++);
      lastUsed.set(page, index);
    }
    history.push({ index, page, before, frames: [...frames], hit, victim, victimFrame, reason, status: hit ? 'HIT' : 'FAULT' });
  });
  return { name, refs, frameCount, history, faults: history.filter(s => !s.hit).length, hits: history.filter(s => s.hit).length };
}

function Brand() { return <div className="brand-mark"><Layers3 size={22} strokeWidth={2.4}/></div>; }
function Stat({ label, value, detail, tone = '' }) { return <div className={`stat-card ${tone}`}><span className="stat-label">{label}</span><strong>{value}</strong><span className="stat-detail">{detail}</span></div>; }
function Tag({ children, type = '' }) { return <span className={`tag ${type}`}>{children}</span>; }

function AlgorithmPanel({ result, step, compact = false }) {
  const current = step > 0 ? result.history[step - 1] : null;
  const finished = step >= result.history.length;
  const visible = result.history.slice(0, step);
  const faults = visible.filter(s => !s.hit).length;
  const hits = visible.filter(s => s.hit).length;
  const currentPage = current?.page;
  return <section className={`algorithm-panel ${compact ? 'compact' : ''}`}>
    <div className="panel-head"><div><div className="algo-title-row"><span className={`algo-dot ${result.name.toLowerCase()}`}></span><h3>{result.name}</h3></div><p>{FULL[result.name]}</p></div><Tag type={finished ? 'success' : current?.hit ? 'hit' : current ? 'fault' : ''}>{finished ? 'COMPLETE' : current ? current.status : 'READY'}</Tag></div>
    <p className="algo-description">{DESC[result.name]}</p>
    <div className="mini-stats"><div><span>Hits</span><b>{hits}</b></div><div><span>Faults</span><b>{faults}</b></div><div><span>Fault rate</span><b>{step ? `${Math.round(faults / step * 100)}%` : '0%'}</b></div></div>
    <div className="memory-label"><span><Cpu size={15}/> MAIN MEMORY / RAM</span><span>{result.frameCount} frames</span></div>
    <div className="ram-grid">{Array.from({ length: result.frameCount }, (_, i) => {
      const page = current?.frames?.[i] ?? null;
      const before = current?.before?.[i] ?? null;
      const isNew = current && !current.hit && page === current.page && before !== page;
      const isVictim = current && current.victimFrame === i && !current.hit;
      return <div key={i} className={`ram-frame ${page !== null ? 'occupied' : ''} ${isNew ? 'loaded' : ''} ${isVictim ? 'victim' : ''}`}><span className="frame-index">FRAME {String(i + 1).padStart(2, '0')}</span><strong>{page === null ? '—' : page}</strong><span className="frame-status">{page === null ? 'EMPTY' : isNew ? 'LOADED' : isVictim ? 'REPLACED' : 'OCCUPIED'}</span></div>;
    })}</div>
    <div className="request-card"><div className="request-icon"><ArrowDownRight size={19}/></div><div className="request-copy"><span>PAGE REQUEST</span><strong>{current ? `Page ${current.page}` : 'Waiting for simulation'}</strong></div><div className="request-result">{current ? <Tag type={current.hit ? 'hit' : 'fault'}>{current.status}</Tag> : <Tag>NOT STARTED</Tag>}</div></div>
    <div className="explanation"><div className="explanation-icon"><Sparkles size={16}/></div><div><strong>{current ? current.hit ? 'Page hit' : 'Page fault' : 'Ready to simulate'}</strong><p>{current ? current.reason : 'Start playback to see how this algorithm handles each page request.'}</p></div></div>
    <div className="reference-strip"><div className="strip-heading"><span>PAGE REFERENCES</span><span>{step}/{result.refs.length} processed</span></div><div className="reference-list">{result.refs.map((p, i) => { const record = result.history[i]; const isProcessed = i < step; return <div key={i} className={`reference-item ${i === step - 1 ? 'current' : ''} ${isProcessed ? record.hit ? 'ref-hit' : 'ref-fault' : ''}`}><b>{p}</b><small>{i === step - 1 ? 'NOW' : isProcessed ? record.status : i + 1}</small></div>; })}</div></div>
  </section>;
}

export default function App() {
  const [mode, setMode] = useState('simulator');
  const [refsText, setRefsText] = useState(EXAMPLES[0].refs);
  const [frameText, setFrameText] = useState('3');
  const [algorithm, setAlgorithm] = useState('FIFO');
  const [selected, setSelected] = useState(['FIFO', 'LRU', 'Optimal']);
  const [speed, setSpeed] = useState(5);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const activeNames = mode === 'simulator' ? [algorithm] : selected;
  const activeResults = useMemo(() => results ? activeNames.map(n => results[n]).filter(Boolean) : [], [results, activeNames]);
  const maxSteps = activeResults[0]?.history.length || 0;
  const finished = !!results && step >= maxSteps && maxSteps > 0;

  useEffect(() => {
    if (!running || !results || finished) return;
    const timer = window.setInterval(() => setStep(s => {
      const next = s + 1;
      if (next >= maxSteps) setRunning(false);
      return Math.min(next, maxSteps);
    }), Math.max(180, 1250 - speed * 105));
    return () => window.clearInterval(timer);
  }, [running, results, finished, maxSteps, speed]);

  function start() {
    try {
      const { refs, frames } = parseInput(refsText, frameText);
      if (mode === 'comparison' && selected.length < 2) throw new Error('Select at least two algorithms to compare.');
      const names = mode === 'simulator' ? [algorithm] : selected;
      const next = Object.fromEntries(names.map(name => [name, simulate(name, refs, frames)]));
      setResults(next); setStep(0); setRunning(true); setError(''); setShowSummary(false);
    } catch (e) { setError(e.message); setRunning(false); }
  }
  function restart() { setStep(0); setRunning(!!results); setShowSummary(false); }
  function toggleAlgorithm(name) { setSelected(old => old.includes(name) ? old.filter(n => n !== name) : ORDER.filter(n => [...old, name].includes(n))); setResults(null); setStep(0); setRunning(false); setShowSummary(false); }
  function fillExample() { const ex = EXAMPLES[exampleIndex % EXAMPLES.length]; setRefsText(ex.refs); setFrameText(String(ex.frames)); setExampleIndex(i => i + 1); setError(''); }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><Brand/><div><strong>Page Replacement <span>Lab</span></strong><small>OPERATING SYSTEMS · VISUAL SIMULATOR</small></div></div><div className="topbar-right"><span className="online-dot"></span><span>Interactive learning environment</span><span className="version-pill">v1.0</span></div></header>
    <main className="main-content">
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={14}/> VISUALIZE THE INVISIBLE</div><h1>See how memory<br/><em>makes its decisions.</em></h1><p>Explore page replacement algorithms in action. Watch pages move through RAM, understand every page fault, and compare strategies side by side.</p><div className="hero-pills"><span><Check size={14}/> FIFO</span><span><Check size={14}/> LRU</span><span><Check size={14}/> Optimal</span><span className="no-install">No installation required</span></div></div><div className="hero-visual"><div className="visual-orbit orbit-one"></div><div className="visual-orbit orbit-two"></div><div className="chip-card"><Cpu size={27}/><span>MAIN MEMORY</span><strong>RAM</strong><div className="chip-lines"><i/><i/><i/><i/></div></div><div className="float-page page-one">P. 07</div><div className="float-page page-two">P. 12</div><div className="float-page page-three">P. 03</div><div className="visual-caption"><span className="caption-dot"></span> PAGE FLOW ACTIVE</div></div></section>
      <section className="workspace">
        <aside className="control-panel"><div className="section-kicker">WORKSPACE</div><h2>Simulation setup</h2><p className="muted">Configure your memory and choose how to explore.</p>
          <div className="mode-switch"><button className={mode === 'simulator' ? 'active' : ''} onClick={() => {setMode('simulator');setResults(null);setRunning(false);setStep(0);setError('');}}><Activity size={16}/> Simulator</button><button className={mode === 'comparison' ? 'active' : ''} onClick={() => {setMode('comparison');setResults(null);setRunning(false);setStep(0);setError('');}}><Trophy size={16}/> Compare</button></div>
          <label className="field-label" htmlFor="refs">Page reference string <span>REQUIRED</span></label><textarea id="refs" value={refsText} onChange={e => setRefsText(e.target.value)} placeholder="e.g. 1, 2, 3, 1, 4, 2, 5" rows={3}/><div className="field-hint">Separate page numbers with commas or spaces · 0–99</div>
          <div className="frames-row"><div className="frames-label"><label className="field-label" htmlFor="frames">RAM frames</label><span>How many slots in memory?</span></div><div className="number-input"><button onClick={() => setFrameText(String(Math.max(1, Number(frameText || 1) - 1)))} aria-label="Decrease frames">−</button><input id="frames" type="number" min="1" max="8" value={frameText} onChange={e => setFrameText(e.target.value)}/><button onClick={() => setFrameText(String(Math.min(8, Number(frameText || 1) + 1)))} aria-label="Increase frames">+</button></div></div>
          <button className="example-button" onClick={fillExample}><RotateCcw size={14}/> Fill example <span>↗</span></button>
          {mode === 'simulator' ? <><div className="divider"/><label className="field-label">Replacement algorithm</label><div className="algorithm-options">{ORDER.map(n => <button key={n} className={`algorithm-option ${algorithm === n ? 'selected' : ''}`} onClick={() => {setAlgorithm(n);setResults(null);setStep(0);setRunning(false);}}><span className={`algo-dot ${n.toLowerCase()}`}></span><span><strong>{n}</strong><small>{FULL[n]}</small></span><span className="radio-mark">{algorithm === n && <span/>}</span></button>)}</div></> : <><div className="divider"/><label className="field-label">Compare algorithms <span>SELECT 2 OR 3</span></label><div className="check-options">{ORDER.map(n => <button key={n} className={selected.includes(n) ? 'checked' : ''} onClick={() => toggleAlgorithm(n)}><span className="checkbox-mark">{selected.includes(n) && <Check size={13}/>}</span>{n}</button>)}</div><div className="field-hint">All selected algorithms run on the same reference string.</div></>}
          {error && <div className="error-box"><CircleHelp size={16}/><span>{error}</span></div>}
          <button className="start-button" onClick={start}><Play size={17} fill="currentColor"/> Start {mode === 'comparison' ? 'comparison' : 'simulation'} <ArrowRight size={17}/></button>
          <div className="setup-foot"><Zap size={14}/> Runs locally in your browser. Your input stays on this device.</div>
        </aside>
        <section className="simulation-area"><div className="sim-topline"><div><div className="section-kicker">LIVE ENVIRONMENT</div><h2>{mode === 'comparison' ? 'Algorithm comparison' : 'Memory in motion'}</h2></div><div className="live-status"><span className={running ? 'pulse' : ''}></span>{running ? 'PLAYING' : finished ? 'COMPLETED' : results ? 'PAUSED' : 'STANDBY'}</div></div>
          <div className="playback-bar"><div className="playback-controls"><button className="play-control" disabled={!results || finished} onClick={() => setRunning(!running)} aria-label={running ? 'Pause' : 'Play'}>{running ? <Pause size={16}/> : <Play size={16} fill="currentColor"/>}</button><button className="icon-control" disabled={!results} onClick={restart} title="Restart"><RotateCcw size={16}/></button><button className="icon-control" disabled={!results || step >= maxSteps} onClick={() => {setRunning(false);setStep(s => Math.min(maxSteps, s + 1));}} title="Next step"><SkipForward size={16}/></button></div><div className="progress-wrap"><div className="progress-label"><span>{results ? `Reference ${Math.min(step, maxSteps)} of ${maxSteps}` : 'Waiting for input'}</span><span>{maxSteps ? `${Math.round(step / maxSteps * 100)}%` : '0%'}</span></div><div className="progress-track"><div className="progress-fill" style={{width: `${maxSteps ? step / maxSteps * 100 : 0}%`}}/></div></div><div className="speed-control"><Gauge size={15}/><span>Speed</span><input type="range" min="1" max="10" value={speed} onChange={e => setSpeed(Number(e.target.value))}/></div></div>
          {!results ? <div className="empty-state"><div className="empty-illustration"><div className="empty-page p-a">07</div><div className="empty-page p-b">02</div><div className="empty-memory"><span/><span/><span/></div><ArrowRight size={22}/><div className="empty-destination"><Layers3 size={23}/></div></div><h3>Your memory lab is ready</h3><p>Set your page sequence and frame count, then start the simulation to see each memory decision unfold.</p><div className="empty-steps"><span><b>01</b> Set inputs</span><ChevronRight size={15}/><span><b>02</b> Start playback</span><ChevronRight size={15}/><span><b>03</b> Explore results</span></div></div> : <>
            <div className={`panels-grid count-${activeResults.length}`}>{activeResults.map(r => <AlgorithmPanel key={r.name} result={r} step={step} compact={activeResults.length > 1}/>)}</div>
            <div className="results-footer"><div className="legend"><span><i className="legend-hit"/> Page hit</span><span><i className="legend-fault"/> Page fault</span><span><i className="legend-loaded"/> Newly loaded</span></div>{finished && <button className="summary-button" onClick={() => setShowSummary(!showSummary)}><Trophy size={15}/>{showSummary ? 'Hide summary' : 'View final summary'}</button>}</div>
            {showSummary && finished && <div className="summary-card"><div className="summary-title"><div><div className="section-kicker">RUN COMPLETE</div><h3>Results at a glance</h3></div><Tag type="success">{maxSteps} REFERENCES</Tag></div><div className="summary-table"><div className="summary-row summary-header"><span>Algorithm</span><span>Hits</span><span>Faults</span><span>Fault rate</span></div>{activeResults.map(r => <div className="summary-row" key={r.name}><span><i className={`algo-dot ${r.name.toLowerCase()}`}/><b>{r.name}</b></span><span>{r.hits}</span><span>{r.faults}</span><span>{Math.round(r.faults / r.refs.length * 100)}%</span></div>)}</div><p className="summary-note"><Sparkles size={15}/> The lowest fault count indicates fewer trips to disk for this particular reference string. Results can change with a different input or frame count.</p></div>}
          </>}
        </section>
      </section>
      <section className="concept-row"><div className="concept-heading"><div className="section-kicker">QUICK REFERENCE</div><h2>Three strategies.<br/><em>One memory problem.</em></h2><p>Each algorithm makes a different choice when RAM is full.</p></div>{ORDER.map((n, i) => <article className="concept-card" key={n}><div className="concept-top"><span className={`concept-number n-${i}`}>0{i + 1}</span><span className={`algo-dot ${n.toLowerCase()}`}></span></div><h3>{n}</h3><p>{DESC[n]}</p><div className="concept-rule"><span style={{width: `${[45, 70, 88][i]}%`}}/></div><small>{['Arrival order', 'Recent usage', 'Future knowledge'][i]}</small></article>)}</section>
      <footer className="footer"><div className="footer-brand"><Brand/><span>Page Replacement Lab</span></div><span>Built for understanding operating systems, one page at a time.</span><span className="footer-badge"><span/> CLIENT-SIDE · NO BACKEND</span></footer>
    </main>
  </div>;
}
