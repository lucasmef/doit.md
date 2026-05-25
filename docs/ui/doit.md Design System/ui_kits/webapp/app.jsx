// app.jsx — main shell, routing, mock state.

const SAMPLE_TODAY = [
  { id: 1, label: 'Write README for v0.4',      done: true,  tag: '#docs',    meta: '10:42' },
  { id: 2, label: 'Review PRs from @sam',       done: true,  tag: '#release', meta: 'now' },
  { id: 3, label: 'Ship v0.4 release notes',    done: false, tag: '#release', meta: 'today' },
  { id: 4, label: 'Outline Q3 plan',            done: false, tag: '#planning',meta: '2h' },
  { id: 5, label: 'Reply to design feedback',   done: false, meta: 'today' },
  { id: 6, label: 'Migration script · dry-run', done: false, tag: '#bug',     meta: 'tomorrow' },
];

const SAMPLE_NOTES = [
  { id: 'release', title: 'Ship v0.4',      path: 'work/release-notes.md', editedAgo: '12m ago',  progress: 60 },
  { id: 'q3',      title: 'Q3 plan',        path: 'work/q3-plan.md',       editedAgo: '1h ago',   progress: 25 },
  { id: 'meeting', title: 'Meeting notes',  path: 'work/meeting-notes.md', editedAgo: 'Yesterday',tag: '#meeting' },
  { id: 'reading', title: 'Reading list',   path: 'personal/reading.md',   editedAgo: '2d ago',   tag: '#reading' },
  { id: 'ideas',   title: 'Idea capture',   path: 'personal/ideas.md',     editedAgo: '3d ago',   tag: '#idea' },
  { id: 'arch',    title: 'Architecture · sync engine', path: 'work/arch.md', editedAgo: '4d ago', progress: 100 },
];

const NOTE_DETAIL = {
  title: 'Ship v0.4',
  path: 'work/release-notes.md',
  editedAgo: '12 minutes ago',
  wordCount: 412,
  tags: ['#release', '#docs'],
  summary: 'The v0.4 release adds inline checkboxes, a command palette, and a faster sync layer. This note tracks the remaining work and links to the migration plan.',
  goals: [
    { label: 'Stabilize sync round-trip under 200ms', done: true },
    { label: 'Inline checkbox keyboard shortcuts',    done: true },
    { label: 'Command palette covers 90% of actions', done: false },
  ],
  weekTasks: [
    { label: 'Final QA pass on iOS',         done: false, tag: '#release', meta: 'Wed' },
    { label: 'Write changelog draft',        done: true,  tag: '#docs',    meta: 'Mon' },
    { label: 'Update marketing screenshots', done: false, tag: '#docs',    meta: 'Thu' },
    { label: 'Cut tag v0.4.0 in main',       done: false, tag: '#release', meta: 'Fri' },
  ],
};

