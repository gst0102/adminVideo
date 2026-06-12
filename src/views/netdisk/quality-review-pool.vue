<template>
  <div class="page">
    <div class="header">
      <div>
        <h2>待复核池</h2>
        <p>集中处理自动进入待复核的高风险资源，已处理或忽略后会移出这里。</p>
      </div>
      <div class="actions">
        <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
        <el-button :disabled="!selectedIds.length" @click="batchHandle('read')">批量已读</el-button>
        <el-button type="success" :disabled="!selectedIds.length || !isSupervisor" @click="batchHandle('resolve')">批量已处理</el-button>
        <el-button type="warning" :disabled="!selectedIds.length || !isSupervisor" @click="batchHandle('ignore')">批量忽略</el-button>
      </div>
    </div>

    <div class="summary">
      <span>待复核 {{ n(total) }} 条</span>
      <span>已选 {{ selectedIds.length }} 条</span>
      <el-tag :type="isSupervisor ? 'success' : 'info'" effect="plain">
        {{ isSupervisor ? '主管权限' : '普通运营：仅可标记已读' }}
      </el-tag>
    </div>

    <el-table v-loading="loading" :data="alerts" border stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="48" />
      <el-table-column prop="last_triggered_at" label="触发时间" width="160">
        <template #default="{ row }">{{ formatTime(row.last_triggered_at) }}</template>
      </el-table-column>
      <el-table-column prop="type" label="风险类型" width="150">
        <template #default="{ row }">
          <el-tag :type="row.level === 'danger' ? 'danger' : 'warning'">{{ alertTypeText(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="复核状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'open' ? 'danger' : 'warning'">{{ alertStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="资源" min-width="260" show-overflow-tooltip />
      <el-table-column prop="message" label="进入原因" min-width="300" show-overflow-tooltip />
      <el-table-column prop="note" label="处理备注" min-width="240" show-overflow-tooltip />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="openDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'open'" type="primary" link @click="handleAlert(row, 'read')">已读</el-button>
          <el-button type="success" link :disabled="!isSupervisor" @click="handleAlert(row, 'resolve')">已处理</el-button>
          <el-button type="warning" link :disabled="!isSupervisor" @click="handleAlert(row, 'ignore')">忽略</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="detailDrawer.visible" size="62%" :title="detail?.resource?.title || '预警详情'">
      <div v-loading="detailDrawer.loading" class="drawer-body">
        <section class="drawer-actions">
          <el-button @click="router.push(`/resource-quality/${detail?.resource?.id}`)">打开完整详情</el-button>
          <el-button type="success" :disabled="!isSupervisor || !detailAlert" @click="resolveWithResult('restore')">恢复上架</el-button>
          <el-button type="danger" :disabled="!isSupervisor || !detailAlert" @click="resolveWithResult('confirm_invalid')">确认失效</el-button>
          <el-button type="warning" :disabled="!isSupervisor || !detailAlert" @click="resolveWithResult('keep_hidden')">继续隐藏</el-button>
        </section>

        <section class="metric-grid">
          <div class="metric">
            <span>投诉</span>
            <strong>{{ n(detail?.stats?.reports) }}</strong>
            <small>24h {{ n(detail?.stats?.recent_reports_24h) }}</small>
          </div>
          <div class="metric">
            <span>解锁</span>
            <strong>{{ n(detail?.stats?.unlocks) }}</strong>
            <small>{{ n(detail?.stats?.unlock_users) }} 个用户</small>
          </div>
          <div class="metric">
            <span>24h 解锁</span>
            <strong>{{ n(detail?.stats?.recent_unlocks_24h) }}</strong>
            <small>{{ detail?.resource?.is_active ? '当前上架' : '当前隐藏' }}</small>
          </div>
        </section>

        <h3>投诉记录</h3>
        <el-table :data="detail?.reports || []" border stripe>
          <el-table-column prop="created_at" label="时间" width="150">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100" />
          <el-table-column prop="note" label="投诉说明" min-width="220" show-overflow-tooltip />
        </el-table>

        <h3>最近解锁</h3>
        <el-table :data="detail?.unlocks || []" border stripe>
          <el-table-column prop="created_at" label="时间" width="150">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column prop="user_id" label="用户ID" min-width="220" show-overflow-tooltip />
          <el-table-column prop="points_delta" label="积分" width="80" align="center" />
        </el-table>

        <h3>最近处理日志</h3>
        <el-table :data="detail?.recent_logs || []" border stripe>
          <el-table-column prop="created_at" label="时间" width="150">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column prop="admin_name" label="管理员" width="110" />
          <el-table-column prop="action" label="动作" width="150" />
          <el-table-column prop="note" label="备注" min-width="240" show-overflow-tooltip />
        </el-table>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAdminStore } from '@/store'
import {
  batchHandleNetdiskQualityAlerts,
  getNetdiskResourceQualityDetail,
  getNetdiskQualityReviewPool,
  handleNetdiskQualityAlert,
  resolveNetdiskQualityAlertWithAction,
} from '@/utils/api'

const router = useRouter()
const adminStore = useAdminStore()
const loading = ref(false)
const alerts = ref<any[]>([])
const total = ref(0)
const selection = ref<any[]>([])
const selectedIds = computed(() => selection.value.map(item => item.id))
const isSupervisor = computed(() => ['admin', 'supervisor'].includes(adminStore.role))
const detailDrawer = ref({ visible: false, loading: false })
const detail = ref<any>(null)
const detailAlert = ref<any>(null)

const n = (value: any) => Number(value || 0).toLocaleString()
const formatTime = (time?: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')
const alertTypeText = (value: string) => ({ high_report: '高投诉', unlock_report_burst: '高解锁高投诉' }[value] || value)
const alertStatusText = (value: string) => ({ open: '待复核', read: '已读待处理' }[value] || value)

const loadData = async () => {
  loading.value = true
  try {
    const data = await getNetdiskQualityReviewPool({ page_size: 100 })
    alerts.value = data.alerts || []
    total.value = data.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '待复核池加载失败')
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (rows: any[]) => {
  selection.value = rows
}

const confirmDangerAction = async (label: string, count: number) => {
  try {
    await ElMessageBox.confirm(
      `${label}会将 ${count} 条资源移出待复核池。请确认已经完成核验，避免误放过高风险资源。`,
      `${label}确认`,
      {
        confirmButtonText: '确认执行',
        cancelButtonText: '再检查一下',
        type: 'warning',
      },
    )
    return true
  } catch {
    return false
  }
}

const handleAlert = async (row: any, action: 'read' | 'resolve' | 'ignore') => {
  const label = ({ read: '标记已读', resolve: '标记已处理', ignore: '忽略预警' }[action])
  if (action !== 'read') {
    if (!isSupervisor.value) {
      ElMessage.warning('普通运营只能标记已读，请主管处理高风险动作')
      return
    }
    const confirmed = await confirmDangerAction(label, 1)
    if (!confirmed) return
  }
  await handleNetdiskQualityAlert(row.id, action, `${label}：待复核池处理`)
  ElMessage.success(label)
  await loadData()
}

const batchHandle = async (action: 'read' | 'resolve' | 'ignore') => {
  if (!selectedIds.value.length) return
  const label = ({ read: '批量已读', resolve: '批量已处理', ignore: '批量忽略' }[action])
  if (action !== 'read') {
    if (!isSupervisor.value) {
      ElMessage.warning('普通运营只能批量已读，请主管处理高风险动作')
      return
    }
    const confirmed = await confirmDangerAction(label, selectedIds.value.length)
    if (!confirmed) return
  }
  const data = await batchHandleNetdiskQualityAlerts(selectedIds.value, action, `${label}：待复核池处理`)
  ElMessage.success(`${label} ${data.handled || 0} 条`)
  selection.value = []
  await loadData()
}

const openDetail = async (row: any) => {
  detailAlert.value = row
  detailDrawer.value.visible = true
  detailDrawer.value.loading = true
  try {
    detail.value = await getNetdiskResourceQualityDetail(row.resource_id)
  } catch (error: any) {
    ElMessage.error(error.message || '预警详情加载失败')
  } finally {
    detailDrawer.value.loading = false
  }
}

const resolveWithResult = async (resultAction: 'restore' | 'confirm_invalid' | 'keep_hidden') => {
  if (!detailAlert.value) return
  if (!isSupervisor.value) {
    ElMessage.warning('普通运营不能执行复核结果处理')
    return
  }
  const label = ({ restore: '恢复上架', confirm_invalid: '确认失效', keep_hidden: '继续隐藏' }[resultAction])
  const confirmed = await confirmDangerAction(label, 1)
  if (!confirmed) return
  await resolveNetdiskQualityAlertWithAction(detailAlert.value.id, resultAction, `${label}：待复核池详情抽屉处理`)
  ElMessage.success(`${label}完成`)
  detailDrawer.value.visible = false
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page {
  padding: 18px;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
}

.header,
.actions,
.summary {
  display: flex;
  align-items: center;
}

.header {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.header h2 {
  margin: 0 0 6px;
  color: #10201d;
  font-size: 20px;
}

.header p,
.summary {
  margin: 0;
  color: #697386;
  font-size: 13px;
}

.actions,
.summary {
  gap: 10px;
}

.summary {
  margin-bottom: 14px;
}

.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drawer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
  font-size: 26px;
}

.drawer-body h3 {
  margin: 6px 0 -6px;
  color: #172033;
  font-size: 16px;
}
</style>
