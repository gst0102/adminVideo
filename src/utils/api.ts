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
  report_confirm_invalid_threshold: number
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

export interface PointsRuleConfig {
  display_unit: string
  exchange_rate: number
  checkin_base_points_normal: number
  checkin_base_points_member: number
  checkin_ad_bonus_min: number
  checkin_ad_bonus_max: number
  checkin_ad_bonus_points: number
  game_base_points_min: number
  game_base_points_max: number
  game_rps_win_points: number
  game_rps_lose_points: number
  game_ad_multiplier: number
}

export interface TaskRuleConfig {
  daily_game_task_limit_normal: number
  daily_game_task_limit_member_month: number
  daily_game_task_limit_member_quarter: number
  daily_game_task_limit_member_year: number
}

export interface CommissionRuleConfig {
  level1_rate: number
  level2_rate: number
  settlement_days: number
  rules: string
}

export interface CoBuildConfig {
  enabled: boolean
  announcement_title: string
  announcement_jump_url: string
  activity_title: string
  main_title: string
  subtitle: string
  intro_text: string
  reward_title: string
  reward_desc: string
  reward_rules: string
  primary_button_text: string
  secondary_button_text: string
  footer_slogan: string
}

export interface NetdiskPublicVisibilityConfig {
  miniapp_public_mode: 'review_safe' | 'normal'
  safe_frontend_categories: string[]
  hidden_categories: string[]
  h5_base_url: string
  request_default_bounty_points: number
  request_requires_audit: boolean
  show_media_in_miniapp: boolean
  hidden_categories_when_closed: string[]
  featured_category_when_closed: string
  note: string
}

export interface NetdiskFrontendCategoriesConfig {
  categories: string[]
}

export interface NetdiskOfficialTransferPanRule {
  enabled: boolean
  level1_amount: number
  level2_amount: number
}

export interface NetdiskOfficialTransferConfig {
  enabled: boolean
  settlement_mode: 'record_only' | 'grant_equity'
  default_level1_amount: number
  default_level2_amount: number
  pan_rules: Record<string, NetdiskOfficialTransferPanRule>
  note: string
}

export interface AdminUserListParams {
  keyword?: string
  is_vip?: boolean
  page?: number
  page_size?: number
}

export interface AdminPaymentOrderParams {
  keyword?: string
  status?: 'pending' | 'paid' | 'closed' | 'refunded'
  page?: number
  page_size?: number
}

export async function pingOpsDashboard(pointsRange: 'today' | '7d' = 'today'): Promise<any> {
  return http.get('/admin/netdisk/ops-dashboard', { params: { points_range: pointsRange } })
}

export async function getOpsDashboard(pointsRange: 'today' | '7d' = 'today', qualityRange: 'today' | '7d' | 'all' = '7d'): Promise<any> {
  return http.get('/admin/netdisk/ops-dashboard', { params: { points_range: pointsRange, quality_range: qualityRange } })
}

export async function getAdminUsers(params: AdminUserListParams = {}): Promise<any> {
  return http.get('/admin/users', { params })
}

export async function getAdminUserDetail(id: string): Promise<any> {
  return http.get(`/admin/users/${id}`)
}

export async function adjustAdminUserPoints(
  id: string,
  payload: { action: 'add' | 'consume'; points: number; note?: string },
): Promise<any> {
  return http.post(`/admin/users/${id}/points-adjust`, payload)
}

export async function getAdminPaymentOrders(params: AdminPaymentOrderParams = {}): Promise<any> {
  return http.get('/admin/payments/orders', { params })
}

export async function getAdminEquityLedger(
  params: {
    keyword?: string
    change_type?: string
    related_type?: string
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
  } = {},
): Promise<any> {
  return http.get('/admin/equity-ledger', { params })
}

export async function getAdminWithdrawals(
  params: {
    keyword?: string
    status?: string
    page?: number
    page_size?: number
  } = {},
): Promise<any> {
  return http.get('/admin/withdrawals', { params })
}

