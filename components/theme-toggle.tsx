"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ThemeToggleProps extends React.ComponentProps<typeof Button> {
  variant?: "ghost" | "outline" | "default" | "secondary"
  showDropdown?: boolean
}

export function ThemeToggle({
  className,
  variant = "ghost",
  showDropdown = false,
  ...props
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Evita hydration mismatch renderizando placeholder neutro
  if (!mounted) {
    return (
      <Button
        variant={variant}
        size="icon"
        className={cn("h-9 w-9 text-foreground/80", className)}
        disabled
        aria-label="Alternar tema"
        {...props}
      >
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  // Toggle rápido de 1 clique (ideal para header/footer e navegação)
  if (!showDropdown) {
    const isDark = resolvedTheme === "dark" || theme === "dark"
    return (
      <Button
        variant={variant}
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "h-9 w-9 text-foreground hover:text-foreground hover:bg-accent transition-colors relative cursor-pointer",
          className
        )}
        title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        aria-label="Alternar tema"
        {...props}
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400" />
        <span className="sr-only">Alternar tema</span>
      </Button>
    )
  }

  // Versão com DropdownMenu (Claro, Escuro, Sistema)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className={cn(
            "h-9 w-9 text-foreground hover:text-foreground hover:bg-accent transition-colors relative cursor-pointer",
            className
          )}
          aria-label="Selecionar tema"
          {...props}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400" />
          <span className="sr-only">Selecionar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-xs">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn("cursor-pointer", theme === "light" && "font-semibold")}
        >
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn("cursor-pointer", theme === "dark" && "font-semibold")}
        >
          Escuro
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn("cursor-pointer", theme === "system" && "font-semibold")}
        >
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
