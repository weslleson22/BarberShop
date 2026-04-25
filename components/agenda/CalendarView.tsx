'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void
  selectedDate?: Date
}

export default function CalendarView({ onDateSelect, selectedDate: externalSelectedDate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(externalSelectedDate || new Date())

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
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <div className="flex items-center space-x-1 text-white/60">
            <CalendarIcon className="w-3 h-3" />
            <span className="text-xs">Calendário</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousMonth}
            className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-white/60 text-xs font-medium py-1">
            {day}
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
              ${day && isSelected(day) ? 'bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 border border-yellow-400/50' : ''}
            `}
            onClick={() => day && handleDateClick(day)}
          >
            {day && (
              <span className={`
                text-sm font-medium
                ${isToday(day) ? 'text-yellow-400' : 'text-white/80'}
                ${isSelected(day) ? 'text-white' : ''}
              `}>
                {day}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Selected date info */}
      <div className="mt-4 pt-3 border-t border-white/6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs">Data selecionada</p>
            <p className="text-white font-medium text-sm">
              {selectedDate.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all text-sm">
            Ver Agendamentos
          </button>
        </div>
      </div>
    </div>
  )
}
