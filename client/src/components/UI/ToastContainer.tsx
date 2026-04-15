import { useToastStore } from '../../context/ToastContext'
import type { Toast, ToastType } from '../../context/ToastContext'

// ─── Icon & colour per type ───────────────────────────────────────────────────

const TOAST_META: Record<
  ToastType,
  { icon: string; accentColor: string; bg: string }
> = {
  success: { icon: '✓', accentColor: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  error:   { icon: '✕', accentColor: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
  info:    { icon: 'i', accentColor: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
}

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const meta = TOAST_META[toast.type]

  return (
    <div
      role="status"
      aria-live="polite"
      className={toast.exiting ? 'toast-exit' : 'toast-enter'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: meta.bg,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px ${meta.accentColor}30`,
        maxWidth: '340px',
        minWidth: '220px',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Accent icon circle */}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: meta.accentColor,
          color: '#0f1117',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 900,
          marginTop: 1,
        }}
      >
        {meta.icon}
      </span>

      {/* Message */}
      <span
        style={{
          flex: 1,
          fontSize: 14,
          lineHeight: 1.45,
          color: 'var(--color-text)',
        }}
      >
        {toast.message}
      </span>

      {/* Dismiss button */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          color: 'var(--color-muted)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: '0 2px',
          marginTop: 1,
          transition: 'color 150ms',
        }}
        onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)')}
        onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)')}
      >
        ×
      </button>
    </div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  )
}
