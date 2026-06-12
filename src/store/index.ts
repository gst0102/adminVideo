import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pingOpsDashboard } from '@/utils/api'

export const useAdminStore = defineStore('admin', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const userInfo = ref<any>(null)
  const loading = ref(false)
  const connectionStatus = ref<'connected' | 'disconnected'>('disconnected')

  const login = async (username: string, password: string) => {
    loading.value = true
    try {
      if (username === 'admin' && password === 'admin123') {
        token.value = `admin-token-${Date.now()}`
        userInfo.value = { username, role: 'admin' }
        localStorage.setItem('admin_token', token.value)
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
    connectionStatus.value = 'disconnected'
    localStorage.removeItem('admin_token')
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
    loading,
    connectionStatus,
    login,
    logout,
    testConnection,
  }
})
