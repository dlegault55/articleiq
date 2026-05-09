import { Link } from 'react-router-dom'
import { CheckCircle, Scan, ArrowRight, AlertOctagon, AlertTriangle, Clock, Zap, BarChart2, Tag, Link2, ImageOff, Wand2, Star, TrendingUp, Globe } from 'lucide-react'

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
          <a href="#how-it-works" className="land-btn land-btn-ghost" style={{ padding:'7px 14px' }}>How it works</a>
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
            Your knowledge base is hurting your support team. You just don't know where.
          </h1>
          <p style={{ fontSize:17, color:'#4A4A48', lineHeight:1.7, marginBottom:28, maxWidth:480 }}>
            ArticleIQ scans every article in your Zendesk® knowledge base — broken links, outdated content, thin articles, missing labels — and gives you a health score with a clear fix list. Then uses AI to rewrite and publish improvements directly.
          </p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <Link to="/login" className="land-btn land-btn-navy" style={{ fontSize:14, padding:'12px 24px' }}>
              Scan your knowledge base free <ArrowRight size={15} />
            </Link>
            <span style={{ fontSize:13, color:'#9B9B98' }}>Connects in 2 minutes</span>
          </div>
        </div>

        {/* Hero visual */}
        <div style={{ background:'#1B2D5B', borderRadius:16, padding:'24px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
          <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Knowledge base health · last scan today</p>
          <div style={{ fontSize:72, fontWeight:800, color:'white', lineHeight:1, letterSpacing:-3, marginBottom:4 }}>74</div>
          <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.75)', marginBottom:16 }}>Needs attention · ↑ +6 vs last scan</div>
          <div style={{ display:'flex', gap:6, marginBottom:14 }}>
            <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(192,57,43,0.35)', color:'#FFAAAA', fontSize:11, fontWeight:700 }}>12 critical</div>
            <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(255,200,80,0.18)', color:'#FFD980', fontSize:11, fontWeight:700 }}>49 warnings</div>
            <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.65)', fontSize:11 }}>1,169 clean</div>
          </div>
          {[
            { label:'Critical', title:'Broken link (HTTP 404)', desc:'help.example.com/setup — dead end for customers', bar:'rgba(192,57,43,0.8)' },
            { label:'Critical', title:'Broken image', desc:'Screenshot missing — customers see a blank space', bar:'rgba(192,57,43,0.8)' },
            { label:'Warning',  title:'Outdated article', desc:'Not updated in 214 days — instructions may be wrong', bar:'rgba(217,119,6,0.8)' },
          ].map(({ label, title, desc, bar }) => (
            <div key={title} style={{ background:'rgba(255,255,255,0.07)', borderRadius:8, padding:'9px 12px', marginBottom:6, borderLeft:`3px solid ${bar}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:1 }}>
                <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color: bar.includes('192') ? '#FFAAAA' : '#FFD980' }}>{label}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'white' }}>{title}</span>
              </div>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem statement ── */}
      <section style={{ padding:'clamp(32px,6vw,60px) clamp(20px,5vw,48px)', background:'white', borderTop:'1px solid #E8E8E6', borderBottom:'1px solid #E8E8E6' }}>
        <div style={{ maxWidth:800, margin:'0 auto', textAlign:'center' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9B9B98', marginBottom:12 }}>The real cost of a bad knowledge base</p>
          <h2 style={{ fontSize:32, fontWeight:800, letterSpacing:-0.8, marginBottom:16, color:'#1A1A18', lineHeight:1.2 }}>
            Every broken article is a support ticket you didn't need to receive
          </h2>
          <p style={{ fontSize:16, color:'#4A4A48', lineHeight:1.75, maxWidth:620, margin:'0 auto 40px' }}>
            Most teams don't know their KB has problems until a customer complains. By then the damage is done — a customer spent 20 minutes getting frustrated, then called. That call costs $15–25. Multiply that by every broken or outdated article and the math gets uncomfortable fast.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
            {[
              { stat:'30%', label:'of support tickets', sub:'could be prevented by a well-maintained knowledge base — customers find answers instead of calling' },
              { stat:'$15–25', label:'per support ticket', sub:'average handling cost, not including customer frustration and churn risk' },
              { stat:'2 mins', label:'to connect ArticleIQ', sub:'and get a full health report for your entire Zendesk® KB' },
            ].map(({ stat, label, sub }) => (
              <div key={stat} style={{ padding:'24px 20px', borderRadius:12, background:'#F7F7F5', border:'1px solid #E8E8E6', textAlign:'left' }}>
                <div style={{ fontSize:36, fontWeight:800, color:'#1B2D5B', letterSpacing:-1, marginBottom:4 }}>{stat}</div>
                <div style={{ fontSize:13, fontWeight:700, color:'#1A1A18', marginBottom:6 }}>{label}</div>
                <div style={{ fontSize:12, color:'#6B6B68', lineHeight:1.6 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ padding:'clamp(32px,6vw,60px) clamp(20px,5vw,48px)' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9B9B98', textAlign:'center', marginBottom:12 }}>How it works</p>
          <h2 style={{ fontSize:32, fontWeight:800, textAlign:'center', letterSpacing:-0.8, marginBottom:48, color:'#1A1A18' }}>Scan. Analyse. Fix. Publish.</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:0, position:'relative' }}>
            <div style={{ position:'absolute', top:24, left:'12.5%', right:'12.5%', height:1, background:'#E8E8E6', zIndex:0 }} />
            {[
              { step:'01', icon:Scan,     title:'Connect',  desc:'Add your Zendesk® subdomain and API token. Takes 2 minutes. Read-only access for scanning.' },
              { step:'02', icon:AlertOctagon, title:'Scan', desc:'We check every article — broken links, broken images, outdated content, thin articles, duplicate titles.' },
              { step:'03', icon:BarChart2,title:'Score',    desc:'Get a health score (0–100) with critical issues first. Quality and SEO scores per article with specific fixes.' },
              { step:'04', icon:Wand2,    title:'Fix',      desc:'AI rewrites the article informed by the analysis. Review it, apply SEO fixes manually, publish directly to Zendesk®.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} style={{ padding:'0 16px', textAlign:'center', position:'relative', zIndex:1 }}>
                <div style={{ width:48, height:48, borderRadius:12, background:'#1B2D5B', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <Icon size={20} color="white" />
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:'#9B9B98', marginBottom:4 }}>Step {step}</div>
                <div style={{ fontSize:14, fontWeight:800, color:'#1A1A18', marginBottom:8 }}>{title}</div>
                <div style={{ fontSize:12, color:'#6B6B68', lineHeight:1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Checks ── */}
      <section style={{ padding:'clamp(32px,6vw,60px) clamp(20px,5vw,48px)', background:'white', borderTop:'1px solid #E8E8E6', borderBottom:'1px solid #E8E8E6' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9B9B98', textAlign:'center', marginBottom:12 }}>What we scan for</p>
          <h2 style={{ fontSize:32, fontWeight:800, textAlign:'center', letterSpacing:-0.8, marginBottom:8, color:'#1A1A18' }}>Six checks. One health score.</h2>
          <p style={{ fontSize:15, color:'#6B6B68', textAlign:'center', marginBottom:40, maxWidth:540, margin:'0 auto 40px' }}>Every check runs in a single scan. Critical issues surface first — broken things before merely imperfect things.</p>
          <div className='landing-checks' style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {[
              { icon:Link2,        title:'Broken links',        desc:'Every hyperlink in every article, checked. Dead links (404, 410, 500) flagged as critical — a customer clicking a broken link gets nothing.', badge:'Critical', badgeColor:'#C0392B', badgeBg:'#FDF0EE' },
              { icon:ImageOff,     title:'Broken images',       desc:'Broken screenshots and diagrams flagged as critical. How-to articles are useless without the images. Smart CDN detection avoids false positives.', badge:'Critical', badgeColor:'#C0392B', badgeBg:'#FDF0EE' },
              { icon:Clock,        title:'Outdated content',    desc:'Articles not updated in 180+ days. Your product changed — did your docs? Flagged as a warning; use your judgment on what needs updating.', badge:'Warning', badgeColor:'#D97706', badgeBg:'#FEF9EC' },
              { icon:Zap,          title:'Thin content',        desc:'Articles under 150 words rarely answer real questions. Flagged as a warning — some short articles are intentional (notices, redirects).', badge:'Warning', badgeColor:'#D97706', badgeBg:'#FEF9EC' },
              { icon:Tag,          title:'Missing labels',      desc:'Untagged articles are hard to find in search. We flag them and use AI to suggest the right labels — publish with one click.', badge:'Warning', badgeColor:'#D97706', badgeBg:'#FEF9EC' },
              { icon:AlertTriangle,title:'Duplicate detection', desc:'Similar article titles flagged for review. Duplicate content confuses customers and splits search traffic. Mark intentional pairs to suppress.', badge:'Warning', badgeColor:'#D97706', badgeBg:'#FEF9EC' },
            ].map(({ icon: Icon, title, desc, badge, badgeColor, badgeBg }) => (
              <div key={title} style={{ padding:'18px', borderRadius:10, border:'1px solid #E8E8E6', background:'#FAFAF8' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:'#F0F3FA', border:'1px solid #C8D4F0', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={15} style={{ color:'#1B2D5B' }} />
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:badgeBg, color:badgeColor }}>{badge}</span>
                </div>
                <p style={{ fontSize:13, fontWeight:700, color:'#1A1A18', marginBottom:6 }}>{title}</p>
                <p style={{ fontSize:12, color:'#6B6B68', lineHeight:1.65, margin:0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI flow ── */}
      <section style={{ padding:'clamp(32px,6vw,60px) clamp(20px,5vw,48px)' }}>
        <div style={{ maxWidth:960, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9B9B98', textAlign:'center', marginBottom:12 }}>AI-powered improvement</p>
          <h2 style={{ fontSize:32, fontWeight:800, textAlign:'center', letterSpacing:-0.8, marginBottom:8, color:'#1A1A18' }}>Not just find problems — fix them</h2>
          <p style={{ fontSize:15, color:'#6B6B68', textAlign:'center', marginBottom:48, maxWidth:560, margin:'0 auto 48px' }}>Open any article and ArticleIQ runs a full analysis before touching it. Then improves the writing with that context. You control what goes back to Zendesk®.</p>

          {/* Flow steps */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:40 }}>
            {[
              {
                step:'1',
                icon: BarChart2,
                title:'Quality & SEO analysis',
                color:'#1B2D5B',
                bg:'#F0F3FA',
                border:'#C8D4F0',
                points:[
                  'Quality score across 5 dimensions — Clarity, Completeness, Structure, Accuracy, Actionability',
                  'SEO grade A–F with specific high/medium/low impact fixes',
                  'Suggested SEO title if the current one underperforms',
                  'Readability factored into the Clarity score',
                ]
              },
              {
                step:'2',
                icon: Wand2,
                title:'Targeted AI rewrite',
                color:'#107C10',
                bg:'#EBF5EB',
                border:'#A8D5A8',
                points:[
                  'Detects article type — troubleshooting, how-to, FAQ, release note — and applies the right structure',
                  'Fixes grammar, passive voice, jargon, and unclear phrasing',
                  'Rewrite is informed by the quality analysis findings',
                  'All images, links, code blocks, and tables preserved exactly',
                ]
              },
              {
                step:'3',
                icon: Globe,
                title:'You review, you publish',
                color:'#7C3AED',
                bg:'#F5F3FF',
                border:'#DDD6FE',
                points:[
                  'SEO recommendations shown alongside the editor — apply them yourself',
                  'Edit the title and body freely before publishing',
                  'Re-analyse after edits to see updated scores',
                  'Publish directly to Zendesk® with one click — or copy to clipboard',
                ]
              },
            ].map(({ step, icon: Icon, title, color, bg, border, points }) => (
              <div key={step} style={{ borderRadius:12, border:`1px solid ${border}`, background:bg, padding:'20px', position:'relative' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={15} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color, opacity:0.7, textTransform:'uppercase', letterSpacing:'0.06em' }}>Step {step}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:'#1A1A18' }}>{title}</div>
                  </div>
                </div>
                {points.map((p, i) => (
                  <div key={i} style={{ display:'flex', gap:7, marginBottom:6 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0, marginTop:5 }} />
                    <span style={{ fontSize:12, color:'#4A4A48', lineHeight:1.6 }}>{p}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* AI mock — before/after */}
          <div style={{ background:'white', borderRadius:14, border:'1px solid #E8E8E6', overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid #E8E8E6', background:'#F0F3FA', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#1B2D5B', textTransform:'uppercase', letterSpacing:'0.08em' }}>ArticleIQ · Analyse & Improve</span>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4, background:'#FEF9EC', color:'#D97706' }}>Quality 42</span>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4, background:'#FDF0EE', color:'#C0392B' }}>SEO D</span>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>
              <div style={{ padding:'16px', borderRight:'1px solid #E8E8E6' }}>
                <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#9B9B98', marginBottom:8 }}>Recommendations</p>
                {[
                  { type:'quality', text:'Opening sentence buries the problem — lead with what the customer needs to do' },
                  { type:'quality', text:'Steps are not numbered — use an ordered list so customers can follow along' },
                  { type:'seo',     text:'Title too generic (62 chars) — use the customer\'s search terms' },
                  { type:'seo',     text:'No H2 headings — add section headings to help Google understand the structure' },
                ].map((r, i) => (
                  <div key={i} style={{ display:'flex', gap:6, marginBottom:6 }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:3, flexShrink:0, marginTop:1, textTransform:'uppercase',
                      background: r.type==='quality' ? '#F0F3FA' : '#FEF9EC',
                      color: r.type==='quality' ? '#1B2D5B' : '#D97706',
                    }}>{r.type === 'quality' ? 'Quality' : 'SEO'}</span>
                    <span style={{ fontSize:11, color:'#4A4A48', lineHeight:1.5 }}>{r.text}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding:'16px', background:'#FAFFFE' }}>
                <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#107C10', marginBottom:8 }}>AI Rewrite — click to edit</p>
                <p style={{ fontSize:12, fontWeight:700, color:'#1A1A18', marginBottom:8 }}>How to Reset Your Password (Step-by-Step)</p>
                <p style={{ fontSize:10, fontWeight:700, color:'#4A4A48', marginBottom:4 }}>If your reset link isn't working:</p>
                <div style={{ fontSize:11, color:'#6B6B68', lineHeight:1.7 }}>
                  <div>1. Check that the link is less than 15 minutes old</div>
                  <div>2. Open the link in a private/incognito window</div>
                  <div>3. If it still fails, request a new reset email</div>
                </div>
              </div>
            </div>
            <div style={{ padding:'10px 16px', borderTop:'1px solid #E8E8E6', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'#9B9B98' }}>Apply SEO recommendations manually, then publish</span>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ padding:'5px 12px', borderRadius:7, background:'#F0F3FA', color:'#1B2D5B', fontSize:11, fontWeight:700, border:'1px solid #C8D4F0' }}>Re-analyse</div>
                <div style={{ padding:'5px 14px', borderRadius:7, background:'#1B2D5B', color:'white', fontSize:11, fontWeight:700 }}>Publish to Zendesk® →</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why not just use Claude ── */}
      <section style={{ padding:'clamp(32px,6vw,60px) clamp(20px,5vw,48px)', background:'white', borderTop:'1px solid #E8E8E6', borderBottom:'1px solid #E8E8E6' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9B9B98', textAlign:'center', marginBottom:12 }}>Why ArticleIQ</p>
          <h2 style={{ fontSize:32, fontWeight:800, textAlign:'center', letterSpacing:-0.8, marginBottom:8, color:'#1A1A18' }}>Why not just paste articles into Claude?</h2>
          <p style={{ fontSize:15, color:'#6B6B68', textAlign:'center', marginBottom:40, maxWidth:520, margin:'0 auto 40px' }}>You could. But you'd do it one article at a time, manually, with no history, no scores, and no way to get the result back into Zendesk® without copy-pasting.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[
              { title:'Scans your entire KB at once', desc:'Hundreds or thousands of articles in a single scan. Claude requires you to copy-paste each one individually.', icon:Scan },
              { title:'Broken links & images', desc:'Claude can\'t check if links are dead or images are missing. We make HTTP requests to every URL.', icon:Link2 },
              { title:'Health trend over time', desc:'Track your KB health score across scans. See if you\'re improving. Claude has no memory between sessions.', icon:TrendingUp },
              { title:'Publishes back to Zendesk®', desc:'The improved article goes straight back to Zendesk®. No copying, formatting, or switching tabs.', icon:Globe },
              { title:'Structured output', desc:'Critical issues first. Severity badges. Filters. Export. Claude gives you a wall of text per article.', icon:BarChart2 },
              { title:'Label suggestions with one click', desc:'AI suggests labels and publishes them directly to Zendesk®. Claude can\'t touch your account.', icon:Tag },
            ].map(({ title, desc, icon: Icon }) => (
              <div key={title} style={{ display:'flex', gap:12, padding:'16px', borderRadius:10, border:'1px solid #E8E8E6', background:'#FAFAF8' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'#F0F3FA', border:'1px solid #C8D4F0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={14} style={{ color:'#1B2D5B' }} />
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'#1A1A18', marginBottom:4 }}>{title}</p>
                  <p style={{ fontSize:12, color:'#6B6B68', lineHeight:1.6, margin:0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding:'clamp(32px,6vw,60px) clamp(20px,5vw,48px)' }}>
        <div style={{ maxWidth:780, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#9B9B98', textAlign:'center', marginBottom:12 }}>Pricing</p>
          <h2 style={{ fontSize:32, fontWeight:800, textAlign:'center', letterSpacing:-0.8, marginBottom:8, color:'#1A1A18' }}>Simple, honest pricing</h2>
          <p style={{ fontSize:15, color:'#6B6B68', textAlign:'center', marginBottom:40 }}>Start free. Upgrade when you're ready to fix what you find.</p>
          <div className='landing-pricing' style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

            {/* Free */}
            <div style={{ borderRadius:14, padding:'24px', border:'1px solid #E8E8E6', background:'#FAFAF8' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#6B6B68', marginBottom:6 }}>Free</p>
              <div style={{ fontSize:40, fontWeight:800, color:'#1A1A18', letterSpacing:-1.5, lineHeight:1, marginBottom:6 }}>$0</div>
              <p style={{ fontSize:13, color:'#6B6B68', marginBottom:20, lineHeight:1.6 }}>Scan your first 300 articles. No credit card required. See exactly what's broken before you decide to fix it.</p>
              <div style={{ marginBottom:24 }}>
                {[
                  { text:'Up to 300 articles per scan', on:true },
                  { text:'All 6 quality checks', on:true },
                  { text:'Broken links & image detection', on:true },
                  { text:'Duplicate detection', on:true },
                  { text:'Health score + shareable report', on:true },
                  { text:'SEO Score (free)', on:true },
                  { text:'AI Improve Article', on:false },
                  { text:'AI Quality Score', on:false },
                  { text:'Publish to Zendesk®', on:false },
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
              <p style={{ fontSize:13, color:'#6B6B68', marginBottom:20, lineHeight:1.6 }}>Unlimited articles, AI that actually fixes the problems it finds, and direct publishing back to Zendesk®.</p>
              <div style={{ marginBottom:24 }}>
                {[
                  'Everything in Free',
                  'Unlimited articles per scan',
                  'AI Improve Article — context-aware rewrite',
                  'AI Quality Score — 5 dimensions',
                  'Publish directly to Zendesk®',
                  'AI label suggestions + one-click publish',
                  'Email notifications on scan complete',
                ].map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                    <CheckCircle size={13} style={{ color:'#107C10', flexShrink:0 }} />
                    <span style={{ fontSize:13, color:'#1A1A18' }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                <Link to="/login" className="land-btn land-btn-navy" style={{ justifyContent:'center', flexDirection:'column', gap:2, padding:'10px' }}>
                  <span>$99/month</span>
                  <span style={{ fontSize:10, opacity:0.75, fontWeight:500 }}>billed monthly</span>
                </Link>
                <Link to="/login" className="land-btn land-btn-navy" style={{ justifyContent:'center', flexDirection:'column', gap:2, padding:'10px', background:'#107C10' }}>
                  <span>$790/year</span>
                  <span style={{ fontSize:10, opacity:0.85, fontWeight:600 }}>save $398 ✓</span>
                </Link>
              </div>
              <p style={{ fontSize:11, color:'#9B9B98', textAlign:'center' }}>Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding:'clamp(40px,6vw,80px) clamp(20px,5vw,48px)', textAlign:'center' }}>
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          <h2 style={{ fontSize:36, fontWeight:800, letterSpacing:-1, marginBottom:14, color:'#1A1A18', lineHeight:1.15 }}>
            Find out what's broken in your KB — free
          </h2>
          <p style={{ fontSize:16, color:'#4A4A48', lineHeight:1.7, marginBottom:28 }}>
            Most teams discover real problems on their first scan. Connect your Zendesk® account in 2 minutes and get a health score for every article.
          </p>
          <Link to="/login" className="land-btn land-btn-navy" style={{ fontSize:15, padding:'14px 28px', margin:'0 auto' }}>
            Scan your knowledge base free <ArrowRight size={16} />
          </Link>
          <p style={{ fontSize:12, color:'#9B9B98', marginTop:12 }}>No credit card · 300 articles free · Connects in 2 minutes</p>
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
