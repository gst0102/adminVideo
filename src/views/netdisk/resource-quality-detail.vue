<template>
  <div class="quality-detail">
    <div class="toolbar">
      <el-button @click="router.back()">返回</el-button>
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
      <el-button :loading="refreshingStats" @click="refreshStats">刷新统计</el-button>
      <el-button @click="router.push('/review?tab=reports')">去投诉审核</el-button>
      <el-button v-if="detail?.resource && !detail.resource.is_active" type="success" :loading="actionLoading" :disabled="!isSupervisor" @click="restoreResource">恢复上架</el-button>
    </div>

    <section class="panel">
      <div class="section-head">
        <div>
          <h2>{{ detail?.resource?.title || '资源质量详情' }}</h2>
          <p>{{ detail?.resource?.category }} · {{ detail?.resource?.pan }} · {{ levelText(detail?.resource?.level) }}</p>
        </div>
        <el-tag :type="detail?.resource?.is_active ? 'success' : 'warning'">
          {{ detail?.resource?.is_active ? '上架' : '隐藏' }}
        </el-tag>
      </div>

      <div class="metric-grid">
        <div class="metric">
          <span>投诉</span>
          <strong>{{ n(detail?.stats?.reports) }}</strong>
          <small>24h {{ n(detail?.stats?.recent_reports_24h) }}</small>
        </div>
        <div class="metric">
          <span>恢复</span>
          <strong>{{ n(detail?.stats?.restores) }}</strong>
          <small>{{ shortTime(detail?.stats?.last_restore_at) }}</small>
        </div>
        <div class="metric">
          <span>解锁</span>
          <strong>{{ n(detail?.stats?.unlocks) }}</strong>
          <small>{{ n(detail?.stats?.unlock_users) }} 个用户</small>
        </div>
        <div class="metric">
          <span>24h解锁</span>
          <strong>{{ n(detail?.stats?.recent_unlocks_24h) }}</strong>
          <small>{{ shortTime(detail?.stats?.last_unlock_at) }}</small>
        </div>
        <div class="metric warning">
          <span>关注度</span>
          <strong>{{ n(detail?.stats?.score) }}</strong>
          <small>投诉权重最高</small>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>质量预警处理</h2>
        <span>已处理或忽略后不再反复出现在看板待处理</span>
      </div>
      <el-table v-loading="loading" :data="detail?.alerts || []" border stripe>
        <el-table-column prop="last_triggered_at" label="触发时间" width="160">
          <template #default="{ row }">{{ formatTime(row.last_triggered_at) }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="140">
          <template #default="{ row }">{{ alertTypeText(row.type) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="alertStatusType(row.status)">{{ alertStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="说明" min-width="260" show-overflow-tooltip />
        <el-table-column prop="note" label="处理备注" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'open'" type="primary" link @click="handleAlert(row, 'read')">已读</el-button>
            <el-button v-if="['open', 'read'].includes(row.status)" type="success" link :disabled="!isSupervisor" @click="handleAlert(row, 'resolve')">已处理</el-button>
            <el-button v-if="['open', 'read'].includes(row.status)" type="warning" link :disabled="!isSupervisor" @click="handleAlert(row, 'ignore')">忽略</el-button>
            <el-button v-if="['resolved', 'ignored'].includes(row.status)" type="primary" link @click="handleAlert(row, 'reopen')">重开</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>7 日质量趋势</h2>
        <span>判断是偶发还是持续恶化</span>
      </div>
      <el-table v-loading="loading" :data="detail?.trends || []" border stripe>
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="reports" label="投诉" width="90" align="center" />
        <el-table-column prop="unlocks" label="解锁" width="90" align="center" />
        <el-table-column prop="unlock_users" label="解锁用户" width="100" align="center" />
        <el-table-column prop="restores" label="恢复" width="90" align="center" />
        <el-table-column prop="score" label="关注度" min-width="180">
          <template #default="{ row }">
            <div class="bar-line">
              <span>{{ n(row.score) }}</span>
              <i :style="{ width: trendWidth(row.score) }" />
            </div>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>投诉记录</h2>
        <span>{{ n(detail?.reports?.length) }} 条</span>
      </div>
      <el-table v-loading="loading" :data="detail?.reports || []" border stripe>
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'danger' : 'info'">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="投诉说明" min-width="260" show-overflow-tooltip />
        <el-table-column prop="audit_note" label="处理备注" min-width="220" show-overflow-tooltip />
        <el-table-column prop="user_id" label="用户ID" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="router.push(`/review?tab=reports&repair_id=${row.id}`)">定位审核</el-button>
            <el-button v-if="row.status === 'pending'" type="warning" link :disabled="!isSupervisor" @click="reviewReport(row, 'confirm-invalid')">确认失效</el-button>
            <el-button v-if="row.status === 'pending'" type="primary" link @click="reviewReport(row, 'reject')">撤销</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>恢复记录</h2>
        <span>{{ n(detail?.restore_logs?.length) }} 条</span>
      </div>
      <el-table v-loading="loading" :data="detail?.restore_logs || []" border stripe>
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="admin_name" label="管理员" width="110" />
        <el-table-column prop="note" label="备注" min-width="280" show-overflow-tooltip />
      </el-table>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>最近解锁</h2>
        <span>展示最近 30 条流水，不新增扣分</span>
      </div>
      <el-table v-loading="loading" :data="detail?.unlocks || []" border stripe>
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="user_id" label="用户ID" min-width="220" show-overflow-tooltip />
        <el-table-column prop="points_delta" label="积分" width="90" align="center" />
        <el-table-column prop="remark" label="备注" min-width="260" show-overflow-tooltip />
      </el-table>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>系统自动处理</h2>
        <span>达到投诉阈值后的自动下架、扣分和待追缴记录</span>
      </div>
      <el-alert
        v-if="systemAutoLogs.length === 0"
        type="info"
        :closable="false"
        title="暂无系统自动处理记录"
        show-icon
      />
      <el-timeline v-else class="system-timeline">
        <el-timeline-item
          v-for="item in systemAutoLogs"
          :key="item.id || `${item.action}-${item.created_at}`"
          type="warning"
          :timestamp="formatTime(item.created_at)"
          placement="top"
        >
          <div class="system-log-card">
            <div class="system-log-head">
              <strong>{{ actionText(item.action) }}</strong>
              <el-tag type="warning" effect="dark">system</el-tag>
            </div>
            <p>{{ item.note || '系统已按资源投诉规则自动处理。' }}</p>
          </div>
        </el-timeline-item>
      </el-timeline>
    </section>

    <section class="panel">
      <div class="section-head">
        <h2>最近处理日志</h2>
        <span>资源和投诉相关日志</span>
      </div>
      <el-table v-loading="loading" :data="detail?.recent_logs || []" border stripe>
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column prop="admin_name" label="管理员" width="110" />
        <el-table-column prop="action" label="动作" width="150">
          <template #default="{ row }">{{ actionText(row.action) }}</template>
        </el-table-column>
        <el-table-column prop="target_title" label="对象" min-width="220" show-overflow-tooltip />
        <el-table-column prop="note" label="备注" min-width="260" show-overflow-tooltip />
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminStore } from '@/store'
import {
  getNetdiskResourceQualityDetail,
  handleNetdiskQualityAlert,
  refreshNetdiskQualityStats,
  restoreNetdiskResource,
  reviewNetdiskRepair,
} from '@/utils/api'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()
const loading = ref(false)
const actionLoading = ref(false)
const refreshingStats = ref(false)
const detail = ref<any>(null)
const isSupervisor = computed(() => ['admin', 'supervisor'].includes(adminStore.role))

