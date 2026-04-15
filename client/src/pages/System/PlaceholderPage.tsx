type PlaceholderPageProps = {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="rounded-2xl border border-white/10 bg-[var(--color-surface)] px-8 py-6">
        <h1 className="font-[var(--font-display)] text-3xl">{title}</h1>
      </div>
    </main>
  )
}
