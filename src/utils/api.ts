import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const http = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const normalizeError = (error: any): string => {
  const msg = error.response?.data?.msg || error.response?.data?.detail || error.message || '网络错误'
  if (String(msg).includes('status code 500')) return '接口返回 500，请确认后端服务和数据库状态'
  if (String(msg).includes('Network Error')) return '网络不可用，请确认后端 8000 已启动'
  return msg
}

http.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code === 200 || data.code === 0) {
      return data.data ?? data
    }
    return Promise.reject(new Error(data.msg || data.message || '请求失败'))
  },
  (error) => Promise.reject(new Error(normalizeError(error))),
)

export interface NetdiskListParams {
  status?: string
  mode?: string
  active?: boolean
  action?: string
  target_type?: string
  start_date?: string
  end_date?: string
  keyword?: string
  page?: number
  page_size?: number
}

export interface AuditConfig {
  upload_reward_points: number
  repair_reward_points: number
  report_hide_threshold: number
  invalid_penalty_multiplier: number
  auto_hide_on_report: boolean
}

export async function pingOpsDashboard(pointsRange: 'today' | '7d' = 'today'): Promise<any> {
  return http.get('/admin/netdisk/ops-dashboard', { params: { points_range: pointsRange } })
}

export async function getOpsDashboard(pointsRange: 'today' | '7d' = 'today'): Promise<any> {
  return http.get('/admin/netdisk/ops-dashboard', { params: { points_range: pointsRange } })
}

export async function getNetdiskUploads(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/uploads', { params })
}

export async function reviewNetdiskUpload(
  id: string,
  action: 'approve' | 'reject' | 'confirm-invalid',
  note = '',
): Promise<any> {
  return http.post(`/admin/netdisk/uploads/${id}/${action}`, { note })
}

export async function getNetdiskRepairs(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/repairs', { params })
}

export async function reviewNetdiskRepair(
  id: string,
  action: 'approve' | 'reject' | 'confirm-invalid',
  note = '',
): Promise<any> {
  return http.post(`/admin/netdisk/repairs/${id}/${action}`, { note })
}

export async function getNetdiskResources(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/resources', { params })
}

export async function restoreNetdiskResource(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/resources/${id}/restore`, { note })
}

export async function getNetdiskRiskRecords(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/risk-records', { params })
}

export async function collectNetdiskRiskRecord(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/risk-records/${id}/collect`, { note })
}

export async function waiveNetdiskRiskRecord(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/risk-records/${id}/waive`, { note })
}

export async function getNetdiskAuditLogs(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/audit-logs', { params })
}

export async function exportNetdiskAuditLogs(params: NetdiskListParams = {}): Promise<void> {
  const resp = await axios.get(`${API_BASE}/admin/netdisk/audit-logs/export`, {
    params,
    responseType: 'blob',
  })
  const blob = new Blob([resp.data], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `netdisk-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function getNetdiskAuditConfig(): Promise<AuditConfig> {
  return http.get('/admin/netdisk/audit-config')
}

export async function updateNetdiskAuditConfig(configData: AuditConfig): Promise<any> {
  return http.put('/admin/netdisk/audit-config', {
    type: 'netdisk_audit_config',
    config_data: configData,
  })
}

export async function seedNetdiskReviewDemo(): Promise<any> {
  return http.post('/admin/netdisk/dev-seed')
}

export default http
