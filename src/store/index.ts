import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/utils/api'

const pendingRequests = new Map<string, Promise<any>>()

const callApi = async (fn: () => Promise<any>, key: string): Promise<any> => {
  if (pendingRequests.has(key)) {
    console.log(`[API] 复用进行中的请求: ${key}`)
    return pendingRequests.get(key)
  }

  const promise = (async () => {
    console.log(`[API] 发起请求: ${key}`)
    const result = await fn()
    console.log(`[API] 请求响应: ${key}`, result)
    return result
  })()

  pendingRequests.set(key, promise)

  try {
    return await promise
  } finally {
    pendingRequests.delete(key)
  }
}

export const useAdminStore = defineStore('admin', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const userInfo = ref<any>(null)
  const loading = ref(false)
  const connectionStatus = ref<'connected' | 'disconnected'>('disconnected')

  const configCache = new Map<string, { data: any; time: number }>()
  const CACHE_TTL = 5 * 60 * 1000

  const login = async (username: string, password: string) => {
    loading.value = true
    try {
      if (username === 'admin' && password === 'admin123') {
        token.value = 'admin-token-' + Date.now()
        localStorage.setItem('admin_token', token.value)
        userInfo.value = { username, role: 'admin' }

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
    configCache.clear()
    localStorage.removeItem('admin_token')
  }

  const testConnection = async () => {
    try {
      await api.getDashboardStats()
      connectionStatus.value = 'connected'
      console.log('[Store] ✓ 已连接到后端服务')
    } catch (e) {
      connectionStatus.value = 'disconnected'
      console.log('[Store] ⚠ 未连接到后端服务', e)
    }
  }

  const getDashboardStats = async () => {
    return callApi(() => api.getDashboardStats(), 'dashboard')
  }

  const getConfig = async (type: string) => {
    const cached = configCache.get(type)
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      console.log(`[Store] 使用缓存配置: ${type}`)
      return cached.data
    }

    const data = await callApi(() => api.getConfig(type), `config_${type}`)
    configCache.set(type, { data, time: Date.now() })
    return data
  }

  const updateConfig = async (configData: any) => {
    console.log('[Store] 保存配置到数据库:', configData.type)
    const result = await api.updateConfig(configData)
    configCache.delete(configData.type)
    console.log('[Store] ✓ 配置已保存')
    return result
  }

  const getUserList = async (page = 1, pageSize = 20, keyword?: string) => {
    return api.getUserList(page, pageSize, keyword)
  }

  const getUserDetail = async (userId: string) => {
    return api.getUserDetail(userId)
  }

  const getWithdrawalList = async (status?: number) => {
    return api.getWithdrawalList(status)
  }

  const processWithdrawal = async (recordId: string, action: 'approve' | 'reject', reason?: string) => {
    return api.processWithdrawal(recordId, action, reason)
  }

  const getChatMessages = async (userId?: string) => {
    return api.getChatMessages(userId)
  }

  const sendReply = async (userId: string, content: string) => {
    return api.sendReply(userId, content)
  }

  const getUserGrowthStats = async (days: number = 7) => {
    return api.getUserGrowthStats(days)
  }

  const getWithdrawalStats = async (days: number = 7) => {
    return api.getWithdrawalStats(days)
  }

  return {
    token,
    userInfo,
    loading,
    connectionStatus,
    login,
    logout,
    testConnection,
    getDashboardStats,
    getConfig,
    updateConfig,
    getUserList,
    getUserDetail,
    getWithdrawalList,
    processWithdrawal,
    getChatMessages,
    sendReply,
    getUserGrowthStats,
    getWithdrawalStats
  }
})