<template>
  <div class="page">
    <div class="summary">
      <div class="summary-item">
        <span>待确认订单</span>
        <strong>{{ pendingCount }}</strong>
      </div>
      <div class="summary-item">
        <span>当前页已到账</span>
        <strong>{{ paidArrivedCount }}</strong>
      </div>
      <div class="summary-item warning">
        <span>当前页未到账</span>
        <strong>{{ notArrivedCount }}</strong>
      </div>
    </div>

    <div class="toolbar">
      <el-input
        v-model="filters.keyword"
        clearable
        placeholder="搜索订单号 / openid / 昵称"
        style="width: 340px"
        @keyup.enter="loadOrders"
      />
      <el-select v-model="filters.status" clearable placeholder="订单状态" style="width: 150px" @change="loadOrders">
        <el-option label="待确认" value="pending" />
        <el-option label="已支付" value="paid" />
        <el-option label="已关闭" value="closed" />
        <el-option label="已退款" value="refunded" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="loadOrders">查询</el-button>
      <el-button :loading="reconciling" @click="reconcileOrders">手动补单</el-button>
    </div>

    <el-table v-loading="loading" :data="orders" border stripe>
      <el-table-column prop="created_at" label="下单时间" width="170">
        <template #default="{ row }">{{ time(row.created_at) }}</template>
      </el-table-column>
      <el-table-column prop="out_trade_no" label="商户订单号" min-width="180" show-overflow-tooltip />
      <el-table-column prop="transaction_id" label="微信/苹果单号" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.transaction_id || '-' }}</template>
      </el-table-column>
      <el-table-column label="用户" min-width="210">
        <template #default="{ row }">
          <div class="user-cell">
            <el-avatar :size="32" :src="row.avatar" />
            <div>
              <strong>{{ row.nickname || '微信用户' }}</strong>
              <small>{{ row.openid || row.user_id }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="amount" label="金额" width="90" align="right">
        <template #default="{ row }">¥{{ money(row.amount) }}</template>
      </el-table-column>
      <el-table-column prop="period" label="套餐" width="110">
        <template #default="{ row }">{{ packageName(row.period) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="订单状态" width="105" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" effect="plain">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="points_arrived" label="积分到账" width="105" align="center">
        <template #default="{ row }">
          <el-tag :type="row.points_arrived ? 'success' : 'warning'" effect="plain">
            {{ row.points_arrived ? '已到账' : '未到账' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="到账流水" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.ledger">
            +{{ n(row.ledger.points_delta) }}，余额 {{ n(row.ledger.balance_consumable_after) }}
          </span>
          <span v-else class="muted">暂无流水</span>
        </template>
      </el-table-column>
      <el-table-column prop="paid_at" label="支付时间" width="170">
        <template #default="{ row }">{{ time(row.paid_at) }}</template>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getAdminPaymentOrders, reconcileAdminPaymentOrders } from '@/utils/api'

const loading = ref(false)
const reconciling = ref(false)
const orders = ref<any[]>([])
const total = ref(0)
const filters = reactive<{ keyword: string; status: string; page: number; page_size: number }>({
  keyword: '',
  status: '',
  page: 1,
  page_size: 20,
})

const n = (value: any) => Number(value || 0).toLocaleString()
const money = (value: any) => Number(value || 0).toFixed(2)
const time = (value: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-')

const pendingCount = computed(() => orders.value.filter((item) => item.status === 'pending').length)
const paidArrivedCount = computed(() => orders.value.filter((item) => item.status === 'paid' && item.points_arrived).length)
const notArrivedCount = computed(() => orders.value.filter((item) => item.status === 'paid' && !item.points_arrived).length)

const statusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待确认',
    paid: '已支付',
    closed: '已关闭',
    refunded: '已退款',
  }
  return map[status] || status || '-'
}

const statusType = (status: string) => {
  if (status === 'paid') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'refunded') return 'danger'
  return 'info'
}

const packageName = (period: string) => {
  const map: Record<string, string> = {
    points_10: '10积分',
    points_100: '100积分',
    points_300: '300积分',
    points_680: '680积分',
  }
  return map[period] || period || '-'
}

const loadOrders = async () => {
  loading.value = true
  try {
    const data = await getAdminPaymentOrders({
      keyword: filters.keyword || undefined,
      status: (filters.status as any) || undefined,
      page: filters.page,
      page_size: filters.page_size,
    })
    orders.value = data.list || []
    total.value = data.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '充值订单加载失败')
  } finally {
    loading.value = false
  }
}

const reconcileOrders = async () => {
  await ElMessageBox.confirm('确认扫描最近 3 小时待确认订单，并把已支付但未到账的积分补到账？', '手动补单', {
    type: 'warning',
  })
  reconciling.value = true
  try {
    const data = await reconcileAdminPaymentOrders({ lookback_minutes: 180, limit: 50 })
    ElMessage.success(`补单完成：检查 ${n(data.checked)} 单，补到账 ${n(data.paid)} 单`)
    await loadOrders()
  } catch (error: any) {
    ElMessage.error(error.message || '补单失败')
  } finally {
    reconciling.value = false
  }
}

const changePage = (page: number) => {
  filters.page = page
  loadOrders()
}

onMounted(loadOrders)
</script>

<style scoped>
.page {
  padding: 18px;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
}

.summary,
.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.summary-item {
  min-width: 180px;
  padding: 14px 16px;
  border: 1px solid #dce4ef;
  border-radius: 8px;
  background: #f8fafc;
}

.summary-item span {
  display: block;
  color: #697386;
  font-size: 13px;
}

.summary-item strong {
  display: block;
  margin-top: 6px;
  color: #172033;
  font-size: 28px;
  line-height: 1;
}

.summary-item.warning strong {
  color: #b45309;
}

.user-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.user-cell small {
  display: block;
  max-width: 150px;
  margin-top: 2px;
  overflow: hidden;
  color: #697386;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: #9aa4b2;
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
