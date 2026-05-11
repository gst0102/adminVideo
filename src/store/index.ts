import { defineStore } from 'pinia'
import { ref } from 'vue'
import { callFunction as tcbCallFunction, getCloudBase } from '@/utils/cloudbase'

const pendingRequests = new Map<string, Promise<any>>()

const callCloudFunction = async (action: string, data: any = {}): Promise<any> => {
  const cacheKey = `${action}_${JSON.stringify(data)}`

  if (pendingRequests.has(cacheKey)) {
    console.log(`[Cloud] 复用进行中的请求: ${action}`)
    return pendingRequests.get(cacheKey)
  }

  const promise = (async () => {
    console.log(`[Cloud] 调用云函数: ${action}`, data)

    const result = await tcbCallFunction('admin-api', { action, data })
    console.log('[Cloud] 云函数响应:', result)

    if (result.code === 200 || result.code === 0) {
      return result.data || result.response_data?.resp_data || result
    }

    throw new Error(result.msg || result.message || '云函数执行失败')
  })()

  pendingRequests.set(cacheKey, promise)

  try {
    return await promise
  } finally {
    pendingRequests.delete(cacheKey)
  }
}

export const useAdminStore = defineStore('admin', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const userInfo = ref<any>(null)
  const loading = ref(false)
  const connectionStatus = ref<'cloud' | 'disconnected'>('disconnected')

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
      await getCloudBase()
      await callCloudFunction('getDashboardStats')
      connectionStatus.value = 'cloud'
      console.log('[Store] ✓ 已连接到云函数（真实数据库模式）')
    } catch (e) {
      connectionStatus.value = 'disconnected'
      console.log('[Store] ⚠ 未连接到云函数', e)
    }
  }

  const getDashboardStats = async () => {
    return callCloudFunction('getDashboardStats')
  }

  const getConfig = async (type: string) => {
    const cached = configCache.get(type)
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      console.log(`[Store] 使用缓存配置: ${type}`)
      return cached.data
    }

    const data = await callCloudFunction('getConfig', { type })
    configCache.set(type, { data, time: Date.now() })
    return data
  }

  const updateConfig = async (configData: any) => {
    console.log('[Store] 保存配置到数据库:', configData.type)
    const result = await callCloudFunction('updateConfig', configData)
    configCache.delete(configData.type)
    console.log('[Store] ✓ 配置已保存到云端数据库')
    return result
  }

  const getUserList = async (page = 1, pageSize = 20, keyword?: string) => {
    return callCloudFunction('getUserList', { page, pageSize, keyword })
  }

  const getUserDetail = async (userId: string) => {
    return callCloudFunction('getUserDetail', { userId })
  }

  const getWithdrawalList = async (status?: number) => {
    return callCloudFunction('getWithdrawalList', { status })
  }

  const processWithdrawal = async (recordId: string, action: 'approve' | 'reject', reason?: string) => {
    return callCloudFunction('processWithdrawal', { recordId, action, reason })
  }

  const getChatMessages = async (userId?: string) => {
    return callCloudFunction('getChatMessages', { userId })
  }

  const sendReply = async (userId: string, content: string) => {
    return callCloudFunction('sendReply', { userId, content })
  }

  const getUserGrowthStats = async (days: number = 7) => {
    return callCloudFunction('getUserGrowthStats', { days })
  }

  const getWithdrawalStats = async (days: number = 7) => {
    return callCloudFunction('getWithdrawalStats', { days })
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
