import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

const ToastContext = createContext(null)
let nextId = 1

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    timers.current[id] = setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const confirm = useCallback((message, confirmLabel = 'Confirm', cancelLabel = 'Cancel') =>
    new Promise(resolve => {
      const id = nextId++
      const handle = (val) => { setToasts(prev => prev.filter(t => t.id !== id)); resolve(val) }
      setToasts(prev => [...prev, { id, message, type: 'confirm', onConfirm: () => handle(true), onCancel: () => handle(false), confirmLabel, cancelLabel }])
    }), [])

  const toast = useMemo(() => ({
    success: (m, d) => add(m, 'success', d),
    error:   (m, d) => add(m, 'error',   d ?? 6000),
    warning: (m, d) => add(m, 'warning', d),
    info:    (m, d) => add(m, 'info',    d),
    confirm,
  }), [add, confirm])

  const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info }
  const colors = {
    success: { bg: 'var(--green-light)',  border: 'var(--green-border)',  text: 'var(--green)' },
    error:   { bg: 'var(--red-light)',    border: 'var(--red-border)',    text: 'var(--red)'   },
    warning: { bg: 'var(--amber-light)',  border: 'var(--amber-border)',  text: 'var(--amber)' },
    info:    { bg: 'var(--blue-light)',   border: 'var(--blue-border)',   text: 'var(--blue)'  },
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
        {toasts.map(t => {
          const Icon = icons[t.type]
          const c = colors[t.type] || colors.info
          return (
            <div key={t.id} style={{
              background: t.type === 'confirm' ? 'var(--bg-card)' : c.bg,
              border: `1px solid ${t.type === 'confirm' ? 'var(--border-dark)' : c.border}`,
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: t.type === 'confirm' ? 'column' : 'row',
              alignItems: t.type === 'confirm' ? 'stretch' : 'center',
              gap: 10,
              animation: 'fade-up 0.2s ease',
            }}>
              {t.type === 'confirm' ? (
                <>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{t.message}</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={t.onCancel}  className="btn btn-secondary btn-sm">{t.cancelLabel}</button>
                    <button onClick={t.onConfirm} className="btn btn-danger btn-sm">{t.confirmLabel}</button>
                  </div>
                </>
              ) : (
                <>
                  {Icon && <Icon size={16} style={{ color: c.text, flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{t.message}</span>
                  <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                    <X size={14} />
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
