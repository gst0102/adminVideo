<template>
  <div class="page">
    <div class="header">
      <div>
        <h2>待处理中心</h2>
        <p>把客服反馈、上传审核、补链投诉和积分异常集中到一个运营入口。</p>
      </div>
      <div class="header-actions">
        <el-button @click="goLogs">操作日志</el-button>
        <el-button type="primary" :loading="loading" @click="loadAll">刷新全部</el-button>
      </div>
    </div>

    <div class="summary-grid">
      <div v-for="item in summaryCards" :key="item.key" class="summary-card" :class="item.key" @click="goModule(item.key)">
        <div class="summary-icon">{{ item.icon }}</div>
        <div>
          <div class="summary-value">{{ item.count }}</div>
          <div class="summary-label">{{ item.label }}</div>
        </div>
      </div>
    </div>

    <el-alert
      class="notice"
      type="info"
      show-icon
      :closable="false"
      title="建议运营顺序：积分异常优先，其次资源投诉，再处理补链、上传和普通反馈。"
    />

    <section class="panel crawler-panel">
      <div class="panel-head">
        <div>
          <h3>资源采集任务</h3>
          <p>查看 KDocs、LinuxDo 的定时规则；必要时手动同步最新一批资源。</p>
        </div>
        <div class="crawler-head-actions">
          <el-tag :type="worker.reachable ? 'success' : 'danger'" effect="plain">
            {{ worker.reachable ? 'worker在线' : 'worker离线' }}
          </el-tag>
          <el-tag :type="Number(browserGuard.browser_processes || 0) > Number(browserGuard.browser_process_limit || 0) ? 'danger' : 'success'" effect="plain">
            浏览器进程 {{ browserGuard.browser_processes || 0 }}/{{ browserGuard.browser_process_limit || 0 }}
          </el-tag>
          <el-tag type="success" effect="plain">浏览器并发 {{ browserGuard.concurrency }}</el-tag>
          <el-tag :type="browserGuard.force_cleanup ? 'success' : 'warning'" effect="plain">
            {{ browserGuard.force_cleanup ? '自动清理已开' : '自动清理关闭' }}
          </el-tag>
          <el-tag type="info" effect="plain">清理保护 {{ browserStaleMinutes }} 分钟</el-tag>
          <el-button :disabled="hasRunningCrawler" :loading="cleaningBrowsers" @click="cleanupBrowsers">清理浏览器进程</el-button>
          <el-button link type="primary" @click="goCollectedResources">进入待审核池</el-button>
        </div>
      </div>
      <div class="worker-strip">
        <div>
          <span class="strip-label">超时</span>
          <strong>{{ worker.task_timeout_seconds || 0 }} 秒</strong>
        </div>
        <div>
          <span class="strip-label">运行中</span>
          <strong>{{ (worker.running_tasks || []).join('、') || '无' }}</strong>
        </div>
        <div>
          <span class="strip-label">熔断</span>
          <strong>{{ (worker.blocked_tasks || []).join('、') || '无' }}</strong>
        </div>
        <div v-if="!worker.reachable" class="worker-error">
          {{ worker.error || 'worker 状态不可用' }}
        </div>
      </div>
      <div class="current-featured-card">
        <div class="current-featured-head">
          <div>
            <span class="strip-label">当前首页将展示</span>
            <strong>最近一次采集精选前三条</strong>
          </div>
          <span>{{ latestFeaturedRunTime }}</span>
        </div>
        <div v-if="currentFeaturedPreview.length" class="current-featured-grid">
          <div v-for="(item, index) in currentFeaturedPreview" :key="item.id || item.title" class="current-featured-item">
            <em>{{ index + 1 }}</em>
            <div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.pan || '-' }} · 上架{{ item.published_at || '-' }} · 验证{{ item.verified_at || '-' }}</span>
            </div>
          </div>
        </div>
        <span v-else class="muted">暂无预览，下一次每小时采集跑完后会自动生成。</span>
      </div>
      <el-table v-loading="crawlerLoading" :data="crawlers" border stripe>
        <el-table-column prop="name" label="来源" min-width="150" />
        <el-table-column prop="schedule" label="频率" width="130" />
        <el-table-column prop="limit_text" label="采集范围" min-width="180" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '开启' : '关闭' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="published_count" label="已入库" width="90" align="center" />
        <el-table-column prop="pending_count" label="待审核" width="90" align="center" />
        <el-table-column label="worker状态" min-width="170">
          <template #default="{ row }">
            <div class="task-status">
              <el-tag :type="taskStatus(row.key).type" size="small">{{ taskStatus(row.key).label }}</el-tag>
              <span v-if="taskStatus(row.key).time">{{ taskStatus(row.key).time }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="下次执行" width="120" align="center">
          <template #default="{ row }">
            <span>{{ nextRunTime(row.key) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="规则说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :disabled="!row.enabled"
              :loading="runningCrawler === row.key"
              @click="runCrawler(row.key)"
            >
              同步最新
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="run-history">
        <div class="panel-head slim">
          <div>
            <h3>最近运行记录</h3>
            <p>自动更新结果会落库，worker 重启后这里也不会丢。</p>
          </div>
        </div>
        <el-table :data="recentRuns" border stripe size="small" empty-text="暂无运行记录">
          <el-table-column prop="crawler_key" label="任务" width="120">
            <template #default="{ row }">{{ crawlerName(row.crawler_key) }}</template>
          </el-table-column>
          <el-table-column prop="trigger_source" label="触发方式" width="90">
            <template #default="{ row }">{{ triggerSourceText(row.trigger_source) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="结果" width="90">
            <template #default="{ row }">
              <el-tag :type="runStatusType(row.status)" size="small">{{ runStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="开始" width="110">
            <template #default="{ row }">{{ formatTime(row.started_at) }}</template>
          </el-table-column>
          <el-table-column label="结束" width="110">
            <template #default="{ row }">{{ formatTime(row.finished_at) }}</template>
          </el-table-column>
          <el-table-column label="耗时" width="88" align="center">
            <template #default="{ row }">{{ formatDuration(row.duration_seconds) }}</template>
          </el-table-column>
          <el-table-column label="结果摘要" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ runSummary(row) }}</template>
          </el-table-column>
          <el-table-column label="本次精选预览" min-width="320">
            <template #default="{ row }">
              <div v-if="runFeaturedPreview(row).length" class="featured-preview-list">
                <div v-for="item in runFeaturedPreview(row)" :key="`${row.id}-${item.id || item.title}`" class="featured-preview-item">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.pan || '-' }} · 上架{{ item.published_at || '-' }} · 验证{{ item.verified_at || '-' }}</span>
                </div>
              </div>
              <span v-else class="muted">暂无预览</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <div class="columns">
      <section class="panel panel-wide">
        <div class="panel-head">
          <div>
            <h3>积分异常</h3>
            <p>待追缴、扣错争议和风险记录优先处理，避免用户信任受损。</p>
          </div>
          <el-button link type="primary" @click="goRisks">查看全部</el-button>
        </div>
        <el-table v-loading="loading" :data="riskRecords" border stripe max-height="360">
          <el-table-column prop="user_id" label="用户" min-width="180" show-overflow-tooltip />
          <el-table-column prop="points_due" label="待追缴" width="90" align="center" />
          <el-table-column label="原因" min-width="180">
            <template #default="{ row }">{{ reasonText(row.reason) }}</template>
          </el-table-column>
          <el-table-column label="时间" width="150">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right">
            <template #default>
              <el-button type="primary" link @click="goRisks">去处理</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>用户反馈</h3>
            <p>资源问题、积分问题和功能建议。</p>
          </div>
          <el-button link type="primary" @click="goFeedbacks()">查看全部</el-button>
        </div>
        <div v-loading="loading" class="ticket-list">
          <div v-for="item in feedbacks" :key="item.id" class="ticket-item">
            <div class="ticket-main">
              <el-tag :type="feedbackTag(item.feedback_type)" size="small">{{ feedbackTypeText(item.feedback_type) }}</el-tag>
              <strong>{{ shortId(item.id) }}</strong>
              <el-tag :type="feedbackStatusTag(item.status)" size="small">{{ feedbackStatusText(item.status) }}</el-tag>
            </div>
            <p>{{ previewText(item.content) }}</p>
            <div class="ticket-foot">
              <span>{{ formatTime(item.created_at) }}</span>
              <el-button link type="primary" @click="goFeedbacks(item.id)">处理</el-button>
            </div>
          </div>
          <el-empty v-if="!feedbacks.length && !loading" description="暂无待处理反馈" :image-size="72" />
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>资源投诉</h3>
            <p>用户反馈链接失效、提取码错误或内容不符。</p>
          </div>
          <el-button link type="primary" @click="goReview('reports')">查看全部</el-button>
        </div>
        <el-table v-loading="loading" :data="reports" border stripe max-height="330">
          <el-table-column prop="resource_title" label="资源" min-width="220" show-overflow-tooltip />
          <el-table-column prop="pan" label="网盘" width="80" />
          <el-table-column label="时间" width="145">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="92" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="goReview('reports', row.id)">核验</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>补链审核</h3>
            <p>补链通过后会影响积分奖励和资源恢复。</p>
          </div>
          <el-button link type="primary" @click="goReview('repairs')">查看全部</el-button>
        </div>
        <el-table v-loading="loading" :data="repairs" border stripe max-height="330">
          <el-table-column prop="resource_title" label="资源" min-width="220" show-overflow-tooltip />
          <el-table-column prop="reward_points" label="奖励" width="76" align="center" />
          <el-table-column label="时间" width="145">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="92" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="goReview('repairs', row.id)">审核</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>上传审核</h3>
            <p>审核通过会发首段奖励，并写入正式资源库。</p>
          </div>
          <el-button link type="primary" @click="goReview('uploads')">查看全部</el-button>
        </div>
        <el-table v-loading="loading" :data="uploads" border stripe max-height="330">
          <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
          <el-table-column prop="pan" label="网盘" width="80" />
          <el-table-column label="时间" width="145">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="92" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="goReview('uploads', row.id)">审核</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '@/store'
import {
  cleanupCrawlerBrowsers,
  getNetdiskCrawlerStatus,
  getNetdiskFeedbacks,
  getNetdiskRepairs,
  getNetdiskRiskRecords,
  getNetdiskUploads,
  runNetdiskCrawler,
} from '@/utils/api'

type ModuleKey = 'feedbacks' | 'uploads' | 'repairs' | 'reports' | 'risks'
type TagType = 'success' | 'primary' | 'warning' | 'info' | 'danger'

const router = useRouter()
const adminStore = useAdminStore()
const loading = ref(false)
const feedbacks = ref<any[]>([])
const uploads = ref<any[]>([])
const repairs = ref<any[]>([])
const reports = ref<any[]>([])
const riskRecords = ref<any[]>([])
const crawlerLoading = ref(false)
const runningCrawler = ref('')
const cleaningBrowsers = ref(false)
const crawlers = ref<any[]>([])
const browserGuard = ref({ concurrency: 1, force_cleanup: true, browser_processes: 0, browser_process_limit: 0, browser_stale_seconds: 300 })
const worker = ref<any>({ reachable: false, status: 'unknown', tasks: [], running_tasks: [], blocked_tasks: [], scheduler_jobs: [], recent_runs: [] })
const totals = ref<Record<ModuleKey, number>>({
  feedbacks: 0,
  uploads: 0,
  repairs: 0,
  reports: 0,
  risks: 0,
})

const summaryCards = computed(() => [
  { key: 'risks' as ModuleKey, label: '积分异常', count: totals.value.risks, icon: '!' },
  { key: 'reports' as ModuleKey, label: '资源投诉', count: totals.value.reports, icon: '?' },
  { key: 'repairs' as ModuleKey, label: '补链审核', count: totals.value.repairs, icon: '↗' },
  { key: 'uploads' as ModuleKey, label: '上传审核', count: totals.value.uploads, icon: '+' },
  { key: 'feedbacks' as ModuleKey, label: '用户反馈', count: totals.value.feedbacks, icon: '↵' },
])

const recentRuns = computed(() => worker.value.recent_runs || [])
const hasRunningCrawler = computed(() => (worker.value.running_tasks || []).length > 0)
const browserStaleMinutes = computed(() => Math.max(1, Math.round(Number(browserGuard.value.browser_stale_seconds || 300) / 60)))
const latestFeaturedRun = computed(() => recentRuns.value.find((row: any) => runFeaturedPreview(row).length))
const currentFeaturedPreview = computed(() => runFeaturedPreview(latestFeaturedRun.value || {}))
const latestFeaturedRunTime = computed(() => latestFeaturedRun.value?.finished_at ? `生成于 ${formatTime(latestFeaturedRun.value.finished_at)}` : '等待生成')

const loadAll = async () => {
  loading.value = true
  crawlerLoading.value = true
  try {
    const [feedbackData, uploadData, repairData, reportData, riskData, crawlerData] = await Promise.all([
      getNetdiskFeedbacks({ status: 'pending', page_size: 8 }),
      getNetdiskUploads({ status: 'pending', page_size: 8 }),
      getNetdiskRepairs({ status: 'pending', mode: 'repair', page_size: 8 }),
      getNetdiskRepairs({ status: 'pending', mode: 'report', page_size: 8 }),
      getNetdiskRiskRecords({ status: 'open', page_size: 8 }),
      getNetdiskCrawlerStatus(),
    ])
    feedbacks.value = feedbackData.feedbacks || []
    uploads.value = uploadData.uploads || []
    repairs.value = repairData.repairs || []
    reports.value = reportData.repairs || []
    riskRecords.value = riskData.risk_records || []
    totals.value = {
      feedbacks: Number(feedbackData.total ?? feedbacks.value.length),
      uploads: Number(uploadData.total ?? uploads.value.length),
      repairs: Number(repairData.total ?? repairs.value.length),
      reports: Number(reportData.total ?? reports.value.length),
      risks: Number(riskData.total ?? riskRecords.value.length),
    }
    crawlers.value = crawlerData.crawlers || []
    browserGuard.value = crawlerData.browser_guard || { concurrency: 1, force_cleanup: true, browser_processes: 0, browser_process_limit: 0, browser_stale_seconds: 300 }
    worker.value = crawlerData.worker || { reachable: false, status: 'unknown', tasks: [], running_tasks: [], blocked_tasks: [], scheduler_jobs: [], recent_runs: [] }
    adminStore.setPendingCounts(totals.value)
  } catch (error: any) {
    ElMessage.error(error.message || '待处理数据加载失败，请确认后端服务状态')
  } finally {
    loading.value = false
    crawlerLoading.value = false
  }
}

const runCrawler = async (key: string) => {
  runningCrawler.value = key
  try {
    const result = await runNetdiskCrawler(key)
    ElMessage.success(`同步完成：入库 ${result?.synced ?? result?.auto_published ?? 0} 条`)
    await loadAll()
  } catch (error: any) {
    ElMessage.error(error.message || '采集失败，请稍后重试')
  } finally {
    runningCrawler.value = ''
  }
}

const cleanupBrowsers = async () => {
  if (hasRunningCrawler.value) {
    ElMessage.warning('采集任务运行中，先不要清理浏览器进程')
    return
  }
  cleaningBrowsers.value = true
  try {
    const result = await cleanupCrawlerBrowsers()
    ElMessage.success(`清理完成：${result?.before ?? 0} -> ${result?.after ?? 0}`)
    await loadAll()
  } catch (error: any) {
    ElMessage.error(error.message || '浏览器进程清理失败')
  } finally {
    cleaningBrowsers.value = false
  }
}

const taskStatus = (key: string) => {
  const task = (worker.value.tasks || []).find((item: any) => item.key === key)
  if (!task) return { type: 'info' as TagType, label: '未上报', time: '' }
  if (task.running) return { type: 'warning' as TagType, label: '运行中', time: formatTime(task.last_started_at) }
  if (task.breaker_until && dayjs(task.breaker_until).isAfter(dayjs())) {
    return { type: 'danger' as TagType, label: `熔断 ${task.consecutive_failures || 0}次`, time: formatTime(task.breaker_until) }
  }
  if (task.last_error) return { type: 'danger' as TagType, label: `失败 ${task.consecutive_failures || 0}次`, time: formatTime(task.last_finished_at) }
  if (task.last_success_at) return { type: 'success' as TagType, label: '正常', time: formatTime(task.last_success_at) }
  return { type: 'info' as TagType, label: '待运行', time: '' }
}

const schedulerMatchesCrawler = (jobId: string, key: string) => {
  if (key === 'kdocs_anime') return jobId === 'sync_anime_job'
  if (key === 'linuxdo') return jobId === 'linuxdo_netdisk_12h_sync'
  if (key === 'kdocs_movie' || key === 'kdocs_4k') return jobId === 'sync_movie_4k_job'
  return false
}

const nextRunTime = (key: string) => {
  const job = (worker.value.scheduler_jobs || []).find((item: any) => schedulerMatchesCrawler(item?.id, key))
  return job?.next_run_time ? formatTime(job.next_run_time) : '-'
}

const crawlerName = (key: string) => ({
  kdocs_anime: '影视剧',
  kdocs_movie: '电影',
  kdocs_4k: '4K影视',
  linuxdo: 'LinuxDo',
}[key] || key)

const triggerSourceText = (value: string) => ({
  manual: '手动',
  schedule: '定时',
}[value] || value || '-')

const runStatusText = (value: string) => ({
  success: '成功',
  failed: '失败',
  timeout: '超时',
}[value] || value || '-')

const runStatusType = (value: string): TagType => {
  if (value === 'success') return 'success'
  if (value === 'timeout') return 'warning'
  if (value === 'failed') return 'danger'
  return 'info'
}

const goModule = (key: ModuleKey) => {
  if (key === 'feedbacks') goFeedbacks()
  if (key === 'uploads') goReview('uploads')
  if (key === 'repairs') goReview('repairs')
  if (key === 'reports') goReview('reports')
  if (key === 'risks') goRisks()
}

const goReview = (tab: 'uploads' | 'repairs' | 'reports', id = '') => {
  const params = new URLSearchParams({ tab })
  if (id) params.set(tab === 'uploads' ? 'upload_id' : 'repair_id', id)
  router.push(`/review?${params.toString()}`)
}

const goFeedbacks = (id = '') => {
  router.push(id ? `/feedbacks?feedback_id=${id}` : '/feedbacks')
}

const goRisks = () => router.push('/risks')
const goLogs = () => router.push('/logs')
const goCollectedResources = () => router.push('/collected-resources')

const formatTime = (time: string) => (time ? dayjs(time).format('MM-DD HH:mm') : '-')
const formatDuration = (seconds: number) => `${Number(seconds || 0)}s`
const shortId = (value: string) => `#${String(value || '').replace(/-/g, '').slice(-6).toUpperCase()}`
const previewText = (value: string) => String(value || '').replace(/\s+/g, ' ').slice(0, 90)
const runSummary = (row: any) => {
  if (row.status !== 'success') return row.error_text || '执行失败'
  const parts = []
  if (Number(row.synced_count || 0)) parts.push(`入库 ${row.synced_count}`)
  if (Number(row.auto_published_count || 0)) parts.push(`自动发布 ${row.auto_published_count}`)
  if (Number(row.review_required_count || 0)) parts.push(`待审核 ${row.review_required_count}`)
  if (Number(row.netdisk_inactive_count || 0)) parts.push(`资源失效 ${row.netdisk_inactive_count}`)
  if (Number(row.inactive_count || 0)) parts.push(`源失效 ${row.inactive_count}`)
  return parts.join('，') || '执行成功'
}
const runFeaturedPreview = (row: any) => {
  const list = row?.result_payload?.featured_preview
  return Array.isArray(list) ? list.slice(0, 3) : []
}

const feedbackTypeText = (value: string) => {
  if (value === 'points') return '积分'
  if (value === 'feature') return '建议'
  return '资源'
}

const feedbackTag = (value: string) => {
  if (value === 'points') return 'warning'
  if (value === 'feature') return 'info'
  return 'success'
}

const feedbackStatusText = (value: string) => {
  if (value === 'processing') return '处理中'
  if (value === 'resolved') return '已解决'
  if (value === 'rejected') return '已关闭'
  return '待处理'
}

const feedbackStatusTag = (value: string) => {
  if (value === 'processing') return 'warning'
  if (value === 'resolved') return 'success'
  if (value === 'rejected') return 'info'
  return 'danger'
}

const reasonText = (value: string) => ({
  upload_reward_invalid: '上传确认失效',
  repair_reward_invalid: '补链确认失效',
  resource_invalid_pending_penalty: '资源失效待处罚',
  upload_reward_rejected: '上传拒绝扣回',
  repair_reward_rejected: '补链拒绝扣回',
}[value] || value || '-')

onMounted(loadAll)
</script>

<style scoped>
.page {
  padding: 18px;
  background: #f6f8fb;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.header h2 {
  margin: 0;
  color: #172033;
  font-size: 22px;
}

.header p {
  margin: 6px 0 0;
  color: #697386;
  font-size: 13px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.summary-card:hover {
  border-color: #0f766e;
  box-shadow: 0 10px 24px rgba(15, 118, 110, 0.08);
}

.summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: #e7f7f3;
  color: #0f766e;
  font-size: 22px;
  font-weight: 800;
}

.summary-card.risks .summary-icon {
  background: #fff1f0;
  color: #c2410c;
}

.summary-card.reports .summary-icon {
  background: #fff7e6;
  color: #b45309;
}

.summary-value {
  color: #172033;
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

.summary-label {
  margin-top: 6px;
  color: #697386;
  font-size: 13px;
}

.notice {
  margin-bottom: 14px;
}

.crawler-panel {
  margin-bottom: 14px;
}

.crawler-head-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.featured-preview-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.featured-preview-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.35;
}

.featured-preview-item strong {
  color: #1f2937;
  font-size: 13px;
  font-weight: 700;
}

.featured-preview-item span,
.muted {
  color: #6b7280;
  font-size: 12px;
}

.worker-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  background: #f8fafc;
}

