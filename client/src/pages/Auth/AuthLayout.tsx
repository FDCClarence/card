import type { ReactNode } from 'react'

type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-10">
      <section
        className="w-full max-w-md border-2 border-[var(--color-accent)]/50 bg-[var(--color-surface)] p-7"
        style={{
          borderRadius: '6px',
          boxShadow: '4px 4px 0 rgba(0,0,0,0.5), 0 0 32px rgba(192,57,43,0.15)',
        }}
      >
        <header className="mb-7 text-center">
          <h1
            className="text-[var(--color-gold)]"
            style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: 0 }}
          >
            C
          </h1>
          <h2
            className="mt-5 text-[var(--color-text)]"
            style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: 0 }}
          >
            {title}
          </h2>
          <p className="mt-3 text-xs text-[var(--color-muted)]">{subtitle}</p>
        </header>
        {children}
      </section>
    </main>
  )
}
