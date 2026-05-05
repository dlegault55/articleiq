import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const ConnectorContext = createContext(null)

export const ConnectorProvider = ({ children }) => {
  const { userId } = useAuth()
  const [connector, setConnector] = useState(null)
  const [hasConnector, setHasConnector] = useState(null) // null = loading

  const reload = useCallback(async () => {
    if (!userId) { setConnector(null); setHasConnector(false); return }
    const { data } = await supabase
      .from('zendesk_connectors')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
    const found = data?.[0] ?? null
    setConnector(found)
    setHasConnector(!!found)
  }, [userId])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    window.addEventListener('focus', reload)
    return () => window.removeEventListener('focus', reload)
  }, [reload])

  return (
    <ConnectorContext.Provider value={{ connector, hasConnector, reload }}>
      {children}
    </ConnectorContext.Provider>
  )
}

export const useConnector = () => useContext(ConnectorContext)
