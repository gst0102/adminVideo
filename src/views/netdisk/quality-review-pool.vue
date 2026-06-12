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
        <el-button type="success" :disabled="!selectedIds.length" @click="batchHandle('resolve')">批量已处理</el-button>
        <el-button type="warning" :disabled="!selectedIds.length" @click="batchHandle('ignore')">批量忽略</el-button>
      </div>
    </div>

    <div class="summary">
      <span>待复核 {{ n(total) }} 条</span>
      <span>已选 {{ selectedIds.length }} 条</span>
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
          <el-button type="primary" link @click="router.push(`/resource-quality/${row.resource_id}`)">详情</el-button>
          <el-button v-if="row.status === 'open'" type="primary" link @click="handleAlert(row, 'read')">已读</el-button>
          <el-button type="success" link @click="handleAlert(row, 'resolve')">已处理</el-button>
          <el-button type="warning" link @click="handleAlert(row, 'ignore')">忽略</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  batchHandleNetdiskQualityAlerts,
  getNetdiskQualityReviewPool,
  handleNetdiskQualityAlert,
} from '@/utils/api'

const router = useRouter()
const loading = ref(false)
const alerts = ref<any[]>([])
const total = ref(0)
const selection = ref<any[]>([])
const selectedIds = computed(() => selection.value.map(item => item.id))

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
    const confirmed = await confirmDangerAction(label, selectedIds.value.length)
    if (!confirmed) return
  }
  const data = await batchHandleNetdiskQualityAlerts(selectedIds.value, action, `${label}：待复核池处理`)
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
</style>
