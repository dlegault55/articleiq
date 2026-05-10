import { usePageTitle } from '@/hooks/usePageTitle'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUpgrade } from '@/hooks/useUpgrade'
import { useScan } from '@/hooks/useScan'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import {
  AlertOctagon, AlertTriangle, Info, CheckCircle, ArrowLeft, X,
  ChevronDown, ChevronUp, ExternalLink, Download, Share2, Check,
  ChevronLeft, ChevronRight, Square, CheckSquare,
  Loader, Wand2, RefreshCcw, Star, BookOpen, Type, Clock, Tag,
  FileText, Link2, Zap, Target, Scan, ImageOff, BarChart2
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TipTapLink from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'

const PAGE_SIZE = 25

const ISSUE_ICONS = {
  low_word_count:    Type,
  outdated:          Clock,
  missing_labels:    Tag,
  missing_section:   FileText,
  missing_metadata:  FileText,
  broken_link:       Link2,
  broken_image:      ImageOff,
  duplicate_content: CheckSquare,
  missing_title:     FileText,
  empty_body:        FileText,
}

const calcHealth = (articles, issues) => {
  if (!articles?.length) return null
  const penalty = (issues.filter(i=>i.severity==='critical').length * 3 + issues.filter(i=>i.severity==='warning').length + issues.filter(i=>i.severity==='info').length * 0.2) / articles.length
  return Math.max(0, Math.min(100, Math.round(100 - penalty * 20)))
}
const healthColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)'
const healthLabel = (s) => s >= 80 ? 'Healthy' : s >= 60 ? 'Needs attention' : 'Critical'

const readColor = (s) => {
  if (s == null) return 'var(--text-3)'
  if (s >= 70) return 'var(--green)'
  if (s >= 50) return 'var(--amber)'
  if (s >= 30) return '#ea580c'
  return 'var(--red)'
}
const readLabel = (s) => {
  if (s == null) return '—'
  if (s >= 70) return 'Easy'
  if (s >= 50) return 'Moderate'
  if (s >= 30) return 'Difficult'
  return 'Very hard'
}

// ─── AI via server-side endpoint ──────────────────────────────
const callAI = async (action, { content, title, readabilityScore, analysisContext } = {}) => {
  const res = await apiFetch('/api/ai-action', {
    method: 'POST',
    body: JSON.stringify({ action, content, title, readabilityScore, analysisContext }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error || `AI error ${res.status}`)
  }
  return (await res.json()).result || ''
}

// ─── Excel export ──────────────────────────────────────────────
const exportExcel = async (scan, articles, issues) => {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')
  const rows = [['Title', 'URL', 'Severity', 'Issue', 'Description', 'Words', 'Readability', 'Last Updated']]
  for (const a of articles) {
    const ai = issues.filter(i => i.article_id === a.id)
    if (!ai.length) {
      rows.push([a.title, a.url||'', 'Clean', '', '', a.word_count||0, a.readability_score??'', a.last_updated ? format(new Date(a.last_updated), 'MMM d yyyy') : ''])
    } else {
      for (const i of ai) {
        rows.push([a.title, a.url||'', i.severity, i.issue_type.replace(/_/g,' '), i.description, a.word_count||0, a.readability_score??'', a.last_updated ? format(new Date(a.last_updated), 'MMM d yyyy') : ''])
      }
    }
  }
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{wch:50},{wch:40},{wch:10},{wch:22},{wch:60},{wch:8},{wch:12},{wch:14}]
  XLSX.utils.book_append_sheet(wb, ws, 'Issues')
  XLSX.writeFile(wb, `ArticleIQ_${format(new Date(scan.created_at), 'yyyy-MM-dd')}.xlsx`)
}

// ─── Markdown renderer ────────────────────────────────────────
function MarkdownContent({ text, muted = false }) {
  if (!text) return null
  const baseColor = muted ? 'var(--text-2)' : 'var(--text)'
  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // H1
    if (line.startsWith('# ')) {
      elements.push(<h2 key={i} style={{ fontSize: 15, fontWeight: 800, color: baseColor, margin: '16px 0 6px', letterSpacing: -0.3 }}>{line.slice(2)}</h2>)
    }
    // H2
    else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} style={{ fontSize: 13, fontWeight: 700, color: baseColor, margin: '14px 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.7 }}>{line.slice(3)}</h3>)
    }
    // H3
    else if (line.startsWith('### ')) {
      elements.push(<h4 key={i} style={{ fontSize: 13, fontWeight: 700, color: baseColor, margin: '10px 0 4px' }}>{line.slice(4)}</h4>)
    }
    // Bullet list
    else if (/^[-*+] /.test(line)) {
      const bullets = []
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        bullets.push(<li key={i} style={{ fontSize: 13, color: baseColor, lineHeight: 1.7, marginBottom: 3 }}>{renderInline(lines[i].slice(2))}</li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} style={{ paddingLeft: 18, margin: '6px 0' }}>{bullets}</ul>)
      continue
    }
    // Numbered list
    else if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i} style={{ fontSize: 13, color: baseColor, lineHeight: 1.7, marginBottom: 3 }}>{renderInline(lines[i].replace(/^\d+\. /, ''))}</li>)
        i++
      }
      elements.push(<ol key={`ol-${i}`} style={{ paddingLeft: 18, margin: '6px 0' }}>{items}</ol>)
      continue
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 8 }} />)
    }
    // Regular paragraph
    else {
      elements.push(<p key={i} style={{ fontSize: 13, color: baseColor, lineHeight: 1.8, margin: '0 0 6px' }}>{renderInline(line)}</p>)
    }
    i++
  }
  return <div>{elements}</div>
}

function renderInline(text) {
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    // Italic within non-bold parts
    const italicParts = part.split(/(_[^_]+_|\*[^*]+\*)/g)
    return italicParts.map((ip, j) => {
      if ((ip.startsWith('_') && ip.endsWith('_')) || (ip.startsWith('*') && ip.endsWith('*'))) {
        return <em key={j}>{ip.slice(1, -1)}</em>
      }
      return ip
    })
  })
}

