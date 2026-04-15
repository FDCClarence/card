import type { ReactNode } from 'react'

type AuthLayoutProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-surface)]/95 p-7 shadow-[0_0_28px_rgba(233,69,96,0.22)] backdrop-blur-sm">
        <header className="mb-7 text-center">
          <h1 className="font-[var(--font-display)] text-4xl text-[var(--color-text)]">CardGame</h1>
          <h2 className="mt-4 text-2xl font-bold text-[var(--color-text)]">{title}</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{subtitle}</p>
        </header>
        {children}
      </section>
    </main>
  )
}
