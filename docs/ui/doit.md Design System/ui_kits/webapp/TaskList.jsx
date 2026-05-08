// TaskList.jsx — markdown-style checkbox list.
// Tasks fade & strike-through when completed.

function TaskCheckbox({ done, onClick }) {
  return (
    <span className={`cb ${done ? 'done' : ''}`} role="checkbox" aria-checked={done} onClick={onClick}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12 9 17 20 6" />
      </svg>
    </span>
  );
}

function TaskList({ tasks, onToggle }) {
  return (
    <ul className="tasks">
      {tasks.map((t, i) => (
        <li key={t.id ?? i} className={t.done ? 'done' : ''}>
          <TaskCheckbox done={t.done} onClick={() => onToggle && onToggle(i)} />
          <span className="label">{t.label}</span>
          {t.tag && <span className="tag">{t.tag}</span>}
          {t.meta && <span className="meta">{t.meta}</span>}
        </li>
      ))}
    </ul>
  );
}

window.TaskList = TaskList;
window.TaskCheckbox = TaskCheckbox;
