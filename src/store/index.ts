import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  getNetdiskCollectedResources,
  getNetdiskFeedbacks,
  getNetdiskRepairs,
  getNetdiskRiskRecords,
  getNetdiskUploads,
  pingOpsDashboard,
} from '@/utils/api'

type PendingCounts = {
  feedbacks: number
  uploads: number
  repairs: number
  reports: number
  risks: number
  collected: number
}

export const useAdminStore = defineStore('admin', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const role = ref(localStorage.getItem('admin_role') || (token.value ? 'supervisor' : 'operator'))
  const userInfo = ref<any>(token.value ? { username: 'admin', role: role.value } : null)
  const loading = ref(false)
  const connectionStatus = ref<'connected' | 'disconnected'>('disconnected')
  const pendingCounts = ref<PendingCounts>({
    feedbacks: 0,
    uploads: 0,
    repairs: 0,
    reports: 0,
    risks: 0,
    collected: 0,
  })
  const pendingLoading = ref(false)
  const pendingTotal = computed(() => Object.values(pendingCounts.value).reduce((sum, item) => sum + Number(item || 0), 0))

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
    pendingCounts.value = { feedbacks: 0, uploads: 0, repairs: 0, reports: 0, risks: 0, collected: 0 }
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_role')
  }

  const testConnection = async () => {
    try {
      await pingOpsDashboard()
      connectionStatus.value = 'connected'
      await loadPendingCounts()
    } catch (error) {
      connectionStatus.value = 'disconnected'
    }
  }

  const loadPendingCounts = async () => {
    if (!token.value) return pendingCounts.value
    pendingLoading.value = true
    try {
      const [feedbackData, uploadData, repairData, reportData, riskData, collectedData] = await Promise.all([
        getNetdiskFeedbacks({ status: 'pending', page_size: 1 }),
        getNetdiskUploads({ status: 'pending', page_size: 1 }),
        getNetdiskRepairs({ status: 'pending', mode: 'repair', page_size: 1 }),
        getNetdiskRepairs({ status: 'pending', mode: 'report', page_size: 1 }),
        getNetdiskRiskRecords({ status: 'open', page_size: 1 }),
        getNetdiskCollectedResources({ status: 'pending', page_size: 1 }),
      ])
      pendingCounts.value = {
        feedbacks: Number(feedbackData.total ?? feedbackData.feedbacks?.length ?? 0),
        uploads: Number(uploadData.total ?? uploadData.uploads?.length ?? 0),
        repairs: Number(repairData.total ?? repairData.repairs?.length ?? 0),
        reports: Number(reportData.total ?? reportData.repairs?.length ?? 0),
        risks: Number(riskData.total ?? riskData.risk_records?.length ?? 0),
        collected: Number(collectedData.total ?? collectedData.collected_resources?.length ?? 0),
      }
    } finally {
      pendingLoading.value = false
    }
    return pendingCounts.value
  }

  const setPendingCounts = (counts: Partial<PendingCounts>) => {
    pendingCounts.value = { ...pendingCounts.value, ...counts }
  }

  return {
    token,
    userInfo,
    role,
    loading,
    connectionStatus,
    pendingCounts,
    pendingLoading,
    pendingTotal,
    login,
    logout,
    testConnection,
    loadPendingCounts,
    setPendingCounts,
  }
})
