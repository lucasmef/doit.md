// Topbar.jsx — sticky topbar with breadcrumbs and per-screen actions.
function Topbar({ crumbs = [], status = 'Synced just now', actions, onOpenPalette }) {
  return (
    <div className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevron" size={12} stroke={2} />}
            {c.ext ? (
              <span className="file"><span className="ext">{c.ext}</span>{c.label}</span>
            ) : (
              <span className={i === crumbs.length - 1 ? 'file' : ''}>{c.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="actions">
        <span className="status"><span className="dot"></span>{status}</span>
        {actions}
        <button className="btn btn-ghost btn-icon" onClick={onOpenPalette} title="Command (⌘K)">
          <Icon name="search" size={16} />
        </button>
        <button className="btn btn-ghost btn-icon" title="More">
          <Icon name="more" size={16} />
        </button>
      </div>
    </div>
  );
}

window.Topbar = Topbar;