function App() {
  const [view, setView]       = React.useState('today');   // today | inbox | note
  const [openNote, setOpenNote] = React.useState(null);    // note id when in editor
  const [today, setToday]     = React.useState(SAMPLE_TODAY);
  const [note, setNote]       = React.useState(NOTE_DETAIL);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [toast, setToast]     = React.useState(null);

  // ⌘K opens palette
  React.useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(p => !p);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), 2200);
  }

  function toggleToday(i) {
    setToday(prev => prev.map((t, idx) => idx === i ? { ...t, done: !t.done } : t));
    showToast(today[i].done ? 'Reopened task' : 'Task completed');
  }
  function addToday(label) {
    setToday(prev => [...prev, { id: Date.now(), label, done: false, meta: 'today' }]);
    showToast('Task added');
  }
  function toggleNoteTask(field, i) {
    setNote(prev => ({ ...prev, [field]: prev[field].map((t, idx) => idx === i ? { ...t, done: !t.done } : t) }));
  }

  function selectView(id) {
    if (id === 'today') { setView('today'); setOpenNote(null); }
    else if (id === 'inbox' || id === 'all') { setView('inbox'); setOpenNote(null); }
    else if (id.startsWith('nb:') || id.startsWith('tag:')) { setView('inbox'); setOpenNote(null); }
    else if (id === 'starred') { setView('inbox'); setOpenNote(null); }
  }
  function openNoteById(id) {
    setOpenNote(id);
    setView('note');
  }
  function paletteAction(it) {
    setPaletteOpen(false);
    if (it.id === 'go-today') selectView('today');
    else if (it.id === 'jump-release') openNoteById('release');
    else if (it.id === 'jump-q3') openNoteById('q3');
    else if (it.id === 'jump-meeting') openNoteById('meeting');
    else if (it.id === 'new-task') { selectView('today'); showToast('Compose a task below'); }
    else if (it.id === 'new-note') showToast('New note (mock)');
  }

  const crumbs =
    view === 'today' ? [{ label: 'sam' }, { label: 'today' }]
    : view === 'inbox' ? [{ label: 'sam' }, { label: 'all-notes' }]
    : [{ label: 'sam' }, { label: 'work' }, { ext: 'M↓ ', label: (note.path.split('/').pop()) }];

  const activeView = view === 'today' ? 'today' : view === 'inbox' ? 'all' : '';

  return (
    <div className="app">
      <Sidebar
        activeView={activeView}
        onSelectView={selectView}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <main className="main">
        <Topbar
          crumbs={crumbs}
          status={view === 'note' ? 'Synced just now' : 'Synced 2m ago'}
          onOpenPalette={() => setPaletteOpen(true)}
          actions={view === 'note' ? (
            <>
              <button className="btn btn-ghost"><Icon name="share" size={14} />Share</button>
              <button className="btn btn-secondary"><Icon name="star" size={14} />Pin</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary"><Icon name="plus" size={14} />New note</button>
            </>
          )}
        />
        <div className="content">
          {view === 'today' && (
            <TodayView tasks={today} onToggle={toggleToday} onAddTask={addToday} />
          )}
          {view === 'inbox' && (
            <InboxView notes={SAMPLE_NOTES} onOpen={openNoteById} />
          )}
          {view === 'note' && (
            <NoteEditor note={note} onToggleTask={toggleNoteTask} />
          )}
        </div>
      </main>

      {/* Right rail — keyboard cheat-sheet & today summary */}
      <aside className="rail">
        <h4>Today's progress</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="64" height="64" viewBox="0 0 56 56">
            <defs><linearGradient id="rg" x1="0" y1="0" x2="56" y2="56"><stop offset="0" stopColor="#2F6BFF"/><stop offset="1" stopColor="#28C7B7"/></linearGradient></defs>
            <circle cx="28" cy="28" r="22" fill="none" stroke="#D9E1EA" strokeWidth="6"/>
            <circle cx="28" cy="28" r="22" fill="none" stroke="url(#rg)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray="138.2"
              strokeDashoffset={138.2 - (today.filter(t => t.done).length / today.length) * 138.2}
              transform="rotate(-90 28 28)"
            />
          </svg>
          <div>
            <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', lineHeight: 1 }}>
              {today.filter(t => t.done).length} / {today.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 4 }}>tasks done today</div>
          </div>
        </div>

        <h4>Streak</h4>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 14 }).map((_, i) => {
            const filled = i < 12;
            const today = i === 12;
            return (
              <div key={i} style={{
                width: 14, height: 24, borderRadius: 4,
                background: filled ? 'var(--c-teal)' : today ? 'var(--c-vivid-blue)' : 'var(--c-gray-100)',
                opacity: today ? 1 : (filled ? 1 : 1)
              }} />
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 8 }}>12-day streak · keep it going</div>

        <h4>Shortcuts</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          {[
            ['Open palette', '⌘ K'],
            ['New task', '⌘ N'],
            ['Toggle Today', '⌘ 1'],
            ['Toggle done', '⌘ ↵'],
            ['Search', '/'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-2)' }}>
              <span>{k}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg-sunken)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4 }}>{v}</span>
            </div>
          ))}
        </div>

        <h4>Recent</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SAMPLE_NOTES.slice(0, 4).map(n => (
            <div key={n.id} onClick={() => openNoteById(n.id)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--c-vivid-blue)', fontFamily: 'var(--font-mono)', marginRight: 6, fontWeight: 600 }}>M↓</span>
                {n.title}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', flexShrink: 0, marginLeft: 8 }}>{n.editedAgo}</span>
            </div>
          ))}
        </div>
      </aside>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onAction={paletteAction} />}
      {toast && (
        <div className="toast">
          <span className="check">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12 9 17 20 6"/></svg>
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
