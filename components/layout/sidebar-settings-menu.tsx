"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { isSettingsNavGroupActive, settingsNavEntries } from "@/components/settings/settings-nav-config"

type SidebarSettingsMenuProps = {
  pathname: string
  collapsed: boolean
}

export function isSettingsPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard/settings")
}

function SettingsMenuItems({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {settingsNavEntries.map((entry) => {
        if (entry.type === "link") {
          const Icon = entry.icon
          const isActive = pathname === entry.href || pathname.startsWith(`${entry.href}/`)

          return (
            <DropdownMenuItem key={entry.id} asChild className={cn(isActive && "bg-primary/10 text-primary")}>
              <Link href={entry.href} onClick={onNavigate}>
                <Icon className="h-4 w-4" />
                {entry.label}
              </Link>
            </DropdownMenuItem>
          )
        }

        const GroupIcon = entry.icon
        const groupActive = isSettingsNavGroupActive(entry, pathname)

        return (
          <DropdownMenuSub key={entry.id}>
            <DropdownMenuSubTrigger className={cn(groupActive && "bg-primary/10 text-primary")}>
              <GroupIcon className="h-4 w-4" />
              {entry.label}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {entry.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <DropdownMenuItem key={item.id} asChild className={cn(isActive && "bg-primary/10 text-primary")}>
                    <Link href={item.href} onClick={onNavigate}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )
      })}
    </>
  )
}

export function SidebarSettingsMenu({ pathname, collapsed }: SidebarSettingsMenuProps) {
  const settingsActive = isSettingsPath(pathname)
  const [settingsOpen, setSettingsOpen] = useState(settingsActive)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (settingsActive) setSettingsOpen(true)
  }, [settingsActive])

  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const entry of settingsNavEntries) {
      if (entry.type === "group" && isSettingsNavGroupActive(entry, pathname)) {
        next[entry.id] = true
      }
    }
    setOpenGroups((prev) => ({ ...prev, ...next }))
  }, [pathname])

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-center gap-3 rounded-xl px-3 py-3 transition-all duration-300 group relative",
              settingsActive
                ? "gradient-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                : "hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 text-muted-foreground hover:text-foreground hover:scale-[1.02]"
            )}
            title="Configuración"
          >
            <Settings className={cn("h-5 w-5 shrink-0", settingsActive && "scale-110")} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={12} className="w-56">
          <SettingsMenuItems pathname={pathname} />
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 transition-all duration-300",
          settingsActive
            ? "gradient-primary text-white shadow-lg shadow-primary/20"
            : "text-muted-foreground hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 hover:text-foreground"
        )}
      >
        <span className="flex items-center gap-3">
          <Settings className={cn("h-5 w-5 shrink-0", settingsActive && "scale-110")} />
          <span className="font-medium">Configuración</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", settingsOpen && "rotate-180")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-1 space-y-0.5 overflow-visible pl-1 data-[state=closed]:hidden data-[state=open]:block">
        {settingsNavEntries.map((entry) => {
          if (entry.type === "link") {
            const Icon = entry.icon
            const isActive = pathname === entry.href || pathname.startsWith(`${entry.href}/`)

            return (
              <Link
                key={entry.id}
                href={entry.href}
                className={cn(
                  "ml-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/15 font-medium text-primary"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {entry.label}
              </Link>
            )
          }

          const GroupIcon = entry.icon
          const groupActive = isSettingsNavGroupActive(entry, pathname)
          const isOpen = openGroups[entry.id] ?? groupActive

          return (
            <Collapsible
              key={entry.id}
              open={isOpen}
              onOpenChange={(open) => setOpenGroups((prev) => ({ ...prev, [entry.id]: open }))}
            >
              <CollapsibleTrigger
                className={cn(
                  "ml-3 flex w-[calc(100%-0.75rem)] items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  groupActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                )}
              >
                <span className="flex items-center gap-2">
                  <GroupIcon className="h-4 w-4 shrink-0" />
                  {entry.label}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isOpen && "rotate-180")} />
              </CollapsibleTrigger>

              <CollapsibleContent className="ml-5 space-y-0.5 overflow-visible border-l border-primary/15 pl-2 data-[state=closed]:hidden data-[state=open]:block">
                {entry.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-primary/15 font-medium text-primary"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}