const n = (value: any) => Number(value || 0).toLocaleString()
const formatTime = (time?: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')
const shortTime = (time?: string) => (time ? dayjs(time).format('MM-DD HH:mm') : '暂无')
const levelText = (value?: string) => ({ normal: '普通', featured: '精选', official: '官方' }[value || ''] || value || '-')
const statusText = (value: string) => ({ pending: '待核验', approved: '已确认', rejected: '已撤销' }[value] || value)
const alertTypeText = (value: string) => ({ high_report: '高投诉', unlock_report_burst: '高解锁高投诉' }[value] || value)
const alertStatusText = (value: string) => ({ open: '待处理', read: '已读', resolved: '已处理', ignored: '已忽略' }[value] || value)
type TagType = 'success' | 'primary' | 'warning' | 'info' | 'danger'
const alertStatusType = (value: string): TagType => ({ open: 'danger', read: 'warning', resolved: 'success', ignored: 'info' }[value] || 'info') as TagType
const systemAutoLogs = computed(() => (detail.value?.recent_logs || []).filter((item: any) => item.admin_name === 'system' || item.action === 'resource_auto_confirm_invalid'))
const actionText = (value: string) => ({
  report_confirm: '投诉确认',
  report_reject: '投诉撤销',
  resource_auto_confirm_invalid: '系统自动确认失效',
  resource_restore: '恢复上架',
  resource_quality_confirm_invalid: '资源质量确认失效',
  resource_quality_keep_hidden: '资源质量继续隐藏',
  upload_confirm_invalid: '上传失效',
  repair_confirm_invalid: '补链失效',
}[value] || value)
const trendMax = () => Math.max(...(detail.value?.trends || []).map((item: any) => Number(item.score || 0)), 1)
const trendWidth = (value: number) => `${Math.max(6, Math.round((Number(value || 0) / trendMax()) * 100))}%`

const loadData = async () => {
  loading.value = true
  try {
    detail.value = await getNetdiskResourceQualityDetail(String(route.params.id))
  } catch (error: any) {
    ElMessage.error(error.message || '资源质量详情加载失败')
  } finally {
    loading.value = false
  }
}

const refreshStats = async () => {
  refreshingStats.value = true
  try {
    await refreshNetdiskQualityStats()
    ElMessage.success('质量统计已刷新')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '刷新统计失败')
  } finally {
    refreshingStats.value = false
  }
}

