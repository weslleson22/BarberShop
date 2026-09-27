export interface BackupManifest {
  version: string
  createdAt: string
  sourceDatabase: string
  postgresVersion: string
  checksum: string
  isEncrypted: boolean
  tables: Record<string, number>
  migrations: Array<{ id: string; migration_name: string; finished_at: string | null }>
}

export interface BackupData {
  manifest: BackupManifest
  data: Record<string, any[]>
}
