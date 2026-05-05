import { createContext, useContext, useState, useCallback, useRef } from 'react'
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
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  // Confirmation toast — returns a promise resolving to true/false
  const confirm = useCallback((message, confirmLabel = 'Delete', cancelLabel = 'Cancel') => {
    return new Promise((resolve) => {
      const id = nextId++
      const handleChoice = (result) => {
        setToasts(prev => prev.filter(t => t.id !== id))
        resolve(result)
      }
      setToasts(prev => [...prev, { id, message, type: 'confirm', onConfirm: () => handleChoice(true), onCancel: () => handleChoice(false), confirmLabel, cancelLabel }])
    })
  }, [])

  toast.success = (msg, dur) => toast(msg, 'success', dur)
  toast.error   = (msg, dur) => toast(msg, 'error',   dur ?? 5000)
  toast.warning = (msg, dur) => toast(msg, 'warning', dur)
  toast.info    = (msg, dur) => toast(msg, 'info',    dur)
  toast.confirm = confirm

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            pointerEvents: 'all',
            background: t.type === 'confirm' ? 'var(--bg-elevated)' : STYLES[t.type]?.bg,
            border: `1px solid ${t.type === 'confirm' ? 'var(--border-bright)' : STYLES[t.type]?.border}`,
            borderRadius: 10,
            padding: '12px 14px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: t.type === 'confirm' ? 'column' : 'row',
            alignItems: t.type === 'confirm' ? 'flex-start' : 'flex-start',
            gap: t.type === 'confirm' ? 10 : 10,
            animation: 'toast-in 0.2s ease-out',
          }}>
            {t.type === 'confirm' ? (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, margin: 0 }}>{t.message}</p>
                <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
                  <button onClick={t.onCancel} style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    {t.cancelLabel}
                  </button>
                  <button onClick={t.onConfirm} style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
                    color: 'var(--badge-critical-color)', fontFamily: 'Inter, sans-serif',
                  }}>
                    {t.confirmLabel}
                  </button>
                </div>
              </>
            ) : (
              <>
                {(() => { const Icon = ICONS[t.type]; return Icon ? <Icon size={15} style={{ color: STYLES[t.type].color, flexShrink: 0, marginTop: 1 }} /> : null })()}
                <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, lineHeight: 1.4 }}>{t.message}</span>
                <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
