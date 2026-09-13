'use client'

import { useState } from 'react'
import { Search, ChevronDown, Plus, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ClientHeaderProps {
  onNewClient?: () => void
  onSearch?: (query: string) => void
  clients?: any[]
}

export default function ClientHeader({ onNewClient, onSearch, clients }: ClientHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('Hoje')
  const [statusFilter, setStatusFilter] = useState('Todos')

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
      <div className="w-full px-4 md:px-6 py-6">
        {/* Page Header - Título e Descrição */}
        <div className="flex flex-col w-full mb-6">
          <div className="flex flex-col w-full max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Clientes
            </h1>
            <p className="text-white/60 text-sm md:text-base">
              Gerencie todos os clientes da barbearia
            </p>
          </div>
        </div>

        {/* Toolbar - Busca, Filtros e Ações */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Filters and Actions */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {/* Status Filter */}
            <div className="relative flex-shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer min-w-[100px]"
              >
                <option value="Todos" className="bg-gray-900">Status</option>
                <option value="Ativos" className="bg-gray-900">Ativos</option>
                <option value="Inativos" className="bg-gray-900">Inativos</option>
                <option value="Novos" className="bg-gray-900">Novos</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>

            {/* Date Filter */}
            <div className="relative flex-shrink-0">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer min-w-[80px]"
              >
                <option value="Hoje" className="bg-gray-900">Hoje</option>
                <option value="Semana" className="bg-gray-900">Semana</option>
                <option value="Mês" className="bg-gray-900">Mês</option>
                <option value="Ano" className="bg-gray-900">Ano</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>

            {/* Export Button */}
            <button 
              onClick={exportToExcel}
              className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex-shrink-0"
              title="Exportar para Excel"
            >
              <Download className="w-5 h-5 text-white" />
            </button>

            {/* New Client Button */}
            <button 
              onClick={onNewClient}
              className="px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2 flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Novo Cliente</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
