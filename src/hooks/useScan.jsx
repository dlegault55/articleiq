import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import { useAuth } from './useAuth'

const ScanContext = createContext(null)
const CHUNK_SIZE = 50

export const ScanProvider = ({ children }) => {
  const { userId } = useAuth()
  const [recentScans, setRecentScans] = useState([])
  const [activeScan,  setActiveScan]  = useState(null)
  const running = useRef(false)  // is the loop running right now?
  const scanId  = useRef(null)   // which scan are we driving?

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

  const drive = useCallback(async (scan) => {
    if (running.current) return   // already looping
    if (!scan?.id) return

    // Get connector
    const { data: connector } = await supabase
      .from('kb_connectors').select('id')
      .eq('user_id', scan.user_id).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).single()
    if (!connector) return

    running.current = true
    scanId.current  = scan.id

    // Resume from where we left off
    const startPage = Math.max(1, Math.floor((scan.scanned_articles || 0) / CHUNK_SIZE) + 1)
    let page = startPage

    while (true) {
      // Check scan hasn't been cancelled externally
      const { data: current } = await supabase
        .from('scan_jobs').select('status').eq('id', scan.id).single()
      if (!current || current.status === 'failed' || current.status === 'completed') break

      try {
        const res = await apiFetch('/api/scan-chunk', {
          method: 'POST',
          body: JSON.stringify({
            scanJobId:   scan.id,
            connectorId: connector.id,
            preset:      scan.preset || 'outdated,wordCount,readability,labels',
            page,
          }),
        })

        if (!res.ok) {
          console.error('Chunk HTTP error:', res.status)
          if (res.status >= 500) {
            // Server error — wait and retry rather than killing the scan
            await new Promise(r => setTimeout(r, 3000))
            continue
          }
          break
        }
        const data = await res.json()
        if (data.cancelled || data.done || !data.hasMore) break
        page = data.nextPage || page + 1
      } catch (e) {
        console.error('Chunk fetch error:', e.message)
        break
      }
    }

    running.current = false
    scanId.current  = null
    reload()
  }, [reload])

  // Resume a stalled scan
  const resumeScan = useCallback(async (scan) => {
    running.current = false // allow re-drive
    await supabase.from('scan_jobs').update({ status: 'running' }).eq('id', scan.id)
    const active = await reload()
    if (active) drive(active)
  }, [reload, drive])

  useEffect(() => { reload() }, [reload])

  // Start driving when active scan detected, poll for UI updates
  useEffect(() => {
    if (!activeScan) return
    if (!running.current) drive(activeScan)
    const id = setInterval(reload, 3000)
    return () => clearInterval(id)
  }, [activeScan?.id])

  return (
    <ScanContext.Provider value={{ recentScans, activeScan, reload, resumeScan }}>
      {children}
    </ScanContext.Provider>
  )
}

export const useScan = () => useContext(ScanContext)
