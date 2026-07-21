import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

// "Hide content" mode blurs terminal text and previews that may contain secrets,
// revealed on tap. Persisted per device.
interface HideContentValue {
  hidden: boolean
  toggle: () => void
}

const HideContentContext = createContext<HideContentValue>({
  hidden: false,
  toggle: () => {},
})

const STORAGE_KEY = 'cmux:hide-content'

export function HideContentProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle])
  return (
    <HideContentContext.Provider value={value}>
      {children}
    </HideContentContext.Provider>
  )
}

export function useHideContent(): HideContentValue {
  return useContext(HideContentContext)
}
