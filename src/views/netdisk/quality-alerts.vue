<template>
  <div class="page">
    <section class="runtime">
      <div>
        <span>统计任务</span>
        <strong>{{ runtime.status === 'success' ? '正常' : runtime.status === 'failed' ? '失败' : '暂无记录' }}</strong>
        <small>上次刷新：{{ formatTime(runtime.last_finished_at) }}</small>
      </div>
      <div>
        <span>刷新行数</span>
        <strong>{{ n(runtime.last_rows) }}</strong>
        <small>耗时 {{ n(runtime.duration_ms) }} ms</small>
      </div>
      <div>
        <span>定时计划</span>
        <strong>{{ runtime.schedule?.enabled === false ? '关闭' : '开启' }}</strong>
        <small>{{ runtime.schedule ? `${runtime.schedule.hour}:${pad(runtime.schedule.minute)}` : '-' }}</small>
      </div>
      <el-alert v-if="runtime.last_error" type="error" :title="runtime.last_error" show-icon :closable="false" />
    </section>

    <div class="toolbar">
      <el-select v-model="filters.status" clearable placeholder="预警状态" style="width: 160px" @change="loadData">
        <el-option label="待处理" value="open" />
        <el-option label="已读" value="read" />
        <el-option label="已处理" value="resolved" />
        <el-option label="已忽略" value="ignored" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
      <el-button :loading="refreshing" @click="refreshStats">刷新统计</el-button>
      <el-button :disabled="!selectedIds.length" @click="batchHandle('read')">批量已读</el-button>
      <el-button type="success" :disabled="!selectedIds.length" @click="batchHandle('resolve')">批量已处理</el-button>
      <el-button type="warning" :disabled="!selectedIds.length" @click="batchHandle('ignore')">批量忽略</el-button>
      <span class="selected-count">已选 {{ selectedIds.length }} 条</span>
    </div>

    <el-table v-loading="loading" :data="alerts" border stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="48" />
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
      <el-table-column prop="title" label="资源" min-width="240" show-overflow-tooltip />
      <el-table-column prop="message" label="说明" min-width="280" show-overflow-tooltip />
      <el-table-column prop="note" label="处理备注" min-width="240" show-overflow-tooltip />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="router.push(`/resource-quality/${row.resource_id}`)">详情</el-button>
          <el-button v-if="row.status === 'open'" type="primary" link @click="handleAlert(row, 'read')">已读</el-button>
          <el-button v-if="['open', 'read'].includes(row.status)" type="success" link @click="handleAlert(row, 'resolve')">已处理</el-button>
          <el-button v-if="['open', 'read'].includes(row.status)" type="warning" link @click="handleAlert(row, 'ignore')">忽略</el-button>
          <el-button v-if="['resolved', 'ignored'].includes(row.status)" type="primary" link @click="handleAlert(row, 'reopen')">重开</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import {
  batchHandleNetdiskQualityAlerts,
  getNetdiskQualityAlerts,
  getNetdiskQualityStatsRuntime,
  handleNetdiskQualityAlert,
  refreshNetdiskQualityStats,
} from '@/utils/api'

const router = useRouter()
const loading = ref(false)
const refreshing = ref(false)
const alerts = ref<any[]>([])
const selection = ref<any[]>([])
const runtime = ref<any>({})
const filters = reactive({ status: 'open' })
const selectedIds = computed(() => selection.value.map(item => item.id))

const n = (value: any) => Number(value || 0).toLocaleString()
const pad = (value: any) => String(value ?? 0).padStart(2, '0')
const formatTime = (time?: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')
const alertTypeText = (value: string) => ({ high_report: '高投诉', unlock_report_burst: '高解锁高投诉' }[value] || value)
const alertStatusText = (value: string) => ({ open: '待处理', read: '已读', resolved: '已处理', ignored: '已忽略' }[value] || value)
type TagType = 'success' | 'primary' | 'warning' | 'info' | 'danger'
const alertStatusType = (value: string): TagType => ({ open: 'danger', read: 'warning', resolved: 'success', ignored: 'info' }[value] || 'info') as TagType

const loadRuntime = async () => {
  runtime.value = await getNetdiskQualityStatsRuntime()
}

const loadData = async () => {
  loading.value = true
  try {
    await loadRuntime()
    const data = await getNetdiskQualityAlerts({ status: filters.status || undefined, page_size: 100 })
    alerts.value = data.alerts || []
  } catch (error: any) {
    ElMessage.error(error.message || '质量预警加载失败')
  } finally {
    loading.value = false
  }
}

const refreshStats = async () => {
  refreshing.value = true
  try {
    await refreshNetdiskQualityStats()
    ElMessage.success('质量统计已刷新')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '刷新统计失败')
  } finally {
    refreshing.value = false
  }
}

const handleAlert = async (row: any, action: 'read' | 'resolve' | 'ignore' | 'reopen') => {
  const label = ({ read: '标记已读', resolve: '标记已处理', ignore: '忽略预警', reopen: '重新打开' }[action])
  await handleNetdiskQualityAlert(row.id, action, `${label}：质量预警列表页处理`)
  ElMessage.success(label)
  await loadData()
}

const handleSelectionChange = (rows: any[]) => {
  selection.value = rows
}

const batchHandle = async (action: 'read' | 'resolve' | 'ignore') => {
  if (!selectedIds.value.length) return
  const label = ({ read: '批量已读', resolve: '批量已处理', ignore: '批量忽略' }[action])
  const data = await batchHandleNetdiskQualityAlerts(selectedIds.value, action, `${label}：质量预警列表页处理`)
  ElMessage.success(`${label} ${data.handled || 0} 条`)
  selection.value = []
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

.runtime {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) 1.5fr;
  gap: 12px;
  margin-bottom: 16px;
}

.runtime > div,
.runtime :deep(.el-alert) {
  min-height: 78px;
}

.runtime > div {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #dfe7ef;
  border-radius: 8px;
}

.runtime span,
.runtime small {
  color: #697386;
  font-size: 13px;
}

.runtime strong {
  display: block;
  margin: 8px 0;
  color: #0f766e;
  font-size: 24px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.selected-count {
  color: #697386;
  font-size: 13px;
}
</style>