// ─── Markdown to HTML (for Zendesk® publish) ───────────────────
const markdownToHtml = (text) => {
  if (!text) return ''
  const lines = text.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('# '))       { out.push(`<h1>${line.slice(2)}</h1>`); i++; continue }
    if (line.startsWith('## '))      { out.push(`<h2>${line.slice(3)}</h2>`); i++; continue }
    if (line.startsWith('### '))     { out.push(`<h3>${line.slice(4)}</h3>`); i++; continue }
    if (/^[-*+] /.test(line)) {
      const items = []
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(`<li>${inlineHtml(lines[i].slice(2))}</li>`)
        i++
      }
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }
    if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li>${inlineHtml(lines[i].replace(/^\d+\. /, ''))}</li>`)
        i++
      }
      out.push(`<ol>${items.join('')}</ol>`)
      continue
    }
    if (line.trim() === '') { i++; continue }
    out.push(`<p>${inlineHtml(line)}</p>`)
    i++
  }
  return out.join('\n')
}

const inlineHtml = (text) =>
  text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')

// ─── WYSIWYG Editor ───────────────────────────────────────────
function WYSIWYGEditor({ html, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TipTapLink.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: html,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // Update content when html prop changes (new AI result)
  useEffect(() => {
    if (editor && html && editor.getHTML() !== html) {
      editor.commands.setContent(html, false)
    }
  }, [html])

  const TOOLBAR_ITEMS = [
    { group: [
      { action: () => editor.chain().focus().toggleBold().run(),      icon: <b>B</b>,  tooltip: 'Bold — make selected text bold',           isActive: () => editor.isActive('bold') },
      { action: () => editor.chain().focus().toggleItalic().run(),    icon: <i>I</i>,  tooltip: 'Italic — make selected text italic',        isActive: () => editor.isActive('italic') },
    ]},
    { group: [
      { action: () => editor.chain().focus().toggleHeading({ level:1 }).run(), icon: 'H1', tooltip: 'Heading 1 — large section title',       isActive: () => editor.isActive('heading', { level:1 }) },
      { action: () => editor.chain().focus().toggleHeading({ level:2 }).run(), icon: 'H2', tooltip: 'Heading 2 — medium section title',      isActive: () => editor.isActive('heading', { level:2 }) },
      { action: () => editor.chain().focus().toggleHeading({ level:3 }).run(), icon: 'H3', tooltip: 'Heading 3 — small section title',       isActive: () => editor.isActive('heading', { level:3 }) },
    ]},
    { group: [
      { action: () => editor.chain().focus().toggleBulletList().run(),  icon: '• —', tooltip: 'Bullet list — unordered list of items',      isActive: () => editor.isActive('bulletList') },
      { action: () => editor.chain().focus().toggleOrderedList().run(), icon: '1.',  tooltip: 'Numbered list — ordered list of items',      isActive: () => editor.isActive('orderedList') },
    ]},
    { group: [
      { action: () => editor.chain().focus().undo().run(), icon: '↩', tooltip: 'Undo — reverse your last change (Ctrl+Z)',  isActive: () => false },
      { action: () => editor.chain().focus().redo().run(), icon: '↪', tooltip: 'Redo — reapply your last undone change',   isActive: () => false },
    ]},
  ]

  if (!editor) return null

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        .tb-tooltip { position:relative; display:inline-flex; }
        .tb-tooltip::after {
          content: attr(data-tip);
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: #1c1b18;
          color: white;
          font-size: 11px;
          font-weight: 500;
          padding: 5px 9px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s;
          z-index: 999;
          font-family: 'Instrument Sans', sans-serif;
        }
        .tb-tooltip::before {
          content: '';
          position: absolute;
          bottom: calc(100% + 1px);
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #1c1b18;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s;
          z-index: 999;
        }
        .tb-tooltip:hover::after, .tb-tooltip:hover::before { opacity: 1; }
      `}</style>

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:2, padding:'6px 12px', borderBottom:'1px solid var(--border)', background:'var(--bg)', flexShrink:0, flexWrap:'wrap' }}>
        {TOOLBAR_ITEMS.map(({ group }, gi) => (
          <div key={gi} style={{ display:'flex', alignItems:'center', gap:1 }}>
            {gi > 0 && <div style={{ width:1, height:18, background:'var(--border)', margin:'0 4px' }} />}
            {group.map(({ action, icon, tooltip, isActive }, bi) => (
              <div key={bi} className="tb-tooltip" data-tip={tooltip}>
                <button onMouseDown={e => { e.preventDefault(); action() }}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:5, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, transition:'all 0.1s',
                    background: isActive() ? 'var(--green-light)' : 'transparent',
                    color: isActive() ? 'var(--green)' : 'var(--text-2)',
                  }}>
                  {icon}
                </button>
              </div>
            ))}
          </div>
        ))}
        {/* Active format indicator */}
        <div style={{ marginLeft:'auto', fontSize:11, color:'var(--text-3)', fontFamily:'monospace', display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 4px var(--green)' }} title="Editor is active and ready" />
          <span>Ready to edit</span>
        </div>
      </div>

      {/* Editor area */}
      <style>{`
        .tiptap-editor { flex:1; overflow-y:auto; padding:20px; outline:none; cursor:text; }
        .tiptap-editor h1 { font-size:18px; font-weight:800; margin:16px 0 8px; color:var(--text); }
        .tiptap-editor h2 { font-size:15px; font-weight:700; margin:14px 0 6px; color:var(--text); }
        .tiptap-editor h3 { font-size:13px; font-weight:700; margin:10px 0 4px; color:var(--text); }
        .tiptap-editor p  { font-size:13px; line-height:1.8; margin:0 0 8px; color:var(--text); }
        .tiptap-editor ul, .tiptap-editor ol { padding-left:20px; margin:8px 0; }
        .tiptap-editor li { font-size:13px; line-height:1.7; margin-bottom:4px; color:var(--text); }
        .tiptap-editor a  { color:var(--green); text-decoration:underline; }
        .tiptap-editor img { max-width:100%; border-radius:6px; margin:8px 0; border:1px solid var(--border); }
        .tiptap-editor strong { font-weight:700; }
        .tiptap-editor em { font-style:italic; }
        .tiptap-editor code { font-family:monospace; font-size:12px; background:var(--bg); padding:1px 5px; border-radius:3px; }
        .tiptap-editor pre { background:var(--bg); padding:12px; border-radius:8px; overflow-x:auto; font-size:12px; margin:10px 0; }
        .tiptap-editor table { width:100%; border-collapse:collapse; margin:12px 0; font-size:13px; }
        .tiptap-editor th, .tiptap-editor td { border:1px solid var(--border-md); padding:8px 12px; text-align:left; vertical-align:top; }
        .tiptap-editor th { background:var(--bg); font-weight:700; color:var(--text); }
        .tiptap-editor td { color:var(--text-2); }
        .tiptap-editor tr:nth-child(even) td { background:#fafafa; }
        .tiptap-editor p.is-editor-empty:first-child::before { content:attr(data-placeholder); color:var(--text-3); float:left; pointer-events:none; height:0; }
      `}</style>
      <EditorContent editor={editor} className="tiptap-editor" style={{ flex:1, overflowY:'auto' }} />
    </div>
  )
}

