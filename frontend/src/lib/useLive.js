import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

// Calls onChange whenever a row matching `filter` changes in `table`
export function useLive(table, filter, onChange) {
  const cb = useRef(onChange)
  cb.current = onChange

  useEffect(() => {
    if (!filter) return
    const channel = supabase
      .channel(`${table}:${filter}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => cb.current())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter])
}