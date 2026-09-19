import { describe, it, expect } from 'vitest'
import { searchBrazilianCities, normalizeText } from '@/lib/brazilian-cities'
import { maskPhone, maskEmail, maskName } from '@/lib/utils'

describe('Validações e Máscaras do Modal de Cadastro de Barbearia (/developer)', () => {
  describe('Máscara de Telefone (maskPhone)', () => {
    it('deve formatar número com 11 dígitos no padrão (00) 00000-0000', () => {
      expect(maskPhone('11987654321')).toBe('(11) 98765-4321')
    })

    it('deve formatar número fixo com 10 dígitos no padrão (00) 0000-0000', () => {
      expect(maskPhone('1133334444')).toBe('(11) 3333-4444')
    })

    it('deve remover caracteres não numéricos e aplicar a máscara', () => {
      expect(maskPhone('abc(11) 9 9999-8888xyz')).toBe('(11) 99999-8888')
    })

    it('deve limitar a no máximo 11 dígitos', () => {
      expect(maskPhone('1199999888899999')).toBe('(11) 99999-8888')
    })
  })

  describe('Máscara de Email (maskEmail)', () => {
    it('deve converter para minúsculas e remover espaços', () => {
      expect(maskEmail('  Contato@Barbearia.COM  ')).toBe('contato@barbearia.com')
    })

    it('deve manter apenas um único @', () => {
      expect(maskEmail('admin@@barbearia.com')).toBe('admin@barbearia.com')
    })
  })

  describe('Máscara de Nome (maskName)', () => {
    it('deve capitalizar corretamente e remover caracteres inválidos', () => {
      expect(maskName('pedro silva santos')).toBe('Pedro Silva Santos')
    })

    it('deve manter caracteres acentuados comuns', () => {
      expect(maskName('josé márcio')).toBe('José Márcio')
    })
  })

  describe('Busca e Autocomplete de Cidades Brasileiras (searchBrazilianCities - Base Oficial IBGE)', () => {
    it('deve conter exatamente os 5.571 municípios oficiais catalogados pelo IBGE', async () => {
      const { ALL_IBGE_CITIES } = await import('@/lib/brazilian-cities')
      expect(ALL_IBGE_CITIES.length).toBe(5571)
    })

    it('deve retornar cidades que começam com o termo digitado', () => {
      const results = searchBrazilianCities('Camp')
      expect(results.length).toBeGreaterThan(0)
      const nomes = results.map((r) => r.nome)
      expect(nomes).toContain('Campinas')
    })

    it('deve ser insensível a maiúsculas, minúsculas e acentuação', () => {
      const comAcento = searchBrazilianCities('São Paulo')
      const semAcento = searchBrazilianCities('sao paulo')
      expect(comAcento[0]?.nome).toBe('São Paulo')
      expect(semAcento[0]?.nome).toBe('São Paulo')
    })

    it('deve encontrar municípios do interior de todos os estados do Brasil', () => {
      // Bahia
      const xique = searchBrazilianCities('Xique-Xique')
      expect(xique.length).toBeGreaterThan(0)
      expect(xique[0]?.nome).toBe('Xique-Xique')
      expect(xique[0]?.uf).toBe('BA')

      // Minas Gerais
      const ouro = searchBrazilianCities('Ouro Preto')
      expect(ouro.map((c) => c.nome)).toContain('Ouro Preto')

      // Rio Grande do Sul
      const gramado = searchBrazilianCities('Gramado')
      expect(gramado[0]?.nome).toBe('Gramado')
      expect(gramado[0]?.uf).toBe('RS')

      // São Paulo (pequeno município)
      const zacarias = searchBrazilianCities('Zacarias')
      expect(zacarias[0]?.nome).toBe('Zacarias')
      expect(zacarias[0]?.uf).toBe('SP')

      // Rondônia
      const jipa = searchBrazilianCities('Ji-Paraná')
      expect(jipa[0]?.nome).toBe('Ji-Paraná')
      expect(jipa[0]?.uf).toBe('RO')
    })

    it('deve sugerir capitais importantes corretamente', () => {
      const bh = searchBrazilianCities('Belo Hor')
      expect(bh.length).toBeGreaterThan(0)
      expect(bh[0]?.nome).toBe('Belo Horizonte')
      expect(bh[0]?.uf).toBe('MG')

      const cwb = searchBrazilianCities('Curit')
      expect(cwb.length).toBeGreaterThan(0)
      expect(cwb[0]?.nome).toBe('Curitiba')
      expect(cwb[0]?.uf).toBe('PR')
    })

    it('deve retornar array vazio se termo for vazio', () => {
      expect(searchBrazilianCities('')).toEqual([])
      expect(searchBrazilianCities('   ')).toEqual([])
    })
  })
})
