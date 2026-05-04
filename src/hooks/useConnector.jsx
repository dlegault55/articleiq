import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const ConnectorContext = createContext(null)

export const ConnectorProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const [hasConnector, setHasConnector] = useState(null)
  const [connector, setConnector] = useState(null)

  const checkConnector = useCallback(async () => {
    const uid = profile?.id || user?.id
    if (!uid) { setHasConnector(false); return }
    const { data } = await supabase
      .from('zendesk_connectors')
      .select('*')
      .eq('user_id', uid)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
    const found = data?.[0] ?? null
    setConnector(found)
    setHasConnector(!!found)
  }, [user, profile])

  useEffect(() => {
    checkConnector()
  }, [checkConnector])

  // Also recheck every time the window gets focus (e.g. after saving on another page)
  useEffect(() => {
    window.addEventListener('focus', checkConnector)
    return () => window.removeEventListener('focus', checkConnector)
  }, [checkConnector])

  return (
    <ConnectorContext.Provider value={{ hasConnector, connector, recheckConnector: checkConnector }}>
      {children}
    </ConnectorContext.Provider>
  )
}

export const useConnector = () => useContext(ConnectorContext)
