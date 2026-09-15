// Fonte única de verdade para as roles do sistema. Qualquer lugar que hoje
// precisaria escrever 'ADMIN' | 'BARBER' | 'CLIENT' à mão deve importar
// `UserRole` daqui — evita que uma role nova (como RECEPTIONIST) fique
// esquecida em algum arquivo.
export type UserRole = 'ADMIN' | 'BARBER' | 'RECEPTIONIST' | 'CLIENT'

export const ALL_ROLES: UserRole[] = ['ADMIN', 'BARBER', 'RECEPTIONIST', 'CLIENT']

// Roles que administram a operação da barbearia (equipe interna, não cliente)
export const STAFF_ROLES: UserRole[] = ['ADMIN', 'BARBER', 'RECEPTIONIST']

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  BARBER: 'Barbeiro',
  RECEPTIONIST: 'Recepcionista',
  CLIENT: 'Cliente',
}
