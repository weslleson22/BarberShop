'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react'

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void
  onMonthSelect?: (monthDate: Date) => void
  selectedDate?: Date
  isMonthView?: boolean
}

export default function CalendarView({ 
  onDateSelect, 
  onMonthSelect, 
  selectedDate: externalSelectedDate,
  isMonthView = false,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(externalSelectedDate || new Date())
  const [selectedDate, setSelectedDate] = useState(externalSelectedDate || new Date())

  useEffect(() => {
    if (externalSelectedDate) {
      setSelectedDate(externalSelectedDate)
      setCurrentDate(new Date(externalSelectedDate.getFullYear(), externalSelectedDate.getMonth(), 1))
    }
  }, [externalSelectedDate])

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    setCurrentDate(newDate)
    if (isMonthView) {
      onMonthSelect?.(newDate)
    }
  }

  const handleNextMonth = () => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    setCurrentDate(newDate)
    if (isMonthView) {
      onMonthSelect?.(newDate)
    }
  }

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(newDate)
    onDateSelect?.(newDate)
  }

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear()
  }

  const isSelected = (day: number) => {
    if (isMonthView) return false
    return day === selectedDate.getDate() && 
           currentDate.getMonth() === selectedDate.getMonth() && 
           currentDate.getFullYear() === selectedDate.getFullYear()
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="bg-card text-card-foreground border border-border rounded-xl p-3.5 sm:p-4 shadow-sm">
      {/* Header com Mês/Ano e Navegação */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => onMonthSelect?.(currentDate)}
          className="text-left group cursor-pointer inline-flex items-center gap-1.5 min-w-0"
          title="Clique para ver todos os agendamentos deste mês"
        >
          <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          {isMonthView && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
              Mês Selecionado
            </span>
          )}
        </button>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onMonthSelect?.(currentDate)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border cursor-pointer ${
              isMonthView
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title="Ver todos os agendamentos deste mês"
          >
            Mês
          </button>

          <button
            onClick={handlePreviousMonth}
            className="h-7 w-7 flex items-center justify-center bg-card border border-border rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            aria-label="Mês anterior"
            title="Mês anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="h-7 w-7 flex items-center justify-center bg-card border border-border rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            aria-label="Próximo mês"
            title="Próximo mês"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cabeçalho dos Dias da Semana */}
      <div className="grid grid-cols-7 gap-1 mb-1 text-center">
        {weekDays.map((day, index) => (
          <div key={index} className="py-1">
            <span className="text-[11px] font-semibold text-muted-foreground">{day}</span>
          </div>
        ))}
      </div>

      {/* Grid Compacto de Dias do Mês */}
      <div className="grid grid-cols-7 gap-1">
        {generateCalendarDays().map((day, index) => {
          const today = day !== null && isToday(day)
          const selected = day !== null && isSelected(day)

          return (
            <div
              key={index}
              className={`
                h-7 sm:h-8 w-full flex items-center justify-center rounded-md cursor-pointer transition-colors text-xs font-medium
                ${day === null ? 'pointer-events-none' : ''}
                ${selected ? 'bg-primary text-primary-foreground font-bold shadow-sm' : ''}
                ${!selected && today ? 'border border-primary text-primary font-bold bg-primary/10' : ''}
                ${!selected && !today && day !== null ? 'hover:bg-muted text-foreground' : ''}
              `}
              onClick={() => day && handleDateClick(day)}
            >
              {day && <span>{day}</span>}
            </div>
          )
        })}
      </div>

      {/* Rodapé Compacto com Info do Dia Selecionado */}
      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-2 text-xs">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">
            {isMonthView ? 'Filtro por Mês' : 'Data'}
          </p>
          <p className="text-foreground font-medium text-xs truncate">
            {isMonthView ? (
              <span>{monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}</span>
            ) : (
              selectedDate.toLocaleDateString('pt-BR', { 
                weekday: 'short', 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })
            )}
          </p>
        </div>

        <div>
          {!isMonthView ? (
            <button 
              type="button"
              onClick={() => onDateSelect?.(selectedDate)}
              className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md transition-all text-xs whitespace-nowrap cursor-pointer shadow-sm"
            >
              Filtrar dia
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => {
                const today = new Date()
                setSelectedDate(today)
                onDateSelect?.(today)
              }}
              className="px-2.5 py-1 bg-card border border-border text-foreground font-medium rounded-md hover:bg-muted transition-all text-xs whitespace-nowrap cursor-pointer"
            >
              Hoje
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
