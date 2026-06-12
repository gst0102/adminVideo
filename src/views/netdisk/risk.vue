<template>
  <div class="page">
    <div class="toolbar">
      <el-select v-model="filters.status" clearable placeholder="状态" style="width: 150px" @change="loadData">
        <el-option label="待追缴" value="open" />
        <el-option label="已处理" value="cleared" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="records" border stripe>
      <el-table-column prop="user_id" label="用户ID" min-width="220" show-overflow-tooltip />
      <el-table-column prop="related_type" label="来源" width="150">
        <template #default="{ row }">{{ relatedTypeText(row.related_type) }}</template>
      </el-table-column>
      <el-table-column prop="related_id" label="关联记录" min-width="180" show-overflow-tooltip />
      <el-table-column prop="reason" label="原因" width="200">
        <template #default="{ row }">{{ reasonText(row.reason) }}</template>
      </el-table-column>
      <el-table-column prop="points_due" label="待追缴" width="100" align="center" />
      <el-table-column prop="points_collected" label="已扣" width="90" align="center" />
      <el-table-column prop="status" label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'open' ? 'warning' : 'success'">{{ row.status === 'open' ? '待追缴' : row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" min-width="280" show-overflow-tooltip />
      <el-table-column prop="created_at" label="创建时间" width="170">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="openDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'open'" type="primary" link @click="openAction(row, 'collect')">追缴扣除</el-button>
          <el-button v-if="row.status === 'open'" type="warning" link @click="openAction(row, 'waive')">人工关闭</el-button>
          <el-tag v-else size="small">已处理</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px">
      <div v-if="riskDetail?.account && dialog.action === 'collect'" class="confirm-preview">
        <span>用户可用积分：{{ n(riskDetail.account.consumable_points) }}</span>
        <span>本次预计扣除：{{ n(riskDetail.collect_preview?.will_collect) }}</span>
        <span>扣后剩余待追缴：{{ n(riskDetail.collect_preview?.shortfall_after_collect) }}</span>
      </div>
      <el-input v-model="dialog.note" type="textarea" :rows="4" placeholder="填写处理备注" />
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button :type="dialog.action === 'waive' ? 'warning' : 'primary'" :loading="dialog.loading" @click="submitAction">
          {{ dialog.action === 'waive' ? '人工关闭' : '确认扣除' }}
        </el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailDrawer.visible" size="58%" title="待追缴详情">
      <div v-loading="detailDrawer.loading" class="detail-drawer">
        <section class="detail-grid">
          <div>
            <span>用户可用积分</span>
            <strong>{{ n(riskDetail?.account?.consumable_points) }}</strong>
          </div>
          <div>
            <span>待追缴</span>
            <strong>{{ n(riskDetail?.risk_record?.points_due) }}</strong>
          </div>
          <div>
            <span>预计扣除</span>
            <strong>{{ n(riskDetail?.collect_preview?.will_collect) }}</strong>
          </div>
          <div>
            <span>扣后缺口</span>
            <strong>{{ n(riskDetail?.collect_preview?.shortfall_after_collect) }}</strong>
          </div>
        </section>

        <section class="detail-section">
          <h3>关联资源</h3>
          <p>{{ riskDetail?.related?.resource?.title || '-' }}</p>
          <small>{{ riskDetail?.related?.resource?.id || '-' }}</small>
        </section>

        <section v-if="riskDetail?.related?.upload" class="detail-section">
          <h3>上传记录</h3>
          <p>{{ riskDetail.related.upload.title }}</p>
          <small>奖励 {{ n(riskDetail.related.upload.reward_points) }} 分 · 状态 {{ statusText(riskDetail.related.upload.status) }}</small>
          <div class="detail-actions">
            <el-button type="primary" @click="openOriginReview('upload', riskDetail.related.upload.id)">打开原上传审核记录</el-button>
          </div>
        </section>

        <section v-if="riskDetail?.related?.repair" class="detail-section">
          <h3>补链记录</h3>
          <p>{{ riskDetail.related.repair.resource_title }}</p>
          <small>奖励 {{ n(riskDetail.related.repair.reward_points) }} 分 · 状态 {{ statusText(riskDetail.related.repair.status) }}</small>
          <div class="detail-actions">
            <el-button type="primary" @click="openOriginReview('repair', riskDetail.related.repair.id)">打开原补链审核记录</el-button>
          </div>
        </section>

        <section class="detail-section">
          <h3>处罚计算</h3>
          <p>{{ reasonText(riskDetail?.risk_record?.reason) }}</p>
          <small>{{ riskDetail?.risk_record?.note || '-' }}</small>
        </section>

        <section class="detail-section">
          <h3>用户通知记录</h3>
          <el-table :data="riskDetail?.notifications || []" border stripe>
            <el-table-column prop="created_at" label="时间" width="150">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column prop="title" label="标题" width="160" />
            <el-table-column prop="content" label="内容" min-width="260" show-overflow-tooltip />
          </el-table>
        </section>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  collectNetdiskRiskRecord,
  getNetdiskRiskRecordDetail,
  getNetdiskRiskRecords,
  waiveNetdiskRiskRecord,
} from '@/utils/api'

