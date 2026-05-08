export function EmptyInbox() {
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center px-4 py-16 text-center">
      <svg
        width="140"
        height="120"
        viewBox="0 0 140 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-6 opacity-80"
        aria-hidden="true"
      >
        <ellipse cx="70" cy="108" rx="42" ry="6" fill="#D9E1EA" opacity="0.55" />
        <rect x="18" y="48" width="104" height="60" rx="12" fill="#FFFFFF" stroke="#D9E1EA" strokeWidth="1.5" />
        <path d="M18 68 L42 48 L98 48 L122 68" stroke="#D9E1EA" strokeWidth="1.5" fill="none" />
        <path d="M18 68 Q70 88 122 68" fill="#ECF0F5" stroke="#B6C2D2" strokeWidth="1.5" />
        <circle cx="70" cy="76" r="18" fill="#EEF4FF" stroke="#B8CFFD" strokeWidth="1.5" />
        <path d="M62 76 l5 5 9-10" stroke="#2F6BFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="28" cy="36" r="3" fill="#B8CFFD" />
        <circle cx="112" cy="30" r="2" fill="#28C7B7" />
        <circle cx="100" cy="14" r="4" fill="#2F6BFF" opacity="0.18" />
        <circle cx="38" cy="18" r="2.5" fill="#28C7B7" opacity="0.3" />
        <rect x="48" y="10" width="44" height="5" rx="2.5" fill="#D9E1EA" />
        <rect x="54" y="20" width="32" height="5" rx="2.5" fill="#ECF0F5" />
      </svg>

      <h3 className="mb-2 text-[18px] font-semibold text-navy-900">Inbox limpo</h3>
      <p className="max-w-xs text-[14px] leading-relaxed text-navy-500">
        Nenhum item aqui. Use{' '}
        <kbd className="inline-flex items-center rounded-md border border-ui-border-strong bg-surface-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-navy-600">
          q
        </kbd>{' '}
        para capturar algo novo.
      </p>
    </div>
  )
}
