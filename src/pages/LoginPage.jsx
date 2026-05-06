import { signInWithGoogle } from '@/lib/supabase'
import { Scan } from 'lucide-react'

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, background: 'var(--green)', borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Scan size={26} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>ArticleIQ</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Knowledge base quality scanner</p>
        </div>

        {/* Card */}
        <div className="card card-padded animate-in">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 6 }}>Welcome back</h2>
          <p style={{ fontSize: 14, marginBottom: 24 }}>Sign in to scan and improve your knowledge base.</p>

          <button onClick={signInWithGoogle} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 18px', fontSize: 15 }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#fff" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"/>
              <path fill="#fff" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
              <path fill="#fff" d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"/>
              <path fill="#fff" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.87 13.04C2.35 15.98 5.48 18 9 18z"/>
            </svg>
            Continue with Google
          </button>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
            By signing in, you agree to our terms of service.
          </p>
        </div>
      </div>
    </div>
  )
}