.worker-strip strong {
  display: block;
  margin-top: 4px;
  color: #172033;
  font-size: 13px;
}

.strip-label {
  color: #697386;
  font-size: 12px;
}

.worker-error {
  grid-column: 1 / -1;
  color: #c2410c;
  font-size: 12px;
}

.current-featured-card {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #d6f1e8;
  border-radius: 10px;
  background: linear-gradient(135deg, #f7fffc, #ecfdf5);
}

.current-featured-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.current-featured-head strong {
  display: block;
  margin-top: 4px;
  color: #065f46;
  font-size: 15px;
}

.current-featured-head > span {
  color: #6b7280;
  font-size: 12px;
  white-space: nowrap;
}

.current-featured-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.current-featured-item {
  display: flex;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(6, 95, 70, .08);
}

.current-featured-item em {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #10b981;
  color: #fff;
  font-style: normal;
  font-size: 12px;
  font-weight: 700;
  line-height: 22px;
  text-align: center;
}

.current-featured-item div {
  min-width: 0;
}

.current-featured-item strong {
  display: block;
  overflow: hidden;
  color: #111827;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-featured-item span {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.task-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #697386;
  font-size: 12px;
}

.run-history {
  margin-top: 16px;
}

.panel-head.slim {
  margin-bottom: 10px;
}

.columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.panel {
  min-width: 0;
  padding: 16px;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  background: #fff;
}

.panel-wide {
  grid-column: 1 / -1;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel h3 {
  margin: 0;
  color: #172033;
  font-size: 17px;
}

.panel p {
  margin: 5px 0 0;
  color: #697386;
  font-size: 13px;
}

.ticket-list {
  min-height: 240px;
}

.ticket-item {
  padding: 13px 0;
  border-top: 1px solid #edf1f5;
}

.ticket-item:first-child {
  border-top: 0;
}

.ticket-main,
.ticket-foot {
  display: flex;
  align-items: center;
  gap: 9px;
}

.ticket-main strong {
  color: #25324b;
  font-size: 13px;
}

.ticket-item p {
  margin: 9px 0;
  color: #25324b;
  line-height: 1.45;
}

.ticket-foot {
  justify-content: space-between;
  color: #697386;
  font-size: 12px;
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .columns {
    grid-template-columns: 1fr;
  }
}
</style>
