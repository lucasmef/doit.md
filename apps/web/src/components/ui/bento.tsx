'use client'

type BaseProps = {
  children: React.ReactNode
  className?: string
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function BentoWallpaper({ children, className }: BaseProps) {
  return (
    <div
      className={cx(
        'relative min-h-full overflow-hidden bg-[#dbe7ff]',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(900px_700px_at_8%_15%,rgba(123,91,255,.42),transparent_62%),radial-gradient(780px_560px_at_92%_10%,rgba(255,111,174,.30),transparent_60%),radial-gradient(850px_720px_at_78%_82%,rgba(40,199,183,.42),transparent_62%),radial-gradient(900px_780px_at_12%_94%,rgba(47,107,255,.40),transparent_64%),linear-gradient(135deg,#b7c9ff_0%,#ddd6fe_34%,#fbc9f0_60%,#cff3ee_100%)]',
        'after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(rgba(255,255,255,.11)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.10)_1px,transparent_1px)] after:bg-[size:38px_38px] after:opacity-45',
        className,
      )}
    >
      <div className="relative z-10 min-h-full">{children}</div>
    </div>
  )
}

export function BentoGrid({ children, className }: BaseProps) {
  return (
    <div
      className={cx(
        'grid gap-3 md:grid-cols-6 lg:grid-cols-12 lg:gap-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

type CardProps = BaseProps & {
  as?: 'section' | 'div' | 'article'
}

export function GlassCard({ children, className, as = 'section' }: CardProps) {
  const Component = as
  return (
    <Component
      className={cx(
        'rounded-[28px] border border-white/55 bg-white/62 shadow-[0_1px_0_rgba(255,255,255,.72)_inset,0_22px_55px_rgba(15,35,66,.16)] backdrop-blur-2xl',
        className,
      )}
    >
      {children}
    </Component>
  )
}

export function DarkGlowCard({ children, className, as = 'section' }: CardProps) {
  const Component = as
  return (
    <Component
      className={cx(
        'relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#0b1733_0%,#0f2342_60%,#122a55_100%)] text-white shadow-[0_24px_60px_rgba(15,35,66,.28)]',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(260px_80px_at_50%_100%,rgba(123,91,255,.55),transparent_70%),radial-gradient(180px_50px_at_20%_10%,rgba(40,199,183,.24),transparent_72%)]',
        className,
      )}
    >
      <div className="relative z-10">{children}</div>
    </Component>
  )
}

export function CardTitle({ children, className }: BaseProps) {
  return (
    <div className={cx('font-mono text-[10px] font-bold uppercase tracking-[0.13em] text-navy-500', className)}>
      {children}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  tone = 'light',
  className,
}: {
  label: string
  value: string | number
  detail?: string
  tone?: 'light' | 'dark'
  className?: string
}) {
  return (
    <div
      className={cx(
        'rounded-[18px] px-4 py-3',
        tone === 'dark'
          ? 'bg-white/10 text-white ring-1 ring-white/10'
          : 'bg-white/58 text-navy-900 ring-1 ring-white/50',
        className,
      )}
    >
      <div className={cx('font-mono text-[10px] font-bold uppercase tracking-[0.1em]', tone === 'dark' ? 'text-white/58' : 'text-navy-400')}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-black leading-none tracking-normal">{value}</div>
      {detail ? (
        <div className={cx('mt-1 text-[12px]', tone === 'dark' ? 'text-white/62' : 'text-navy-500')}>
          {detail}
        </div>
      ) : null}
    </div>
  )
}

export function FolderChip({
  children,
  count,
  active,
  className,
}: BaseProps & {
  count?: number
  active?: boolean
}) {
  return (
    <span
      className={cx(
        'inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold',
        active
          ? 'border-white/70 bg-white/80 text-brand-700 shadow-cool-sm'
          : 'border-white/45 bg-white/42 text-navy-700',
        className,
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      {count !== undefined ? (
        <span className="font-mono text-[10px] text-navy-400">{count}</span>
      ) : null}
    </span>
  )
}

export function MarkdownFileBadge({ children, dark = false }: BaseProps & { dark?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-1 font-mono text-[10px] font-bold',
        dark ? 'bg-white/10 text-cyan-100' : 'bg-brand-50 text-brand-700',
      )}
    >
      M↓ {children}
    </span>
  )
}

export function AuditRiskBadge({
  risk,
}: {
  risk: 'low' | 'medium' | 'high' | string
}) {
  const label = risk === 'low' ? 'baixo' : risk === 'medium' ? 'medio' : risk === 'high' ? 'alto' : risk
  const tone =
    risk === 'high'
      ? 'bg-red-50 text-red-700'
      : risk === 'medium'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-teal-50 text-teal-700'

  return (
    <span className={cx('rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase', tone)}>
      {label}
    </span>
  )
}
