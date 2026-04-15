// Context files conventionally export both the provider component and hooks.
/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  exiting: boolean
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType) => void
  dismissToast: (id: string) => void
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD'; toast: Omit<Toast, 'exiting'> }
  | { type: 'BEGIN_EXIT'; id: string }
  | { type: 'REMOVE'; id: string }

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case 'ADD':
      // Keep at most 4 visible; trim oldest if needed
      return [...state.slice(-3), { ...action.toast, exiting: false }]
    case 'BEGIN_EXIT':
      return state.map((t) => (t.id === action.id ? { ...t, exiting: true } : t))
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id)
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

const DISMISS_DELAY_MS = 3400
const EXIT_ANIM_MS = 250

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])
  const counterRef = useRef(0)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: string) => {
    const existing = timersRef.current.get(id)
    if (existing !== undefined) clearTimeout(existing)

    dispatch({ type: 'BEGIN_EXIT', id })

    const removeTimer = setTimeout(() => {
      dispatch({ type: 'REMOVE', id })
      timersRef.current.delete(id)
    }, EXIT_ANIM_MS)

    timersRef.current.set(id, removeTimer)
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      counterRef.current += 1
      const id = `toast-${counterRef.current}`

      dispatch({ type: 'ADD', toast: { id, message, type } })

      const autoDismissTimer = setTimeout(() => {
        dismissToast(id)
      }, DISMISS_DELAY_MS)

      timersRef.current.set(id, autoDismissTimer)
    },
    [dismissToast],
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): Pick<ToastContextValue, 'addToast'> {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return { addToast: ctx.addToast }
}

export function useToastStore(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastStore must be used inside <ToastProvider>')
  return ctx
}
