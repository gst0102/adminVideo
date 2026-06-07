<template>
  <div class="settlement-container">
    <el-alert
      class="page-alert"
      type="warning"
      :closable="false"
      show-icon
      title="运营结算口径"
      description="每日先录入昨日 eCPM、广告 PV、有效点击和总收益，再手动触发昨日结算。提现只允许使用已结算可提现积分。"
    />

    <el-card shadow="hover" class="toolbar-card">
      <el-row :gutter="16" align="middle">
        <el-col :xs="24" :sm="10" :md="7">
          <el-date-picker
            v-model="settlementDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择结算日期"
            style="width: 100%"
            :clearable="false"
            @change="loadDetail"
          />
        </el-col>
        <el-col :xs="24" :sm="14" :md="17" class="toolbar-actions">
          <el-button :loading="loading" @click="loadDetail">加载</el-button>
          <el-button type="primary" :loading="saving" @click="saveInput">保存运营数据</el-button>
          <el-button type="success" :loading="triggering" @click="triggerSettlement(false)">触发结算</el-button>
          <el-button type="danger" plain :loading="triggering" @click="triggerSettlement(true)">强制重算</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-row :gutter="16" class="summary-row">
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">结算状态</div>
          <el-tag :type="statusTag.type" size="large">{{ statusTag.label }}</el-tag>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">eCPM 来源</div>
          <div class="summary-value">{{ ecpmSourceLabel }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">预估积分</div>
          <div class="summary-value">{{ formatInteger(preview.total_estimated_points) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">结算积分</div>
          <div class="summary-value positive">{{ formatInteger(preview.total_settled_points) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">补正积分</div>
          <div class="summary-value" :class="adjustmentClass">{{ signedInteger(preview.total_adjustment_points) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">涉及用户</div>
          <div class="summary-value">{{ formatInteger(preview.user_count) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="10">
        <el-card shadow="hover" class="form-card">
          <template #header>
            <div class="card-header">
              <span>昨日运营数据录入</span>
              <span class="helper-text">单位：eCPM 为元 / 千次展示</span>
            </div>
          </template>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
            <el-form-item label="结算日期" prop="settlement_date">
              <el-input v-model="form.settlement_date" disabled />
            </el-form-item>
            <el-form-item label="昨日 eCPM" prop="ecpm_value">
              <el-input-number v-model="form.ecpm_value" :min="0" :precision="4" :step="0.1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="广告 PV" prop="ad_pv">
              <el-input-number v-model="form.ad_pv" :min="0" :step="100" :precision="0" style="width: 100%" />
            </el-form-item>
            <el-form-item label="有效点击" prop="valid_clicks">
              <el-input-number v-model="form.valid_clicks" :min="0" :step="10" :precision="0" style="width: 100%" />
            </el-form-item>
            <el-form-item label="总收益" prop="total_revenue">
              <el-input-number v-model="form.total_revenue" :min="0" :precision="4" :step="1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="运营备注">
              <el-input
                v-model="form.note"
                type="textarea"
                :rows="4"
                maxlength="512"
                show-word-limit
                placeholder="例如：穿山甲后台 2026-06-06 数据，人工核对后录入"
              />
            </el-form-item>
          </el-form>

          <el-descriptions class="batch-info" :column="1" border size="small">
            <el-descriptions-item label="最近保存">{{ formatTime(batch?.updated_at) }}</el-descriptions-item>
            <el-descriptions-item label="最近结算">{{ formatTime(batch?.settled_at) }}</el-descriptions-item>
            <el-descriptions-item label="批次 ID">{{ batch?.id || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="14">
        <el-card shadow="hover" class="table-card">
          <template #header>
            <div class="card-header">
              <span>结算预览 Top 100</span>
              <span class="helper-text">保存 eCPM 后会按会员系数重新预览</span>
            </div>
          </template>

          <el-table v-loading="loading" :data="preview.users" stripe border height="470">
            <el-table-column prop="nickname" label="用户" min-width="140" show-overflow-tooltip />
            <el-table-column prop="membership_level" label="等级" width="90">
              <template #default="{ row }">{{ membershipLabel(row.membership_level) }}</template>
            </el-table-column>
            <el-table-column prop="factor_value" label="系数" width="80" align="center">
              <template #default="{ row }">{{ percent(row.factor_value) }}</template>
            </el-table-column>
            <el-table-column prop="round_count" label="局数" width="70" align="center" />
            <el-table-column prop="ad_pv" label="PV" width="80" align="center" />
            <el-table-column prop="valid_clicks" label="有效点击" width="90" align="center" />
            <el-table-column prop="estimated_points" label="预估" width="90" align="right" />
            <el-table-column prop="settled_points" label="结算" width="90" align="right" />
            <el-table-column prop="adjustment_points" label="补正" width="90" align="right">
              <template #default="{ row }">
                <span :class="numberClass(row.adjustment_points)">{{ signedInteger(row.adjustment_points) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="hover" class="table-card result-card">
      <template #header>
        <div class="card-header">
          <span>已落账结算结果</span>
          <span class="helper-text">触发结算后生成，可用于核对 points_ledger 的 game_settlement / game_adjustment 流水</span>
        </div>
      </template>

      <el-table v-loading="loading" :data="settlements" stripe border>
        <el-table-column prop="nickname" label="用户" min-width="150" show-overflow-tooltip />
        <el-table-column prop="membership_level" label="等级" width="90">
          <template #default="{ row }">{{ membershipLabel(row.membership_level) }}</template>
        </el-table-column>
        <el-table-column prop="factor_value" label="系数" width="80" align="center">
          <template #default="{ row }">{{ percent(row.factor_value) }}</template>
        </el-table-column>
        <el-table-column prop="estimated_points" label="预估积分" width="110" align="right" />
        <el-table-column prop="settled_points" label="结算积分" width="110" align="right" />
        <el-table-column prop="adjustment_points" label="补正积分" width="110" align="right">
          <template #default="{ row }">
            <span :class="numberClass(row.adjustment_points)">{{ signedInteger(row.adjustment_points) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="round_count" label="局数" width="80" align="center" />
        <el-table-column prop="ad_pv" label="PV" width="90" align="center" />
        <el-table-column prop="valid_clicks" label="有效点击" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'adjusted' ? 'warning' : 'success'">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="170">
          <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import dayjs from 'dayjs'
import http from '@/utils/api'

interface SettlementBatch {
  id?: string
  settlement_date?: string
  status?: string
  ecpm_value?: number
  ecpm_source?: string
  ad_pv?: number
  valid_clicks?: number
  total_revenue?: number
  note?: string
  settled_at?: string
  updated_at?: string
}

interface SettlementPreview {
  user_count: number
  total_estimated_points: number
  total_settled_points: number
  total_adjustment_points: number
  users: any[]
}

const yesterday = () => dayjs().subtract(1, 'day').format('YYYY-MM-DD')

const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const triggering = ref(false)
const settlementDate = ref(yesterday())
const batch = ref<SettlementBatch | null>(null)
const settlements = ref<any[]>([])
const preview = ref<SettlementPreview>({
  user_count: 0,
  total_estimated_points: 0,
  total_settled_points: 0,
  total_adjustment_points: 0,
  users: [],
})

const form = reactive({
  settlement_date: settlementDate.value,
  ecpm_value: 0,
  ad_pv: 0,
  valid_clicks: 0,
  total_revenue: 0,
  note: '',
})

const rules: FormRules = {
  settlement_date: [{ required: true, message: '请选择结算日期', trigger: 'change' }],
  ecpm_value: [{ required: true, message: '请输入昨日 eCPM', trigger: 'blur' }],
  ad_pv: [{ required: true, message: '请输入广告 PV', trigger: 'blur' }],
  valid_clicks: [{ required: true, message: '请输入有效点击', trigger: 'blur' }],
  total_revenue: [{ required: true, message: '请输入总收益', trigger: 'blur' }],
}

const statusTag = computed(() => {
  const status = batch.value?.status || 'pending'
  if (status === 'settled') return { label: '已结算', type: 'success' as const }
  if (status === 'adjusted') return { label: '已补正', type: 'warning' as const }
  return { label: '待结算', type: 'info' as const }
})

const ecpmSourceLabel = computed(() => {
  const source = batch.value?.ecpm_source
  if (source === 'manual') return '人工录入'
  if (source === 'rolling_average') return '近 7 日均值'
  if (source === 'default_revenue_config') return '默认配置'
  return '-'
})

const adjustmentClass = computed(() => numberClass(preview.value.total_adjustment_points))

watch(settlementDate, (value) => {
  form.settlement_date = value || yesterday()
})

const loadDetail = async () => {
  if (!settlementDate.value) return
  loading.value = true
  try {
    const data = (await http.get('/admin/game-settlements/daily', {
      params: { settlement_date: settlementDate.value },
    })) as any
    applyDetail(data || {})
  } catch (error: any) {
    ElMessage.error(error.message || '加载结算数据失败')
  } finally {
    loading.value = false
  }
}

const saveInput = async () => {
  await formRef.value?.validate()
  saving.value = true
  try {
    const saved = (await http.put('/admin/game-settlements/daily', {
      settlement_date: form.settlement_date,
      ecpm_value: Number(form.ecpm_value || 0),
      ad_pv: Number(form.ad_pv || 0),
      valid_clicks: Number(form.valid_clicks || 0),
      total_revenue: Number(form.total_revenue || 0),
      note: form.note || '',
    })) as any
    batch.value = saved
    ElMessage.success('运营数据已保存')
    await loadDetail()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const triggerSettlement = async (forceRecalculate: boolean) => {
  const actionText = forceRecalculate ? '强制重算昨日结算' : '触发昨日结算'
  await ElMessageBox.confirm(
    forceRecalculate
      ? '强制重算会重新计算已落账用户的补正差额，请确认已核对 eCPM、PV、有效点击和总收益。'
      : '触发后会把游戏预估积分转为已结算积分，并按差额写入补正流水。确认继续？',
    actionText,
    { type: forceRecalculate ? 'warning' : 'info' },
  )
  triggering.value = true
  try {
    const data = (await http.post('/admin/game-settlements/daily/trigger', {
      settlement_date: form.settlement_date,
      allow_fallback: true,
      force_recalculate: forceRecalculate,
    })) as any
    applyDetail(data || {})
    ElMessage.success(forceRecalculate ? '已完成强制重算' : '已触发结算')
  } catch (error: any) {
    ElMessage.error(error.message || '触发结算失败')
  } finally {
    triggering.value = false
  }
}

const applyDetail = (data: any) => {
  batch.value = data.batch || null
  settlements.value = Array.isArray(data.settlements) ? data.settlements : []
  preview.value = {
    user_count: Number(data.preview?.user_count || 0),
    total_estimated_points: Number(data.preview?.total_estimated_points || 0),
    total_settled_points: Number(data.preview?.total_settled_points || 0),
    total_adjustment_points: Number(data.preview?.total_adjustment_points || 0),
    users: Array.isArray(data.preview?.users) ? data.preview.users : [],
  }

  const nextBatch = data.batch || {}
  form.settlement_date = data.settlement_date || settlementDate.value
  form.ecpm_value = Number(nextBatch.ecpm_value || 0)
  form.ad_pv = Number(nextBatch.ad_pv || 0)
  form.valid_clicks = Number(nextBatch.valid_clicks || 0)
  form.total_revenue = Number(nextBatch.total_revenue || 0)
  form.note = nextBatch.note || ''
}

const membershipLabel = (value: string) => {
  const map: Record<string, string> = {
    normal: '普通',
    month: '月卡',
    quarter: '季卡',
    year: '年卡',
  }
  return map[value] || value || '-'
}

const percent = (value: number) => `${Math.round(Number(value || 0) * 100)}%`
const formatInteger = (value: number) => Number(value || 0).toLocaleString('zh-CN')
const signedInteger = (value: number) => {
  const numberValue = Number(value || 0)
  return numberValue > 0 ? `+${formatInteger(numberValue)}` : formatInteger(numberValue)
}
const numberClass = (value: number) => {
  const numberValue = Number(value || 0)
  if (numberValue > 0) return 'positive'
  if (numberValue < 0) return 'negative'
  return ''
}
const formatTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-')

loadDetail()
</script>

<style scoped>
.settlement-container {
  padding: 0;
}

.page-alert {
  margin-bottom: 16px;
}

.toolbar-card,
.summary-row,
.form-card,
.table-card {
  margin-bottom: 16px;
}

.toolbar-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-card {
  min-height: 104px;
}

.summary-label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}

.summary-value {
  color: #303133;
  font-size: 24px;
  font-weight: 700;
}

.positive {
  color: #67c23a;
  font-weight: 700;
}

.negative {
  color: #f56c6c;
  font-weight: 700;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.helper-text {
  color: #909399;
  font-size: 13px;
}

.batch-info {
  margin-top: 12px;
}

.result-card {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .toolbar-actions {
    justify-content: flex-start;
    margin-top: 12px;
  }
}
</style>
