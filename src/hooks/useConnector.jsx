import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const ConnectorContext = createContext(null)

export const ConnectorProvider = ({ children }) => {
  const { user } = useAuth()
  const [hasConnector, setHasConnector] = useState(null)

  useEffect(() => {
    if (!user) { setHasConnector(false); return }
    supabase
      .from('zendesk_connectors')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .then(({ data }) => setHasConnector((data?.length ?? 0) > 0))
  }, [user])

  return (
    <ConnectorContext.Provider value={{ hasConnector }}>
      {children}
    </ConnectorContext.Provider>
  )
}

export const useConnector = () => useContext(ConnectorContext)
