// NoteEditor.jsx — the markdown editor view. Title + tags + body.
// Body content is rendered as faux-markdown HTML for fidelity, not real parsing.

function NoteEditor({ note, onToggleTask }) {
  return (
    <div className="col">
      <div className="note-head">
        <div className="note-meta">
          <span style={{ color: 'var(--c-vivid-blue)', fontWeight: 600 }}>M↓</span>
          <span>{note.path}</span>
          <span className="dot">·</span>
          <span>edited {note.editedAgo}</span>
          <span className="dot">·</span>
          <span>{note.wordCount} words</span>
        </div>
        <input className="note-title" defaultValue={note.title} />
        <div className="note-tags">
          {note.tags.map(t => (
            <span key={t} className={`tag ${t === '#docs' ? 'teal' : ''}`}>{t}</span>
          ))}
        </div>
      </div>

      <div className="md">
        <p>{note.summary}</p>

        <h2>Goals</h2>
        <ul className="tasks">
          {note.goals.map((g, i) => (
            <li key={i}><TaskCheckbox done={g.done} onClick={() => onToggleTask('goals', i)} /><span className="label" style={g.done ? { color: 'var(--fg-3)', textDecoration: 'line-through' } : {}}>{g.label}</span></li>
          ))}
        </ul>

        <h2>Tasks for this week</h2>
        <TaskList tasks={note.weekTasks} onToggle={(i) => onToggleTask('weekTasks', i)} />

        <h2>Notes</h2>
        <p>
          The launch checklist lives in <code>release-notes.md</code>. Owners are tagged inline. We
          ship behind the <code>v0_4</code> flag and roll forward from there.
        </p>

        <pre><span className="h"># shortcuts</span>{"\n"}<span className="acc">⌘</span> K  ·  open palette{"\n"}<span className="acc">⌘</span> N  ·  new note{"\n"}<span className="acc">⌘</span> ↵  ·  toggle task</pre>

        <blockquote>
          Capture is cheap. Organize is the work. Ship is the point.
        </blockquote>

        <p>Ping <a href="#">@sam</a> when the migration script lands. See <a href="#">q3-plan.md</a> for the wider context.</p>
      </div>
    </div>
  );
}

window.NoteEditor = NoteEditor;
