<template>
  <div class="page">
    <div class="summary">
      <div class="summary-card income">
        <span>筛选入账</span>
        <strong>+¥{{ money(stats.amount_in) }}</strong>
      </div>
      <div class="summary-card outcome">
        <span>筛选扣回/冻结</span>
        <strong>¥{{ money(stats.amount_out) }}</strong>
      </div>
      <div class="summary-card net">
        <span>净变化</span>
        <strong :class="{ negative: Number(stats.net_amount || 0) < 0 }">¥{{ money(stats.net_amount) }}</strong>
      </div>
      <div class="summary-card frozen">
        <span>冻结变化</span>
        <strong :class="{ negative: Number(stats.frozen_delta || 0) < 0 }">¥{{ money(stats.frozen_delta) }}</strong>
      </div>
    </div>

    <div class="toolbar">
      <el-input
        v-model="filters.keyword"
        clearable
        placeholder="搜索用户 / openid / 邀请码 / 订单ID / 提现ID / 流水ID"
        style="width: 380px"
        @keyup.enter="search"
      />
      <el-select v-model="filters.change_type" clearable placeholder="流水类型" style="width: 180px" @change="search">
        <el-option label="邀请权益金入账" value="invite_reward" />
        <el-option label="退款回收" value="refund_revoke" />
        <el-option label="提现冻结" value="withdraw_freeze" />
        <el-option label="提现成功" value="withdraw_success" />
        <el-option label="提现失败返还" value="withdraw_failed_return" />
      </el-select>
      <el-select v-model="filters.related_type" clearable placeholder="关联类型" style="width: 160px" @change="search">
        <el-option label="佣金记录" value="commission_record" />
        <el-option label="提现记录" value="withdraw_record" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        unlink-panels
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 260px"
        @change="search"
      />
      <el-button type="primary" :loading="loading" @click="search">查询</el-button>
      <el-button @click="reset">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column label="时间" width="150">
        <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="用户" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="user-cell">
            <strong>{{ row.nickname || '未命名用户' }}</strong>
            <span>{{ row.invite_code || row.openid || row.user_id }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="130" align="center">
        <template #default="{ row }">
          <el-tag :type="typeTag(row.change_type)" effect="plain">{{ typeText(row.change_type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="余额变化" width="120" align="right">
        <template #default="{ row }">
          <span :class="amountClass(row.amount_delta)">{{ signedMoney(row.amount_delta) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="冻结变化" width="120" align="right">
        <template #default="{ row }">
          <span :class="amountClass(row.frozen_delta)">{{ signedMoney(row.frozen_delta) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="累计收益变化" width="130" align="right">
        <template #default="{ row }">
          <span :class="amountClass(row.total_income_delta)">{{ signedMoney(row.total_income_delta) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="累计提现变化" width="130" align="right">
        <template #default="{ row }">
          <span :class="amountClass(row.total_withdrawn_delta)">{{ signedMoney(row.total_withdrawn_delta) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="变更后快照" min-width="220">
        <template #default="{ row }">
          <div class="snapshot">
            <span>余额 ¥{{ money(row.balance_after) }}</span>
            <span>冻结 ¥{{ money(row.frozen_balance_after) }}</span>
            <span>累计收益 ¥{{ money(row.total_income_after) }}</span>
            <span>已提现 ¥{{ money(row.total_withdrawn_after) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="关联业务" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="related">
            <span>{{ relatedText(row.related_type) }}</span>
            <el-button link type="primary" @click="copy(row.related_id)">{{ shortId(row.related_id) }}</el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="说明" min-width="260" show-overflow-tooltip />
      <el-table-column label="流水ID" width="110" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="copy(row.id)">{{ shortId(row.id) }}</el-button>
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
import { ElMessage } from 'element-plus'
import { getAdminEquityLedger } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const rows = ref<any[]>([])
const total = ref(0)
const stats = reactive<Record<string, number>>({})
const dateRange = ref<string[]>([])
const filters = reactive({
  keyword: '',
  change_type: '',
  related_type: '',
  page: 1,
  page_size: 50,
})

const pad = (value: number) => String(value).padStart(2, '0')
const money = (value: any) => Math.abs(Number(value || 0)).toFixed(2)
const signedMoney = (value: any) => {
  const amount = Number(value || 0)
  if (!amount) return '¥0.00'
  return `${amount > 0 ? '+' : '-'}¥${Math.abs(amount).toFixed(2)}`
}

const amountClass = (value: any) => {
  const amount = Number(value || 0)
  return {
    positive: amount > 0,
    negative: amount < 0,
    muted: amount === 0,
  }
}

const formatDate = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 16)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const typeText = (type: string) => ({
  invite_reward: '权益金入账',
  refund_revoke: '退款回收',
  withdraw_freeze: '提现冻结',
  withdraw_success: '提现成功',
  withdraw_failed_return: '失败返还',
}[type] || type || '-')

const typeTag = (type: string) => {
  if (type === 'invite_reward' || type === 'withdraw_failed_return') return 'success'
  if (type === 'refund_revoke') return 'danger'
  if (type === 'withdraw_freeze') return 'warning'
  if (type === 'withdraw_success') return 'info'
  return undefined
}

const relatedText = (type: string) => ({
  commission_record: '佣金/订单',
  withdraw_record: '提现单',
}[type] || type || '-')

const shortId = (value: string) => {
  if (!value) return '-'
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value
}

const applyRouteQuery = () => {
  filters.keyword = typeof route.query.keyword === 'string' ? route.query.keyword : ''
  filters.change_type = typeof route.query.change_type === 'string' ? route.query.change_type : ''
  filters.related_type = typeof route.query.related_type === 'string' ? route.query.related_type : ''
}

const loadData = async () => {
  loading.value = true
  try {
    const data = await getAdminEquityLedger({
      keyword: filters.keyword || undefined,
      change_type: filters.change_type || undefined,
      related_type: filters.related_type || undefined,
      start_date: dateRange.value?.[0] || undefined,
      end_date: dateRange.value?.[1] || undefined,
      page: filters.page,
      page_size: filters.page_size,
    })
    rows.value = data.list || []
    total.value = data.total || 0
    Object.assign(stats, data.stats || {})
  } catch (error: any) {
    ElMessage.error(error.message || '权益金流水加载失败')
  } finally {
    loading.value = false
  }
}

const search = () => {
  filters.page = 1
  router.replace({
    path: '/equity-ledger',
    query: {
      keyword: filters.keyword || undefined,
      change_type: filters.change_type || undefined,
      related_type: filters.related_type || undefined,
    },
  })
  loadData()
}

const reset = () => {
  filters.keyword = ''
  filters.change_type = ''
  filters.related_type = ''
  filters.page = 1
  dateRange.value = []
  router.replace({ path: '/equity-ledger' })
  loadData()
}

const changePage = (page: number) => {
  filters.page = page
  loadData()
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
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e6edf5;
}

.summary-card span {
  display: block;
  color: #667085;
  font-size: 13px;
  margin-bottom: 8px;
}

.summary-card strong {
  color: #102a2a;
  font-size: 24px;
}

.summary-card.income strong,
.positive {
  color: #079455;
}

.summary-card.outcome strong,
.negative {
  color: #d92d20;
}

.summary-card.net strong {
  color: #1570ef;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.user-cell,
.snapshot,
.related {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-cell span,
.snapshot span {
  color: #667085;
  font-size: 12px;
}

.related {
  gap: 2px;
}

.muted {
  color: #98a2b3;
}

.pager {
  margin-top: 18px;
  justify-content: flex-end;
}
</style>
