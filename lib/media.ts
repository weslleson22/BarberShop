/**
 * Helpers para servir imagens (avatar) armazenadas no banco sem trafegá-las
 * dentro de listagens.
 *
 * Motivo: avatares são salvos como data URL base64 na coluna `users.avatar`.
 * Incluí-los em `findMany` faz a resposta do Prisma Accelerate ultrapassar o
 * limite de 5MB (erro P6009). As listagens passam a devolver apenas uma URL
 * leve que aponta para `/api/media/avatar/:id`, e o navegador busca cada
 * imagem individualmente (com cache).
 */

export const AVATAR_PROXY_PREFIX = '/api/media/avatar/'

/**
 * Monta a URL pública do avatar. O parâmetro `v` muda sempre que o usuário é
 * atualizado, o que permite cache longo sem servir imagem desatualizada.
 */
export function avatarProxyUrl(userId: string, updatedAt?: Date | string | null): string {
  let version = ''
  if (updatedAt) {
    const ms = new Date(updatedAt).getTime()
    if (!isNaN(ms)) version = `?v=${ms}`
  }
  return `${AVATAR_PROXY_PREFIX}${encodeURIComponent(userId)}${version}`
}

/**
 * Indica se o valor recebido é a própria URL do proxy (ex.: o front reenviou
 * no PUT o avatar que recebeu da listagem). Nesses casos o avatar salvo no
 * banco deve ser mantido, e não sobrescrito pela URL.
 */
export function isAvatarProxyUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (v.startsWith(AVATAR_PROXY_PREFIX)) return true
  try {
    return new URL(v).pathname.startsWith(AVATAR_PROXY_PREFIX)
  } catch {
    return false
  }
}
