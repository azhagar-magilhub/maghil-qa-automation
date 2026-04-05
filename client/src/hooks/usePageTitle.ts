import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | QA Automation Platform`
    return () => { document.title = 'QA Automation Platform - Maghil' }
  }, [title])
}
