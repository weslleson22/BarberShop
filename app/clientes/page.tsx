'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import ClientHeader from '@/components/clientes/ClientHeader'
import ClientList from '@/components/clientes/ClientList'
import ClientModal from '@/components/clientes/ClientModal'
import { getAuthHeaders } from '@/lib/utils'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  isVip?: boolean
  createdAt: string
  lastAppointment?: {
    service: string
    startTime: string
  }
  _count?: {
    appointments: number
  }
}

export default function ClientesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/clients/all', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setClients(Array.isArray(data) ? data : [])
      } else {
        console.error('Erro ao buscar clientes do banco:', response.statusText)
        setClients([])
      }
    } catch (error) {
      console.error('Error fetching clients from database:', error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
      } else if (user.role === 'DEVELOPER') {
        router.replace('/developer')
      } else if (user.role === 'CLIENT') {
        router.replace('/meus-agendamentos')
      }
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!authLoading && user && (user.role === 'ADMIN' || user.role === 'BARBER' || user.role === 'RECEPTIONIST')) {
      fetchClients()
    }
  }, [authLoading, user, fetchClients])

  // Aguardar carregamento inicial do contexto ou redirecionamento de role não permitida
  if (authLoading || (user && (user.role === 'DEVELOPER' || user.role === 'CLIENT'))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
      </div>
    )
  }

  // Se não estiver autenticado e já terminou de carregar o auth context, exibe spinner enquanto o useEffect redireciona
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
      </div>
    )
  }

  const handleNewClient = () => {
    setEditingClient(null)
    setIsModalOpen(true)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setIsModalOpen(true)
  }

  const handleSaveClient = (client: Client) => {
    fetchClients() // Refresh clients after save
    setIsModalOpen(false)
    setEditingClient(null)
  }

  const handleDeleteClient = async (clientId: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
      try {
        const response = await fetch(`/api/clients?id=${clientId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
          credentials: 'include',
        })

        if (response.ok) {
          alert('Cliente excluído com sucesso!')
          fetchClients() // Refresh clients after delete
        } else {
          const error = await response.json()
          alert(error.error || 'Erro ao excluir cliente')
        }
      } catch (error) {
        console.error('Error deleting client:', error)
        alert('Erro ao excluir cliente')
      }
    }
  }

  const handleMessageClient = (client: Client) => {
    // TODO: Implement message functionality
    console.log('Send message to client:', client)
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground pb-20 pt-20">
      {/* Header Fixo no Topo */}
      <DropdownHeader />
      
      {/* Conteúdo Principal Padrão */}
      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        <ClientHeader onNewClient={handleNewClient} onSearch={setSearchQuery} clients={clients} />
        
        <ClientList 
          clients={clients}
          loading={loading}
          searchQuery={searchQuery}
          onEdit={handleEditClient}
          onDelete={handleDeleteClient}
          onMessage={handleMessageClient}
        />
      </main>

      {/* Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClient}
        client={editingClient}
      />
    </div>
  )
}