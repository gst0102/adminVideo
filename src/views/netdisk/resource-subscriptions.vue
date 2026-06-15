<template>
  <div class="page">
    <div class="summary-row">
      <el-tag type="info" effect="plain">订阅 {{ n(subscriptionStats.total) }}</el-tag>
      <el-tag type="success" effect="plain">活跃 {{ n(subscriptionStats.active) }}</el-tag>
      <el-tag type="warning" effect="plain">待推送授权 {{ n(subscriptionStats.accepted) }}</el-tag>
      <el-tag type="info" effect="plain">已推送 {{ n(subscriptionStats.sent) }}</el-tag>
      <el-tag type="danger" effect="plain">失败记录 {{ n(logStats.failed) }}</el-tag>
    </div>

    <div class="toolbar">
      <el-input v-model="filters.keyword" clearable placeholder="搜索资源标题 / 用户 / openid" style="width: 320px" @keyup.enter="loadSubscriptions" />
      <el-select v-model="filters.status" clearable placeholder="订阅状态" style="width: 150px" @change="loadSubscriptions">
        <el-option label="全部" value="all" />
        <el-option label="活跃" value="active" />
        <el-option label="关闭" value="inactive" />
      </el-select>
      <el-select v-model="filters.wx_subscribe_status" clearable placeholder="微信授权状态" style="width: 170px" @change="loadSubscriptions">
        <el-option label="全部" value="all" />
        <el-option label="待推送" value="accept" />
        <el-option label="已推送" value="sent" />
        <el-option label="未授权" value="reject" />
        <el-option label="未知" value="unknown" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="loadSubscriptions">查询订阅</el-button>
      <el-button :loading="logLoading" @click="loadLogs">刷新推送记录</el-button>
    </div>

    <el-table v-loading="loading" :data="subscriptions" border stripe>
      <el-table-column prop="resource_title" label="订阅资源" min-width="260" show-overflow-tooltip />
      <el-table-column prop="resource_pan" label="网盘" width="90" />
      <el-table-column label="用户" min-width="210" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="user-cell">
            <strong>{{ row.user_nickname }}</strong>
            <span>{{ row.user_openid || row.user_id }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="订阅状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' && row.is_active ? 'success' : 'info'">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="wx_subscribe_status" label="微信状态" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="wxStatusType(row.wx_subscribe_status)">{{ wxStatusText(row.wx_subscribe_status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="subscribe_count" label="授权次数" width="100" align="center" />
      <el-table-column prop="last_subscribed_at" label="最近授权" width="180" />
      <el-table-column prop="last_pushed_at" label="最近推送" width="180" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="showLogs(row)">看记录</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      background
      layout="prev, pager, next, total"
      :total="subscriptionTotal"
      :page-size="filters.page_size"
      :current-page="filters.page"
      @current-change="changeSubscriptionPage"
    />

    <div class="logs-head">
      <div>
        <h3>推送记录</h3>
        <p>{{ activeLogTitle }}</p>
      </div>
      <div class="log-filters">
        <el-input v-model="logFilters.keyword" clearable placeholder="搜索失败原因 / 资源 / 用户" style="width: 280px" @keyup.enter="loadLogs" />
        <el-select v-model="logFilters.status" clearable placeholder="结果" style="width: 130px" @change="loadLogs">
          <el-option label="全部" value="all" />
          <el-option label="成功" value="sent" />
          <el-option label="失败" value="failed" />
          <el-option label="跳过" value="skipped" />
        </el-select>
        <el-button :loading="logLoading" @click="clearLogScope">查看全部</el-button>
      </div>
    </div>

    <el-table v-loading="logLoading" :data="pushLogs" border stripe>
      <el-table-column prop="created_at" label="时间" width="180" />
      <el-table-column prop="status" label="结果" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="logStatusType(row.status)">{{ logStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="resource_title" label="资源" min-width="240" show-overflow-tooltip />
      <el-table-column label="用户" min-width="190" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ row.user_nickname }}</span>
          <span class="muted"> / {{ row.user_openid || row.user_id || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="errcode" label="错误码" width="100" align="center" />
      <el-table-column prop="errmsg" label="失败原因" min-width="260" show-overflow-tooltip />
      <el-table-column prop="template_id" label="模板ID" min-width="180" show-overflow-tooltip />
    </el-table>

    <el-pagination
      class="pager"
      background
      layout="prev, pager, next, total"
      :total="logTotal"
      :page-size="logFilters.page_size"
      :current-page="logFilters.page"
      @current-change="changeLogPage"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getNetdiskResourceSubscriptionPushLogs, getNetdiskResourceSubscriptions } from '@/utils/api'

const loading = ref(false)
const logLoading = ref(false)
const subscriptions = ref<any[]>([])
const pushLogs = ref<any[]>([])
const subscriptionTotal = ref(0)
const logTotal = ref(0)
const activeLogTitle = ref('默认展示最近推送记录。')

const subscriptionStats = reactive({ total: 0, active: 0, accepted: 0, sent: 0 })
const logStats = reactive({ total: 0, sent: 0, failed: 0, skipped: 0 })

const filters = reactive({
  keyword: '',
  status: 'all',
  wx_subscribe_status: 'all',
  page: 1,
  page_size: 50,
})

const logFilters = reactive({
  keyword: '',
  status: 'all',
  subscription_id: '',
  resource_id: '',
  page: 1,
  page_size: 50,
})

const n = (value: any) => Number(value || 0).toLocaleString()

const statusText = (value: string) => (value === 'active' ? '活跃' : '关闭')
const wxStatusText = (value: string) => {
  if (value === 'accept') return '待推送'
  if (value === 'sent') return '已推送'
  if (value === 'reject') return '未授权'
  return '未知'
}
const wxStatusType = (value: string) => {
  if (value === 'accept') return 'warning'
  if (value === 'sent') return 'success'
  if (value === 'reject') return 'danger'
  return 'info'
}
const logStatusText = (value: string) => {
  if (value === 'sent') return '成功'
  if (value === 'failed') return '失败'
  return '跳过'
}
const logStatusType = (value: string) => {
  if (value === 'sent') return 'success'
  if (value === 'failed') return 'danger'
  return 'info'
}

const loadSubscriptions = async () => {
  loading.value = true
  try {
    const data = await getNetdiskResourceSubscriptions({
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
      wx_subscribe_status: filters.wx_subscribe_status || undefined,
      page: filters.page,
      page_size: filters.page_size,
    })
    subscriptions.value = data.subscriptions || []
    subscriptionTotal.value = data.total || 0
    Object.assign(subscriptionStats, data.stats || {})
  } catch (error: any) {
    ElMessage.error(error.message || '订阅列表加载失败')
  } finally {
    loading.value = false
  }
}

const loadLogs = async () => {
  logLoading.value = true
  try {
    const data = await getNetdiskResourceSubscriptionPushLogs({
      keyword: logFilters.keyword || undefined,
      status: logFilters.status || undefined,
      subscription_id: logFilters.subscription_id || undefined,
      resource_id: logFilters.resource_id || undefined,
      page: logFilters.page,
      page_size: logFilters.page_size,
    })
    pushLogs.value = data.push_logs || []
    logTotal.value = data.total || 0
    Object.assign(logStats, data.stats || {})
  } catch (error: any) {
    ElMessage.error(error.message || '推送记录加载失败')
  } finally {
    logLoading.value = false
  }
}

const showLogs = (row: any) => {
  logFilters.subscription_id = row.id
  logFilters.resource_id = ''
  logFilters.page = 1
  activeLogTitle.value = `正在查看「${row.resource_title}」的订阅推送记录。`
  loadLogs()
}

const clearLogScope = () => {
  logFilters.subscription_id = ''
  logFilters.resource_id = ''
  logFilters.page = 1
  activeLogTitle.value = '默认展示最近推送记录。'
  loadLogs()
}

const changeSubscriptionPage = (page: number) => {
  filters.page = page
  loadSubscriptions()
}

const changeLogPage = (page: number) => {
  logFilters.page = page
  loadLogs()
}

onMounted(async () => {
  await loadSubscriptions()
  await loadLogs()
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-row,
.toolbar,
.logs-head,
.log-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.logs-head {
  justify-content: space-between;
  margin-top: 8px;
}

.logs-head h3 {
  margin: 0;
  color: #172033;
}

.logs-head p,
.muted {
  margin: 4px 0 0;
  color: #697386;
}

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-cell span {
  color: #697386;
  font-size: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
}
</style>
