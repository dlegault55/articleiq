import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const ScanContext = createContext(null)

export const ScanProvider = ({ children }) => {
  const { profile, user } = useAuth()
  const [activeScan, setActiveScan] = useState(null)
  const [recentScans, setRecentScans] = useState([])

  const uid = profile?.id || user?.id

  const loadScans = useCallback(async () => {
    if (!uid) return
    const { data } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(10)
    if (!data) return
    setRecentScans(data)
    const active = data.find(s => s.status === 'running' || s.status === 'pending')
    setActiveScan(active || null)
  }, [uid])

  // Load on mount and when user changes
  useEffect(() => { loadScans() }, [loadScans])

  // Poll every 2s when there's an active scan
  useEffect(() => {
    if (!activeScan) return
    const interval = setInterval(loadScans, 2000)
    return () => clearInterval(interval)
  }, [activeScan, loadScans])

  return (
    <ScanContext.Provider value={{ activeScan, recentScans, loadScans }}>
      {children}
    </ScanContext.Provider>
  )
}

export const useScan = () => useContext(ScanContext)
