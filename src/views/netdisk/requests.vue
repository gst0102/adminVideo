<template>
  <div class="page">
    <div class="toolbar">
      <el-input v-model="filters.keyword" clearable placeholder="搜索需求标题 / 分类 / 说明" style="width: 320px" @keyup.enter="loadData" />
      <el-select v-model="filters.status" clearable placeholder="需求状态" style="width: 150px" @change="loadData">
        <el-option label="待审核" value="pending_review" />
        <el-option label="进行中" value="open" />
        <el-option label="已采纳" value="accepted" />
        <el-option label="已拒绝" value="rejected" />
        <el-option label="已退回" value="canceled" />
        <el-option label="已过期" value="expired" />
        <el-option label="后台删除" value="admin_deleted" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="loadData">查询</el-button>
    </div>

    <div class="stats">
      <el-tag type="warning" effect="plain">待审核 {{ n(stats.pending_review) }}</el-tag>
      <el-tag type="success" effect="plain">进行中 {{ n(stats.open) }}</el-tag>
      <el-tag type="warning" effect="plain">已采纳 {{ n(stats.accepted) }}</el-tag>
      <el-tag type="danger" effect="plain">已拒绝 {{ n(stats.rejected) }}</el-tag>
      <el-tag type="info" effect="plain">已退回 {{ n(stats.canceled) }}</el-tag>
      <el-tag type="danger" effect="plain">后台删除 {{ n(stats.admin_deleted) }}</el-tag>
      <span>通过后进入需求广场；拒绝或删除会退回冻结积分。</span>
    </div>

    <el-table v-loading="loading" :data="requests" border stripe empty-text="暂无需求记录">
      <el-table-column prop="id" label="需求ID" width="120" show-overflow-tooltip />
      <el-table-column label="发布时间" width="150">
        <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="260" show-overflow-tooltip />
      <el-table-column prop="pans" label="期望说明" width="130" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" width="110" />
      <el-table-column prop="bounty_points" label="积分" width="100" align="center" />
      <el-table-column prop="submissions_count" label="线索" width="80" align="center" />
      <el-table-column label="状态" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="积分状态" width="110" align="center">
        <template #default="{ row }">{{ bountyText(row.bounty_status) }}</template>
      </el-table-column>
      <el-table-column prop="note" label="说明" min-width="220" show-overflow-tooltip />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'pending_review'"
            type="success"
            link
            @click="approveRequest(row)"
          >
            通过
          </el-button>
          <el-button
            v-if="row.status === 'pending_review'"
            type="warning"
            link
            @click="rejectRequest(row)"
          >
            拒绝
          </el-button>
          <el-button
            v-if="row.status !== 'admin_deleted'"
            type="danger"
            link
            @click="deleteRequest(row)"
          >
            删除
          </el-button>
          <span v-else class="muted">已删除</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      background
      layout="prev, pager, next, total"
      :total="total"
      :page-size="filters.page_size"
      :current-page="filters.page"
      @current-change="changePage"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { approveNetdiskRequest, deleteNetdiskRequest, getNetdiskRequests, rejectNetdiskRequest } from '@/utils/api'

const loading = ref(false)
const requests = ref<any[]>([])
const total = ref(0)
const stats = reactive<Record<string, number>>({})
const filters = reactive<{ keyword: string; status: string; page: number; page_size: number }>({
  keyword: '',
  status: 'pending_review',
  page: 1,
  page_size: 100,
})

const n = (value: any) => Number(value || 0).toLocaleString()
const pad = (value: number) => String(value).padStart(2, '0')

const formatDate = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 16)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const statusText = (status: string) => ({
  pending_review: '待审核',
  open: '进行中',
  accepted: '已采纳',
  rejected: '已拒绝',
  canceled: '已退回',
  expired: '已过期',
  admin_deleted: '后台删除',
}[status] || status || '-')

const bountyText = (status: string) => ({
  frozen: '冻结中',
  paid: '已发放',
  returned: '已退回',
}[status] || status || '-')

const statusTag = (status: string) => {
  if (status === 'open') return 'success'
  if (status === 'pending_review') return 'warning'
  if (status === 'accepted') return 'warning'
  if (status === 'admin_deleted' || status === 'rejected') return 'danger'
  return 'info'
}

const loadData = async () => {
  loading.value = true
  try {
    const data = await getNetdiskRequests({
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
      page: filters.page,
      page_size: filters.page_size,
    })
    requests.value = data.requests || []
    total.value = data.total || 0
    Object.assign(stats, data.stats || {})
  } catch (error: any) {
    ElMessage.error(error.message || '求助列表加载失败')
  } finally {
    loading.value = false
  }
}

const changePage = (page: number) => {
  filters.page = page
  loadData()
}

const deleteRequest = async (row: any) => {
  const result = await ElMessageBox.prompt(
    `确认删除求助「${row.title}」？进行中的求助会自动退回冻结积分。`,
    '删除求助',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      inputPlaceholder: '删除原因，例如：内容不完整 / 用户要求退回',
      inputValue: '后台删除求助',
      type: 'warning',
    },
  )
  await deleteNetdiskRequest(row.id, result.value || '后台删除求助')
  ElMessage.success('求助已删除')
  await loadData()
}

const approveRequest = async (row: any) => {
  const result = await ElMessageBox.prompt(`确认通过需求「${row.title}」？通过后会进入小程序需求广场。`, '通过需求', {
    confirmButtonText: '通过',
    cancelButtonText: '取消',
    inputPlaceholder: '审核备注，可留空',
    inputValue: '需求审核通过',
    type: 'success',
  })
  await approveNetdiskRequest(row.id, result.value || '需求审核通过')
  ElMessage.success('需求已通过')
  await loadData()
}

const rejectRequest = async (row: any) => {
  const result = await ElMessageBox.prompt(`确认拒绝需求「${row.title}」？拒绝后会退回冻结积分。`, '拒绝需求', {
    confirmButtonText: '拒绝并退回',
    cancelButtonText: '取消',
    inputPlaceholder: '拒绝原因，必填',
    inputValue: '内容不符合发布规则',
    type: 'warning',
    inputValidator: (value) => Boolean(String(value || '').trim()) || '拒绝原因必填',
  })
  await rejectNetdiskRequest(row.id, result.value || '内容不符合发布规则')
  ElMessage.success('需求已拒绝并退回积分')
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

.toolbar,
.stats {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar {
  margin-bottom: 16px;
}

.stats {
  margin-bottom: 18px;
  color: #667085;
  font-size: 14px;
}

.pager {
  margin-top: 18px;
  justify-content: flex-end;
}

.muted {
  color: #98a2b3;
}
</style>
