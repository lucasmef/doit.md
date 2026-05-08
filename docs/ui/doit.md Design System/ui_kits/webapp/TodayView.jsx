// TodayView.jsx — the daily focus screen.
// Header with date + progress meter, list of today's tasks, plus a composer
// to add a new task. Mostly mocked; the composer is wired so users can type.

function TodayView({ tasks, onToggle, onAddTask }) {
  const [draft, setDraft] = React.useState('');
  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  function submit(e) {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return;
    onAddTask(v);
    setDraft('');
  }

  return (
    <div className="col">
      <div className="today-head">
        <div>
          <h1>Today</h1>
          <div className="date">{today.toLowerCase()}</div>
        </div>
        <div className="today-meter">
          <span>{done} / {total} done</span>
          <div className="meter"><div className="meter-fill" style={{ width: `${pct}%` }}></div></div>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{pct}%</span>
        </div>
      </div>

      <TaskList tasks={tasks} onToggle={onToggle} />

      <form className="composer" onSubmit={submit}>
        <Icon name="plus" size={16} />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="- [ ] add a task and press enter"
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>↵</span>
      </form>

      <div style={{ marginTop: 30 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
          Pinned notes
        </div>
        <div className="grid-2">
          <div className="card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--c-vivid-blue)', fontWeight: 600 }}>M↓</span>
              <span>release-notes.md</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>Ship v0.4</div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4, lineHeight: 1.5 }}>
              Inline checkboxes, command palette, faster sync. Final polish before Friday.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
              <div style={{ width: 60, height: 5, borderRadius: 999, background: 'var(--c-gray-100)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '60%', background: 'var(--brand-gradient)' }}></div>
              </div>
              3 / 5 done · 2d
            </div>
          </div>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--c-vivid-blue)', fontWeight: 600 }}>M↓</span>
              <span>q3-plan.md</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>Q3 plan</div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4, lineHeight: 1.5 }}>
              Targets, owners, and the one risk we're willing to accept this quarter.
            </div>
            <div style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>
              edited 12m ago · @sam
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.TodayView = TodayView;
