'use client'

import { useState } from 'react'
import { Search, ChevronDown, Plus, Download } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface ClientHeaderProps {
  onNewClient?: () => void
  onSearch?: (query: string) => void
  clients?: any[]
}

export default function ClientHeader({ onNewClient, onSearch, clients }: ClientHeaderProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('Hoje')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const exportToExcel = async () => {
    if (!clients || clients.length === 0) {
      alert('Nenhum cliente para exportar')
      return
    }

    // Carregamento dinâmico sob demanda para não onerar o bundle inicial da página
    const XLSX = await import('xlsx')
    const isDeveloper = user?.role === 'DEVELOPER'

    // Preparar dados para Excel com formatação bonita
    const excelData = clients.map((client, index) => {
      const row: Record<string, any> = {}
      if (isDeveloper) {
        row['ID'] = client.id || ''
      }
      row['Nome'] = client.name || ''
      row['Telefone'] = client.phone || ''
      row['Email'] = client.email || ''
      row['Agendamentos'] = client._count?.appointments || 0
      row['Data de Cadastro'] = new Date(client.createdAt).toLocaleDateString('pt-BR')
      row['Status'] = (client._count?.appointments || 0) > 10 ? 'VIP' : 
                      (client._count?.appointments || 0) > 3 ? 'Regular' : 'Novo'
      return row
    })

    // Criar workbook
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // Definir larguras das colunas
    const colWidths = [
      ...(isDeveloper ? [{ wch: 25 }] : []),
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
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="w-full px-4 md:px-6 py-6">
        {/* Page Header - Título e Descrição */}
        <div className="flex flex-col w-full mb-6">
          <div className="flex flex-col w-full max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 tracking-tight">
              Clientes
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Gerencie todos os clientes da barbearia
            </p>
          </div>
        </div>

        {/* Toolbar - Busca, Filtros e Ações */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-sm font-medium"
            />
          </div>

          {/* Filters and Actions */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {/* Status Filter */}
            <div className="relative flex-shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-background border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer min-w-[100px] font-medium"
              >
                <option value="Todos">Status</option>
                <option value="Ativos">Ativos</option>
                <option value="Inativos">Inativos</option>
                <option value="Novos">Novos</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Date Filter */}
            <div className="relative flex-shrink-0">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none bg-background border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer min-w-[80px] font-medium"
              >
                <option value="Hoje">Hoje</option>
                <option value="Semana">Semana</option>
                <option value="Mês">Mês</option>
                <option value="Ano">Ano</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Export Button */}
            <button 
              onClick={exportToExcel}
              className="p-2.5 bg-background border border-border rounded-xl hover:bg-muted text-foreground transition-all flex-shrink-0 shadow-sm"
              title="Exportar para Excel"
            >
              <Download className="w-4 h-4 text-foreground" />
            </button>

            {/* New Client Button */}
            <button 
              onClick={onNewClient}
              className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all flex items-center space-x-2 flex-shrink-0 shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Cliente</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
