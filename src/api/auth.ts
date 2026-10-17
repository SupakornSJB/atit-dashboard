import { apiClient } from './client'

interface LoginResponse {
  token: string
  expiresIn: number
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/auth/login', { username, password })
  return res.data
}