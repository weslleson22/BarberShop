'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Users, ClipboardList, BarChart3, Activity } from 'lucide-react'

interface RealtimeNavTabsProps {
  activeTab?: 'online-users' | 'audit-logs' | 'reports' | 'monitoring'
}

export default function RealtimeNavTabs({ activeTab }: RealtimeNavTabsProps) {
  const router = useRouter()
  const pathname = usePathname()

  const currentTab =
    activeTab ||
    (pathname.includes('/online-users')
      ? 'online-users'
      : pathname.includes('/audit-logs')
      ? 'audit-logs'
      : pathname.includes('/reports')
      ? 'reports'
      : pathname.includes('/monitoring')
      ? 'monitoring'
      : 'online-users')

  const tabs = [
    {
      id: 'online-users',
      label: 'Usuários Online',
      icon: Users,
      url: '/developer/online-users',
    },
    {
      id: 'audit-logs',
      label: 'Audit Logs',
      icon: ClipboardList,
      url: '/developer/audit-logs',
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: BarChart3,
      url: '/developer/reports',
    },
    {
      id: 'monitoring',
      label: 'System Health',
      icon: Activity,
      url: '/developer/monitoring',
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#111827] border border-[#374151]">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = currentTab === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => router.push(tab.url)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              isActive
                ? 'bg-[#2563eb] text-white border border-[#1d4ed8]'
                : 'text-white hover:bg-[#1f2937]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
