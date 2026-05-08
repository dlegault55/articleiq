import { useEffect } from 'react'

export const usePageTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} — ArticleIQ` : 'ArticleIQ'
    return () => { document.title = 'ArticleIQ' }
  }, [title])
}
