import { executeDatabaseBackup } from '../lib/backup/generator'

async function run() {
  console.log('🚀 Iniciando backup do banco de dados com upload para Cloudflare R2...')
  try {
    const result = await executeDatabaseBackup({
      trigger: 'CLI',
      saveLocalCopy: true,
    })

    console.log('✅ BACKUP CONCLUÍDO E ENVIADO COM SUCESSO!')
    console.log('--------------------------------------------------')
    console.log(`📦 Bucket R2:     ${result.bucket}`)
    console.log(`🔑 Chave no R2:    ${result.key}`)
    console.log(`📁 Arquivo:       ${result.filename}`)
    console.log(`📊 Tamanho Bruto: ${(result.rawSizeBytes / 1024).toFixed(2)} KB`)
    console.log(`🗜️ Tamanho Gzip:  ${(result.sizeBytes / 1024).toFixed(2)} KB`)
    console.log(`📋 Tabelas:       ${result.tablesCount}`)
    console.log(`📝 Registros:     ${result.recordsCount}`)
    console.log(`⏱️ Duração:       ${result.durationMs}ms`)
    console.log(`🔒 SHA-256:       ${result.sha256}`)
    if (result.localPath) {
      console.log(`💾 Cópia Local:   ${result.localPath}`)
    }
    console.log('--------------------------------------------------')
    process.exit(0)
  } catch (error) {
    console.error('❌ ERRO AO EXECUTAR BACKUP:', error)
    process.exit(1)
  }
}

run()