const restoreResource = async () => {
  if (!detail.value?.resource) return
  if (!isSupervisor.value) {
    ElMessage.warning('普通运营不能恢复上架，请主管处理')
    return
  }
  await ElMessageBox.confirm(`确认恢复上架「${detail.value.resource.title}」？`, '恢复上架', { type: 'warning' })
  actionLoading.value = true
  try {
    await restoreNetdiskResource(detail.value.resource.id, '资源质量详情页恢复上架')
    ElMessage.success('资源已恢复')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '恢复失败')
  } finally {
    actionLoading.value = false
  }
}

const reviewReport = async (row: any, action: 'confirm-invalid' | 'reject') => {
  const label = action === 'confirm-invalid' ? '确认失效' : '撤销投诉'
  if (action === 'confirm-invalid' && !isSupervisor.value) {
    ElMessage.warning('普通运营不能确认失效，请主管处理')
    return
  }
  await ElMessageBox.confirm(`确认对这条投诉执行「${label}」？`, label, { type: 'warning' })
  actionLoading.value = true
  try {
    await reviewNetdiskRepair(row.id, action, `资源质量详情页${label}`)
    ElMessage.success('处理完成')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '处理失败')
  } finally {
    actionLoading.value = false
  }
}

const handleAlert = async (row: any, action: 'read' | 'resolve' | 'ignore' | 'reopen') => {
  const label = ({ read: '标记已读', resolve: '标记已处理', ignore: '忽略预警', reopen: '重新打开' }[action])
  if (['resolve', 'ignore'].includes(action) && !isSupervisor.value) {
    ElMessage.warning('普通运营只能标记已读，请主管处理高风险动作')
    return
  }
  const note = action === 'read' ? '' : `${label}：资源质量详情页处理`
  await handleNetdiskQualityAlert(row.id, action, note)
  ElMessage.success(label)
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
.quality-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.toolbar {
  display: flex;
  gap: 12px;
}

.panel {
  padding: 18px;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-head h2 {
  margin: 0;
  color: #172033;
  font-size: 18px;
}

.section-head p,
.section-head span {
  margin: 6px 0 0;
  color: #697386;
  font-size: 13px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.metric {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #dfe7ef;
  border-radius: 8px;
}

.metric span,
.metric small {
  color: #697386;
  font-size: 13px;
}

.metric strong {
  display: block;
  margin: 8px 0;
  color: #0f766e;
  font-size: 28px;
}

.metric.warning strong {
  color: #b45309;
}

.bar-line {
  display: grid;
  grid-template-columns: 64px 1fr;
  align-items: center;
  gap: 10px;
}

.bar-line span {
  color: #344054;
  font-variant-numeric: tabular-nums;
}

.bar-line i {
  display: block;
  height: 8px;
  background: #0f766e;
  border-radius: 999px;
}

.system-timeline {
  margin-top: 6px;
}

.system-log-card {
  padding: 12px 14px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
}

.system-log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.system-log-head strong {
  color: #9a3412;
}

.system-log-card p {
  margin: 8px 0 0;
  color: #7c2d12;
  line-height: 1.55;
}

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
