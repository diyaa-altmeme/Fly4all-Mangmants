
"use client"

import * as React from "react"
import {
  Calculator,
  Calendar,
  Contact,
  CreditCard,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Network,
  Rocket,
  Search,
  Send,
  Settings,
  Ticket,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Button } from "../ui/button"
import { useRouter } from "next/navigation"

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])
  
  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  const commandItems = [
      {
          group: "الصفحات الرئيسية",
          items: [
              { label: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
              { label: "إدارة العلاقات", href: "/clients", icon: Contact },
              { label: "العمليات المحاسبية", href: "/bookings", icon: Calculator },
              { label: "السندات", href: "/accounts/vouchers/list", icon: FileText },
              { label: "التقارير", href: "/reports/debts", icon: FileSpreadsheet },
              { label: "النظام", href: "/users", icon: Network },
              { label: "المحادثات", href: "/chat", icon: MessageSquare },
              { label: "الحملات", href: "/campaigns", icon: Send },
          ]
      },
      {
          group: "إنشاء سريع",
          items: [
              { label: "إضافة حجز جديد", href: "/bookings", icon: Ticket },
              { label: "إضافة طلب فيزا", href: "/visas", icon: CreditCard },
              { label: "إضافة علاقة", href: "/clients", icon: Contact },
          ]
      },
  ]

  return (
    <>
      <Button
        variant="outline"
        className="h-8 w-8 p-0 sm:h-9 sm:w-64 sm:justify-start sm:px-3 sm:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline-block">بحث...</span>
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
          <span className="text-sm">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="ابحث عن صفحة أو إجراء..." />
        <CommandList>
          <CommandEmpty>لا توجد نتائج.</CommandEmpty>
          {commandItems.map(group => (
              <CommandGroup key={group.group} heading={group.group}>
                  {group.items.map(item => {
                      const Icon = item.icon;
                      return (
                         <CommandItem
                            key={item.href}
                            onSelect={() => runCommand(() => router.push(item.href))}
                            className="justify-end"
                          >
                            <span className="flex-grow">{item.label}</span>
                            <Icon className="ml-2 h-4 w-4" />
                          </CommandItem>
                      )
                  })}
              </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="الإعدادات">
            <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
              <span className="flex-grow">الإعدادات العامة</span>
              <Settings className="ml-2 h-4 w-4" />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
