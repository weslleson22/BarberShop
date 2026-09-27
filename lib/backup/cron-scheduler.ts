import cron, { ScheduledTask } from 'node-cron'
import { executeDatabaseBackup } from './generator'

let isInitialized = false
let scheduledTask: ScheduledTask | null = null

/**
 * Inicializa a rotina de cron interna para execução diária às 00:00.
 * Indicado para ambientes de servidor Node.js com ciclo de vida contínuo (VPS / Docker / Dev).
 */
export function initBackupCron(): { scheduled: boolean; scheduleExpression: string } {
  if (isInitialized && scheduledTask) {
    return { scheduled: true, scheduleExpression: '0 0 * * *' }
  }

  // Padrão: 00:00 diariamente ('0 0 * * *')
  const cronExpression = '0 0 * * *'

  scheduledTask = cron.schedule(
    cronExpression,
    async () => {
      console.log(`[node-cron] [${new Date().toISOString()}] Executando rotina diária de backup para Cloudflare R2...`)
      try {
        const result = await executeDatabaseBackup({
          trigger: 'CRON_AUTOMATIC',
          saveLocalCopy: true,
        })
        console.log(`[node-cron] Backup concluído com sucesso: ${result.key} (${(result.sizeBytes / 1024).toFixed(2)} KB)`)
      } catch (err) {
        console.error('[node-cron] Erro ao executar backup agendado:', err)
      }
    },
    {
      timezone: 'America/Sao_Paulo',
    }
  )

  isInitialized = true
  console.log('[node-cron] Rotina de backup automático configurada para todos os dias às 00:00 (America/Sao_Paulo).')

  return { scheduled: true, scheduleExpression: cronExpression }
}

/**
 * Para a execução da tarefa agendada.
 */
export function stopBackupCron(): void {
  if (scheduledTask) {
    scheduledTask.stop()
    scheduledTask = null
    isInitialized = false
  }
}

/**
 * Retorna o status atual do agendador interno.
 */
export function getBackupCronStatus(): {
  isInitialized: boolean
  schedule: string
  timezone: string
} {
  return {
    isInitialized,
    schedule: '0 0 * * *',
    timezone: 'America/Sao_Paulo',
  }
}
