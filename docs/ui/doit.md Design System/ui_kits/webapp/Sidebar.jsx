// Sidebar.jsx — left nav with views, tags, notebooks.
function Sidebar({ activeView, onSelectView, onOpenPalette }) {
  const views = [
    { id: 'today',   label: 'Today',     icon: 'today',   count: 7 },
    { id: 'inbox',   label: 'Inbox',     icon: 'inbox',   count: 3 },
    { id: 'starred', label: 'Starred',   icon: 'star' },
    { id: 'all',     label: 'All notes', icon: 'file',    count: 24 },
  ];
  const notebooks = [
    { id: 'work',     label: 'work' },
    { id: 'personal', label: 'personal' },
    { id: 'reading',  label: 'reading-list' },
  ];
  const tags = [
    { id: 'release', label: '#release', color: '#2F6BFF' },
    { id: 'docs',    label: '#docs',    color: '#28C7B7' },
    { id: 'idea',    label: '#idea',    color: '#F5A524' },
    { id: 'bug',     label: '#bug',     color: '#F04438' },
  ];

  return (
    <aside className="sidebar">
      <div className="sb-head">
        <img className="sb-logo" src="../../assets/logo-icon.svg" alt="" />
        <div className="sb-name">doit<span className="dot">.md</span></div>
      </div>
      <div className="sb-search" onClick={onOpenPalette}>
        <Icon name="search" size={14} />
        <span className="grow">Search or jump to…</span>
        <span className="kbd">⌘K</span>
      </div>

      <div className="sb-section">Views</div>
      <div className="sb-list">
        {views.map(v => (
          <div
            key={v.id}
            className={`sb-item ${activeView === v.id ? 'active' : ''}`}
            onClick={() => onSelectView(v.id)}
          >
            <span className="ico"><Icon name={v.icon} size={16} /></span>
            <span>{v.label}</span>
            {v.count != null && <span className="count">{v.count}</span>}
          </div>
        ))}
      </div>

      <div className="sb-section">Notebooks</div>
      <div className="sb-list">
        {notebooks.map(n => (
          <div
            key={n.id}
            className={`sb-item ${activeView === `nb:${n.id}` ? 'active' : ''}`}
            onClick={() => onSelectView(`nb:${n.id}`)}
          >
            <span className="ico"><Icon name="folder" size={16} /></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{n.label}</span>
          </div>
        ))}
      </div>

      <div className="sb-section">Tags</div>
      <div className="sb-list">
        {tags.map(t => (
          <div
            key={t.id}
            className="sb-item"
            onClick={() => onSelectView(`tag:${t.id}`)}
          >
            <span className="tag-dot" style={{ background: t.color }}></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.label}</span>
          </div>
        ))}
      </div>

      <div className="sb-foot">
        <span className="avatar">SR</span>
        <div>
          <div className="name">Sam Reyes</div>
          <div className="sub">synced 2m ago</div>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
