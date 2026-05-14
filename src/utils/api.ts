import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const http = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

http.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code === 200 || data.code === 0) {
      return data.data ?? data
    }
    return Promise.reject(new Error(data.msg || data.message || '请求失败'))
  },
  (error) => {
    const msg = error.response?.data?.msg || error.response?.data?.detail || error.message || '网络错误'
    return Promise.reject(new Error(msg))
  }
)

export async function callAdminApi(action: string, data: any = {}): Promise<any> {
  return http.post('/pc/call', { action, data })
}

export async function getDashboardStats(): Promise<any> {
  return http.post('/pc/dashboard')
}

export async function getUserGrowthStats(days: number = 7): Promise<any> {
  return http.post('/pc/user-growth', null, { params: { days } })
}

export async function getWithdrawalStats(days: number = 7): Promise<any> {
  return http.post('/pc/withdrawal-stats', null, { params: { days } })
}

export async function getUserList(page: number = 1, pageSize: number = 20, keyword?: string): Promise<any> {
  return http.post('/pc/user-list', { page, pageSize, keyword })
}

export async function getUserDetail(userId: string): Promise<any> {
  return http.post('/pc/user-detail', null, { params: { userId } })
}

export async function getConfig(type: string): Promise<any> {
  return http.post('/pc/config', { type })
}

export async function updateConfig(configData: any): Promise<any> {
  return http.post('/pc/config-update', configData)
}

export async function getWithdrawalList(status?: number): Promise<any> {
  return http.post('/pc/withdrawal-list', null, { params: { status } })
}

export async function processWithdrawal(recordId: string, action: 'approve' | 'reject', reason?: string): Promise<any> {
  return http.post('/pc/withdrawal-process', { recordId, action, reason })
}

export async function getChatMessages(userId?: string): Promise<any> {
  return http.post('/pc/chat-messages', null, { params: { userId } })
}

export async function sendReply(userId: string, content: string): Promise<any> {
  return http.post('/pc/chat-reply', { userId, content })
}

export async function callUploadFunction(action: string, data: any = {}): Promise<any> {
  return http.post('/pc/upload', { action, data })
}

export default http