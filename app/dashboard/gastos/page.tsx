'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import {
  TrendingDown,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Download,
  RefreshCw,
  Building2,
  Package,
  Wrench,
  Megaphone,
  Receipt,
  FileText,
  AlertCircle,
  AlertTriangle,
  X,
  Calendar,
  Check,
  ArrowDownUp,
  ArrowUpRight,
  ArrowDownRight,
  Boxes,
  Tag,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  Layers,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ExpenseRecord, InventoryItem, StockMovement } from '@/lib/operating-hours'

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string }> = {
  FIXED: { label: 'Custo Fixo (Aluguel, Luz, Água)', icon: Building2, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  SUPPLIES: { label: 'Insumos & Produtos', icon: Package, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  MAINTENANCE: { label: 'Manutenção & Equipamentos', icon: Wrench, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  MARKETING: { label: 'Marketing & Divulgação', icon: Megaphone, color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' },
  TAXES: { label: 'Impostos & Tarifas', icon: Receipt, color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
  OTHER: { label: 'Outras Despesas', icon: FileText, color: 'bg-muted text-muted-foreground border-border' },
}

const PRODUCT_CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  REVENTA: { label: 'Revenda', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  USO_INTERNO: { label: 'Uso Bancada / Salão', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  OUTROS: { label: 'Outros', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
}

const MOVEMENT_REASON_MAP: Record<string, string> = {
  PURCHASE: 'Compra de Fornecedor',
  SALE: 'Venda para Cliente',
  INTERNAL_USE: 'Uso Bancada / Lavatório',
  LOSS_EXPIRED: 'Perda / Vencimento / Avaria',
  ADJUSTMENT: 'Ajuste de Balanço',
  OTHER: 'Outro Motivo',
}

export default function GastosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Aba selecionada: 'despesas' | 'estoque' | 'movimentacoes'
  const [activeTab, setActiveTab] = useState<'despesas' | 'estoque' | 'movimentacoes'>('estoque')

  // Estado das Despesas
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL')
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('ALL')

  // Estado do Estoque & Movimentações
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loadingInventory, setLoadingInventory] = useState(true)
  const [inventorySearchTerm, setInventorySearchTerm] = useState('')
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('ALL')
  const [inventoryStockFilter, setInventoryStockFilter] = useState('ALL')
  const [inventoryExpiryFilter, setInventoryExpiryFilter] = useState('ALL')

  // Estado de Filtro de Movimentações
  const [movementSearchTerm, setMovementSearchTerm] = useState('')
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL')
  const [movementReasonFilter, setMovementReasonFilter] = useState('ALL')

  // Modais
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulário de Despesa
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null)
  const [expenseFormData, setExpenseFormData] = useState({
    title: '',
    amount: '',
    category: 'FIXED',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'PAID' as 'PAID' | 'PENDING',
    notes: '',
  })

  // Formulário de Produto
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null)
  const [productFormData, setProductFormData] = useState({
    name: '',
    sku: '',
    category: 'REVENTA' as 'REVENTA' | 'USO_INTERNO' | 'OUTROS',
    currentStock: '0',
    minStock: '5',
    unit: 'UN',
    costPrice: '',
    salePrice: '',
    expirationDate: '',
    batch: '',
    notes: '',
  })

  // Formulário de Movimentação
  const [movementFormData, setMovementFormData] = useState({
    productId: '',
    type: 'ENTRY' as 'ENTRY' | 'EXIT',
    quantity: '1',
    reason: 'PURCHASE' as 'PURCHASE' | 'SALE' | 'INTERNAL_USE' | 'LOSS_EXPIRED' | 'ADJUSTMENT' | 'OTHER',
    costUnit: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    createExpense: false,
  })

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login')
      } else if (user.role === 'CLIENT') {
        router.replace('/meus-agendamentos')
      } else if (user.role !== 'ADMIN' && user.role !== 'DEVELOPER') {
        router.replace('/dashboard')
      }
    }
  }, [user, authLoading, router])

  // Busca dados de despesas
  const fetchExpenses = async () => {
    setLoadingExpenses(true)
    try {
      const res = await fetch('/api/expenses', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setExpenses(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Erro ao buscar gastos:', error)
    } finally {
      setLoadingExpenses(false)
    }
  }

  // Busca dados de estoque e movimentações
  const fetchInventory = async () => {
    setLoadingInventory(true)
    try {
      const res = await fetch('/api/inventory', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setInventory(Array.isArray(data.items) ? data.items : [])
        setMovements(Array.isArray(data.movements) ? data.movements : [])
      }
    } catch (error) {
      console.error('Erro ao buscar estoque:', error)
    } finally {
      setLoadingInventory(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchExpenses()
      fetchInventory()
    }
  }, [user])

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  // Helper de cálculo de dias de validade
  const getExpirationInfo = (expirationDate?: string | null) => {
    if (!expirationDate) return null
    try {
      const parts = expirationDate.split('-').map(Number)
      if (parts.length < 3) return null
      const expDate = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59)
      const today = new Date()
      const diffTime = expDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        formattedDate: new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).toLocaleDateString('pt-BR'),
        daysRemaining: diffDays,
        isExpired: diffDays < 0,
        isExpiringSoon: diffDays >= 0 && diffDays <= 30,
      }
    } catch {
      return null
    }
  }

  // ----------------------------------------------------
  // HANDLERS DE DESPESAS
  // ----------------------------------------------------
  const handleOpenCreateExpenseModal = () => {
    setEditingExpense(null)
    setExpenseFormData({
      title: '',
      amount: '',
      category: 'FIXED',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'PAID',
      notes: '',
    })
    setIsExpenseModalOpen(true)
  }

  const handleOpenEditExpenseModal = (expense: ExpenseRecord) => {
    setEditingExpense(expense)
    setExpenseFormData({
      title: expense.title,
      amount: String(expense.amount),
      category: expense.category,
      dueDate: expense.dueDate,
      status: expense.status,
      notes: expense.notes || '',
    })
    setIsExpenseModalOpen(true)
  }

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expenseFormData.title.trim()) {
      alert('Por favor, informe a descrição do gasto.')
      return
    }

    const numericAmount = parseFloat(expenseFormData.amount.replace(',', '.'))
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor, informe um valor válido maior que zero.')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingExpense) {
        const res = await fetch('/api/expenses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: editingExpense.id,
            title: expenseFormData.title,
            amount: numericAmount,
            category: expenseFormData.category,
            dueDate: expenseFormData.dueDate,
            status: expenseFormData.status,
            notes: expenseFormData.notes,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Erro ao atualizar gasto')
        }

        const updated = await res.json()
        setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      } else {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: expenseFormData.title,
            amount: numericAmount,
            category: expenseFormData.category,
            dueDate: expenseFormData.dueDate,
            status: expenseFormData.status,
            notes: expenseFormData.notes,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Erro ao cadastrar gasto')
        }

        const created = await res.json()
        setExpenses((prev) => [created, ...prev])
      }

      setIsExpenseModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar despesa')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento de gasto?')) return
    setExpenses((prev) => prev.filter((e) => e.id !== id))

    try {
      const res = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        fetchExpenses()
        alert('Erro ao excluir despesa do servidor')
      }
    } catch {
      fetchExpenses()
      alert('Erro de conexão ao excluir despesa')
    }
  }

  const handleToggleExpenseStatus = async (expense: ExpenseRecord) => {
    const nextStatus = expense.status === 'PAID' ? 'PENDING' : 'PAID'
    setExpenses((prev) =>
      prev.map((e) => (e.id === expense.id ? { ...e, status: nextStatus } : e))
    )

    try {
      await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: expense.id,
          status: nextStatus,
        }),
      })
    } catch {
      fetchExpenses()
    }
  }

  // ----------------------------------------------------
  // HANDLERS DE PRODUTO DO ESTOQUE
  // ----------------------------------------------------
  const handleOpenCreateProductModal = () => {
    setEditingProduct(null)
    setProductFormData({
      name: '',
      sku: '',
      category: 'REVENTA',
      currentStock: '0',
      minStock: '5',
      unit: 'UN',
      costPrice: '',
      salePrice: '',
      expirationDate: '',
      batch: '',
      notes: '',
    })
    setIsProductModalOpen(true)
  }

  const handleOpenEditProductModal = (item: InventoryItem) => {
    setEditingProduct(item)
    setProductFormData({
      name: item.name,
      sku: item.sku || '',
      category: item.category,
      currentStock: String(item.currentStock),
      minStock: String(item.minStock),
      unit: item.unit,
      costPrice: String(item.costPrice),
      salePrice: String(item.salePrice || ''),
      expirationDate: item.expirationDate || '',
      batch: item.batch || '',
      notes: item.notes || '',
    })
    setIsProductModalOpen(true)
  }

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productFormData.name.trim()) {
      alert('Por favor, informe o nome do produto.')
      return
    }

    const costNum = parseFloat(productFormData.costPrice.replace(',', '.')) || 0
    const saleNum = parseFloat(productFormData.salePrice.replace(',', '.')) || 0
    const stockNum = parseFloat(productFormData.currentStock.replace(',', '.')) || 0
    const minStockNum = parseFloat(productFormData.minStock.replace(',', '.')) || 0

    if (costNum < 0 || saleNum < 0) {
      alert('Valores de custo e venda não podem ser negativos.')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingProduct) {
        const res = await fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: editingProduct.id,
            name: productFormData.name,
            sku: productFormData.sku,
            category: productFormData.category,
            currentStock: stockNum,
            minStock: minStockNum,
            unit: productFormData.unit,
            costPrice: costNum,
            salePrice: saleNum,
            expirationDate: productFormData.expirationDate,
            batch: productFormData.batch,
            notes: productFormData.notes,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Erro ao atualizar produto')
        }

        const updated = await res.json()
        setInventory((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'CREATE_PRODUCT',
            name: productFormData.name,
            sku: productFormData.sku,
            category: productFormData.category,
            currentStock: stockNum,
            minStock: minStockNum,
            unit: productFormData.unit,
            costPrice: costNum,
            salePrice: saleNum,
            expirationDate: productFormData.expirationDate,
            batch: productFormData.batch,
            notes: productFormData.notes,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Erro ao cadastrar produto')
        }

        const responseData = await res.json()
        setInventory((prev) => [responseData.item, ...prev])
        if (responseData.movements) {
          setMovements(responseData.movements)
        }
      }

      setIsProductModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar produto')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Deseja realmente remover este produto do estoque?')) return
    setInventory((prev) => prev.filter((p) => p.id !== id))

    try {
      const res = await fetch(`/api/inventory?productId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        fetchInventory()
        alert('Erro ao excluir produto do servidor')
      }
    } catch {
      fetchInventory()
      alert('Erro de conexão ao excluir produto')
    }
  }

  // ----------------------------------------------------
  // HANDLERS DE MOVIMENTAÇÃO DE ESTOQUE (ENTRADA / SAÍDA)
  // ----------------------------------------------------
  const handleOpenMovementModal = (preselectedProductId?: string, defaultType: 'ENTRY' | 'EXIT' = 'ENTRY') => {
    const targetProduct = inventory.find((p) => p.id === preselectedProductId) || inventory[0]
    setMovementFormData({
      productId: targetProduct ? targetProduct.id : '',
      type: defaultType,
      quantity: '1',
      reason: defaultType === 'ENTRY' ? 'PURCHASE' : 'INTERNAL_USE',
      costUnit: targetProduct ? String(targetProduct.costPrice) : '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      createExpense: defaultType === 'ENTRY',
    })
    setIsMovementModalOpen(true)
  }

  const handleSubmitMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movementFormData.productId) {
      alert('Selecione o produto para a movimentação.')
      return
    }

    const qty = parseFloat(movementFormData.quantity.replace(',', '.'))
    if (isNaN(qty) || qty <= 0) {
      alert('Por favor, informe uma quantidade válida maior que zero.')
      return
    }

    const targetProduct = inventory.find((p) => p.id === movementFormData.productId)
    if (movementFormData.type === 'EXIT' && targetProduct && targetProduct.currentStock < qty) {
      alert(`Saldo insuficiente! O estoque atual deste item é de ${targetProduct.currentStock} ${targetProduct.unit}.`)
      return
    }

    const costUnitNum = movementFormData.costUnit ? parseFloat(movementFormData.costUnit.replace(',', '.')) : undefined

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'MOVEMENT',
          productId: movementFormData.productId,
          type: movementFormData.type,
          quantity: qty,
          reason: movementFormData.reason,
          costUnit: costUnitNum,
          date: movementFormData.date,
          notes: movementFormData.notes,
          createExpense: movementFormData.createExpense,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao registrar movimentação')
      }

      const responseData = await res.json()
      // Atualiza produto no estado
      setInventory((prev) =>
        prev.map((p) => (p.id === responseData.item.id ? responseData.item : p))
      )
      // Adiciona movimentação
      setMovements((prev) => [responseData.movement, ...prev])

      // Se gerou despesa automática, recarrega despesas
      if (movementFormData.createExpense && movementFormData.type === 'ENTRY') {
        fetchExpenses()
      }

      setIsMovementModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar movimentação')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMovement = async (id: string) => {
    if (!confirm('Deseja excluir este registro do histórico de movimentações?')) return
    setMovements((prev) => prev.filter((m) => m.id !== id))

    try {
      const res = await fetch(`/api/inventory?movementId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        fetchInventory()
        alert('Erro ao excluir movimentação')
      }
    } catch {
      fetchInventory()
      alert('Erro de conexão ao excluir')
    }
  }

  // ----------------------------------------------------
  // EXPORTAÇÕES CSV
  // ----------------------------------------------------
  const handleExportExpensesCSV = () => {
    if (expenses.length === 0) return

    const rows = [
      ['Descrição', 'Categoria', 'Valor (R$)', 'Vencimento', 'Status', 'Observações', 'Data de Cadastro'],
      ...expenses.map((e) => [
        e.title,
        CATEGORY_MAP[e.category]?.label || e.category,
        e.amount.toFixed(2),
        e.dueDate,
        e.status === 'PAID' ? 'Pago' : 'Pendente',
        e.notes || '',
        new Date(e.createdAt).toLocaleDateString('pt-BR'),
      ]),
    ]

    downloadCSV(rows, `gastos-estabelecimento-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleExportInventoryCSV = () => {
    if (inventory.length === 0) return

    const rows = [
      [
        'Código/SKU',
        'Produto',
        'Categoria',
        'Saldo Atual',
        'Unidade',
        'Estoque Mínimo',
        'Status Estoque',
        'Custo Unitário (R$)',
        'Preço Venda (R$)',
        'Lucro Unitário (R$)',
        'Margem (%)',
        'Total ao Custo (R$)',
        'Total Potencial Venda (R$)',
        'Data Validade',
        'Lote',
        'Observações',
      ],
      ...inventory.map((item) => {
        const unitProfit = item.category === 'REVENTA' ? Math.max(0, item.salePrice - item.costPrice) : 0
        const marginPct = item.costPrice > 0 && item.salePrice > item.costPrice
          ? (((item.salePrice - item.costPrice) / item.costPrice) * 100).toFixed(1)
          : '0.0'
        const stockStatus =
          item.currentStock <= 0
            ? 'ESGOTADO'
            : item.currentStock <= item.minStock
            ? 'ESTOQUE BAIXO'
            : 'REGULAR'

        return [
          item.sku || '',
          item.name,
          PRODUCT_CATEGORY_MAP[item.category]?.label || item.category,
          item.currentStock.toString(),
          item.unit,
          item.minStock.toString(),
          stockStatus,
          item.costPrice.toFixed(2),
          item.salePrice ? item.salePrice.toFixed(2) : '0.00',
          unitProfit.toFixed(2),
          `${marginPct}%`,
          (item.currentStock * item.costPrice).toFixed(2),
          (item.currentStock * (item.salePrice || item.costPrice)).toFixed(2),
          item.expirationDate || '',
          item.batch || '',
          item.notes || '',
        ]
      }),
    ]

    downloadCSV(rows, `inventario-estoque-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleExportMovementsCSV = () => {
    if (movements.length === 0) return

    const rows = [
      ['Data', 'Tipo', 'Produto', 'Quantidade', 'Unidade', 'Motivo', 'Valor Total (R$)', 'Observações'],
      ...movements.map((m) => [
        m.date,
        m.type === 'ENTRY' ? 'ENTRADA' : 'SAÍDA',
        m.productName,
        m.quantity.toString(),
        m.unit,
        MOVEMENT_REASON_MAP[m.reason] || m.reason,
        m.totalValue ? m.totalValue.toFixed(2) : '0.00',
        m.notes || '',
      ]),
    ]

    downloadCSV(rows, `historico-movimentacoes-estoque-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const downloadCSV = (rows: string[][], filename: string) => {
    const csvContent = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ----------------------------------------------------
  // DADOS FILTRADOS
  // ----------------------------------------------------
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (expenseCategoryFilter !== 'ALL' && e.category !== expenseCategoryFilter) return false
      if (expenseStatusFilter !== 'ALL' && e.status !== expenseStatusFilter) return false
      if (expenseSearchTerm.trim()) {
        const q = expenseSearchTerm.toLowerCase().trim()
        const titleMatch = e.title.toLowerCase().includes(q)
        const notesMatch = e.notes ? e.notes.toLowerCase().includes(q) : false
        return titleMatch || notesMatch
      }
      return true
    })
  }, [expenses, expenseCategoryFilter, expenseStatusFilter, expenseSearchTerm])

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (inventoryCategoryFilter !== 'ALL' && item.category !== inventoryCategoryFilter) return false

      if (inventoryStockFilter === 'LOW_OR_OUT') {
        if (item.currentStock > item.minStock) return false
      } else if (inventoryStockFilter === 'OUT') {
        if (item.currentStock > 0) return false
      } else if (inventoryStockFilter === 'REGULAR') {
        if (item.currentStock <= item.minStock) return false
      }

      if (inventoryExpiryFilter === 'EXPIRING_OR_EXPIRED') {
        const expInfo = getExpirationInfo(item.expirationDate)
        if (!expInfo || (!expInfo.isExpired && !expInfo.isExpiringSoon)) return false
      }

      if (inventorySearchTerm.trim()) {
        const q = inventorySearchTerm.toLowerCase().trim()
        const nameMatch = item.name.toLowerCase().includes(q)
        const skuMatch = item.sku ? item.sku.toLowerCase().includes(q) : false
        const notesMatch = item.notes ? item.notes.toLowerCase().includes(q) : false
        return nameMatch || skuMatch || notesMatch
      }
      return true
    })
  }, [inventory, inventoryCategoryFilter, inventoryStockFilter, inventoryExpiryFilter, inventorySearchTerm])

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (movementTypeFilter !== 'ALL' && m.type !== movementTypeFilter) return false
      if (movementReasonFilter !== 'ALL' && m.reason !== movementReasonFilter) return false
      if (movementSearchTerm.trim()) {
        const q = movementSearchTerm.toLowerCase().trim()
        const prodMatch = m.productName.toLowerCase().includes(q)
        const notesMatch = m.notes ? m.notes.toLowerCase().includes(q) : false
        return prodMatch || notesMatch
      }
      return true
    })
  }, [movements, movementTypeFilter, movementReasonFilter, movementSearchTerm])

  // ----------------------------------------------------
  // KPIS DE DESPESAS
  // ----------------------------------------------------
  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const currentMonthExpenses = expenses.filter((e) => e.dueDate.startsWith(currentMonthStr))
  const totalMonthAmount = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const fixedExpensesAmount = currentMonthExpenses
    .filter((e) => e.category === 'FIXED')
    .reduce((sum, e) => sum + e.amount, 0)
  const suppliesAmount = currentMonthExpenses
    .filter((e) => e.category === 'SUPPLIES')
    .reduce((sum, e) => sum + e.amount, 0)
  const pendingAmount = expenses
    .filter((e) => e.status === 'PENDING')
    .reduce((sum, e) => sum + e.amount, 0)
  const pendingCount = expenses.filter((e) => e.status === 'PENDING').length

  // ----------------------------------------------------
  // KPIS DE ESTOQUE & INVENTÁRIO
  // ----------------------------------------------------
  // Valor total em estoque (Custo do Inventário)
  const totalInventoryCost = inventory.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0)
  // Potencial total de venda em estoque
  const totalInventorySales = inventory.reduce((sum, p) => {
    const saleVal = p.salePrice > 0 ? p.salePrice : p.costPrice
    return sum + p.currentStock * saleVal
  }, 0)
  // Projeção total de lucro em estoque (apenas para produtos de revenda)
  const totalProjectedProfit = inventory.reduce((sum, p) => {
    if (p.category === 'REVENTA' && p.salePrice > p.costPrice) {
      return sum + p.currentStock * (p.salePrice - p.costPrice)
    }
    return sum
  }, 0)

  // Alertas
  const lowStockItems = inventory.filter((p) => p.currentStock <= p.minStock)
  const outOfStockItems = inventory.filter((p) => p.currentStock <= 0)
  const expiredItems = inventory.filter((p) => {
    const info = getExpirationInfo(p.expirationDate)
    return info && info.isExpired
  })
  const expiringSoonItems = inventory.filter((p) => {
    const info = getExpirationInfo(p.expirationDate)
    return info && info.isExpiringSoon
  })

  // Prévia dinâmica no modal de produto
  const previewCost = parseFloat(productFormData.costPrice.replace(',', '.')) || 0
  const previewSale = parseFloat(productFormData.salePrice.replace(',', '.')) || 0
  const previewProfit = previewSale > previewCost ? previewSale - previewCost : 0
  const previewMargin = previewCost > 0 && previewSale > previewCost ? ((previewProfit / previewCost) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Cabeçalho Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="gap-1.5 font-semibold text-xs bg-destructive/10 text-destructive border-destructive/20">
                <TrendingDown className="w-3.5 h-3.5" />
                Custos, Estoque & Inventário
              </Badge>
              <span className="text-xs text-muted-foreground">• Gestão Operacional Completa</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <TrendingDown className="w-7 h-7 text-destructive" />
              Gastos & Estoque do Estabelecimento
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Tenha controle total do saldo de produtos, histórico de movimentações, custos e lucros unitários, alertas de validade e valor total do seu inventário.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchExpenses()
                fetchInventory()
              }}
              disabled={loadingExpenses || loadingInventory}
              className="gap-2 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingExpenses || loadingInventory ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>

            {activeTab === 'despesas' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExpensesCSV}
                  disabled={loadingExpenses || expenses.length === 0}
                  className="gap-2 text-xs h-9"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenCreateExpenseModal}
                  className="gap-2 text-xs h-9 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Gasto</span>
                </Button>
              </>
            )}

            {activeTab === 'estoque' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportInventoryCSV}
                  disabled={loadingInventory || inventory.length === 0}
                  className="gap-2 text-xs h-9"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Balanço</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenMovementModal(undefined, 'ENTRY')}
                  disabled={inventory.length === 0}
                  className="gap-2 text-xs h-9"
                >
                  <ArrowDownUp className="w-3.5 h-3.5 text-primary" />
                  <span>Movimentar Estoque</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenCreateProductModal}
                  className="gap-2 text-xs h-9 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Produto</span>
                </Button>
              </>
            )}

            {activeTab === 'movimentacoes' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportMovementsCSV}
                  disabled={loadingInventory || movements.length === 0}
                  className="gap-2 text-xs h-9"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Extrato</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleOpenMovementModal(undefined, 'ENTRY')}
                  disabled={inventory.length === 0}
                  className="gap-2 text-xs h-9 shadow-sm"
                >
                  <ArrowDownUp className="w-4 h-4" />
                  <span>Registrar Entrada / Saída</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Abas Superiores de Navegação */}
        <div className="flex border-b border-border overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('estoque')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'estoque'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Controle de Estoque & Inventário</span>
            {(lowStockItems.length > 0 || expiredItems.length > 0) && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px] font-bold">
                {lowStockItems.length + expiredItems.length}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('movimentacoes')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'movimentacoes'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <ArrowDownUp className="w-4 h-4" />
            <span>Histórico de Movimentações (Entrada / Saída)</span>
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
              {movements.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('despesas')}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'despesas'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Despesas & Contas a Pagar</span>
            {pendingCount > 0 && (
              <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px] text-amber-600 border-amber-500/30">
                {pendingCount} pendente(s)
              </Badge>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: CONTROLE DE ESTOQUE & INVENTÁRIO                                    */}
        {/* ========================================================================= */}
        {activeTab === 'estoque' && (
          <div className="space-y-6">
            {/* Banner de Alerta de Estoque Baixo ou Validade Vencida */}
            {(lowStockItems.length > 0 || expiredItems.length > 0 || expiringSoonItems.length > 0) && (
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
                <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Atenção: Alertas Críticos de Estoque e Validade</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                  {outOfStockItems.length > 0 && (
                    <div className="flex items-center gap-2 bg-background/80 p-2.5 rounded-lg border border-destructive/30">
                      <div className="w-2 h-2 rounded-full bg-destructive animate-ping" />
                      <span className="font-semibold text-destructive">{outOfStockItems.length} produto(s) esgotado(s)</span>
                    </div>
                  )}
                  {lowStockItems.length > 0 && (
                    <div className="flex items-center gap-2 bg-background/80 p-2.5 rounded-lg border border-amber-500/30">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {lowStockItems.length} produto(s) abaixo do estoque mínimo
                      </span>
                    </div>
                  )}
                  {(expiredItems.length > 0 || expiringSoonItems.length > 0) && (
                    <div className="flex items-center gap-2 bg-background/80 p-2.5 rounded-lg border border-orange-500/30">
                      <Clock className="w-3.5 h-3.5 text-orange-600" />
                      <span className="font-medium text-orange-700 dark:text-orange-400">
                        {expiredItems.length} vencido(s) • {expiringSoonItems.length} vence(m) em até 30 dias
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4 Cards de Métricas de Inventário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Valor em Estoque ao Custo (Inventário) */}
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Valor em Estoque (Custo)
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatPrice(totalInventoryCost)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Capital total imobilizado em mercadorias e insumos
                  </p>
                </CardContent>
              </Card>

              {/* 2. Potencial de Venda */}
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Potencial de Faturamento
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatPrice(totalInventorySales)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Valor bruto potencial ao comercializar os produtos
                  </p>
                </CardContent>
              </Card>

              {/* 3. Lucro Projetado em Estoque */}
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Lucro Projetado (Revenda)
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {formatPrice(totalProjectedProfit)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Margem líquida a realizar com itens de revenda
                  </p>
                </CardContent>
              </Card>

              {/* 4. Total de Itens e Alertas */}
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Produtos & Alertas
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {inventory.length} <span className="text-xs font-normal text-muted-foreground">produtos</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    {lowStockItems.length > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        {lowStockItems.length} com estoque baixo
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">Todos os saldos regulares</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filtros e Tabela de Produtos */}
            <Card className="border-border shadow-sm space-y-4 p-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                <div className="relative w-full lg:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, SKU ou notas..."
                    value={inventorySearchTerm}
                    onChange={(e) => setInventorySearchTerm(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
                  <select
                    value={inventoryCategoryFilter}
                    onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                    className="bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">Todas as Categorias</option>
                    <option value="REVENTA">Revenda para Clientes</option>
                    <option value="USO_INTERNO">Uso na Bancada / Salão</option>
                    <option value="OUTROS">Outros</option>
                  </select>

                  <select
                    value={inventoryStockFilter}
                    onChange={(e) => setInventoryStockFilter(e.target.value)}
                    className="bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">Todos os Níveis de Estoque</option>
                    <option value="LOW_OR_OUT">Estoque Baixo ou Esgotado</option>
                    <option value="OUT">Somente Esgotados</option>
                    <option value="REGULAR">Estoque Regular</option>
                  </select>

                  <select
                    value={inventoryExpiryFilter}
                    onChange={(e) => setInventoryExpiryFilter(e.target.value)}
                    className="bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">Todas as Validades</option>
                    <option value="EXPIRING_OR_EXPIRED">Vencidos / Próximos ao Vencimento</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Produtos */}
              <div className="border border-border rounded-xl overflow-hidden">
                {loadingInventory ? (
                  <div className="p-8 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredInventory.length === 0 ? (
                  <div className="text-center py-16 px-4 space-y-3">
                    <Boxes className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">Nenhum produto cadastrado no estoque</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Cadastre pomadas, lâminas, shampoos, óleos de barba e insumos para controlar saldos, custos e lucros.
                    </p>
                    <Button size="sm" variant="default" onClick={handleOpenCreateProductModal} className="gap-2 text-xs mt-2">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar Primeiro Produto</span>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Produto / SKU</TableHead>
                        <TableHead className="text-xs">Categoria</TableHead>
                        <TableHead className="text-xs text-center">Saldo em Estoque</TableHead>
                        <TableHead className="text-xs text-right">Custo Unitário</TableHead>
                        <TableHead className="text-xs text-right">Preço de Venda</TableHead>
                        <TableHead className="text-xs text-center">Lucro / Margem</TableHead>
                        <TableHead className="text-xs text-right">Valor em Estoque</TableHead>
                        <TableHead className="text-xs text-center">Validade</TableHead>
                        <TableHead className="text-xs text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory.map((item) => {
                        const isOutOfStock = item.currentStock <= 0
                        const isLowStock = !isOutOfStock && item.currentStock <= item.minStock
                        const expInfo = getExpirationInfo(item.expirationDate)
                        const unitProfit = item.category === 'REVENTA' ? Math.max(0, item.salePrice - item.costPrice) : 0
                        const marginPct =
                          item.costPrice > 0 && item.salePrice > item.costPrice
                            ? (((item.salePrice - item.costPrice) / item.costPrice) * 100).toFixed(0)
                            : null

                        return (
                          <TableRow key={item.id} className="hover:bg-muted/30">
                            {/* Produto / SKU */}
                            <TableCell className="py-3">
                              <div className="font-semibold text-xs text-foreground">{item.name}</div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                {item.sku && <span>SKU: {item.sku}</span>}
                                {item.batch && <span>• Lote: {item.batch}</span>}
                              </div>
                            </TableCell>

                            {/* Categoria */}
                            <TableCell className="py-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-2 py-0.5 font-medium ${
                                  PRODUCT_CATEGORY_MAP[item.category]?.color || 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {PRODUCT_CATEGORY_MAP[item.category]?.label || item.category}
                              </Badge>
                            </TableCell>

                            {/* Saldo em Estoque */}
                            <TableCell className="py-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-xs text-foreground">
                                  {item.currentStock} {item.unit}
                                </span>
                                {isOutOfStock ? (
                                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 mt-0.5 font-bold">
                                    Esgotado
                                  </Badge>
                                ) : isLowStock ? (
                                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] px-1.5 py-0 mt-0.5">
                                    Mínimo: {item.minStock} {item.unit}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground mt-0.5">
                                    Mín: {item.minStock} {item.unit}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Custo Unitário */}
                            <TableCell className="py-3 text-right font-medium text-xs text-foreground">
                              {formatPrice(item.costPrice)}
                            </TableCell>

                            {/* Preço de Venda */}
                            <TableCell className="py-3 text-right font-medium text-xs text-foreground">
                              {item.category === 'REVENTA' ? (
                                formatPrice(item.salePrice)
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">Uso Interno</span>
                              )}
                            </TableCell>

                            {/* Lucro / Margem */}
                            <TableCell className="py-3 text-center">
                              {item.category === 'REVENTA' ? (
                                <div className="flex flex-col items-center">
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    +{formatPrice(unitProfit)}
                                  </span>
                                  {marginPct && (
                                    <span className="text-[10px] text-muted-foreground">
                                      ({marginPct}% margem)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">-</span>
                              )}
                            </TableCell>

                            {/* Valor em Estoque */}
                            <TableCell className="py-3 text-right font-bold text-xs text-foreground">
                              {formatPrice(item.currentStock * item.costPrice)}
                            </TableCell>

                            {/* Validade */}
                            <TableCell className="py-3 text-center">
                              {expInfo ? (
                                <div>
                                  {expInfo.isExpired ? (
                                    <Badge variant="destructive" className="gap-1 text-[9px] px-1.5 py-0 font-bold">
                                      <ShieldAlert className="w-2.5 h-2.5" />
                                      VENCIDO ({expInfo.formattedDate})
                                    </Badge>
                                  ) : expInfo.isExpiringSoon ? (
                                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1 text-[9px] px-1.5 py-0">
                                      <Clock className="w-2.5 h-2.5" />
                                      Vence em {expInfo.daysRemaining}d
                                    </Badge>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground">
                                      {expInfo.formattedDate}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">-</span>
                              )}
                            </TableCell>

                            {/* Ações */}
                            <TableCell className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenMovementModal(item.id, 'ENTRY')}
                                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                  title="Entrada / Saída Rápida"
                                >
                                  <ArrowDownUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditProductModal(item)}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Editar Produto"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteProduct(item.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  title="Excluir Produto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: HISTÓRICO DE MOVIMENTAÇÕES (ENTRADA / SAÍDA)                       */}
        {/* ========================================================================= */}
        {activeTab === 'movimentacoes' && (
          <div className="space-y-6">
            <Card className="border-border shadow-sm space-y-4 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por produto ou notas..."
                    value={movementSearchTerm}
                    onChange={(e) => setMovementSearchTerm(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <select
                    value={movementTypeFilter}
                    onChange={(e) => setMovementTypeFilter(e.target.value)}
                    className="bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">Todos os Tipos</option>
                    <option value="ENTRY">Entradas (+)</option>
                    <option value="EXIT">Saídas (-)</option>
                  </select>

                  <select
                    value={movementReasonFilter}
                    onChange={(e) => setMovementReasonFilter(e.target.value)}
                    className="bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">Todos os Motivos</option>
                    <option value="PURCHASE">Compra de Fornecedor</option>
                    <option value="SALE">Venda para Cliente</option>
                    <option value="INTERNAL_USE">Uso Bancada / Salão</option>
                    <option value="LOSS_EXPIRED">Perda / Vencimento / Avaria</option>
                    <option value="ADJUSTMENT">Ajuste de Balanço</option>
                  </select>
                </div>
              </div>

              {/* Tabela de Histórico de Movimentações */}
              <div className="border border-border rounded-xl overflow-hidden">
                {loadingInventory ? (
                  <div className="p-8 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredMovements.length === 0 ? (
                  <div className="text-center py-16 px-4 space-y-3">
                    <ArrowDownUp className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">Nenhuma movimentação registrada</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Registre entradas de compras ou saídas de consumo e vendas para auditar o fluxo do seu estoque.
                    </p>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleOpenMovementModal(undefined, 'ENTRY')}
                      disabled={inventory.length === 0}
                      className="gap-2 text-xs mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Registrar Primeira Movimentação</span>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs text-center">Tipo</TableHead>
                        <TableHead className="text-xs">Produto</TableHead>
                        <TableHead className="text-xs text-center">Quantidade</TableHead>
                        <TableHead className="text-xs">Motivo / Operação</TableHead>
                        <TableHead className="text-xs text-right">Valor Total</TableHead>
                        <TableHead className="text-xs">Observações</TableHead>
                        <TableHead className="text-xs text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovements.map((mov) => {
                        const isEntry = mov.type === 'ENTRY'

                        return (
                          <TableRow key={mov.id}>
                            <TableCell className="py-3 text-xs text-muted-foreground">
                              {mov.date ? new Date(mov.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </TableCell>

                            <TableCell className="py-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold px-2 py-0.5 gap-1 ${
                                  isEntry
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'bg-destructive/10 text-destructive border-destructive/30'
                                }`}
                              >
                                {isEntry ? (
                                  <>
                                    <ArrowUpRight className="w-3 h-3" />
                                    <span>Entrada</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownRight className="w-3 h-3" />
                                    <span>Saída</span>
                                  </>
                                )}
                              </Badge>
                            </TableCell>

                            <TableCell className="py-3 font-semibold text-xs text-foreground">
                              {mov.productName}
                            </TableCell>

                            <TableCell className="py-3 text-center font-bold text-xs">
                              <span className={isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}>
                                {isEntry ? `+${mov.quantity}` : `-${mov.quantity}`} {mov.unit}
                              </span>
                            </TableCell>

                            <TableCell className="py-3 text-xs text-foreground">
                              {MOVEMENT_REASON_MAP[mov.reason] || mov.reason}
                            </TableCell>

                            <TableCell className="py-3 text-right font-medium text-xs text-foreground">
                              {mov.totalValue ? formatPrice(mov.totalValue) : '-'}
                            </TableCell>

                            <TableCell className="py-3 text-xs text-muted-foreground max-w-xs truncate">
                              {mov.notes || '-'}
                            </TableCell>

                            <TableCell className="py-3 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteMovement(mov.id)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                title="Excluir Registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 3: DESPESAS & CONTAS A PAGAR                                          */}
        {/* ========================================================================= */}
        {activeTab === 'despesas' && (
          <div className="space-y-6">
            {/* Grade de 4 Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Gastos do Mês
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatPrice(totalMonthAmount)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    {currentMonthExpenses.length} lançamento(s) no mês atual
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Custos Fixos
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatPrice(fixedExpensesAmount)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Aluguel, energia, internet e água
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Insumos & Produtos
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatPrice(suppliesAmount)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Lâminas, pomadas, navalhas e pós-barba
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contas Pendentes
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {formatPrice(pendingAmount)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    {pendingCount} conta(s) a pagar em aberto
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filtros e Tabela de Lançamentos de Despesas */}
            <Card className="border-border shadow-sm space-y-4 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por descrição ou observação..."
                    value={expenseSearchTerm}
                    onChange={(e) => setExpenseSearchTerm(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <select
                    value={expenseCategoryFilter}
                    onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                    className="bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">Todas as Categorias</option>
                    <option value="FIXED">Custos Fixos</option>
                    <option value="SUPPLIES">Insumos & Produtos</option>
                    <option value="MAINTENANCE">Manutenção</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="TAXES">Impostos / Tarifas</option>
                    <option value="OTHER">Outras</option>
                  </select>

                  <select
                    value={expenseStatusFilter}
                    onChange={(e) => setExpenseStatusFilter(e.target.value)}
                    className="bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="ALL">Todos os Status</option>
                    <option value="PAID">Pagos</option>
                    <option value="PENDING">Pendentes</option>
                  </select>
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                {loadingExpenses ? (
                  <div className="p-8 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="text-center py-16 px-4 space-y-3">
                    <Receipt className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">Nenhum gasto ou despesa encontrado</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Clique em &quot;Novo Gasto&quot; para registrar saídas financeiras, contas públicas ou pagamentos da unidade.
                    </p>
                    <Button size="sm" variant="outline" onClick={handleOpenCreateExpenseModal} className="gap-2 text-xs mt-2">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar Primeiro Gasto</span>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Descrição / Finalidade</TableHead>
                        <TableHead className="text-xs">Categoria</TableHead>
                        <TableHead className="text-xs">Vencimento</TableHead>
                        <TableHead className="text-xs text-right">Valor</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                        <TableHead className="text-xs text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense) => {
                        const cat = CATEGORY_MAP[expense.category] || CATEGORY_MAP.OTHER
                        const CatIcon = cat.icon
                        const isPaid = expense.status === 'PAID'

                        return (
                          <TableRow key={expense.id}>
                            <TableCell className="py-3">
                              <div className="font-semibold text-xs text-foreground">{expense.title}</div>
                              {expense.notes && (
                                <div className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">
                                  {expense.notes}
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="py-3">
                              <Badge variant="outline" className={`gap-1 text-[10px] px-2 py-0.5 font-medium ${cat.color}`}>
                                <CatIcon className="w-3 h-3" />
                                <span>{cat.label.split('(')[0].trim()}</span>
                              </Badge>
                            </TableCell>

                            <TableCell className="py-3 text-xs text-muted-foreground">
                              {expense.dueDate ? new Date(expense.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </TableCell>

                            <TableCell className="py-3 text-right font-bold text-xs text-foreground">
                              {formatPrice(expense.amount)}
                            </TableCell>

                            <TableCell className="py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleExpenseStatus(expense)}
                                title="Clique para alternar status"
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                                  isPaid
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                }`}
                              >
                                {isPaid ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Pago</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3" />
                                    <span>Pendente</span>
                                  </>
                                )}
                              </button>
                            </TableCell>

                            <TableCell className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditExpenseModal(expense)}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Editar"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: CADASTRAR / EDITAR PRODUTO NO ESTOQUE                             */}
        {/* ========================================================================= */}
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      {editingProduct ? 'Editar Produto do Estoque' : 'Novo Produto no Estoque'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Cadastre saldo, valores de custo, preço de venda e validade.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitProduct} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Nome do Produto / Insumo <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Ex: Pomada Modeladora Matte 150g, Navalhete Premium..."
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Código de Barras / SKU</label>
                    <Input
                      placeholder="Ex: 78912345678"
                      value={productFormData.sku}
                      onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Destinação / Categoria</label>
                    <select
                      value={productFormData.category}
                      onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value as any })}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="REVENTA">Revenda (Venda para Clientes)</option>
                      <option value="USO_INTERNO">Uso Interno (Bancada / Lavatório)</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Saldo Atual <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="0"
                      value={productFormData.currentStock}
                      onChange={(e) => setProductFormData({ ...productFormData, currentStock: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Unidade de Medida</label>
                    <select
                      value={productFormData.unit}
                      onChange={(e) => setProductFormData({ ...productFormData, unit: e.target.value })}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="UN">UN (Unidade)</option>
                      <option value="ML">ML (Mililitros)</option>
                      <option value="L">L (Litros)</option>
                      <option value="CX">CX (Caixa)</option>
                      <option value="FRASCO">FRASCO</option>
                      <option value="G">G (Gramas)</option>
                      <option value="KG">KG (Quilos)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Estoque Mínimo <span className="text-xs text-muted-foreground">(Alerta)</span>
                    </label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="5"
                      value={productFormData.minStock}
                      onChange={(e) => setProductFormData({ ...productFormData, minStock: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Preço de Custo Unitário (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={productFormData.costPrice}
                      onChange={(e) => setProductFormData({ ...productFormData, costPrice: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Preço de Venda Unitário (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={productFormData.salePrice}
                      onChange={(e) => setProductFormData({ ...productFormData, salePrice: e.target.value })}
                    />
                  </div>
                </div>

                {/* Card de Prévia de Lucro */}
                {productFormData.category === 'REVENTA' && previewSale > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Lucro por Unidade: <strong>{formatPrice(previewProfit)}</strong></span>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                      {previewMargin}% de margem
                    </Badge>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Data de Validade</label>
                    <Input
                      type="date"
                      value={productFormData.expirationDate}
                      onChange={(e) => setProductFormData({ ...productFormData, expirationDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Lote de Fabricação</label>
                    <Input
                      placeholder="Ex: LOTE-2026A"
                      value={productFormData.batch}
                      onChange={(e) => setProductFormData({ ...productFormData, batch: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Observações / Fornecedor</label>
                  <textarea
                    rows={2}
                    placeholder="Instruções de armazenamento, fornecedor preferencial..."
                    value={productFormData.notes}
                    onChange={(e) => setProductFormData({ ...productFormData, notes: e.target.value })}
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProductModalOpen(false)}
                    disabled={isSubmitting}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="text-xs gap-1.5">
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{editingProduct ? 'Salvar Alterações' : 'Cadastrar no Estoque'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: REGISTRAR MOVIMENTAÇÃO DE ESTOQUE (ENTRADA / SAÍDA)               */}
        {/* ========================================================================= */}
        {isMovementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ArrowDownUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Movimentação de Estoque
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Registre compras, vendas, consumo em bancada ou ajustes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitMovement} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Seleção do Produto */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Produto <span className="text-destructive">*</span>
                  </label>
                  <select
                    required
                    value={movementFormData.productId}
                    onChange={(e) => {
                      const selProd = inventory.find((p) => p.id === e.target.value)
                      setMovementFormData({
                        ...movementFormData,
                        productId: e.target.value,
                        costUnit: selProd ? String(selProd.costPrice) : '',
                      })
                    }}
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {inventory.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (Saldo Atual: {prod.currentStock} {prod.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Movimentação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Tipo de Movimentação <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMovementFormData({
                          ...movementFormData,
                          type: 'ENTRY',
                          reason: 'PURCHASE',
                          createExpense: true,
                        })
                      }
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        movementFormData.type === 'ENTRY'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 ring-2 ring-emerald-500/20'
                          : 'border-input text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Entrada (+)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setMovementFormData({
                          ...movementFormData,
                          type: 'EXIT',
                          reason: 'INTERNAL_USE',
                          createExpense: false,
                        })
                      }
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        movementFormData.type === 'EXIT'
                          ? 'bg-destructive/10 text-destructive border-destructive/40 ring-2 ring-destructive/20'
                          : 'border-input text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      <span>Saída (-)</span>
                    </button>
                  </div>
                </div>

                {/* Quantidade e Motivo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Quantidade <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="1"
                      value={movementFormData.quantity}
                      onChange={(e) => setMovementFormData({ ...movementFormData, quantity: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Motivo da Operação</label>
                    <select
                      value={movementFormData.reason}
                      onChange={(e) => setMovementFormData({ ...movementFormData, reason: e.target.value as any })}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {movementFormData.type === 'ENTRY' ? (
                        <>
                          <option value="PURCHASE">Compra de Fornecedor</option>
                          <option value="ADJUSTMENT">Ajuste / Sobra de Balanço</option>
                          <option value="OTHER">Outra Entrada</option>
                        </>
                      ) : (
                        <>
                          <option value="INTERNAL_USE">Consumo na Bancada / Lavatório</option>
                          <option value="SALE">Venda para Cliente</option>
                          <option value="LOSS_EXPIRED">Perda / Vencimento / Avaria</option>
                          <option value="ADJUSTMENT">Ajuste de Balanço</option>
                          <option value="OTHER">Outra Saída</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Custo Unitário e Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Custo Unitário da Operação (R$)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={movementFormData.costUnit}
                      onChange={(e) => setMovementFormData({ ...movementFormData, costUnit: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Data da Movimentação</label>
                    <Input
                      type="date"
                      required
                      value={movementFormData.date}
                      onChange={(e) => setMovementFormData({ ...movementFormData, date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Opção de Lançar Automaticamente em Gastos */}
                {movementFormData.type === 'ENTRY' && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-xl">
                    <input
                      type="checkbox"
                      id="createExpense"
                      checked={movementFormData.createExpense}
                      onChange={(e) => setMovementFormData({ ...movementFormData, createExpense: e.target.checked })}
                      className="w-4 h-4 rounded border-input text-primary focus:ring-ring cursor-pointer"
                    />
                    <label htmlFor="createExpense" className="text-xs text-foreground cursor-pointer">
                      <strong className="font-semibold">Lançar automaticamente em Gastos do Estabelecimento</strong>
                      <p className="text-[11px] text-muted-foreground">
                        Cria um lançamento pago na categoria &quot;Insumos & Produtos&quot; com o valor total da compra.
                      </p>
                    </label>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Observações / Motivo</label>
                  <Input
                    placeholder="Ex: Fornecedor Barba Forte, lote 2026, nota fiscal 1234..."
                    value={movementFormData.notes}
                    onChange={(e) => setMovementFormData({ ...movementFormData, notes: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsMovementModalOpen(false)}
                    disabled={isSubmitting}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="text-xs gap-1.5">
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Confirmar Movimentação</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: CADASTRAR / EDITAR DESPESA FINANCEIRA                              */}
        {/* ========================================================================= */}
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      {editingExpense ? 'Editar Despesa' : 'Novo Gasto / Despesa'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Lance custos fixos, contas públicas ou pagamentos da unidade.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitExpense} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Descrição do Gasto <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Ex: Aluguel do Salão, Conta de Energia, Lâminas..."
                    value={expenseFormData.title}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Valor (R$) <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0,00"
                      value={expenseFormData.amount}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Categoria</label>
                    <select
                      value={expenseFormData.category}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="FIXED">Custo Fixo (Aluguel, Luz, Água)</option>
                      <option value="SUPPLIES">Insumos & Produtos</option>
                      <option value="MAINTENANCE">Manutenção & Equipamentos</option>
                      <option value="MARKETING">Marketing & Divulgação</option>
                      <option value="TAXES">Impostos & Tarifas</option>
                      <option value="OTHER">Outras Despesas</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Data de Vencimento / Pagamento</label>
                    <Input
                      type="date"
                      required
                      value={expenseFormData.dueDate}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, dueDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Status do Pagamento</label>
                    <select
                      value={expenseFormData.status}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, status: e.target.value as any })}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="PAID">Pago / Liquidado</option>
                      <option value="PENDING">Pendente (A Pagar)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Observações (Opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Número da nota, fornecedor ou detalhes adicionais..."
                    value={expenseFormData.notes}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsExpenseModalOpen(false)}
                    disabled={isSubmitting}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="text-xs gap-1.5">
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{editingExpense ? 'Salvar Alterações' : 'Cadastrar Gasto'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