const loading = ref(false)
const router = useRouter()
const records = ref<any[]>([])
const riskDetail = ref<any>(null)
const detailDrawer = reactive({ visible: false, loading: false })
const filters = reactive({ status: 'open' })
const dialog = reactive({
  visible: false,
  loading: false,
  title: '',
  action: 'collect' as 'collect' | 'waive',
  note: '',
  row: null as any,
})

const loadData = async () => {
  loading.value = true
  try {
    const data = await getNetdiskRiskRecords({ status: filters.status || undefined, page_size: 100 })
    records.value = data.risk_records || []
  } catch (error: any) {
    ElMessage.error(error.message || '待追缴列表加载失败，请确认后端 8000 已启动')
  } finally {
    loading.value = false
  }
}

const openAction = (row: any, action: 'collect' | 'waive') => {
  dialog.row = row
  dialog.action = action
  dialog.note = ''
  dialog.title = action === 'collect' ? `追缴扣除 ${row.points_due} 分` : '人工关闭待追缴（不扣分）'
  dialog.visible = true
  loadRiskDetail(row.id)
}

const openDetail = async (row: any) => {
  detailDrawer.visible = true
  await loadRiskDetail(row.id, true)
}

const loadRiskDetail = async (id: string, drawerLoading = false) => {
  if (drawerLoading) detailDrawer.loading = true
  try {
    riskDetail.value = await getNetdiskRiskRecordDetail(id)
  } catch (error: any) {
    ElMessage.error(error.message || '待追缴详情加载失败')
  } finally {
    detailDrawer.loading = false
  }
}

const openOriginReview = (kind: 'upload' | 'repair', id: string) => {
  if (!id) return
  if (kind === 'upload') {
    router.push(`/review?tab=uploads&upload_id=${id}`)
    return
  }
  router.push(`/review?tab=repairs&repair_id=${id}`)
}

const submitAction = async () => {
  if (!dialog.row) return
  if (dialog.action === 'waive') {
    try {
      await ElMessageBox.confirm(
        '人工关闭只会把这条待追缴记录标记为已处理，不会扣除用户积分。请确认这不是误点。',
        '确认人工关闭',
        {
          confirmButtonText: '确认关闭',
          cancelButtonText: '再检查一下',
          type: 'warning',
        },
      )
    } catch {
      return
    }
  }
  if (dialog.action === 'collect') {
    const preview = riskDetail.value?.collect_preview || {}
    try {
      await ElMessageBox.confirm(
        `用户当前可用 ${n(riskDetail.value?.account?.consumable_points)} 分，本次预计扣除 ${n(preview.will_collect)} 分，扣后剩余待追缴 ${n(preview.shortfall_after_collect)} 分。确认继续？`,
        '确认追缴扣除',
        {
          confirmButtonText: '确认扣除',
          cancelButtonText: '再检查一下',
          type: 'warning',
        },
      )
    } catch {
      return
    }
  }
  dialog.loading = true
  try {
    if (dialog.action === 'collect') {
      const data = await collectNetdiskRiskRecord(dialog.row.id, dialog.note)
      ElMessage.success(`已追缴 ${data.collected_points || 0} 分`)
    } else {
      await waiveNetdiskRiskRecord(dialog.row.id, dialog.note)
      ElMessage.success('已人工关闭')
    }
    dialog.visible = false
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '处理失败')
  } finally {
    dialog.loading = false
  }
}

const formatTime = (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')
const n = (value: any) => Number(value || 0).toLocaleString()
const relatedTypeText = (value: string) => ({ netdisk_upload: '上传', netdisk_repair: '补链', netdisk_resource: '资源' }[value] || value)
const statusText = (status: string) => ({ approved: '已通过', invalid_confirmed: '确认失效', pending: '待审核', rejected: '已拒绝' }[status] || status)
const reasonText = (value: string) => ({
  upload_reward_invalid: '上传确认失效',
  repair_reward_invalid: '补链确认失效',
  resource_invalid_pending_penalty: '资源失效待处罚',
  upload_reward_rejected: '上传拒绝扣回',
  repair_reward_rejected: '补链拒绝扣回',
}[value] || value)

onMounted(loadData)
</script>

<style scoped>
.page {
  padding: 18px;
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.confirm-preview {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  color: #9a3412;
}

.detail-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.detail-grid > div,
.detail-section {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #dfe7ef;
  border-radius: 8px;
}

.detail-grid span,
.detail-section small {
  color: #697386;
  font-size: 13px;
}

.detail-grid strong {
  display: block;
  margin-top: 8px;
  color: #0f766e;
  font-size: 24px;
}

.detail-section h3 {
  margin: 0 0 8px;
  color: #172033;
  font-size: 16px;
}

.detail-section p {
  margin: 0 0 6px;
}

.detail-actions {
  margin-top: 12px;
}
</style>
