export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/ñ/g, 'n')
    .trim()
    .replace(/\s+/g, '-') // Espacios por guiones
    .replace(/[^\w-]+/g, '') // Quitar caracteres especiales
    .replace(/--+/g, '-'); // Quitar guiones duplicados
}
