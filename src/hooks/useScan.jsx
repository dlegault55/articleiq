import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const ScanContext = createContext(null)

export const ScanProvider = ({ children }) => {
  const { userId } = useAuth()
  const [recentScans, setRecentScans] = useState([])
  const [activeScan, setActiveScan]   = useState(null)
  const [initialized, setInitialized] = useState(false)

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
    setActiveScan(scans.find(s => s.status === 'running' || s.status === 'pending') ?? null)
    setInitialized(true)
  }, [userId])

  useEffect(() => { reload() }, [reload])

  // Poll only when there's an active scan
  useEffect(() => {
    if (!activeScan) return
    const id = setInterval(reload, 2000)
    return () => clearInterval(id)
  }, [!!activeScan, reload])

  return (
    <ScanContext.Provider value={{ recentScans, activeScan, initialized, reload }}>
      {children}
    </ScanContext.Provider>
  )
}

export const useScan = () => useContext(ScanContext)
