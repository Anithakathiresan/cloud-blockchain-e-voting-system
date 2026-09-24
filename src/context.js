import { createContext, useContext } from 'react'

// Everything a page needs from the shell: text, session, registry, ledger,
// derived election state and the actions that change them. Provided by App.
export const AppContext = createContext(null)

export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp must be used inside <AppContext.Provider>.')
  return value
}
