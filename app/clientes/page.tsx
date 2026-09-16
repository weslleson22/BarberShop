'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import ClientHeader from '@/components/clientes/ClientHeader'
import ClientList from '@/components/clientes/ClientList'
import ClientModal from '@/components/clientes/ClientModal'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
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

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'BARBER' || user.role === 'RECEPTIONIST')) {
      fetchClients()
    }
  }, [user])

  // Aguardar carregamento inicial do contexto
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  // Verificar se usuário tem permissão
  if (!user || (user.role !== 'ADMIN' && user.role !== 'BARBER' && user.role !== 'RECEPTIONIST')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
          <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  const fetchClients = async () => {
    try {
      // Buscando dados reais do banco via API
      const response = await fetch('/api/clients/all')
      
      if (response.ok) {
        const data = await response.json()
        console.log('Clientes recebidos do banco de dados:', data)
        setClients(data)
      } else {
        console.error('Erro ao buscar clientes do banco:', response.statusText)
        setClients([]) // Array vazio em caso de erro
      }
    } catch (error) {
      console.error('Error fetching clients from database:', error)
      setClients([]) // Array vazio em caso de erro
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black pt-20">
      {/* Header Fixo no Topo */}
      <DropdownHeader />
      
      {/* Conteúdo Principal */}
      <div className="w-full px-4 md:px-6">
        {/* Header fixo no topo */}
        <div className="flex-shrink-0">
          <ClientHeader onNewClient={handleNewClient} onSearch={setSearchQuery} clients={clients} />
        </div>
        
        {/* Conteúdo com scroll */}
        <div className="flex-1 min-w-0">
          <div className="p-4 md:p-6">
            <ClientList 
              clients={clients}
              loading={loading}
              searchQuery={searchQuery}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
              onMessage={handleMessageClient}
            />
          </div>
        </div>
      </div>

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
