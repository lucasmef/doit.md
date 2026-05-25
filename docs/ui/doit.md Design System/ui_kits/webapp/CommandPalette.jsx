// CommandPalette.jsx — ⌘K overlay.
function CommandPalette({ onClose, onAction }) {
  const [q, setQ] = React.useState('');
  const inputRef = React.useRef(null);
  React.useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);

  const items = [
    { section: 'Actions', icon: 'plus', label: 'New task',      kbd: '⌘ N', id: 'new-task' },
    { section: 'Actions', icon: 'file', label: 'New note',      kbd: '⌘ ⇧ N', id: 'new-note' },
    { section: 'Actions', icon: 'today', label: 'Toggle Today', kbd: '⌘ 1', id: 'go-today' },
    { section: 'Jump to', icon: 'file', label: 'release-notes.md', kbd: '↵', id: 'jump-release' },
    { section: 'Jump to', icon: 'file', label: 'q3-plan.md', kbd: '↵', id: 'jump-q3' },
    { section: 'Jump to', icon: 'file', label: 'meeting-notes.md', kbd: '↵', id: 'jump-meeting' },
  ];
  const filtered = q
    ? items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()))
    : items;

  // Group by section preserving order
  const groups = [];
  filtered.forEach(it => {
    let g = groups.find(g => g.section === it.section);
    if (!g) { g = { section: it.section, items: [] }; groups.push(g); }
    g.items.push(it);
  });

  return (
    <div className="palette-bg" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-search">
          <Icon name="search" size={16} style={{ color: 'var(--fg-3)' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command or jump to a note…"
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)' }}>esc</span>
        </div>
        <div className="palette-list">
          {groups.length === 0 && (
            <div style={{ padding: '20px 14px', color: 'var(--fg-3)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              No results for "{q}"
            </div>
          )}
          {groups.map(g => (
            <div key={g.section}>
              <div className="palette-section">{g.section}</div>
              {g.items.map((it, idx) => (
                <div
                  key={it.id}
                  className={`palette-item ${idx === 0 && g === groups[0] ? 'active' : ''}`}
                  onClick={() => { onAction(it); }}
                >
                  <span className="ic"><Icon name={it.icon} size={16} /></span>
                  <span>{it.label}</span>
                  <span className="kbd">{it.kbd}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.CommandPalette = CommandPalette;
