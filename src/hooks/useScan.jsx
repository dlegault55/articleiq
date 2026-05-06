import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const ScanContext = createContext(null)

export const ScanProvider = ({ children }) => {
  const { userId } = useAuth()
  const [recentScans, setRecentScans] = useState([])
  const [activeScan,  setActiveScan]  = useState(null)
  const driving = useRef(null) // scan ID currently being driven

  const reload = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('scan_jobs').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    const scans = data ?? []
    setRecentScans(scans)
    const active = scans.find(s => s.status === 'running' || s.status === 'pending') ?? null
    setActiveScan(active)
    return active
  }, [userId])

  // Drive scan chunks — simple loop, one chunk at a time
  const drive = useCallback(async (scan) => {
    if (!scan?.id || driving.current === scan.id) return
    driving.current = scan.id

    // Get connector
    const { data: connector } = await supabase
      .from('zendesk_connectors').select('id')
      .eq('user_id', scan.user_id).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).single()

    if (!connector) { driving.current = null; return }

    // Resume from where we left off
    const startPage = Math.max(1, Math.floor((scan.scanned_articles || 0) / 50) + 1)
    let page = startPage
    let done = false

    while (!done) {
      try {
        const res = await fetch('/api/scan-chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scanJobId:   scan.id,
            userId:      scan.user_id,
            connectorId: connector.id,
            preset:      scan.preset || 'standard',
            page,
          }),
        })
        if (!res.ok) break
        const data = await res.json()
        if (data.done || data.cancelled || !data.hasMore) done = true
        else page = data.nextPage || page + 1
      } catch (e) {
        console.error('Scan chunk error:', e.message)
        break
      }
    }

    driving.current = null
    reload()
  }, [reload])

  // Resume a stalled scan
  const resumeScan = useCallback(async (scan) => {
    await supabase.from('scan_jobs').update({ status: 'running' }).eq('id', scan.id)
    driving.current = null // allow re-drive
    const fresh = await reload()
    if (fresh) drive(fresh)
  }, [reload, drive])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!activeScan) return
    // Start driving if not already
    if (driving.current !== activeScan.id) drive(activeScan)
    // Poll for UI updates
    const id = setInterval(reload, 3000)
    return () => clearInterval(id)
  }, [!!activeScan, activeScan?.id])

  return (
    <ScanContext.Provider value={{ recentScans, activeScan, reload, resumeScan }}>
      {children}
    </ScanContext.Provider>
  )
}

export const useScan = () => useContext(ScanContext)
