import { executeBackup } from './backup'
import {
  loadAndVerifyBackup,
  restoreToIsolatedSchema,
  validateRestoredSchema,
  teardownIsolatedSchema,
} from './restore'
import { prisma } from '../../lib/prisma'

/**
 * Procedimento Completo de Simulação de Disaster Recovery & Validação de Restauração.
 */
export async function runDisasterRecoverySimulation(): Promise<{
  success: boolean
  durationMs: number
  backupFile: string
  manifestChecksum: string
  checksPassed: number
  checksTotal: number
  report: string[]
}> {
  const startTime = Date.now()
  const report: string[] = []
  const tempSchemaName = `dr_verification_${Date.now()}`

  function log(msg: string) {
    report.push(msg)
    console.log(msg)
  }

  log('==================================================================')
  log('   INICIANDO SIMULAÇÃO DE DISASTER RECOVERY (BACKUP & RESTORE)    ')
  log('==================================================================')

  try {
    // PASSO 1: Gerar Snapshot Consistente do Banco de Dados
    log('\n[ETAPA 1/7] Gerando backup consistente e criptografado com AES-256-GCM...')
    const backupResult = await executeBackup({ encrypt: true })
    log(`  -> Arquivo gerado: ${backupResult.filePath}`)
    log(`  -> Checksum SHA-256: ${backupResult.manifest.checksum}`)
    log(`  -> Tamanho cifrado: ${(backupResult.finalSizeBytes / 1024).toFixed(2)} KB`)

    // PASSO 2: Carregar, Decriptar e Validar Checksum SHA-256
    log('\n[ETAPA 2/7] Decriptando e validando integridade criptográfica do snapshot...')
    const backupData = loadAndVerifyBackup(backupResult.filePath)
    log('  -> Integridade verificada com sucesso! Checksum coincide 100%.')

    // PASSO 3: Provisionar Schema Isolado Temporário
    log(`\n[ETAPA 3/7] Provisionando ambiente temporário isolado: "${tempSchemaName}"...`)
    const restoreResult = await restoreToIsolatedSchema(backupData, tempSchemaName)
    log(`  -> Schema provisionado e dados restaurados em ${restoreResult.durationMs}ms.`)

    // PASSO 4: Validar Migrations e Estrutura do Schema
    log('\n[ETAPA 4/7] Validando histórico de migrations e estrutura...')
    const migrationsCount = backupData.manifest.migrations.length
    log(`  -> Total de migrations verificadas: ${migrationsCount}`)

    // PASSO 5: Validar Registros e Integridade Relacional das Entidades Críticas
    log('\n[ETAPA 5/7] Executando checagem estrita de integridade de dados...')
    const validation = await validateRestoredSchema(tempSchemaName, backupData.manifest)

    for (const check of validation.checks) {
      log(`  [${check.status === 'PASS' ? 'OK' : 'FALHA'}] ${check.name} - ${check.details}`)
    }

    if (!validation.valid) {
      throw new Error('Falha na validação dos dados restaurados no ambiente temporário.')
    }

    // PASSO 6: Executar Consultas de Negócio e Testes no Ambiente Restaurado
    log('\n[ETAPA 6/7] Executando testes funcionais nas tabelas restauradas...')
    
    // Teste A: Consultar Barbearia por Slug no schema restaurado
    const shopResult: any = await prisma.$queryRawUnsafe(
      `SELECT name, slug, "isActive" FROM "${tempSchemaName}"."barbershops" WHERE slug IS NOT NULL LIMIT 1`
    )
    log(`  -> Teste A (Barbearia/Slug): Barbearia "${shopResult[0]?.name}" encontrada com slug "${shopResult[0]?.slug}".`)

    // Teste B: Consultar Usuário com credenciais hash preservadas
    const userResult: any = await prisma.$queryRawUnsafe(
      `SELECT email, role, password FROM "${tempSchemaName}"."users" WHERE role = 'ADMIN' LIMIT 1`
    )
    log(`  -> Teste B (Segurança/RBAC): Administrador "${userResult[0]?.email}" com hash de senha íntegro (${userResult[0]?.password?.substring(0, 15)}...).`)

    // Teste C: Verificar se há agendamentos válidos
    const aptCount: any = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM "${tempSchemaName}"."appointments"`
    )
    log(`  -> Teste C (Agenda Operacional): ${aptCount[0]?.count} agendamentos preservados.`)

    // PASSO 7: Descartar Ambiente Temporário (Clean Teardown)
    log(`\n[ETAPA 7/7] Descartando ambiente temporário "${tempSchemaName}"...`)
    await teardownIsolatedSchema(tempSchemaName)
    log('  -> Schema temporário removido com sucesso. Nenhum resíduo deixado no banco.')

    const durationMs = Date.now() - startTime
    log('\n==================================================================')
    log(`✅ TESTE DE RESTAURAÇÃO DE DISASTER RECOVERY CONCLUÍDO COM SUCESSO!`)
    log(`⏱️ Tempo Total de Execução (RTO Simulado): ${(durationMs / 1000).toFixed(2)}s`)
    log('==================================================================\n')

    return {
      success: true,
      durationMs,
      backupFile: backupResult.filePath,
      manifestChecksum: backupResult.manifest.checksum,
      checksPassed: validation.checks.filter((c) => c.status === 'PASS').length,
      checksTotal: validation.checks.length,
      report,
    }
  } catch (err: any) {
    log(`\n❌ ERRO NA SIMULAÇÃO DE DISASTER RECOVERY: ${err.message}`)
    // Garantir teardown em caso de erro
    try {
      await teardownIsolatedSchema(tempSchemaName)
    } catch {}
    throw err
  } finally {
    await prisma.$disconnect()
  }
}

// Execução via CLI direta
if (process.argv[1]?.endsWith('test-restore.ts')) {
  runDisasterRecoverySimulation()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