// ─── AI Drawer ─────────────────────────────────────────────────
// Single unified flow — 3 fixed panes: Original | Recommendations | Rewrite
function AIDrawer({ article, connector, onClose }) {
  const [bodyHtml,    setBodyHtml]    = useState('')
  const [fetchErr,    setFetchErr]    = useState(null)
  const [analysing,   setAnalysing]   = useState(true)
  const [analysis,    setAnalysis]    = useState(null)
  const [improving,   setImproving]   = useState(false)
  const [improved,    setImproved]    = useState('')
  const [editedText,  setEditedText]  = useState('')
  const [editedTitle, setEditedTitle] = useState('')
  const [copying,     setCopying]     = useState(false)
  const [publishing,  setPublishing]  = useState(false)
  const [published,   setPublished]   = useState(false)
  const [confirmPub,  setConfirmPub]  = useState(false)
  const [reanalysing, setReanalysing] = useState(false)
  const [error,       setError]       = useState(null)

  // Fetch article + run analysis on open
  useEffect(() => {
    if (!article || !connector) return
    const run = async () => {
      setAnalysing(true); setFetchErr(null)
      try {
        const authHeader = `Basic ${btoa(connector.api_key_encrypted)}`
        const res = await fetch(
          `https://${connector.subdomain}.zendesk.com/api/v2/help_center/articles/${article.zendesk_article_id}`,
          { headers: { Authorization: authHeader } }
        )
        if (!res.ok) throw new Error(`Could not fetch article (${res.status})`)
        const data = await res.json()
        const html = data.article?.body || ''
        setBodyHtml(html)
        await runAnalysis(html, article.title)
      } catch (e) { setFetchErr(e.message) }
      finally { setAnalysing(false) }
    }
    run()
  }, [article?.id])

  const runAnalysis = async (html, title) => {
    const [qualityRaw, seoRaw] = await Promise.all([
      callAI('quality', { title, content: html, readabilityScore: article.readability_score }),
      callAI('seo',     { title, content: html }),
    ])
    let quality = {}, seo = {}
    try { quality = JSON.parse(qualityRaw.replace(/```json|```/g,'').trim()) } catch {}
    try { seo     = JSON.parse(seoRaw.replace(/```json|```/g,'').trim())     } catch {}
    setAnalysis({ quality, seo })
    return { quality, seo }
  }

  const runImprove = async () => {
    setImproving(true); setError(null)
    try {
      const source = editedText || improved || bodyHtml
      const title  = editedTitle || article.title
      const nl = '\n'
      const qualityCtx = analysis?.quality?.suggestions?.length
        ? 'Quality improvements needed:' + nl + analysis.quality.suggestions.map(s => '- ' + s).join(nl)
        : ''
      const seoCtx = analysis?.seo?.issues?.filter(i => i.impact === 'high').length
        ? 'High-impact SEO fixes:' + nl + analysis.seo.issues.filter(i => i.impact === 'high').map(i => '- ' + i.fix).join(nl)
        : ''
      const result = await callAI('improve', {
        content: source, title,
        analysisContext: [qualityCtx, seoCtx].filter(Boolean).join('\n\n'),
      })
      setImproved(result)
      setEditedText(result)
      setEditedTitle(analysis?.seo?.title_suggestion || title)
    } catch (e) { setError(e.message) }
    finally { setImproving(false) }
  }

  const reanalyse = async () => {
    const source = editedText || improved
    const title  = editedTitle || article.title
    if (!source) return
    setReanalysing(true); setError(null)
    try { await runAnalysis(source, title) }
    catch (e) { setError(e.message) }
    finally { setReanalysing(false) }
  }

  const copy = async () => {
    await navigator.clipboard.writeText((editedText || improved).replace(/<[^>]+>/g, ''))
    setCopying(true); setTimeout(() => setCopying(false), 2000)
  }

  const publish = async () => {
    if (!confirmPub) { setConfirmPub(true); return }
    setPublishing(true); setConfirmPub(false)
    try {
      const res = await apiFetch('/api/publish-article', {
        method: 'POST',
        body: JSON.stringify({
          connectorId: connector.id,
          articleId: article.zendesk_article_id,
          title: editedTitle || article.title,
          html: editedText || improved,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(d))
      setPublished(true); setTimeout(() => setPublished(false), 4000)
    } catch (e) { setError(`Publish failed: ${e.message}`) }
    finally { setPublishing(false) }
  }

  const scoreBg    = s => s >= 70 ? 'var(--green-light)' : s >= 50 ? 'var(--amber-light)' : 'var(--red-light)'
  const scoreColor = s => s >= 70 ? 'var(--green)'       : s >= 50 ? 'var(--amber)'       : 'var(--red)'
  const gradeBg    = g => g <= 'B' ? 'var(--green-light)' : g === 'C' ? 'var(--amber-light)' : 'var(--red-light)'
  const gradeColor = g => g <= 'B' ? 'var(--green)'       : g === 'C' ? 'var(--amber)'       : 'var(--red)'

  const PanelHeader = ({ icon: Icon, label, color = 'var(--text-3)', bg = 'var(--bg)', border = 'var(--border)', right }) => (
    <div style={{ padding:'9px 14px', background:bg, borderBottom:`1px solid ${border}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <Icon size={13} style={{ color }} />
        <span style={{ fontSize:11, fontWeight:700, color }}>{label}</span>
      </div>
      {right}
    </div>
  )

  return (
    <div className="ai-drawer" style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(1100px,96vw)', background:'white', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.12)', animation:'slide-in 0.22s ease' }}>
      <style>{`
        @keyframes slide-in { from{transform:translateX(100%)} to{transform:translateX(0)} }
        .article-html h1{font-size:18px;font-weight:800;margin:16px 0 8px}
        .article-html h2{font-size:15px;font-weight:700;margin:14px 0 6px}
        .article-html h3{font-size:13px;font-weight:700;margin:10px 0 4px}
        .article-html p{font-size:13px;line-height:1.8;margin:0 0 10px}
        .article-html ul,.article-html ol{padding-left:20px;margin:8px 0}
        .article-html li{font-size:13px;line-height:1.7;margin-bottom:4px}
        .article-html a{color:var(--navy);text-decoration:underline}
        .article-html img{max-width:100% !important;height:auto !important;border-radius:6px;margin:8px 0;display:block;border:1px solid var(--border)}
        .article-html code{font-family:monospace;font-size:12px;background:var(--bg);padding:1px 5px;border-radius:3px}
        .article-html pre{background:var(--bg);padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;margin:10px 0}
        .article-html table{width:100%;border-collapse:collapse;font-size:13px;margin:10px 0}
        .article-html th,.article-html td{padding:8px 10px;border:1px solid var(--border);text-align:left}
        .article-html th{background:var(--bg);font-weight:700}
        .ProseMirror img{max-width:100% !important;height:auto !important;border-radius:6px;margin:8px 0;display:block}
        .ProseMirror{outline:none;min-height:200px}
      `}</style>

      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:-1 }} />

      {/* ── Drawer header ── */}
      <div style={{ padding:'10px 18px', borderBottom:'1px solid var(--border-md)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'white', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color:'var(--text-3)', flexShrink:0 }}><X size={15} /></button>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:500 }}>{article.title}</p>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {analysis?.quality?.score != null && (
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:3, background: scoreBg(analysis.quality.score), color: scoreColor(analysis.quality.score) }}>
                  Quality {analysis.quality.score}
                </span>
              )}
              {analysis?.seo?.grade && (
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:3, background: gradeBg(analysis.seo.grade), color: gradeColor(analysis.seo.grade) }}>
                  SEO {analysis.seo.grade}
                </span>
              )}
              {(analysing || reanalysing) && (
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text-3)' }}>
                  <Loader size={10} style={{ animation:'spin 0.7s linear infinite' }} />
                  {reanalysing ? 'Re-analysing...' : 'Analysing...'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {article.url && (
            <a href={article.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              <ExternalLink size={11} /> Open in Zendesk®
            </a>
          )}
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ color:'var(--text-3)' }}>Close</button>
        </div>
      </div>

      {/* ── Three panes ── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 280px 1fr', overflow:'hidden' }}>

        {/* Pane 1 — Original article */}
        <div style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--border-md)', overflow:'hidden' }}>
          <PanelHeader icon={BookOpen} label="Original Article" />
          <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 4px' }}>Title</p>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'0 0 16px', lineHeight:1.4 }}>{article.title}</p>
            <div className="article-html" dangerouslySetInnerHTML={{ __html: bodyHtml || '<p style="color:var(--text-3)">Loading article...</p>' }} />
          </div>
        </div>

        {/* Pane 2 — Recommendations (narrow) */}
        <div style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--border-md)', overflow:'hidden', background:'#FAFAF8' }}>
          <PanelHeader icon={BarChart2} label="Recommendations" color="var(--navy)" bg="var(--navy-light)" border="var(--navy-border)" />
          <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
            {analysing && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:'40px 0', textAlign:'center' }}>
                <Loader size={20} style={{ animation:'spin 0.8s linear infinite', color:'var(--navy)' }} />
                <p style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', margin:0 }}>Analysing quality & SEO...</p>
                <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>~10–15 seconds</p>
              </div>
            )}
            {fetchErr && <p style={{ fontSize:12, color:'var(--red)', lineHeight:1.6 }}>{fetchErr}</p>}
            {!analysing && analysis && (
              <>
                {/* Score badges */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
                  {analysis.quality?.score != null && (
                    <div style={{ textAlign:'center', padding:'8px 6px', borderRadius:8, background: scoreBg(analysis.quality.score) }}>
                      <div style={{ fontSize:24, fontWeight:800, color: scoreColor(analysis.quality.score), lineHeight:1 }}>{analysis.quality.score}</div>
                      <div style={{ fontSize:9, color: scoreColor(analysis.quality.score), opacity:0.8 }}>Quality</div>
                    </div>
                  )}
                  {analysis.seo?.grade && (
                    <div style={{ textAlign:'center', padding:'8px 6px', borderRadius:8, background: gradeBg(analysis.seo.grade) }}>
                      <div style={{ fontSize:24, fontWeight:800, color: gradeColor(analysis.seo.grade), lineHeight:1 }}>{analysis.seo.grade}</div>
                      <div style={{ fontSize:9, color: gradeColor(analysis.seo.grade), opacity:0.8 }}>SEO</div>
                    </div>
                  )}
                </div>

                {/* Verdict */}
                {analysis.quality?.verdict && (
                  <p style={{ fontSize:11, color:'var(--text-2)', lineHeight:1.6, marginBottom:14, padding:'8px 10px', background:'white', borderRadius:7, border:'1px solid var(--border-md)' }}>
                    {analysis.quality.verdict}
                  </p>
                )}

                {/* Quality dimensions */}
                {analysis.quality?.dimensions && (
                  <div style={{ marginBottom:14 }}>
                    <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-3)', marginBottom:8 }}>Quality breakdown</p>
                    {Object.entries(analysis.quality.dimensions).map(([dim, val]) => (
                      <div key={dim} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                        <span style={{ fontSize:10, color:'var(--text-3)', textTransform:'capitalize', width:72, flexShrink:0 }}>{dim}</span>
                        <div style={{ flex:1, height:4, background:'var(--border-md)', borderRadius:100, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${(val/20)*100}%`, borderRadius:100,
                            background: val>=16?'var(--green)':val>=10?'var(--amber)':'var(--red)' }} />
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', width:16, textAlign:'right' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quality suggestions */}
                {analysis.quality?.suggestions?.length > 0 && (
                  <div style={{ marginBottom:14 }}>
                    <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-3)', marginBottom:8 }}>Writing fixes</p>
                    {analysis.quality.suggestions.map((s, i) => (
                      <div key={i} style={{ display:'flex', gap:6, marginBottom:5, padding:'6px 8px', background:'white', borderRadius:6, border:'1px solid var(--border-md)' }}>
                        <span style={{ color:'var(--navy)', flexShrink:0, fontWeight:700, fontSize:12 }}>→</span>
                        <span style={{ fontSize:11, color:'var(--text-2)', lineHeight:1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ height:1, background:'var(--border-md)', margin:'0 0 12px' }} />

                {/* SEO title */}
                {analysis.seo?.title_suggestion && (
                  <div style={{ marginBottom:12 }}>
                    <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-3)', marginBottom:6 }}>Suggested SEO title</p>
                    <div style={{ padding:'7px 9px', borderRadius:6, background:'var(--navy-light)', border:'1px solid var(--navy-border)' }}>
                      <p style={{ fontSize:11, color:'var(--navy)', fontWeight:600, margin:'0 0 3px', lineHeight:1.4 }}>{analysis.seo.title_suggestion}</p>
                      <p style={{ fontSize:9, color:'var(--navy)', opacity:0.55, margin:0 }}>Copy into title field →</p>
                    </div>
                  </div>
                )}

                {/* SEO issues */}
                {analysis.seo?.issues?.length > 0 && (
                  <div>
                    <p style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-3)', marginBottom:8 }}>SEO fixes — apply manually</p>
                    {analysis.seo.issues.map((item, i) => (
                      <div key={i} style={{ marginBottom:7, padding:'6px 8px', background:'white', borderRadius:6, border:'1px solid var(--border-md)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                          <span style={{ fontSize:8, fontWeight:700, padding:'1px 5px', borderRadius:3, textTransform:'uppercase',
                            background: item.impact==='high' ? 'var(--red-light)' : item.impact==='medium' ? 'var(--amber-light)' : 'var(--blue-light)',
                            color: item.impact==='high' ? 'var(--red)' : item.impact==='medium' ? 'var(--amber)' : 'var(--blue)',
                          }}>{item.impact}</span>
                          <span style={{ fontSize:11, fontWeight:600, color:'var(--text)' }}>{item.issue}</span>
                        </div>
                        <p style={{ fontSize:10, color:'var(--text-3)', margin:0, lineHeight:1.5 }}>{item.fix}</p>
                      </div>
                    ))}
                  </div>
                )}

                {!analysis.quality?.score && !analysis.seo?.grade && (
                  <p style={{ fontSize:12, color:'var(--red)', textAlign:'center', marginTop:20 }}>Analysis incomplete — try again</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pane 3 — AI Rewrite */}
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <PanelHeader
            icon={Wand2}
            label="AI Rewrite"
            color="white"
            bg="var(--navy)"
            border="var(--navy)"
            right={
              !improving && !analysing && (
                <button onClick={runImprove} disabled={improving || analysing} className="btn btn-sm"
                  style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'1px solid rgba(255,255,255,0.25)', fontSize:11, padding:'4px 10px' }}>
                  {improved ? <><RefreshCcw size={10} /> Re-improve</> : <><Wand2 size={10} /> Improve Article</>}
                </button>
              )
            }
          />

          {/* Title field */}
          <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', flexShrink:0, background:'white' }}>
            <p style={{ fontSize:9, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 3px' }}>Title — edit or paste SEO title from recommendations</p>
            <input value={editedTitle} onChange={e => setEditedTitle(e.target.value)}
              style={{ width:'100%', fontSize:14, fontWeight:700, color:'var(--text)', border:'none', outline:'none', fontFamily:'inherit', background:'transparent', padding:0 }}
              placeholder={article.title} />
          </div>

          {/* Content area */}
          {improving ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:40 }}>
              <Loader size={22} style={{ animation:'spin 0.8s linear infinite', color:'var(--navy)' }} />
              <p style={{ fontSize:13, fontWeight:600, color:'var(--text-2)', margin:0 }}>Generating AI rewrite...</p>
              <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>Informed by the quality & SEO findings</p>
            </div>
          ) : improved || editedText ? (
            <WYSIWYGEditor html={editedText || improved} onChange={setEditedText} />
          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:40, textAlign:'center' }}>
              <div style={{ width:48, height:48, borderRadius:12, background:'var(--navy-light)', border:'1px solid var(--navy-border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Wand2 size={20} style={{ color:'var(--navy)' }} />
              </div>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--text-2)', margin:0 }}>Ready to improve</p>
              <p style={{ fontSize:12, color:'var(--text-3)', margin:0, maxWidth:220, lineHeight:1.6 }}>
                Review the recommendations in the middle panel, then click <strong>Improve Article</strong> above to generate an AI rewrite.
              </p>
              {!analysing && (
                <button onClick={runImprove} disabled={improving} className="btn btn-primary btn-sm" style={{ marginTop:4 }}>
                  <Wand2 size={12} /> Improve Article
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding:'10px 18px', borderTop:'1px solid var(--border-md)', flexShrink:0, background:'white' }}>
        {confirmPub && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'var(--amber-light)', border:'1px solid var(--amber-border)', borderRadius:8, marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
              <AlertTriangle size={12} style={{ color:'var(--amber)' }} />
              <p style={{ fontSize:12, fontWeight:600, color:'var(--text)', margin:0 }}>This will overwrite the article in Zendesk®. Are you sure?</p>
            </div>
            <button onClick={() => setConfirmPub(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        )}
        {published && (
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 12px', background:'var(--green-light)', border:'1px solid var(--green-border)', borderRadius:8, marginBottom:10 }}>
            <CheckCircle size={13} style={{ color:'var(--green)' }} />
            <p style={{ fontSize:12, fontWeight:600, color:'var(--green)', margin:0 }}>Published to Zendesk® successfully</p>
          </div>
        )}
        {error && <p style={{ fontSize:11, color:'var(--red)', marginBottom:8 }}>{error}</p>}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={reanalyse} disabled={reanalysing || analysing || (!improved && !editedText)} className="btn btn-sm"
            style={{ background:'var(--navy-light)', color:'var(--navy)', border:'1px solid var(--navy-border)', fontWeight:700 }}>
            {reanalysing ? <><Loader size={11} style={{ animation:'spin 0.7s linear infinite' }} /> Re-analysing...</> : <><BarChart2 size={11} /> Re-analyse</>}
          </button>
          <div style={{ flex:1 }} />
          <button onClick={copy} disabled={!improved && !editedText} className="btn btn-secondary btn-sm">
            {copying ? <><Check size={11} /> Copied!</> : <><CheckSquare size={11} /> Copy text</>}
          </button>
          <button onClick={publish} disabled={publishing || (!improved && !editedText)} className="btn btn-primary btn-sm"
            style={{ background: confirmPub ? 'var(--amber)' : 'var(--navy)' }}>
            {publishing ? <Loader size={11} style={{ animation:'spin 0.7s linear infinite' }} /> : confirmPub ? <AlertTriangle size={11} /> : <ExternalLink size={11} />}
            {publishing ? 'Publishing...' : confirmPub ? 'Yes, publish' : 'Publish to Zendesk®'}
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── AI Panel ──────────────────────────────────────────────────

// ─── Issue card ───────────────────────────────────────────────
function IssueCard({ issue, Icon, s, resolved, article, connector, onResolve }) {
  const [suggesting,   setSuggesting]   = useState(false)
  const [labels,       setLabels]       = useState(null)
  const [publishing,   setPublishing]   = useState(null)
  const [published,    setPublished]    = useState(new Set())

  const suggestLabels = async () => {
    setSuggesting(true)
    try {
      const raw  = await callAI('labels', { title: article.title })
      const data = JSON.parse(raw.replace(/```json|```/g, '').trim())
      setLabels(data.labels || [])
    } catch (e) { setLabels([`Error: ${e.message}`]) }
    finally { setSuggesting(false) }
  }

  const publishLabel = async (label) => {
    if (!connector) { navigator.clipboard.writeText(label); return }
    setPublishing(label)
    try {
      const res = await apiFetch('/api/publish-labels', {
        method: 'POST',
        body: JSON.stringify({ connectorId: connector.id, articleId: article.zendesk_article_id, labels: [label] }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      setPublished(prev => new Set([...prev, label]))
    } catch (e) {
      navigator.clipboard.writeText(label)
      alert(`Couldn't publish — copied to clipboard. Error: ${e.message}`)
    } finally { setPublishing(null) }
  }

  return (
    <div style={{ background:'white', border:'1px solid var(--border-md)', borderLeft:`3px solid ${resolved ? 'var(--border-strong)' : s.color}`, borderRadius:9, overflow:'hidden', opacity: resolved ? 0.5 : 1, transition:'opacity 0.2s' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px' }}>
        <div style={{ width:30, height:30, borderRadius:7, background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={14} style={{ color: resolved ? 'var(--text-3)' : s.color }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color: resolved ? 'var(--text-3)' : s.color }}>{s.label}</span>
            <span style={{ fontSize:13, fontWeight:700, color: resolved ? 'var(--text-3)' : 'var(--text)', textTransform:'capitalize' }}>{issue.issue_type.replace(/_/g,' ')}</span>
          </div>
          <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.65 }}>{issue.description}</p>

          {issue.issue_type === 'missing_labels' && !resolved && (
            <div style={{ marginTop:10 }}>
              {!labels && (
                <button onClick={suggestLabels} disabled={suggesting}
                  style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border-md)', background:'var(--bg)', cursor:'pointer', fontSize:11, fontWeight:600, color:'var(--text-2)', fontFamily:'inherit' }}>
                  {suggesting ? <><Loader size={10} style={{ animation:'spin 0.7s linear infinite' }} /> Suggesting...</> : <><Tag size={10} /> Suggest labels</>}
                </button>
              )}
              {labels?.length > 0 && (
                <div>
                  <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    {connector ? 'Click to publish to Zendesk®' : 'Click to copy'}
                  </p>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {labels.map(label => {
                      const isPublished = published.has(label)
                      const isLoading   = publishing === label
                      return (
                        <button key={label} onClick={() => publishLabel(label)} disabled={isLoading || isPublished}
                          style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:600, cursor: isPublished ? 'default' : 'pointer', fontFamily:'inherit', transition:'all 0.15s',
                            background: isPublished ? 'var(--green-light)' : 'var(--navy-light)',
                            border: `1px solid ${isPublished ? 'var(--green-border)' : 'var(--navy-border)'}`,
                            color: isPublished ? 'var(--green)' : 'var(--navy)',
                          }}>
                          {isLoading && <Loader size={9} style={{ animation:'spin 0.7s linear infinite' }} />}
                          {isPublished && <CheckCircle size={9} />}
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <p style={{ fontSize:10, color:'var(--text-3)', marginTop:5 }}>
                    {connector ? 'Labels added immediately — existing labels preserved' : 'Add labels in Zendesk®'}
                  </p>
                </div>
              )}
              {labels !== null && labels.length === 0 && (
                <p style={{ fontSize:11, color:'var(--text-3)', marginTop:6 }}>Couldn't suggest labels.</p>
              )}
            </div>
          )}
        </div>
        <button onClick={onResolve} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:6, border:'1px solid var(--border-md)', cursor:'pointer', fontSize:11, fontWeight:600, flexShrink:0, whiteSpace:'nowrap', fontFamily:'inherit',
          background: resolved ? 'var(--green-light)' : 'white',
          color: resolved ? 'var(--green)' : 'var(--text-3)',
        }}>
          {resolved ? <><CheckCircle size={11}/> Reviewed</> : <><Square size={11}/> Mark reviewed</>}
        </button>
      </div>
    </div>
  )
}

const AI_ACTIONS = [
  {
    key: 'analyse',
    label: 'Analyse & Improve',
    desc: 'Quality score, SEO grade A–F, and a targeted rewrite — all in one flow.',
    icon: Wand2,
    action: 'analyse',
  },
]

function ArticleRow({ article, issues, isPaid, connector, onOpenDrawer, resolvedIssues, onResolveIssue }) {
  const [open, setOpen] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(null)

  const activeIssues = issues.filter(i => !resolvedIssues.has(i.id))
  const critical     = activeIssues.filter(i => i.severity === 'critical')
  const warning      = activeIssues.filter(i => i.severity === 'warning')
  const clean        = issues.length === 0
  const allResolved  = issues.length > 0 && issues.every(i => resolvedIssues.has(i.id))

  const barColor = critical.length ? 'var(--red)' : warning.length ? 'var(--amber)' : (allResolved || clean) ? 'var(--green)' : 'var(--border-md)'

  const SEVERITY = {
    critical: { color:'var(--red)',   label:'Critical' },
    warning:  { color:'var(--amber)', label:'Warning'  },
    info:     { color:'var(--blue)',  label:'Info'     },
  }

  const runInlineAI = async (action) => {
    setAiLoading(action); setAiResult(null)
    try {
      // Fetch article body from Zendesk® so AI has full content, not just title
      let articleContent = ''
      if (connector && article.zendesk_article_id) {
        const authHeader = `Basic ${btoa(connector.api_key_encrypted)}`
        const res = await fetch(
          `https://${connector.subdomain}.zendesk.com/api/v2/help_center/articles/${article.zendesk_article_id}`,
          { headers: { Authorization: authHeader } }
        )
        if (res.ok) {
          const data = await res.json()
          articleContent = data.article?.body || ''
        }
      }
      const raw = await callAI(action, { title: article.title, content: articleContent })
      setAiResult({ type: action, data: JSON.parse(raw.replace(/```json|```/g,'').trim()) })
    } catch (e) {
      setAiResult({ type: 'error', message: e.message })
    } finally { setAiLoading(null) }
  }

  return (
    <div style={{ borderBottom:'1px solid var(--border)' }}>
      {/* Collapsed row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 20px', transition:'background 0.1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

        <div style={{ width:3, alignSelf:'stretch', borderRadius:2, background:barColor, flexShrink:0 }} />

        <button onClick={() => setOpen(v => !v)}
          style={{ display:'flex', alignItems:'center', flex:1, minWidth:0, background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0, gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
              <span style={{ fontSize:14, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {article.title}
              </span>
              {article.url && (
                <a href={article.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                  style={{ color:'var(--text-3)', display:'flex', flexShrink:0 }}>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color:'var(--text-3)' }}>{article.word_count||0} words</span>
              {article.last_updated && <span style={{ fontSize:11, color:'var(--text-3)' }}>Updated {formatDistanceToNow(new Date(article.last_updated), { addSuffix:true })}</span>}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            {critical.length > 0 && <span className="badge badge-critical"><AlertOctagon size={9} />{critical.length} critical</span>}
            {warning.length  > 0 && <span className="badge badge-warning"><AlertTriangle size={9} />{warning.length} warning{warning.length !== 1 ? 's' : ''}</span>}
            {(clean || allResolved) && <span className="badge badge-success"><CheckCircle size={9} />{allResolved ? 'All resolved' : 'Clean'}</span>}
            {open ? <ChevronUp size={13} style={{ color:'var(--text-3)' }} /> : <ChevronDown size={13} style={{ color:'var(--text-3)' }} />}
          </div>
        </button>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ background:'var(--bg)', border:'1px solid var(--border-md)', borderTop:'none', margin:'0 12px 10px', borderRadius:'0 0 10px 10px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>

          {/* Article link — prominent */}
          {article.url && (
            <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontSize:12, fontWeight:600, color:'var(--text-3)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>Article</p>
                <p style={{ fontSize:12, fontWeight:500, color:'var(--text-2)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:400 }}>{article.title}</p>
              </div>
              <a href={article.url} target="_blank" rel="noreferrer"
                className="btn btn-secondary btn-sm" style={{ flexShrink:0 }}>
                <ExternalLink size={13} /> Open in Zendesk®
              </a>
            </div>
          )}

          {/* Issues */}
          {issues.length > 0 && (
            <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border-md)' }}>
              <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', marginBottom:10 }}>Issues found</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[...issues.filter(i=>i.severity==='critical'), ...issues.filter(i=>i.severity==='warning'), ...issues.filter(i=>i.severity==='info')].map(issue => {
                  const Icon     = ISSUE_ICONS[issue.issue_type] || Info
                  const s        = SEVERITY[issue.severity] || SEVERITY.info
                  const resolved = resolvedIssues.has(issue.id)
                  return (
                    <IssueCard key={issue.id} issue={issue} Icon={Icon} s={s} resolved={resolved}
                      article={article} connector={connector}
                      onResolve={() => onResolveIssue(issue.id, !resolved)} />
                  )
                })}
              </div>
            </div>
          )}

          {/* Clean */}
          {issues.length === 0 && (
            <div style={{ padding:'11px 14px', borderRadius:8, background:'var(--green-light)', border:'1px solid var(--green-border)', display:'flex', alignItems:'center', gap:8, margin:'0 0 4px' }}>
              <CheckCircle size={13} style={{ color:'var(--green)', flexShrink:0 }} />
              <p style={{ fontSize:12, fontWeight:600, color:'var(--green)', margin:0 }}>No issues found — this article looks good.</p>
            </div>
          )}

          {/* AI section */}
          <div style={{ padding:'16px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div>
                <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', margin:'0 0 2px' }}>Fix with ArticleIQ</p>
                {!isPaid && <p style={{ fontSize:11, color:'var(--amber)', fontWeight:600, margin:0 }}>Pro feature — upgrade to unlock</p>}
              </div>
              {!isPaid && (
                <button className="btn btn-sm" style={{ background:'#FFD93D', color:'#0A1A0A', fontWeight:700, fontSize:12 }}>
                  <Zap size={12} /> Upgrade to Pro
                </button>
              )}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {AI_ACTIONS.map(({ key, label, desc, icon: Icon, action }) => (
                <div key={key} style={{ borderRadius:10, border:'1px solid var(--border)', background:'white', overflow:'hidden',
                  opacity: !isPaid ? 0.6 : 1,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px' }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:'var(--green-light)', border:'1px solid var(--green-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={16} style={{ color:'var(--green)' }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 3px' }}>{label}</p>
                      <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.6 }}>{desc}</p>
                    </div>
                    <button onClick={() => isPaid && onOpenDrawer(action)} disabled={!isPaid}
                      className="btn btn-secondary btn-sm" style={{ flexShrink:0 }}>
                      <Icon size={12} /> Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pagination ────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = []
  let start = Math.max(1, page - 2)
  let end   = Math.min(totalPages, start + 4)
  start = Math.max(1, end - 4)
  for (let p = start; p <= end; p++) pages.push(p)

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'20px 0' }}>
      <button onClick={() => onChange(page-1)} disabled={page===1} className="btn btn-secondary btn-sm"><ChevronLeft size={14} /></button>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)}
          style={{ width:32, height:32, borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight: page===p ? 700 : 400,
            background: page===p ? 'var(--navy)' : 'var(--bg-card)', color: page===p ? 'white' : 'var(--text-2)' }}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page+1)} disabled={page===totalPages} className="btn btn-secondary btn-sm"><ChevronRight size={14} /></button>
      <span style={{ fontSize:12, color:'var(--text-3)', marginLeft:4 }}>Page {page} of {totalPages}</span>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────
export default function ScanResultsPage() {
  const { id: scanId } = useParams()
  const { profile }    = useAuth()
  const { resumeScan } = useScan()
  const upgrade        = useUpgrade()

  const [scan,     setScan]     = useState(null)
  const [articles, setArticles] = useState([])
  const [issues,   setIssues]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('critical')
  const [sort,     setSort]     = useState('severity')
  const [page,     setPage]     = useState(1)
  const [exporting,setExporting]= useState(false)
  const [shared,   setShared]   = useState(false)
  const [resolvedIssues,   setResolvedIssues]   = useState(new Set())
  const [drawer,           setDrawer]           = useState(null) // { article, action }
  const [connector,        setConnector]        = useState(null)
  const intervalRef = useRef(null)

  usePageTitle(scan ? `Scan report · ${format(new Date(scan.created_at), 'MMM d')}` : 'Scan results')

  const isPaid = ['paid','pack','annual'].includes(profile?.plan)

  // Load connector for AI drawer
  useEffect(() => {
    if (!scan?.user_id) return
    supabase.from('zendesk_connectors').select('*').eq('user_id', scan.user_id).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => setConnector(data || null))
  }, [scan?.user_id])

  const fetchAll = useCallback(async () => {
    const [{ data:s }, { data:a }, { data:i }] = await Promise.all([
      supabase.from('scan_jobs').select('*').eq('id', scanId).single(),
      supabase.from('scanned_articles').select('*').eq('scan_job_id', scanId),
      supabase.from('article_issues').select('*').eq('scan_job_id', scanId),
    ])
    if (s) setScan(s)
    if (a) setArticles(a)
    if (i) { setIssues(i); setResolvedIssues(new Set(i.filter(x=>x.resolved).map(x=>x.id))) }
    return s?.status === 'running' || s?.status === 'pending'
  }, [scanId])

  useEffect(() => {
    const init = async () => {
      const running = await fetchAll()
      setLoading(false)
      if (running) {
        intervalRef.current = setInterval(async () => {
          const still = await fetchAll()
          if (!still) clearInterval(intervalRef.current)
        }, 3000)
      }
    }
    init()
    return () => clearInterval(intervalRef.current)
  }, [scanId])

  useEffect(() => setPage(1), [filter, sort])

  const resolveIssue = async (issueId, resolved) => {
    // Optimistic update first
    setResolvedIssues(prev => { const n = new Set(prev); resolved ? n.add(issueId) : n.delete(issueId); return n })
    const { error } = await supabase.from('article_issues')
      .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null })
      .eq('id', issueId)
    if (error) {
      console.error('resolveIssue error:', error)
      // Revert optimistic update on failure
      setResolvedIssues(prev => { const n = new Set(prev); resolved ? n.delete(issueId) : n.add(issueId); return n })
    }
  }


  const handleShare = async () => {
    await supabase.from('scan_jobs').update({ is_shared:true, shared_at:new Date().toISOString() }).eq('id', scanId)
    await navigator.clipboard.writeText(`${window.location.origin}/share/${scanId}`)
    setShared(true); setTimeout(() => setShared(false), 3000)
  }

  const score    = calcHealth(articles, issues)
  const isActive = scan?.status === 'running' || scan?.status === 'pending'
  const isStalled = isActive && scan?.last_activity &&
    (Date.now() - new Date(scan.last_activity).getTime()) > 3 * 60 * 1000
  const pct = scan?.total_articles ? Math.round((scan.scanned_articles / scan.total_articles) * 100) : 0

  const filterOpts = [
    { key:'all',      label:'All',         count: articles.length },
    { key:'issues',   label:'Needs review', count: articles.filter(a => issues.some(i=>i.article_id===a.id && !resolvedIssues.has(i.id))).length },
    { key:'critical', label:'Critical',    count: articles.filter(a => issues.some(i=>i.article_id===a.id && i.severity==='critical' && !resolvedIssues.has(i.id))).length },
    { key:'clean',    label:'Clean',       count: articles.filter(a => !issues.some(i=>i.article_id===a.id)).length },
    { key:'reviewed', label:'Reviewed',    count: articles.filter(a => { const ai = issues.filter(i=>i.article_id===a.id); return ai.length > 0 && ai.every(i=>resolvedIssues.has(i.id)) }).length },
  ]

  const filtered = articles
    .filter(a => {
      const ai      = issues.filter(i => i.article_id===a.id)
      const unrec   = ai.filter(i => !resolvedIssues.has(i.id))
      const allRes  = ai.length > 0 && ai.every(i => resolvedIssues.has(i.id))
      if (filter==='reviewed') return issues.filter(i=>i.article_id===a.id).some(i=>resolvedIssues.has(i.id))
      if (allRes && filter !== 'reviewed') return false
      if (filter==='all')      return true
      if (filter==='issues')   return unrec.length > 0
      if (filter==='critical') return unrec.some(i=>i.severity==='critical')
      if (filter==='clean')    return ai.length === 0
      return true
    })
    .sort((a, b) => {
      const ai = issues.filter(i=>i.article_id===a.id && !resolvedIssues.has(i.id))
      const bi = issues.filter(i=>i.article_id===b.id && !resolvedIssues.has(i.id))
      // Critical always first regardless of sort
      const aCrit = ai.some(i=>i.severity==='critical')
      const bCrit = bi.some(i=>i.severity==='critical')
      if (aCrit && !bCrit) return -1
      if (!aCrit && bCrit) return 1
      if (sort==='severity') {
        const sev = x => x.some(i=>i.severity==='critical') ? 0 : x.some(i=>i.severity==='warning') ? 1 : x.length ? 2 : 3
        return sev(ai) - sev(bi)
      }
      if (sort==='words') return (a.word_count||0) - (b.word_count||0)
      return 0
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400 }}>
      <div style={{ textAlign:'center' }}>
        <Loader size={22} style={{ color:'var(--green)', animation:'spin 0.7s linear infinite', marginBottom:10 }} />
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Loading report...</p>
      </div>
    </div>
  )

  if (!scan) return (
    <div style={{ maxWidth:600, margin:'80px auto', textAlign:'center', padding:'0 24px' }}>
      <p style={{ color:'var(--text-3)', marginBottom:16 }}>Scan not found</p>
      <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
    </div>
  )

  if (scan.status === 'failed') return (
    <div style={{ maxWidth:560, margin:'80px auto', textAlign:'center', padding:'0 24px' }} className="animate-in">
      <div style={{ width:52, height:52, borderRadius:14, background:'var(--red-light)', border:'1px solid var(--red-border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
        <AlertOctagon size={24} style={{ color:'var(--red)' }} />
      </div>
      <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:8 }}>Scan didn't complete</h2>
      <p style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.7, marginBottom:8 }}>
        {scan.error_message || 'Something went wrong while scanning your knowledge base.'}
      </p>
      <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:24 }}>
        {scan.scanned_articles > 0 && `${scan.scanned_articles} articles were analyzed before the error.`}
      </p>
      <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
        <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
        <Link to="/dashboard" className="btn btn-primary"><Scan size={14} /> Start new scan</Link>
      </div>
      {scan.scanned_articles > 0 && (
        <p style={{ fontSize:12, color:'var(--green)', marginTop:16, cursor:'pointer', fontWeight:600 }}
          onClick={() => setScan(s => ({ ...s, status: 'completed' }))}>
          View partial results ({scan.scanned_articles} articles) →
        </p>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'clamp(12px,4vw,24px)' }}>

      {/* Back + actions */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <Link to="/dashboard" className="btn btn-ghost btn-sm" style={{ gap:5 }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleShare} className="btn btn-secondary btn-sm">
            {shared ? <Check size={13} /> : <Share2 size={13} />}
            {shared ? 'Link copied!' : 'Share report'}
          </button>
          <button onClick={() => { setExporting(true); exportExcel(scan, articles, issues).finally(() => setExporting(false)) }}
            disabled={exporting} className="btn btn-secondary btn-sm">
            {exporting ? <Loader size={13} style={{ animation:'spin 0.7s linear infinite' }} /> : <Download size={13} />}
            Export
          </button>
        </div>
      </div>

      {/* Progress banner */}
{/* nothing — active scan is merged into hero below */}

      {/* Free tier limit reached banner */}
      {scan.status === 'completed' && scan.error_message === 'free_limit_reached' && (() => {
        const scanned     = scan.scanned_articles || 300
        const total       = scan.total_articles || scanned
        const remaining   = total - scanned
        const issueRate   = issues.length / scanned
        const estimated   = Math.round(issueRate * remaining)
        const critRate    = issues.filter(i=>i.severity==='critical').length / scanned
        const estCritical = Math.round(critRate * remaining)
        return (
          <div className="card animate-in" style={{ marginBottom: 16, overflow: 'hidden', border: '1.5px solid var(--amber-border)' }}>
            <div style={{ padding: '16px 20px', background: 'var(--amber-light)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertTriangle size={18} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                    Showing {scanned.toLocaleString()} of {total.toLocaleString()} articles — free tier limit
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                    You found <strong>{issues.length} issues</strong> in the first {scanned} articles.
                    At this rate, the remaining <strong>{remaining.toLocaleString()} articles</strong> likely contain{' '}
                    <strong style={{ color: 'var(--amber)' }}>~{estimated} more issues</strong>
                    {estCritical > 0 && <span> including <strong style={{ color: 'var(--red)' }}>~{estCritical} critical</strong></span>}.
                  </p>
                </div>
              </div>
              <button onClick={upgrade} className="btn btn-sm" style={{ background:'#FFD93D', color:'#0A1A0A', fontWeight:700, flexShrink:0 }}>
                <Zap size={13} /> Upgrade to Pro →
              </button>
            </div>
            <div style={{ padding: '10px 20px', background: 'white', display: 'flex', gap: 24 }}>
              {[
                { label: 'Scanned', value: scanned.toLocaleString(), color: 'var(--text)' },
                { label: 'Issues found', value: issues.length, color: 'var(--amber)' },
                { label: 'Articles remaining', value: remaining.toLocaleString(), color: 'var(--text-3)' },
                { label: 'Estimated issues remaining', value: `~${estimated}`, color: 'var(--red)' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Combined hero — handles active scan and completed */}
      <div style={{ borderRadius:'var(--radius-xl)', background:'var(--navy)', padding:'22px 26px', marginBottom:16, position:'relative', overflow:'hidden' }} className="animate-in">
        <div style={{ position:'absolute', top:-50, right:-50, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
        <div style={{ position:'relative' }}>
          {/* Label row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', margin:0 }}>
              Scan Report · {format(new Date(scan.created_at), 'MMM d, yyyy')} · {scan.preset ? `${scan.preset.split(',').length} checks` : ''}
            </p>
            {isActive && (
              <button onClick={async () => {
                await supabase.from('scan_jobs').update({ status:'failed', error_message:'Cancelled', completed_at:new Date().toISOString() }).eq('id', scanId)
                setScan(s => ({ ...s, status:'failed' }))
              }} className="btn btn-ghost btn-sm" style={{ color:'rgba(255,255,255,0.5)', fontSize:11 }}>Stop</button>
            )}
          </div>

          {/* Score + status */}
          <div style={{ display:'flex', alignItems:'flex-end', gap:16, marginBottom:14 }}>
            <div style={{ fontSize:72, fontWeight:800, color: isActive ? 'rgba(255,255,255,0.4)' : 'white', lineHeight:1, letterSpacing:-3 }}>
              {isActive ? `${pct}%` : (score ?? '—')}
            </div>
            <div style={{ paddingBottom:10 }}>
              {isActive ? (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                    {isStalled
                      ? <span style={{ fontSize:15, fontWeight:700, color:'#FFD980' }}>Scan paused</span>
                      : <><div className="pulse-dot" style={{ width:8, height:8, borderRadius:'50%', background:'white', opacity:0.7 }} /><span style={{ fontSize:15, fontWeight:700, color:'white' }}>Scan in progress</span></>
                    }
                  </div>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:0 }}>
                    {scan.scanned_articles||0} of {scan.total_articles||'?'} articles · keep this tab open
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:3 }}>{score ? healthLabel(score) : '—'}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{formatDistanceToNow(new Date(scan.created_at), { addSuffix:true })}</div>
                </div>
              )}
            </div>
            {isStalled && (
              <button onClick={() => resumeScan(scan)} className="btn btn-sm" style={{ background:'#FFD93D', color:'#1A1A18', fontWeight:700, marginBottom:8 }}>Resume scan</button>
            )}
          </div>

          {/* Pills */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            {issues.filter(i=>i.severity==='critical').length > 0 && (
              <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(192,57,43,0.35)', color:'#FFAAAA', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                <AlertOctagon size={10}/> {issues.filter(i=>i.severity==='critical').length} critical
              </div>
            )}
            {issues.filter(i=>i.severity==='warning').length > 0 && (
              <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(255,200,80,0.18)', color:'#FFD980', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                <AlertTriangle size={10}/> {issues.filter(i=>i.severity==='warning').length} warnings
              </div>
            )}
            <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.65)', fontSize:11 }}>
              {articles.length || scan.scanned_articles || 0} articles
            </div>
            {score !== null && score < 80 && !isActive && (
              <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.55)', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                <Target size={10}/> {80-score} points to Healthy
              </div>
            )}
          </div>

          {/* Progress bar — only when active */}
          {isActive && (
            <div style={{ marginTop:14, height:3, background:'rgba(255,255,255,0.15)', borderRadius:100, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.max(pct,1)}%`, background: isStalled ? '#FFD93D' : 'rgba(255,255,255,0.6)', borderRadius:100, transition:'width 0.4s ease' }} />
            </div>
          )}
        </div>
      </div>

      {/* Filters + sort */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        <div className='filter-pills' style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.7)', borderRadius:100, padding:4, border:'1px solid var(--border-md)', flexWrap:'wrap' }}>
          {filterOpts.map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ padding:'5px 14px', borderRadius:100, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', transition:'all 0.15s',
                background: filter===key ? 'var(--navy)' : 'transparent',
                color: filter===key ? 'white' : 'var(--text-2)',
              }}>
              {label} <span style={{ opacity:0.7 }}>({count})</span>
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="input"
          style={{ width:'auto', padding:'6px 10px', fontSize:13 }}>
          <option value="severity">Sort by severity</option>
          <option value="words">Sort by word count</option>
        </select>
      </div>

      {/* Article count */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
        <span style={{ fontSize:11, color:'var(--text-3)' }}>{filtered.length} articles</span>
      </div>

      {/* Article list */}
      <div className="card" style={{ overflow:'hidden', marginBottom:16 }}>
        {paginated.length === 0 ? (
          <div style={{ padding:48, textAlign:'center' }}>
            {isActive ? (
              // Scan still initialising — no articles yet
              <>
                <Loader size={24} style={{ color:'var(--navy)', animation:'spin 0.8s linear infinite', marginBottom:12 }} />
                <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Scan in progress</p>
                <p style={{ fontSize:13, color:'var(--text-3)' }}>Articles will appear here as the scan runs — keep this tab open.</p>
              </>
            ) : articles.length === 0 ? (
              // Scan done but truly no articles returned
              <>
                <Loader size={24} style={{ color:'var(--text-3)', marginBottom:12 }} />
                <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Loading results...</p>
                <p style={{ fontSize:13, color:'var(--text-3)' }}>Fetching scan data — this should only take a moment.</p>
              </>
            ) : (
              // Articles loaded, filter just has no matches
              <>
                <CheckCircle size={28} style={{ color:'var(--green)', marginBottom:10 }} />
                <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:4 }}>
                  {filter === 'critical' ? '0 critical issues — nice work' : 'Nothing matches this filter'}
                </p>
                <p style={{ fontSize:13, color:'var(--text-3)' }}>Try a different filter to see more articles.</p>
              </>
            )}
          </div>
        ) : paginated.map(a => (
          <ArticleRow key={a.id} article={a}
            issues={issues.filter(i=>i.article_id===a.id)}
            isPaid={isPaid}
            connector={connector}
            onOpenDrawer={(action) => setDrawer({ article: a, action })}
            resolvedIssues={resolvedIssues}
            onResolveIssue={resolveIssue}
          />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); window.scrollTo(0,0) }} />

      {/* AI Drawer */}
      {drawer && (
        <AIDrawer
          article={drawer.article}
          connector={connector}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  )
}
