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
    <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => onMonthSelect?.(currentDate)}
            className="text-left group cursor-pointer"
            title="Clique para ver todos os agendamentos deste mês"
          >
            <h3 className={`text-lg font-bold transition-colors ${
              isMonthView ? 'text-yellow-400 flex items-center gap-1.5' : 'text-white group-hover:text-yellow-400'
            }`}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              {isMonthView && <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">Mês Selecionado</span>}
            </h3>
          </button>
        </div>
        
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          {/* Botão Ver Mês Inteiro */}
          <button
            type="button"
            onClick={() => onMonthSelect?.(currentDate)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
              isMonthView
                ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-400/20'
                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
            }`}
            title="Ver todos os agendamentos deste mês"
          >
            Ver Mês Inteiro
          </button>

          <button
            onClick={handlePreviousMonth}
            className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            aria-label="Mês anterior"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
            aria-label="Próximo mês"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div key={index} className="text-center py-1">
            <span className="text-xs text-white/40 font-medium">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {generateCalendarDays().map((day, index) => (
          <div
            key={index}
            className={`
              aspect-square flex items-center justify-center rounded-lg cursor-pointer transition-all
              ${day === null ? '' : 'hover:bg-white/10'}
              ${day && isToday(day) ? 'bg-yellow-400/20 border border-yellow-400/30' : ''}
              ${day && isSelected(day) ? 'bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 border border-yellow-400/50 shadow-md' : ''}
            `}
            onClick={() => day && handleDateClick(day)}
          >
            {day && (
              <span className={`
                text-sm font-medium
                ${isToday(day) ? 'text-yellow-400 font-bold' : 'text-white/80'}
                ${isSelected(day) ? 'text-white font-bold' : ''}
              `}>
                {day}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Selected date/month info */}
      <div className="mt-4 pt-3 border-t border-white/6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs mb-1">
              {isMonthView ? 'Filtro atual' : 'Data selecionada'}
            </p>
            <p className="text-white font-medium text-sm break-words">
              {isMonthView ? (
                <span className="text-yellow-400 font-semibold">
                  Todos os agendamentos de {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
                </span>
              ) : (
                selectedDate.toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isMonthView ? (
              <button 
                type="button"
                onClick={() => onDateSelect?.(selectedDate)}
                className="px-3 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all text-sm whitespace-nowrap flex-shrink-0 cursor-pointer"
              >
                Filtrar este dia
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => {
                  const today = new Date()
                  setSelectedDate(today)
                  onDateSelect?.(today)
                }}
                className="px-3 py-2 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-all text-xs whitespace-nowrap flex-shrink-0 cursor-pointer"
              >
                Ver dia de hoje
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
