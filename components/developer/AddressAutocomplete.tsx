'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Search, Check, Loader2 } from 'lucide-react'
import { searchBrazilianCities, fetchIbgeCities, BrazilianCity } from '@/lib/brazilian-cities'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  id?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Ex: Av. Paulista, 1000 - Bela Vista, São Paulo, SP',
  className = '',
  required = false,
  id = 'address',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<BrazilianCity[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [isSearchingCep, setIsSearchingCep] = useState(false)
  const [detectedCep, setDetectedCep] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Extrai termo de busca para cidade
  // Se o usuário digitou "Rua das Flores, 100, Campi", o termo de busca é "Campi"
  const extractCityQuery = (text: string): string => {
    if (!text) return ''
    const parts = text.split(/[-–—,]/)
    const lastPart = parts[parts.length - 1]?.trim() || ''
    return lastPart.length >= 1 ? lastPart : text.trim()
  }

  // Verifica se há um CEP de 8 dígitos no texto
  useEffect(() => {
    const cepMatch = value.replace(/\D/g, '')
    if (cepMatch.length === 8 && !value.includes(',')) {
      setDetectedCep(cepMatch)
    } else {
      setDetectedCep(null)
    }
  }, [value])

  // Atualiza sugestões conforme o usuário digita
  useEffect(() => {
    const query = extractCityQuery(value)

    if (!query || query.length < 1) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    // Busca instantânea em todos os 5.571 municípios da base oficial do IBGE
    const matches = searchBrazilianCities(query, 15)
    setSuggestions(matches)
    setIsOpen(matches.length > 0)
    setSelectedIndex(-1)
  }, [value])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Aplica a cidade selecionada ao campo de endereço
  const handleSelectCity = (city: BrazilianCity) => {
    const current = value.trim()
    const parts = current.split(/[-–—,]/)

    let finalAddress = ''
    if (parts.length > 1) {
      // O usuário já digitou logradouro / número / bairro antes da cidade
      const prefix = parts.slice(0, parts.length - 1).join(' - ').trim()
      finalAddress = `${prefix} - ${city.label}`
    } else {
      // O usuário apenas digitou a cidade
      finalAddress = city.label
    }

    onChange(finalAddress)
    setIsOpen(false)
    setSuggestions([])
    inputRef.current?.focus()
  }

  // Busca por CEP via ViaCEP caso o usuário informe um CEP
  const handleFetchCep = async (cep: string) => {
    setIsSearchingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (res.ok) {
        const data = await res.json()
        if (!data.erro) {
          const parts = [
            data.logradouro,
            data.bairro,
            `${data.localidade}, ${data.uf}`,
            `CEP ${data.cep}`,
          ].filter(Boolean)
          onChange(parts.join(' - '))
          setDetectedCep(null)
          setIsOpen(false)
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar ViaCEP:', err)
    } finally {
      setIsSearchingCep(false)
    }
  }

  // Navegação por teclado no dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault()
        handleSelectCity(suggestions[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={
            className ||
            'w-full pl-9 pr-10 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition'
          }
        />

        {isSearchingCep && (
          <Loader2 className="w-4 h-4 text-primary absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
        )}
      </div>

      {/* Sugestão de busca por CEP detectado */}
      {detectedCep && (
        <div className="mt-1 flex items-center justify-between px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400">
          <span className="flex items-center gap-1.5 font-medium">
            <Search className="w-3.5 h-3.5" />
            CEP detectado: <strong>{detectedCep.slice(0, 5)}-{detectedCep.slice(5)}</strong>
          </span>
          <button
            type="button"
            onClick={() => handleFetchCep(detectedCep)}
            disabled={isSearchingCep}
            className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition text-xs"
          >
            {isSearchingCep ? 'Buscando...' : 'Auto-completar'}
          </button>
        </div>
      )}

      {/* Dropdown de cidades brasileiras */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto py-1 text-xs text-popover-foreground">
          <div className="px-3.5 py-2 text-[10px] font-semibold tracking-wide text-muted-foreground bg-muted/50 border-b border-border flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Base Oficial IBGE (5.571 municípios) &bull; {suggestions.length} encontrados
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">Use ↑↓ e Enter</span>
          </div>

          <ul className="divide-y divide-border">
            {suggestions.map((city, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <li
                  key={`${city.nome}-${city.uf}-${idx}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelectCity(city)
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition ${
                    isSelected ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm">{city.nome}</span>
                      <span className={`text-xs ml-1.5 ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>({city.uf})</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted border border-border text-muted-foreground'}`}>
                    {city.uf}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
