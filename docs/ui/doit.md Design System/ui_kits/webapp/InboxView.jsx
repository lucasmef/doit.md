// InboxView.jsx — list of all notes (markdown files). Click a row to open.

function InboxView({ notes, onOpen }) {
  return (
    <div className="col">
      <div className="today-head">
        <div>
          <h1>All notes</h1>
          <div className="date">{notes.length} files · sorted by edited</div>
        </div>
        <div className="row">
          <button className="btn btn-secondary"><Icon name="plus" size={14} />New note</button>
        </div>
      </div>

      <div className="inbox">
        {notes.map(n => (
          <div key={n.id} className="inbox-row" onClick={() => onOpen(n.id)}>
            <Icon name="file" size={16} stroke={1.75} style={{ color: 'var(--fg-2)' }} />
            <div className="title">
              <span className="ext">M↓</span>{n.title}
              <span style={{ color: 'var(--fg-3)', fontWeight: 400, fontFamily: 'var(--font-mono)', fontSize: 12, marginLeft: 8 }}>{n.path}</span>
            </div>
            {n.progress != null ? (
              <div className="progress"><div className="progress-fill" style={{ width: `${n.progress}%` }}></div></div>
            ) : (
              <span className="meta">{n.tag || ''}</span>
            )}
            <span className="meta">{n.editedAgo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.InboxView = InboxView;
