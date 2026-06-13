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

http.interceptors.request.use((config) => {
  config.headers = config.headers || {}
  ;(config.headers as any)['X-Admin-Role'] = localStorage.getItem('admin_role') || 'operator'
  return config
})

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
  upload_id?: string
  repair_id?: string
  active?: boolean
  action?: string
  target_type?: string
  start_date?: string
  end_date?: string
  keyword?: string
  review_pool?: boolean
  page?: number
  page_size?: number
}

export interface AuditConfig {
  upload_reward_points: number
  repair_reward_points: number
  report_hide_threshold: number
  quality_high_report_threshold: number
  quality_high_unlock_threshold: number
  quality_burst_report_threshold: number
  quality_burst_unlock_threshold: number
  quality_auto_review_pool: boolean
  quality_auto_hide_high_report: boolean
  quality_auto_hide_burst: boolean
  invalid_penalty_multiplier: number
  auto_hide_on_report: boolean
}

export async function pingOpsDashboard(pointsRange: 'today' | '7d' = 'today'): Promise<any> {
  return http.get('/admin/netdisk/ops-dashboard', { params: { points_range: pointsRange } })
}

export async function getOpsDashboard(pointsRange: 'today' | '7d' = 'today', qualityRange: 'today' | '7d' | 'all' = '7d'): Promise<any> {
  return http.get('/admin/netdisk/ops-dashboard', { params: { points_range: pointsRange, quality_range: qualityRange } })
}

export async function getNetdiskResourceQuality(params: { filter?: string; range?: string; page_size?: number } = {}): Promise<any> {
  return http.get('/admin/netdisk/resource-quality', { params })
}

export async function getNetdiskResourceQualityDetail(id: string): Promise<any> {
  return http.get(`/admin/netdisk/resource-quality/${id}`)
}

export async function handleNetdiskQualityAlert(id: string, action: 'read' | 'resolve' | 'ignore' | 'reopen', note = ''): Promise<any> {
  return http.post(`/admin/netdisk/resource-quality/alerts/${id}/${action}`, { note })
}

export async function resolveNetdiskQualityAlertWithAction(
  id: string,
  resultAction: 'restore' | 'confirm_invalid' | 'keep_hidden',
  note = '',
): Promise<any> {
  return http.post(`/admin/netdisk/resource-quality/alerts-action/${id}/resolve`, {
    note,
    result_action: resultAction,
  })
}

export async function batchHandleNetdiskQualityAlerts(ids: string[], action: 'read' | 'resolve' | 'ignore', note = ''): Promise<any> {
  return http.post(`/admin/netdisk/resource-quality/alerts-batch/${action}`, { ids, note })
}

export async function refreshNetdiskQualityStats(): Promise<any> {
  return http.post('/admin/netdisk/resource-quality/refresh-stats', {})
}

export async function getNetdiskQualityAlerts(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/quality-alerts', { params })
}

export async function getNetdiskQualityReviewPool(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/quality-review-pool', { params })
}

export async function getNetdiskQualityStatsRuntime(): Promise<any> {
  return http.get('/admin/netdisk/resource-quality/stats-runtime')
}

export async function simulateNetdiskQualityStatsFailure(): Promise<any> {
  return http.post('/admin/netdisk/resource-quality/stats-runtime/dev-simulate-failure', {})
}

export async function recoverNetdiskQualityStatsRuntime(): Promise<any> {
  return http.post('/admin/netdisk/resource-quality/stats-runtime/dev-recover', {})
}

export async function getNetdiskUploads(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/uploads', { params })
}

export async function reviewNetdiskUpload(
  id: string,
  action: 'approve' | 'reject' | 'confirm-invalid',
  note = '',
  options: { resource_level?: string; cost_points?: number } = {},
): Promise<any> {
  return http.post(`/admin/netdisk/uploads/${id}/${action}`, { note, ...options })
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

export async function getNetdiskFeedbacks(params: NetdiskListParams & { feedback_type?: string; feedback_id?: string } = {}): Promise<any> {
  return http.get('/admin/netdisk/feedbacks', { params })
}

export async function getNetdiskCrawlerStatus(): Promise<any> {
  return http.get('/admin/netdisk/crawlers/status')
}

export async function runNetdiskCrawler(crawlerKey: string): Promise<any> {
  return http.post(`/admin/netdisk/crawlers/${crawlerKey}/run`, {})
}

export async function getNetdiskCollectedResources(
  params: NetdiskListParams & { bucket?: string } = {},
): Promise<any> {
  return http.get('/admin/netdisk/collected-resources', { params })
}

export async function handleNetdiskCollectedResource(
  id: string,
  action: 'approve' | 'skip' | 'merge',
  note = '',
): Promise<any> {
  return http.post(`/admin/netdisk/collected-resources/${id}/${action}`, { note })
}

export async function importNetdiskCollectedResources(file: File, sourceType = 'manual'): Promise<any> {
  const form = new FormData()
  form.append('file', file)
  const resp = await axios.post(`${API_BASE}/admin/netdisk/collected-resources/import`, form, {
    params: { source_type: sourceType },
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Admin-Role': localStorage.getItem('admin_role') || 'operator',
    },
    timeout: 60000,
  })
  const data = resp.data
  if (data.code === 200 || data.code === 0) return data.data ?? data
  throw new Error(data.msg || data.message || '导入失败')
}

export async function getNetdiskImportBatches(
  params: { source_type?: string; status?: string; page?: number; page_size?: number } = {},
): Promise<any> {
  return http.get('/admin/netdisk/collected-resources/import-batches', { params })
}

export async function downloadNetdiskImportFailedRows(batchId: string, filename = ''): Promise<void> {
  const resp = await axios.get(`${API_BASE}/admin/netdisk/collected-resources/import-batches/${batchId}/failed.csv`, {
    responseType: 'blob',
    headers: {
      'X-Admin-Role': localStorage.getItem('admin_role') || 'operator',
    },
  })
  const blob = new Blob([resp.data], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `导入失败明细-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function replyNetdiskFeedback(
  id: string,
  status: 'pending' | 'processing' | 'resolved' | 'rejected',
  note = '',
): Promise<any> {
  return http.post(`/admin/netdisk/feedbacks/${id}/reply`, {
    result_action: status,
    note,
  })
}

export async function restoreNetdiskResource(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/resources/${id}/restore`, { note })
}

export async function getNetdiskRiskRecords(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/risk-records', { params })
}

export async function getNetdiskRiskRecordDetail(id: string): Promise<any> {
  return http.get(`/admin/netdisk/risk-records/${id}`)
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
