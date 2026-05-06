import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const ScanContext = createContext(null)

const CHUNK_SIZE = 50 // matches api/scan-chunk.js PER_PAGE

export const ScanProvider = ({ children }) => {
  const { userId } = useAuth()
  const [recentScans, setRecentScans] = useState([])
  const [activeScan,  setActiveScan]  = useState(null)
  const [initialized, setInitialized] = useState(false)
  const chunkingRef   = useRef(false)
  const drivingForRef = useRef(null)
  const activeRef     = useRef(null)

  const reload = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('scan_jobs').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(20)
    const scans = data ?? []
    setRecentScans(scans)
    const active = scans.find(s => s.status === 'running' || s.status === 'pending') ?? null
    setActiveScan(active)
    activeRef.current = active
    setInitialized(true)
  }, [userId])

  const driveChunks = useCallback(async (scan, resumeFromPage = 1) => {
    if (!scan?.id) return
    if (drivingForRef.current === scan.id) return
    if (chunkingRef.current) return

    const { data: connector } = await supabase
      .from('zendesk_connectors').select('id')
      .eq('user_id', scan.user_id).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).single()

    if (!connector) return

    chunkingRef.current = true
    drivingForRef.current = scan.id
    let page = resumeFromPage

    while (true) {
      const current = activeRef.current
      if (!current || current.id !== scan.id) break
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
        if (data.done || data.cancelled || !data.hasMore) break
        page = data.nextPage || page + 1
      } catch (e) {
        console.error('Chunk error:', e)
        break
      }
    }

    chunkingRef.current = false
    drivingForRef.current = null
    reload()
  }, [reload])

  // Resume a stalled scan from where it left off
  const resumeScan = useCallback(async (scan) => {
    if (!scan?.id) return
    // Figure out which page to resume from based on articles already scanned
    const scanned = scan.scanned_articles || 0
    const resumePage = Math.floor(scanned / CHUNK_SIZE) + 1

    // Mark as running again
    await supabase.from('scan_jobs').update({ status: 'running' }).eq('id', scan.id)
    await reload()

    driveChunks({ ...scan, status: 'running' }, resumePage)
  }, [driveChunks, reload])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!activeScan) return
    if (!chunkingRef.current && drivingForRef.current !== activeScan.id) {
      // Calculate resume page based on already-scanned articles
      const scanned = activeScan.scanned_articles || 0
      const resumePage = Math.max(1, Math.floor(scanned / CHUNK_SIZE) + 1)
      driveChunks(activeScan, resumePage)
    }
    const id = setInterval(reload, 3000)
    return () => clearInterval(id)
  }, [!!activeScan, activeScan?.id, reload, driveChunks])

  return (
    <ScanContext.Provider value={{ recentScans, activeScan, initialized, reload, resumeScan }}>
      {children}
    </ScanContext.Provider>
  )
}

export const useScan = () => useContext(ScanContext)
