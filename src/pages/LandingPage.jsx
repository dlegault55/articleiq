import { Link } from 'react-router-dom'
import { CheckCircle, Scan, ArrowRight, AlertOctagon, AlertTriangle, BookOpen, Tag, Clock, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans', sans-serif", background:'#F7F7F5', color:'#1A1A18' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .land-btn { display:inline-flex; align-items:center; gap:7px; padding:10px 20px; border-radius:8px; font-family:inherit; font-size:13px; font-weight:700; text-decoration:none; cursor:pointer; border:none; transition:opacity 0.15s; }
        .land-btn:hover { opacity: 0.85; }
        .land-btn-navy { background:#1B2D5B; color:white; }
        .land-btn-outline { background:white; color:#1A1A18; border:1px solid #E8E8E6; }
        .land-btn-ghost { background:transparent; color:#1B2D5B; }
      `}</style>

      {/* ── Nav ── */}
      <nav className='landing-nav' style={{ background:'rgba(247,247,245,0.92)', backdropFilter:'blur(12px)', borderBottom:'1px solid #E8E8E6', padding:'0 48px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:26, height:26, background:'#1B2D5B', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Scan size={13} color="white" />
          </div>
          <span style={{ fontWeight:800, fontSize:15, letterSpacing:-0.3 }}>Article<span style={{ color:'#107C10' }}>IQ</span></span>
        </div>
        <div className='landing-nav-links' style={{ display:'flex', alignItems:'center', gap:8 }}>
          <a href="#pricing" className="land-btn land-btn-ghost" style={{ padding:'7px 14px' }}>Pricing</a>
          <Link to="/login" className="land-btn land-btn-outline" style={{ padding:'7px 16px' }}>Sign in</Link>
          <Link to="/login" className="land-btn land-btn-navy">Get started free</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className='landing-hero' style={{ padding:'80px 48px 60px', maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center' }}>
        <div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:100, background:'#EBF5EB', border:'1px solid #A8D5A8', marginBottom:20 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#107C10' }} />
            <span style={{ fontSize:12, fontWeight:700, color:'#107C10' }}>Free to start — no credit card required</span>
          </div>
          <h1 style={{ fontSize:48, fontWeight:800, letterSpacing:-2, lineHeight:1.05, marginBottom:20, color:'#1A1A18' }}>
            Find what's hurting your knowledge base
          </h1>
          <p style={{ fontSize:17, color:'#4A4A48', lineHeight:1.7, marginBottom:28, maxWidth:460 }}>
            ArticleIQ scans every article in your Zendesk® knowledge base and tells you exactly what's causing customers to call support instead of finding answers themselves.
          </p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <Link to="/login" className="land-btn land-btn-navy" style={{ fontSize:14, padding:'12px 24px' }}>
              Scan your knowledge base <ArrowRight size={15} />
            </Link>
            <span style={{ fontSize:13, color:'#9B9B98' }}>Connects in 2 minutes</span>
          </div>
        </div>

        {/* Hero visual — health score mock */}
        <div style={{ background:'#1B2D5B', borderRadius:16, padding:'24px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
          <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Knowledge base health</p>
          <div style={{ fontSize:72, fontWeight:800, color:'white', lineHeight:1, letterSpacing:-3, marginBottom:4 }}>74</div>
          <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.75)', marginBottom:16 }}>Needs attention</div>
          <div style={{ display:'flex', gap:6, marginBottom:16 }}>
            <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(192,57,43,0.35)', color:'#FFAAAA', fontSize:11, fontWeight:700 }}>12 critical</div>
            <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(255,200,80,0.18)', color:'#FFD980', fontSize:11, fontWeight:700 }}>49 warnings</div>
            <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.65)', fontSize:11 }}>1,169 clean</div>
          </div>
          {/* Sample issue cards */}
          {[
            { label:'Critical', title:'Low readability', desc:'Score 29 — customers struggle to follow', color:'#FFAAAA', bar:'rgba(192,57,43,0.8)' },
            { label:'Warning',  title:'Outdated article', desc:'Not updated in 214 days', color:'#FFD980', bar:'rgba(217,119,6,0.8)' },
          ].map(({ label, title, desc, color, bar }) => (
            <div key={title} style={{ background:'rgba(255,255,255,0.07)', borderRadius:9, padding:'10px 12px', marginBottom:8, display:'flex', alignItems:'center', gap:10, borderLeft:`3px solid ${bar}` }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                  <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color }}>{label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'white' }}>{title}</span>
                </div>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Checks ── */}
      <section style={{ padding:'clamp(32px,6vw,60px) clamp(20px,5vw,48px)', background:'white', borderTop:'1px solid #E8E8E6', borderBottom:'1px solid #E8E8E6' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9B9B98', textAlign:'center', marginBottom:10 }}>What we scan for</p>
          <h2 style={{ fontSize:30, fontWeight:800, textAlign:'center', letterSpacing:-0.8, marginBottom:40, color:'#1A1A18' }}>Six checks. One health score.</h2>
          <div className='landing-checks' style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              { icon:Clock,       title:'Outdated content',    desc:'Articles not updated in 180+ days. Your instructions may be wrong.' },
              { icon:BookOpen,    title:'Readability score',   desc:'Flesch-Kincaid scoring on every article. Low scores mean customers call instead of reading.' },
              { icon:Zap,         title:'Thin content',        desc:'Articles under 150 words rarely answer real questions. We flag them automatically.' },
              { icon:Tag,         title:'Missing labels',      desc:'Untagged articles are invisible in search. We suggest labels with AI.' },
              { icon:AlertOctagon,title:'Duplicate detection', desc:'Similar articles split traffic and confuse customers. We compare titles across your KB.' },
              { icon:AlertTriangle,title:'Broken links',       desc:'Dead links inside articles destroy trust. We check every hyperlink.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ padding:'18px', borderRadius:10, border:'1px solid #E8E8E6', background:'#FAFAF8' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'#F0F3FA', border:'1px solid #C8D4F0', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <Icon size={15} style={{ color:'#1B2D5B' }} />
                </div>
                <p style={{ fontSize:13, fontWeight:700, color:'#1A1A18', marginBottom:5 }}>{title}</p>
                <p style={{ fontSize:12, color:'#6B6B68', lineHeight:1.65, margin:0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI ── */}
      <section style={{ padding:'clamp(32px,6vw,60px) clamp(20px,5vw,48px)' }}>
        <div className='landing-ai' style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }}>
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:100, background:'#FEF9EC', border:'1px solid #F5D98A', marginBottom:16 }}>
              <Zap size={12} style={{ color:'#D97706' }} />
              <span style={{ fontSize:11, fontWeight:700, color:'#D97706' }}>Pro feature</span>
            </div>
            <h2 style={{ fontSize:30, fontWeight:800, letterSpacing:-0.8, marginBottom:14, color:'#1A1A18', lineHeight:1.2 }}>
              Fix issues with AI, not manual editing
            </h2>
            <p style={{ fontSize:15, color:'#4A4A48', lineHeight:1.7, marginBottom:20 }}>
              ArticleIQ uses Claude to improve your articles in one click — better grammar, clearer structure, and suggested labels. Review the result and publish directly to Zendesk®.
            </p>
            {[
              'Fix grammar and rewrite for clarity in a single pass',
              'Publish the improved article directly to Zendesk®',
              'Quality scoring with specific improvement suggestions',
              'AI-suggested labels based on article content',
            ].map(f => (
              <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                <CheckCircle size={14} style={{ color:'#107C10', flexShrink:0, marginTop:2 }} />
                <span style={{ fontSize:13, color:'#4A4A48' }}>{f}</span>
              </div>
            ))}
          </div>
          {/* AI mock */}
          <div style={{ background:'white', borderRadius:14, border:'1px solid #E8E8E6', overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #E8E8E6', background:'#FAFAF8', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#9B9B98', textTransform:'uppercase', letterSpacing:'0.08em' }}>ArticleIQ Rewrite</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', height:200 }}>
              <div style={{ padding:'16px', borderRight:'1px solid #E8E8E6', overflow:'hidden' }}>
                <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9B9B98', marginBottom:8 }}>Original</p>
                <p style={{ fontSize:11, color:'#9B9B98', lineHeight:1.7 }}>Users cannot reset their password using the self-service portal. The reset email is delivered but clicking the link returns an error page. This affects all users on the Enterprise plan...</p>
              </div>
              <div style={{ padding:'16px', background:'#FAFFFE', overflow:'hidden' }}>
                <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#107C10', marginBottom:8 }}>Improved</p>
                <p style={{ fontSize:11, fontWeight:700, color:'#1A1A18', marginBottom:6 }}>Password Reset Link Returns an Error</p>
                <p style={{ fontSize:10, fontWeight:700, color:'#4A4A48', marginBottom:4 }}>Problem</p>
                <p style={{ fontSize:11, color:'#6B6B68', lineHeight:1.7 }}>The self-service password reset link expires after 15 minutes. If the link is clicked after this window, users see a generic error page...</p>
              </div>
            </div>
            <div style={{ padding:'10px 16px', borderTop:'1px solid #E8E8E6', display:'flex', justifyContent:'flex-end', gap:8 }}>
              <div style={{ padding:'6px 14px', borderRadius:7, background:'#F0F0EE', color:'#6B6B68', fontSize:11, fontWeight:600 }}>Copy text</div>
              <div style={{ padding:'6px 14px', borderRadius:7, background:'#1B2D5B', color:'white', fontSize:11, fontWeight:700 }}>Publish to Zendesk® →</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding:'clamp(32px,6vw,60px) clamp(20px,5vw,48px)', background:'white', borderTop:'1px solid #E8E8E6' }}>
        <div style={{ maxWidth:780, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9B9B98', textAlign:'center', marginBottom:10 }}>Pricing</p>
          <h2 style={{ fontSize:30, fontWeight:800, textAlign:'center', letterSpacing:-0.8, marginBottom:40, color:'#1A1A18' }}>Simple, honest pricing</h2>
          <div className='landing-pricing' style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

            {/* Free */}
            <div style={{ borderRadius:14, padding:'24px', border:'1px solid #E8E8E6', background:'#FAFAF8' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#6B6B68', marginBottom:6 }}>Free</p>
              <div style={{ fontSize:40, fontWeight:800, color:'#1A1A18', letterSpacing:-1.5, lineHeight:1, marginBottom:6 }}>$0</div>
              <p style={{ fontSize:13, color:'#6B6B68', marginBottom:20, lineHeight:1.6 }}>Try ArticleIQ on your first 300 articles. No credit card required.</p>
              <div style={{ marginBottom:24 }}>
                {[
                  { text:'Up to 300 articles per scan', on:true },
                  { text:'All quality checks', on:true },
                  { text:'Readability + duplicate detection', on:true },
                  { text:'Excel export + shareable reports', on:true },
                  { text:'AI Improve Article', on:false },
                  { text:'AI Quality Score', on:false },
                  { text:'Email notifications', on:false },
                ].map(({ text, on }) => (
                  <div key={text} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7, opacity: on ? 1 : 0.4 }}>
                    <CheckCircle size={13} style={{ color: on ? '#107C10' : '#9B9B98', flexShrink:0 }} />
                    <span style={{ fontSize:13, color:'#1A1A18' }}>{text}</span>
                  </div>
                ))}
              </div>
              <Link to="/login" className="land-btn land-btn-outline" style={{ width:'100%', justifyContent:'center' }}>Get started free</Link>
            </div>

            {/* Pro */}
            <div style={{ borderRadius:14, padding:'24px', border:'2px solid #1B2D5B', background:'white', position:'relative' }}>
              <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'#1B2D5B', color:'white', fontSize:10, fontWeight:700, padding:'3px 14px', borderRadius:100, whiteSpace:'nowrap' }}>Most popular</div>
              <p style={{ fontSize:13, fontWeight:700, color:'#6B6B68', marginBottom:6 }}>Pro</p>
              <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:6 }}>
                <span style={{ fontSize:40, fontWeight:800, color:'#1A1A18', letterSpacing:-1.5, lineHeight:1 }}>$99</span>
                <span style={{ fontSize:14, color:'#9B9B98' }}>/month</span>
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', background:'#F0F3FA', border:'1px solid #C8D4F0', borderRadius:7, marginBottom:14 }}>
                <span style={{ fontSize:12, fontWeight:800, color:'#1B2D5B' }}>$790/year</span>
                <span style={{ fontSize:11, color:'#4A4A48' }}>— 2 months free, save $398</span>
              </div>
              <p style={{ fontSize:13, color:'#6B6B68', marginBottom:20, lineHeight:1.6 }}>Unlimited articles, AI-powered fixes, and direct email notifications.</p>
              <div style={{ marginBottom:24 }}>
                {[
                  'Unlimited articles per scan',
                  'Everything in Free',
                  'AI Improve Article — grammar + rewrite',
                  'Publish improvements directly to Zendesk®',
                  'AI Quality Score',
                  'AI label suggestions',
                  'Email notifications on scan complete',
                ].map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                    <CheckCircle size={13} style={{ color:'#107C10', flexShrink:0 }} />
                    <span style={{ fontSize:13, color:'#1A1A18' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/login" className="land-btn land-btn-navy" style={{ width:'100%', justifyContent:'center', marginBottom:8 }}>Start free trial</Link>
              <p style={{ fontSize:11, color:'#9B9B98', textAlign:'center' }}>14-day free trial · No credit card required</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className='landing-footer' style={{ background:'#1A1A18', padding:'28px 48px 20px' }}>
        <div className='landing-footer-row' style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:24, height:24, background:'#1B2D5B', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Scan size={12} color="white" />
            </div>
            <span style={{ fontWeight:800, fontSize:14, color:'white' }}>Article<span style={{ color:'#4ade80' }}>IQ</span></span>
          </div>
          <p style={{ fontSize:12, color:'#4A4A48' }}>© 2026 ArticleIQ. All rights reserved.</p>
          <Link to="/login" style={{ fontSize:13, color:'#4ade80', fontWeight:600, textDecoration:'none' }}>Sign in →</Link>
        </div>
        <div style={{ borderTop:'1px solid #2A2A28', paddingTop:14, textAlign:'center' }}>
          <p style={{ fontSize:11, color:'#3A3A38', lineHeight:1.6 }}>
            Zendesk® is a registered trademark of Zendesk, Inc. ArticleIQ is not affiliated with, endorsed by, or sponsored by Zendesk, Inc. in any way.
          </p>
        </div>
      </footer>
    </div>
  )
}
