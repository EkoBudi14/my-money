'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

type Theme = 'light' | 'dark'

// Where the theme wipe starts (a click's clientX/clientY). Omit = screen center.
type Origin = { clientX: number; clientY: number }

interface ThemeContextType {
  theme: Theme
  toggleTheme: (origin?: Origin) => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => { },
  setTheme: () => { },
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    // Read from localStorage
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'dark' || stored === 'light') {
      setThemeState(stored)
      if (stored === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      // No stored preference — follow system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        setThemeState('dark')
        document.documentElement.classList.add('dark')
      } else {
        setThemeState('light')
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Circle wipe from the click point via the View Transitions API.
  // Falls back to an instant swap when unsupported or reduced motion is on.
  const toggleTheme = (origin?: Origin) => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!doc.startViewTransition || reduce) {
      setTheme(next)
      return
    }
    const w = window.innerWidth, h = window.innerHeight
    const hasPoint = origin && (origin.clientX || origin.clientY)
    const x = hasPoint ? origin!.clientX : w / 2
    const y = hasPoint ? origin!.clientY : h / 2
    const r = Math.hypot(Math.max(x, w - x), Math.max(y, h - y))
    const vt = doc.startViewTransition(() => { flushSync(() => setTheme(next)) })
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' },
      )
    }).catch(() => { })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
