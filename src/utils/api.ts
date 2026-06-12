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

// ==================== 视频相关 ====================

export interface VideoInfoData {
  title: string
  thumbnail: string
  cover_url: string
  formats: { preset: string; label: string; description: string }[]
}

export async function getVideoInfo(url: string, userId: string, formatPreset: string = 'fast'): Promise<VideoInfoData> {
  return http.post('/video/video_info', { url, user_id: userId, format_preset: formatPreset })
}

export function getVideoDownloadUrl(userId: string, url: string, formatPreset: string = 'fast'): string {
  const encodedUrl = encodeURIComponent(url)
  return `${API_BASE}/video/user_video?user_id=${encodeURIComponent(userId)}&url=${encodedUrl}&format_preset=${formatPreset}`
}

export async function downloadVideoWithProgress(
  url: string,
  userId: string,
  formatPreset: string = 'fast',
  onProgress?: (event: VideoProgressEvent) => void
): Promise<void> {
  const resp = await fetch(`${API_BASE}/video/video_download_with_progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, user_id: userId, format_preset: formatPreset })
  })

  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      const event: VideoProgressEvent = JSON.parse(line)
      onProgress?.(event)
      if (event.status === 'completed') {
        return
      }
    }
  }
}

export interface VideoProgressEvent {
  status: 'start' | 'processing' | 'preparing' | 'completed' | 'error'
  progress?: number
  message: string
  download_id?: string
  download_url?: string
  video_title?: string
}

// ==================== 影视资源相关 ====================

export interface AnimeResource {
  anime_id: string
  title: string
  quality: string
  episode: string
  status: string
  baidu_url: string
  baidu_password: string
  quark_url: string
  '4k_url': string
  update_time: string
}

export interface AnimeResourceListData {
  total: number
  list: AnimeResource[]
}

export async function getAnimeResources(
  type: string = 'movie',
  keyword?: string,
  page: number = 1,
  pageSize: number = 100
): Promise<AnimeResourceListData> {
  const params: Record<string, string | number> = { type, page, page_size: pageSize }
  if (keyword) params.keyword = keyword
  return http.get('/anime/resources', { params })
}

export async function syncAnime(type: string = 'anime'): Promise<{ synced: number; inactive: number; error: string | null }> {
  return http.get('/admin/sync-anime', { params: { type } })
}

// ==================== 管理后台相关 ====================

export async function getDashboardStats(): Promise<any> {
  return http.get('/admin/dashboard')
}

export async function getUserList(
  page: number = 1,
  pageSize: number = 20,
  keyword?: string,
  isVip?: boolean
): Promise<any> {
  return http.get('/admin/users', { params: { page, page_size: pageSize, keyword, is_vip: isVip } })
}

export async function getUserDetail(userId: string): Promise<any> {
  return http.get(`/admin/users/${userId}`)
}

export async function updateUserVip(userId: string, payload: { is_vip: boolean; vip_expire_at: string | null }): Promise<any> {
  return http.put(`/admin/users/${userId}/vip`, payload)
}

export async function getConfig(type: string): Promise<any> {
  return http.get('/admin/configs', { params: { type } })
}

export async function updateConfig(configData: any): Promise<any> {
  return http.put('/admin/configs', configData)
}

export async function getWithdrawalList(status?: string): Promise<any> {
  return http.get('/admin/withdrawals', { params: { status } })
}

export async function processWithdrawal(recordId: string, action: 'approve' | 'reject', reason?: string): Promise<any> {
  if (action === 'approve') {
    return http.post(`/admin/withdrawals/${recordId}/approve`)
  }
  return http.post(`/admin/withdrawals/${recordId}/reject`, null, { params: { reason } })
}

export async function getChatMessages(userId?: string): Promise<any> {
  return http.get('/admin/chat/messages', { params: { user_id: userId } })
}

export async function sendReply(userId: string, content: string): Promise<any> {
  return http.post('/admin/chat/reply', { user_id: userId, content })
}


// ==================== 网盘审核 ====================

export interface NetdiskAuditListParams {
  status?: string
  mode?: string
  active?: boolean
  keyword?: string
  page?: number
  page_size?: number
}

export async function getNetdiskUploads(params: NetdiskAuditListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/uploads', { params })
}

export async function getNetdiskRepairs(params: NetdiskAuditListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/repairs', { params })
}

export async function getNetdiskResources(params: NetdiskAuditListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/resources', { params })
}

export async function getNetdiskRiskRecords(params: NetdiskAuditListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/risk-records', { params })
}

export async function reviewNetdiskUpload(
  id: string,
  action: 'approve' | 'reject' | 'confirm-invalid',
  note = '',
): Promise<any> {
  return http.post(`/admin/netdisk/uploads/${id}/${action}`, { note })
}

export async function reviewNetdiskRepair(
  id: string,
  action: 'approve' | 'reject' | 'confirm-invalid',
  note = '',
): Promise<any> {
  return http.post(`/admin/netdisk/repairs/${id}/${action}`, { note })
}

export async function restoreNetdiskResource(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/resources/${id}/restore`, { note })
}

export async function getNetdiskAuditConfig(): Promise<any> {
  return http.get('/admin/netdisk/audit-config')
}

export async function updateNetdiskAuditConfig(configData: any): Promise<any> {
  return http.put('/admin/netdisk/audit-config', { type: 'netdisk_audit_config', config_data: configData })
}

export async function seedNetdiskReviewDemo(): Promise<any> {
  return http.post('/admin/netdisk/dev-seed')
}

export async function getUserGrowthStats(days: number = 7): Promise<any> {
  return http.get('/admin/dashboard', { params: { days } })
}

export async function getWithdrawalStats(days: number = 7): Promise<any> {
  return http.get('/admin/withdrawals', { params: { days } })
}

export default http
