import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
}

const STYLES = {
  success: { bg: 'rgba(16,124,16,0.12)',  border: 'rgba(16,124,16,0.3)',  color: 'var(--xbox)' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: 'var(--badge-critical-color)' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: 'var(--badge-warning-color)' },
  info:    { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', color: 'var(--badge-info-color)' },
}

let nextId = 1

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((message, type = 'info', duration = 3500) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const confirm = useCallback((message, confirmLabel = 'Confirm', cancelLabel = 'Cancel') => {
    return new Promise((resolve) => {
      const id = nextId++
      const handle = (result) => {
        setToasts(prev => prev.filter(t => t.id !== id))
        resolve(result)
      }
      setToasts(prev => [...prev, { id, message, type: 'confirm', onConfirm: () => handle(true), onCancel: () => handle(false), confirmLabel, cancelLabel }])
    })
  }, [])

  // Stable toast API object — never recreated
  const api = useMemo(() => ({
    show:    (msg, dur) => add(msg, 'info',    dur),
    success: (msg, dur) => add(msg, 'success', dur),
    error:   (msg, dur) => add(msg, 'error',   dur ?? 5000),
    warning: (msg, dur) => add(msg, 'warning', dur),
    info:    (msg, dur) => add(msg, 'info',    dur),
    confirm,
  }), [add, confirm])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            pointerEvents: 'all',
            background: t.type === 'confirm' ? 'var(--bg-elevated)' : STYLES[t.type]?.bg ?? STYLES.info.bg,
            border: `1px solid ${t.type === 'confirm' ? 'var(--border-bright)' : STYLES[t.type]?.border ?? STYLES.info.border}`,
            borderRadius: 10, padding: '12px 14px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)',
            display: 'flex', flexDirection: t.type === 'confirm' ? 'column' : 'row',
            alignItems: t.type === 'confirm' ? 'flex-start' : 'center',
            gap: t.type === 'confirm' ? 12 : 10,
            animation: 'toast-slide-in 0.2s ease-out',
          }}>
            {t.type === 'confirm' ? (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, margin: 0, lineHeight: 1.4 }}>{t.message}</p>
                <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
                  <button onClick={t.onCancel} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>
                    {t.cancelLabel}
                  </button>
                  <button onClick={t.onConfirm} style={{ padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--badge-critical-color)', fontFamily: 'Inter, sans-serif' }}>
                    {t.confirmLabel}
                  </button>
                </div>
              </>
            ) : (
              <>
                {(() => { const Icon = ICONS[t.type]; return Icon ? <Icon size={15} style={{ color: STYLES[t.type]?.color, flexShrink: 0 }} /> : null })()}
                <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, lineHeight: 1.4 }}>{t.message}</span>
                <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', flexShrink: 0, display: 'flex' }}>
                  <X size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <style>{`@keyframes toast-slide-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
