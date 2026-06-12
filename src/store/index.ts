import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pingOpsDashboard } from '@/utils/api'

export const useAdminStore = defineStore('admin', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const role = ref(localStorage.getItem('admin_role') || (token.value ? 'supervisor' : 'operator'))
  const userInfo = ref<any>(token.value ? { username: 'admin', role: role.value } : null)
  const loading = ref(false)
  const connectionStatus = ref<'connected' | 'disconnected'>('disconnected')

  const login = async (username: string, password: string) => {
    loading.value = true
    try {
      if (username === 'admin' && password === 'admin123') {
        token.value = `admin-token-${Date.now()}`
        role.value = 'supervisor'
        userInfo.value = { username, role: role.value }
        localStorage.setItem('admin_token', token.value)
        localStorage.setItem('admin_role', role.value)
        await testConnection()
        return { success: true }
      }
      throw new Error('用户名或密码错误')
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    role.value = 'operator'
    connectionStatus.value = 'disconnected'
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_role')
  }

  const testConnection = async () => {
    try {
      await pingOpsDashboard()
      connectionStatus.value = 'connected'
    } catch (error) {
      connectionStatus.value = 'disconnected'
    }
  }

  return {
    token,
    userInfo,
    role,
    loading,
    connectionStatus,
    login,
    logout,
    testConnection,
  }
})
