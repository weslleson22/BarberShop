"use client"

import * as React from "react"

interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
  forcedTheme?: string
}

type ThemeContextType = {
  theme: string
  setTheme: (theme: string) => void
  themes: string[]
  systemTheme?: "dark" | "light"
  resolvedTheme?: "dark" | "light"
}

const ThemeContext = React.createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => null,
  themes: ["light", "dark", "system"],
})

export const useTheme = () => React.useContext(ThemeContext)

/**
 * ThemeProvider robusto com suporte nativo e fallback automático:
 * Integra com 'next-themes' quando presente ou gerencia a classe 'dark' no <html> nativamente.
 */
export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  storageKey = "theme",
  forcedTheme,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = React.useState<"dark" | "light">("dark")
  const [mounted, setMounted] = React.useState(false)

  // Sincronização inicial de tema
  React.useEffect(() => {
    setMounted(true)
    try {
      const savedTheme = localStorage.getItem(storageKey) || defaultTheme
      setThemeState(savedTheme)
    } catch {
      // Ignora erro de acesso a localStorage em ambiente restrito
    }
  }, [defaultTheme, storageKey])

  // Aplicação da classe 'dark' no elemento raiz <html>
  React.useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    const effectiveTheme = forcedTheme || theme

    const applyTheme = (isDark: boolean) => {
      if (attribute === "class") {
        if (isDark) {
          root.classList.add("dark")
          root.classList.remove("light")
        } else {
          root.classList.remove("dark")
          root.classList.add("light")
        }
      } else {
        root.setAttribute(attribute, isDark ? "dark" : "light")
      }
      setResolvedTheme(isDark ? "dark" : "light")
    }

    if (effectiveTheme === "system" && enableSystem) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      applyTheme(mediaQuery.matches)

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener("change", handler)
      return () => mediaQuery.removeEventListener("change", handler)
    } else {
      applyTheme(effectiveTheme === "dark")
    }
  }, [theme, mounted, attribute, enableSystem, forcedTheme])

  const setTheme = React.useCallback(
    (newTheme: string) => {
      setThemeState(newTheme)
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch {
        // Ignora erro de storage
      }
    },
    [storageKey]
  )

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      themes: ["light", "dark", "system"],
      resolvedTheme,
    }),
    [theme, setTheme, resolvedTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
