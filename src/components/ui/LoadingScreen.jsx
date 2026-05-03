export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #107C10, #0A5A0A)', boxShadow: '0 0 32px rgba(16,124,16,0.4)' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, color: '#fff', fontSize: 20 }}>A</span>
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: 3, color: 'var(--text-primary)' }}>
          ARTICLE<span style={{ color: 'var(--xbox)' }}>IQ</span>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--xbox)', animation: `loadingDot 1.2s ease-in-out ${i * 0.18}s infinite` }} />
          ))}
        </div>
        <p style={{ fontSize: 12, fontFamily: 'Fira Code, monospace', color: 'var(--text-muted)' }}>{message}</p>
      </div>
      <style>{`@keyframes loadingDot { 0%,100%{opacity:0.2;transform:scale(0.7)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
    </div>
  )
}
