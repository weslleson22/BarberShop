'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Search, Bell, Calendar, User, Filter, ChevronDown, Plus, Download, Users, LogOut } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ClientHeaderProps {
  onNewClient?: () => void
  onSearch?: (query: string) => void
  clients?: any[]
}

export default function ClientHeader({ onNewClient, onSearch, clients }: ClientHeaderProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('Hoje')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const exportToExcel = () => {
    if (!clients || clients.length === 0) {
      alert('Nenhum cliente para exportar')
      return
    }

    // Preparar dados para Excel com formatação bonita
    const excelData = clients.map((client, index) => ({
      'ID': client.id || '',
      'Nome': client.name || '',
      'Telefone': client.phone || '',
      'Email': client.email || '',
      'Agendamentos': client._count?.appointments || 0,
      'Data de Cadastro': new Date(client.createdAt).toLocaleDateString('pt-BR'),
      'Status': (client._count?.appointments || 0) > 10 ? 'VIP' : 
               (client._count?.appointments || 0) > 3 ? 'Regular' : 'Novo'
    }))

    // Criar workbook
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // Definir larguras das colunas
    const colWidths = [
      { wch: 8 },  // ID
      { wch: 25 }, // Nome
      { wch: 15 }, // Telefone
      { wch: 25 }, // Email
      { wch: 12 }, // Agendamentos
      { wch: 12 }, // Data de Cadastro
      { wch: 10 }  // Status
    ]
    ws['!cols'] = colWidths

    // Criar workbook e adicionar worksheet
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')

    // Estilizar o header
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1'
      if (!ws[address]) continue
      ws[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center' }
      }
    }

    // Gerar arquivo XLSX
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    
    // Criar blob e download
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `clientes_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '_')}.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-gradient-to-b from-gray-900/50 to-transparent border-b border-white/6">
      <div className="px-6 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Welcome Message */}
          <div className="flex-1 flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Clientes
              </h1>
              <p className="text-white/60">
                Gerencie todos os clientes da barbearia
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4 w-full lg:w-auto">
            {/* Search Bar */}
            <div className="relative w-full lg:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full lg:w-64 pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto">
              {/* Status Filter */}
              <div className="relative flex-shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs lg:text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer min-w-[100px]"
                >
                  <option value="Todos" className="bg-gray-900">Status</option>
                  <option value="Ativos" className="bg-gray-900">Ativos</option>
                  <option value="Inativos" className="bg-gray-900">Inativos</option>
                  <option value="Novos" className="bg-gray-900">Novos</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 lg:w-4 lg:h-4 text-white/40 pointer-events-none" />
              </div>

              {/* Date Filter */}
              <div className="relative flex-shrink-0">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs lg:text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer min-w-[80px]"
                >
                  <option value="Hoje" className="bg-gray-900">Hoje</option>
                  <option value="Semana" className="bg-gray-900">Semana</option>
                  <option value="Mês" className="bg-gray-900">Mês</option>
                  <option value="Ano" className="bg-gray-900">Ano</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 lg:w-4 lg:h-4 text-white/40 pointer-events-none" />
              </div>

              {/* Action Buttons */}
              <button 
                onClick={exportToExcel}
                className="p-2 lg:p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex-shrink-0"
                title="Exportar para Excel"
              >
                <Download className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </button>

              <button className="p-2 lg:p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex-shrink-0">
                <Bell className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </button>

              <button 
                onClick={onNewClient}
                className="px-3 py-2 lg:px-4 lg:py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-1 lg:space-x-2 flex-shrink-0 text-xs lg:text-sm"
              >
                <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden lg:inline">Novo Cliente</span>
                <span className="lg:hidden">Novo</span>
              </button>

              {/* User Avatar - Hidden on mobile */}
              <div className="hidden lg:flex items-center space-x-3 p-2 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-xl flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                  <span className="text-black font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{user?.name || 'Usuário'}</p>
                  <p className="text-yellow-400 text-xs font-medium">
                    {user?.role === 'ADMIN' ? 'Admin' : 
                     user?.role === 'BARBER' ? 'Barbeiro' : 'Cliente'}
                  </p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
