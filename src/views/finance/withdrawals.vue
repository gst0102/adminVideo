<template>
  <div class="page">
    <div class="summary">
      <div class="summary-card pending">
        <span>筛选待处理</span>
        <strong>¥{{ money(stats.processing_amount) }}</strong>
      </div>
      <div class="summary-card success">
        <span>筛选已到账</span>
        <strong>¥{{ money(stats.success_amount) }}</strong>
      </div>
      <div class="summary-card failed">
        <span>筛选失败/驳回</span>
        <strong>¥{{ money(stats.failed_amount) }}</strong>
      </div>
      <div class="summary-card total">
        <span>筛选总金额</span>
        <strong>¥{{ money(stats.total_amount) }}</strong>
      </div>
    </div>

    <div class="toolbar">
      <el-input
        v-model="filters.keyword"
        clearable
        placeholder="搜索用户 / openid / 邀请码 / 提现ID / 批次号 / 微信单号"
        style="width: 420px"
        @keyup.enter="search"
      />
      <el-select v-model="filters.status" clearable placeholder="提现状态" style="width: 160px" @change="search">
        <el-option label="处理中" value="processing" />
        <el-option label="已到账" value="success" />
        <el-option label="失败" value="failed" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="search">查询</el-button>
      <el-button @click="reset">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column label="申请时间" width="170">
        <template #default="{ row }">{{ time(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="用户" min-width="230" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="user-cell">
            <el-avatar :size="32" :src="row.avatar" />
            <div>
              <strong>{{ row.nickname || '微信用户' }}</strong>
              <span>{{ row.openid || row.user_id }}</span>
              <small>邀请码：{{ row.invite_code || '-' }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="提现金额" width="110" align="right">
        <template #default="{ row }">¥{{ money(row.amount) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" effect="plain">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="权益金快照" min-width="240">
        <template #default="{ row }">
          <div class="snapshot">
            <span>余额 ¥{{ money(row.user_balance) }} · 冻结 ¥{{ money(row.user_frozen_balance) }}</span>
            <span>累计收益 ¥{{ money(row.user_total_income) }} · 已提现 ¥{{ money(row.user_total_withdrawn) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="积分提现账户" min-width="210">
        <template #default="{ row }">
          <div class="snapshot">
            <span>可提现 {{ n(row.account?.withdrawable_points) }} · 锁定 {{ n(row.account?.locked_withdraw_points) }}</span>
            <span>已提现 {{ n(row.account?.withdrawn_points) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="微信转账信息" min-width="260" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="snapshot">
            <span>批次：<el-button link type="primary" @click="copy(row.batch_no)">{{ shortId(row.batch_no) }}</el-button></span>
            <span>单号：<el-button link type="primary" @click="copy(row.transfer_bill_no)">{{ row.transfer_bill_no ? shortId(row.transfer_bill_no) : '-' }}</el-button></span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="关联流水" min-width="220">
        <template #default="{ row }">
          <div v-if="row.equity_ledgers?.length" class="ledger-list">
            <button v-for="item in row.equity_ledgers" :key="item.id" @click="openLedger(row)">
              {{ ledgerText(item.change_type) }} {{ signedMoney(item.amount_delta || item.frozen_delta || item.total_withdrawn_delta) }}
            </button>
          </div>
          <span v-else class="muted">暂无流水</span>
        </template>
      </el-table-column>
      <el-table-column label="失败原因" min-width="190" show-overflow-tooltip>
        <template #default="{ row }">{{ row.fail_reason || '-' }}</template>
      </el-table-column>
      <el-table-column label="完成时间" width="170">
        <template #default="{ row }">{{ time(row.completed_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="copy(row.id)">复制ID</el-button>
          <el-button type="success" link :disabled="row.status !== 'processing'" @click="approve(row)">提交转账</el-button>
          <el-button type="danger" link :disabled="row.status !== 'processing' || !!row.transfer_bill_no" @click="reject(row)">驳回</el-button>
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
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { approveAdminWithdrawal, getAdminWithdrawals, rejectAdminWithdrawal } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const stats = reactive<Record<string, number>>({})
const filters = reactive({
  keyword: '',
  status: '',
  page: 1,
  page_size: 30,
})

const n = (value: any) => Number(value || 0).toLocaleString()
const money = (value: any) => Number(value || 0).toFixed(2)
const signedMoney = (value: any) => {
  const amount = Number(value || 0)
  if (!amount) return '¥0.00'
  return `${amount > 0 ? '+' : '-'}¥${Math.abs(amount).toFixed(2)}`
}
const time = (value: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-')
const shortId = (value: string) => {
  if (!value) return '-'
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value
}

const statusText = (status: string) => ({
  processing: '处理中',
  success: '已到账',
  failed: '失败',
  rejected: '已驳回',
}[status] || status || '-')

const statusType = (status: string) => {
  if (status === 'success') return 'success'
  if (status === 'processing') return 'warning'
  if (status === 'failed' || status === 'rejected') return 'danger'
  return 'info'
}

const ledgerText = (type: string) => ({
  withdraw_freeze: '冻结',
  withdraw_success: '到账',
  withdraw_failed_return: '返还',
}[type] || type || '流水')

const applyRouteQuery = () => {
  filters.keyword = typeof route.query.keyword === 'string' ? route.query.keyword : ''
  filters.status = typeof route.query.status === 'string' ? route.query.status : ''
}

const loadData = async () => {
  loading.value = true
  try {
    const data = await getAdminWithdrawals({
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
      page: filters.page,
      page_size: filters.page_size,
    })
    rows.value = data.list || []
    total.value = data.total || 0
    Object.assign(stats, data.stats || {})
  } catch (error: any) {
    ElMessage.error(error.message || '提现记录加载失败')
  } finally {
    loading.value = false
  }
}

const search = () => {
  filters.page = 1
  router.replace({ path: '/withdrawals', query: { keyword: filters.keyword || undefined, status: filters.status || undefined } })
  loadData()
}

const reset = () => {
  filters.keyword = ''
  filters.status = ''
  filters.page = 1
  router.replace({ path: '/withdrawals' })
  loadData()
}

const changePage = (page: number) => {
  filters.page = page
  loadData()
}

const approve = async (row: any) => {
  await ElMessageBox.confirm(`确认向 ${row.nickname || row.openid} 提交微信提现 ¥${money(row.amount)}？`, '提交转账', {
    type: 'warning',
  })
  try {
    await approveAdminWithdrawal(row.id)
    ElMessage.success('已提交微信转账')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '提交转账失败')
  }
}

const reject = async (row: any) => {
  const { value } = await ElMessageBox.prompt('请输入驳回原因，会进入提现失败原因和返还流水备注', '驳回提现', {
    inputValue: 'admin_rejected',
    inputPlaceholder: '例如：用户信息异常 / 运营人工驳回',
    confirmButtonText: '确认驳回',
    cancelButtonText: '取消',
    inputValidator: (val) => !!String(val || '').trim() || '请填写驳回原因',
  })
  try {
    await rejectAdminWithdrawal(row.id, String(value || 'admin_rejected'))
    ElMessage.success('已驳回并返还冻结金额')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '驳回失败')
  }
}

const openLedger = (row: any) => {
  router.push({ path: '/equity-ledger', query: { keyword: row.id, related_type: 'withdraw_record' } })
}

const copy = async (value: string) => {
  if (!value) return
  await navigator.clipboard.writeText(value)
  ElMessage.success('已复制')
}

watch(
  () => route.query,
  () => {
    applyRouteQuery()
    filters.page = 1
    loadData()
  },
)

onMounted(() => {
  applyRouteQuery()
  loadData()
})
</script>

<style scoped>
.page {
  padding: 18px;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  padding: 16px;
  border: 1px solid #e6edf5;
  border-radius: 12px;
  background: #f8fafc;
}

.summary-card span {
  display: block;
  margin-bottom: 8px;
  color: #667085;
  font-size: 13px;
}

.summary-card strong {
  color: #102a2a;
  font-size: 24px;
}

.summary-card.pending strong {
  color: #b54708;
}

.summary-card.success strong {
  color: #079455;
}

.summary-card.failed strong {
  color: #d92d20;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.user-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.user-cell div,
.snapshot,
.ledger-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-cell span,
.user-cell small,
.snapshot span {
  color: #667085;
  font-size: 12px;
}

.ledger-list button {
  width: fit-content;
  padding: 0;
  border: 0;
  background: transparent;
  color: #1570ef;
  cursor: pointer;
  text-align: left;
}

.muted {
  color: #98a2b3;
}

.pager {
  margin-top: 18px;
  justify-content: flex-end;
}
</style>
