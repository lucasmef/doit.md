export function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      {/* Illustrated SVG */}
      <svg
        width="140"
        height="120"
        viewBox="0 0 140 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-6 opacity-80"
        aria-hidden="true"
      >
        {/* Shadow */}
        <ellipse cx="70" cy="108" rx="42" ry="6" fill="#ebe4da" />

        {/* Inbox box body */}
        <rect x="18" y="48" width="104" height="60" rx="12" fill="#ffffff" stroke="#e7e1d8" strokeWidth="1.5" />

        {/* Inbox box lid */}
        <path d="M18 68 L42 48 L98 48 L122 68" stroke="#e7e1d8" strokeWidth="1.5" fill="none" />
        <path d="M18 68 Q70 88 122 68" fill="#f8f5f1" stroke="#ddd7cf" strokeWidth="1.5" />

        {/* Checkmark circle — subtle, in the center of the box */}
        <circle cx="70" cy="76" r="18" fill="#f0f7ff" stroke="#bfdbfe" strokeWidth="1.5" />
        <path d="M62 76 l5 5 9-10" stroke="#2f80ed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Small sparkle dots */}
        <circle cx="28" cy="36" r="3" fill="#bfdbfe" />
        <circle cx="112" cy="30" r="2" fill="#e4d8ff" />
        <circle cx="100" cy="14" r="4" fill="#fde4c2" />
        <circle cx="38" cy="18" r="2.5" fill="#d7ecd9" />

        {/* Lines suggesting list items — above the box */}
        <rect x="48" y="10" width="44" height="5" rx="2.5" fill="#ebe4da" />
        <rect x="54" y="20" width="32" height="5" rx="2.5" fill="#f0ece6" />
      </svg>

      <h3 className="text-[18px] font-semibold text-slate-800 mb-2">Inbox limpo! 🎉</h3>
      <p className="text-[14px] text-slate-500 max-w-xs leading-relaxed">
        Nenhum item aqui. Use{' '}
        <kbd className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-surface-soft border border-ui-border-soft text-slate-600">
          ⌘K
        </kbd>{' '}
        para capturar algo novo.
      </p>
    </div>
  )
}
