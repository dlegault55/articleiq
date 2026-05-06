import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const ScanContext = createContext(null)

export const ScanProvider = ({ children }) => {
  const { userId } = useAuth()
  const [recentScans, setRecentScans] = useState([])
  const [activeScan,  setActiveScan]  = useState(null)
  const [initialized, setInitialized] = useState(false)
  const chunkingRef   = useRef(false)
  const activeRef     = useRef(null)
  const drivingForRef = useRef(null) // track which scan we're driving

  const reload = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    const scans = data ?? []
    setRecentScans(scans)
    const active = scans.find(s => s.status === 'running' || s.status === 'pending') ?? null
    setActiveScan(active)
    activeRef.current = active
    setInitialized(true)
    return active
  }, [userId])

  const driveChunks = useCallback(async (scan) => {
    if (!scan?.id) return
    if (drivingForRef.current === scan.id) return // already driving this scan
    if (chunkingRef.current) return

    const { data: connector } = await supabase
      .from('zendesk_connectors')
      .select('id')
      .eq('user_id', scan.user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!connector) return

    chunkingRef.current = true
    drivingForRef.current = scan.id
    let page = 1
    let done = false

    while (!done) {
      // Stop if scan was cancelled or completed externally
      const current = activeRef.current
      if (!current || current.id !== scan.id) { done = true; break }

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
        if (!res.ok) { done = true; break }
        const data = await res.json()
        if (data.done || data.cancelled || !data.hasMore) done = true
        else page = data.nextPage || page + 1
      } catch (e) {
        console.error('Chunk error:', e)
        done = true
      }
    }

    chunkingRef.current = false
    drivingForRef.current = null
    reload()
  }, [reload])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!activeScan) return

    // Drive chunks for pending scans — or running scans we're not already handling
    if (!chunkingRef.current && drivingForRef.current !== activeScan.id) {
      driveChunks(activeScan)
    }

    const id = setInterval(reload, 2000)
    return () => clearInterval(id)
  }, [!!activeScan, activeScan?.id, reload, driveChunks])

  return (
    <ScanContext.Provider value={{ recentScans, activeScan, initialized, reload }}>
      {children}
    </ScanContext.Provider>
  )
}

export const useScan = () => useContext(ScanContext)
