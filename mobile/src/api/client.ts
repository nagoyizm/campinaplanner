/**
 * mobile/src/api/client.ts
 * HTTP client compartido entre todas las screens de la app móvil.
 * Apunta a la misma API REST de Next.js.
 */

// En desarrollo: tu IP local. En producción: tu dominio.
// ponytail: AsyncStorage se importa en el módulo de auth, no aquí
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: object
  token?: string
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${method} ${path} → ${res.status}: ${err}`)
  }

  return res.json() as Promise<T>
}