export async function approveAdminWithdrawal(id: string): Promise<any> {
  return http.post(`/admin/withdrawals/${id}/approve`, {})
}

export async function rejectAdminWithdrawal(id: string, reason = 'admin_rejected'): Promise<any> {
  return http.post(`/admin/withdrawals/${id}/reject`, {}, { params: { reason } })
}

export async function reconcileAdminPaymentOrders(payload: { lookback_minutes?: number; limit?: number } = {}): Promise<any> {
  return http.post('/admin/payments/reconcile', {
    lookback_minutes: payload.lookback_minutes ?? 180,
    limit: payload.limit ?? 50,
  })
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

export async function previewHiddenDuplicateCleanup(): Promise<any> {
  return http.get('/admin/netdisk/resources/cleanup-hidden-duplicates/preview')
}

export async function cleanupHiddenDuplicateResources(note = ''): Promise<any> {
  return http.post('/admin/netdisk/resources/cleanup-hidden-duplicates', { note })
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

export async function cleanupCrawlerBrowsers(): Promise<any> {
  return http.post('/admin/netdisk/crawlers/maintenance/cleanup-browsers', {})
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

export async function bulkHandleNetdiskCollectedResources(params: {
  action: 'approve' | 'skip' | 'merge'
  ids?: string[]
  all_matching?: boolean
  status?: string
  bucket?: string
  keyword?: string
  note?: string
}): Promise<any> {
  return http.post('/admin/netdisk/collected-resources/bulk-action', params)
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
  rewardPoints = 0,
): Promise<any> {
  return http.post(`/admin/netdisk/feedbacks/${id}/reply`, {
    result_action: status,
    note,
    reward_points: rewardPoints,
  })
}

export async function approveNetdiskFeedbackAppeal(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/feedbacks/${id}/appeal-approve`, { note })
}

export async function restoreNetdiskResource(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/resources/${id}/restore`, { note })
}

export async function hideNetdiskResource(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/resources/${id}/hide`, { note })
}

export async function getNetdiskRequests(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/requests', { params })
}

export async function deleteNetdiskRequest(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/requests/${id}/delete`, { note })
}

export async function approveNetdiskRequest(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/requests/${id}/approve`, { note })
}

export async function rejectNetdiskRequest(id: string, note = ''): Promise<any> {
  return http.post(`/admin/netdisk/requests/${id}/reject`, { note })
}

export async function getNetdiskResourceSubscriptions(
  params: NetdiskListParams & { wx_subscribe_status?: string } = {},
): Promise<any> {
  return http.get('/admin/netdisk/resource-subscriptions', { params })
}

export async function getNetdiskResourceSubscriptionPushLogs(
  params: NetdiskListParams & { subscription_id?: string; resource_id?: string } = {},
): Promise<any> {
  return http.get('/admin/netdisk/resource-subscription-push-logs', { params })
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

export async function getAdminConfigs(type?: string): Promise<any> {
  return http.get('/admin/configs', { params: type ? { type } : {} })
}

export async function updateAdminConfig(type: string, configData: Record<string, any>): Promise<any> {
  return http.put('/admin/configs', {
    type,
    config_data: configData,
  })
}

export async function getNetdiskFrontendCategories(): Promise<NetdiskFrontendCategoriesConfig> {
  return http.get('/admin/netdisk/frontend-categories')
}

export async function updateNetdiskFrontendCategories(categories: string[]): Promise<NetdiskFrontendCategoriesConfig> {
  return http.put('/admin/netdisk/frontend-categories', { categories })
}

export async function getNetdiskTransferTasks(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/transfer-tasks', { params })
}

export async function getNetdiskNewOfficialAccessRecords(params: NetdiskListParams = {}): Promise<any> {
  return http.get('/admin/netdisk/new-official-access-records', { params })
}

export default http
