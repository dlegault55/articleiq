export default function LoadingScreen({ message = 'Initializing...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-0 grid-overlay">
      <div className="flex flex-col items-center gap-6">
        {/* Logo mark */}
        <div className="relative">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #107C10, #0A5A0A)', boxShadow: '0 0 40px rgba(16,124,16,0.5)' }}>
            <span className="font-display font-bold text-white text-2xl">A</span>
          </div>
          <div className="absolute inset-0 rounded-xl animate-pulse-glow" />
        </div>

        {/* Brand */}
        <div className="text-center">
          <div className="font-display font-bold text-xl tracking-widest" style={{ color: 'var(--text-primary)' }}>
            ARTICLE<span style={{ color: 'var(--xbox)' }}>IQ</span>
          </div>
        </div>

        {/* Spinner */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--xbox)',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                boxShadow: '0 0 6px var(--xbox-glow)',
              }}
            />
          ))}
        </div>

        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{message}</p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
