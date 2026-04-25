'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import ClientSidebar from '@/components/clientes/ClientSidebar'
import ClientHeader from '@/components/clientes/ClientHeader'
import ClientList from '@/components/clientes/ClientList'
import ClientModal from '@/components/clientes/ClientModal'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  createdAt: string
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

  // Aguardar carregamento inicial do contexto
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  // Aguardar autenticação
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Verificando autenticação...</p>
      </div>
    )
  }

  // Verificar se usuário tem permissão
  if (!user || (user.role !== 'ADMIN' && user.role !== 'BARBER')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
          <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      // Buscando todos os clientes do Prisma via API
      const response = await fetch('/api/clients/all')
      if (response.ok) {
        const data = await response.json()
        console.log('Clientes recebidos do Prisma:', data)
        setClients(data)
      } else {
        console.error('Erro ao buscar clientes:', response.statusText)
        // Se falhar, usar dados mockados como fallback
        const mockClients = [
          { id: '1', name: 'Cliente Demo', phone: '(11) 99999-8888', email: 'cliente@demo.com', createdAt: new Date().toISOString() },
        ]
        setClients(mockClients)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
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

  const handleDeleteClient = (clientId: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      // TODO: Implement delete API call
      console.log('Delete client:', clientId)
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <ClientSidebar />
      
      <div className="lg:pl-80">
        <ClientHeader onNewClient={handleNewClient} onSearch={setSearchQuery} />
        
        <div className="p-6">
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
