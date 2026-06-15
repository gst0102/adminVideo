<template>
  <div class="page">
    <div class="header">
      <div>
        <h2>问题反馈</h2>
        <p>处理小程序用户提交的资源问题、积分问题、上传问题和功能建议。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
    </div>

    <div class="toolbar">
      <el-select v-model="filters.status" clearable placeholder="处理状态" style="width: 150px" @change="loadData">
        <el-option label="待处理" value="pending" />
        <el-option label="处理中" value="processing" />
        <el-option label="已解决" value="resolved" />
        <el-option label="已关闭" value="rejected" />
      </el-select>
      <el-select v-model="filters.feedback_type" clearable placeholder="问题类型" style="width: 160px" @change="loadData">
        <el-option label="资源问题" value="resource" />
        <el-option label="积分问题" value="points" />
        <el-option label="功能建议" value="feature" />
      </el-select>
      <el-input v-model="filters.feedback_id" clearable placeholder="工单 ID 精确查询" style="width: 240px" @keyup.enter="loadData" />
      <el-button :loading="loading" @click="loadData">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <el-table v-loading="loading" :data="feedbacks" border stripe>
      <el-table-column label="工单" min-width="260">
        <template #default="{ row }">
          <div class="ticket-main">
            <el-tag :type="typeTag(row.feedback_type)" effect="light">{{ typeText(row.feedback_type) }}</el-tag>
            <span class="ticket-id">{{ shortId(row.id) }}</span>
            <el-tag v-if="row.appeal_context?.is_appeal" type="danger" effect="light">申诉</el-tag>
            <el-tag v-if="row.appeal_preview?.match_status" :type="previewTag(row.appeal_preview.match_status)" effect="plain">
              {{ previewText(row.appeal_preview) }}
            </el-tag>
          </div>
          <div v-if="contextTags(row).length" class="context-tags">
            <el-tag v-for="tag in contextTags(row)" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
          </div>
          <div class="content-preview">{{ row.content }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="contact" label="联系方式" width="160">
        <template #default="{ row }">
          <span>{{ row.contact || '未填写' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="奖励/返还" width="110" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.reward_points > 0" type="success">{{ row.reward_points }} 分</el-tag>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="处理回复" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ row.admin_reply || row.auto_reply || '暂无回复' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="openDetail(row)">查看</el-button>
          <el-button type="warning" link @click="quickUpdate(row, 'processing')">处理中</el-button>
          <el-button type="success" link @click="openReply(row, 'resolved')">解决</el-button>
          <el-button v-if="canAppeal(row)" type="danger" link @click="approveAppeal(row)">申诉通过</el-button>
          <el-button type="info" link @click="openReply(row, 'rejected')">关闭</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="filters.page"
        v-model:page-size="filters.page_size"
        background
        layout="total, sizes, prev, pager, next"
        :page-sizes="[20, 50, 100]"
        :total="total"
        @change="loadData"
      />
    </div>

    <el-dialog v-model="detailVisible" title="工单详情" width="680px">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工单 ID">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusText(current.status) }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ typeText(current.feedback_type) }}</el-descriptions-item>
          <el-descriptions-item label="联系方式">{{ current.contact || '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatTime(current.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatTime(current.updated_at) }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="current.appeal_context?.is_appeal || contextTags(current).length" class="appeal-card">
          <div class="appeal-card-head">
            <div>
              <div class="detail-title">申诉关联信息</div>
              <div class="appeal-sub">{{ current.appeal_preview?.message || '系统已解析工单中的关联信息' }}</div>
            </div>
            <el-tag :type="previewTag(current.appeal_preview?.match_status || '')">
              {{ previewText(current.appeal_preview) }}
            </el-tag>
          </div>
          <div class="context-tags detail-tags">
            <el-tag v-for="tag in contextTags(current)" :key="tag" effect="plain">{{ tag }}</el-tag>
          </div>
          <div v-if="current.appeal_preview?.match_status === 'matched'" class="appeal-preview">
            预计返还 {{ current.appeal_preview.return_points || 0 }} 分，
            处罚流水 {{ shortId(current.appeal_preview.penalty_ledger_id || '') }}，
            关联 {{ current.appeal_preview.related_type || '-' }} / {{ current.appeal_preview.related_id || '-' }}
          </div>
        </div>
        <div class="detail-block">
          <div class="detail-title">用户描述</div>
          <pre>{{ current.content }}</pre>
        </div>
        <div class="detail-block">
          <div class="detail-title">后台回复</div>
          <pre>{{ current.admin_reply || current.auto_reply || '暂无回复' }}</pre>
        </div>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button v-if="current" type="primary" @click="openReply(current, 'processing')">处理工单</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="replyVisible" :title="replyDialogTitle" width="560px">
      <el-form label-position="top">
        <el-form-item label="处理状态">
          <el-select v-model="replyForm.status" style="width: 100%">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已关闭" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理说明">
          <el-input
            v-model="replyForm.note"
            type="textarea"
            :rows="5"
            maxlength="300"
            show-word-limit
            placeholder="写给用户看的处理说明，例如：已补发积分 / 链接已修复 / 已记录建议"
          />
        </el-form-item>
        <el-form-item label="奖励/返还积分">
          <el-input-number
            v-model="replyForm.reward_points"
            :min="0"
            :max="500"
            :step="10"
            :disabled="replyForm.status !== 'resolved' || Boolean(current?.reward_ledger_id)"
          />
          <span class="hint">
            {{ current?.reward_ledger_id ? '已到账，不能重复发放' : '仅已解决工单会发放到可用积分' }}
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitReply">保存处理结果</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { approveNetdiskFeedbackAppeal, getNetdiskFeedbacks, replyNetdiskFeedback } from '@/utils/api'

type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'rejected'

type FeedbackItem = {
  id: string
  feedback_type: string
  content: string
  contact: string
  status: FeedbackStatus
  auto_reply: string
  admin_reply: string
  reward_points: number
  reward_ledger_id: string
  appeal_context?: {
    is_appeal?: boolean
    resource_id?: string
    resource_title?: string
    pan?: string
    upload_id?: string
    repair_id?: string
    ledger_id?: string
    related_type?: string
    related_id?: string
    ids?: string[]
  }
  appeal_preview?: {
    match_status?: string
    message?: string
    penalty_ledger_id?: string
    related_type?: string
    related_id?: string
    return_points?: number
    created_at?: string
  }
  created_at: string
  updated_at: string
}

const loading = ref(false)
const route = useRoute()
const submitting = ref(false)
const detailVisible = ref(false)
const replyVisible = ref(false)
const feedbacks = ref<FeedbackItem[]>([])
const total = ref(0)
const current = ref<FeedbackItem | null>(null)
const filters = reactive({
  status: '',
  feedback_type: '',
  feedback_id: String(route.query.feedback_id || ''),
  page: 1,
  page_size: 50,
})
const replyForm = reactive<{ status: FeedbackStatus; note: string; reward_points: number }>({
  status: 'processing',
  note: '',
  reward_points: 0,
})

const replyDialogTitle = computed(() => current.value ? `处理工单 ${shortId(current.value.id)}` : '处理工单')

const loadData = async () => {
  loading.value = true
  try {
    const data = await getNetdiskFeedbacks({
      status: filters.status || undefined,
      feedback_type: filters.feedback_type || undefined,
      feedback_id: filters.feedback_id || undefined,
      page: filters.page,
      page_size: filters.page_size,
    })
    feedbacks.value = data.feedbacks || []
    total.value = data.total || feedbacks.value.length
  } catch (error: any) {
    ElMessage.error(error.message || '反馈工单加载失败')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.status = ''
  filters.feedback_type = ''
  filters.feedback_id = ''
  filters.page = 1
  loadData()
}

const openDetail = (row: FeedbackItem) => {
  current.value = row
  detailVisible.value = true
}

const openReply = (row: FeedbackItem, status: FeedbackStatus) => {
  current.value = row
  replyForm.status = status
  replyForm.note = row.admin_reply || ''
  replyForm.reward_points = row.reward_points || (status === 'resolved' ? 10 : 0)
  detailVisible.value = false
  replyVisible.value = true
}

const quickUpdate = async (row: FeedbackItem, status: FeedbackStatus) => {
  current.value = row
  replyForm.status = status
  replyForm.note = row.admin_reply || '工单已进入处理流程。'
  replyForm.reward_points = 0
  await submitReply()
}

const canAppeal = (row: FeedbackItem) => ['resource', 'points'].includes(row.feedback_type) && row.status !== 'resolved'

const contextTags = (row: FeedbackItem) => {
  const context = row.appeal_context || {}
  const tags: string[] = []
  if (context.resource_id) tags.push(`资源 ${context.resource_id}`)
  if (context.resource_title) tags.push(`标题 ${context.resource_title}`)
  if (context.pan) tags.push(`网盘 ${context.pan}`)
  if (context.upload_id) tags.push(`上传 ${context.upload_id}`)
  if (context.repair_id) tags.push(`补链/投诉 ${context.repair_id}`)
  if (context.ledger_id) tags.push(`流水 ${context.ledger_id}`)
  if (context.related_type || context.related_id) tags.push(`关联 ${context.related_type || '-'} / ${context.related_id || '-'}`)
  return tags
}

const previewText = (preview?: FeedbackItem['appeal_preview']) => {
  const status = preview?.match_status || ''
  if (status === 'matched') return `可返 ${preview?.return_points || 0}分`
  if (status === 'missing') return '待补ID'
  if (status === 'resolved') return '已处理'
  if (status === 'not_appeal') return '普通工单'
  return '未预览'
}

const previewTag = (status: string) => {
  if (status === 'matched') return 'success'
  if (status === 'missing') return 'danger'
  if (status === 'resolved') return 'info'
  return 'info'
}

const approveAppeal = async (row: FeedbackItem) => {
  const note = `申诉通过：${row.content.slice(0, 120)}`
  await ElMessageBox.confirm(
    '确认申诉通过？系统会尝试返还最近匹配的失效扣罚积分、恢复信用并关闭待追缴。若用户有多条扣罚且未提供ID，后端会拒绝以避免误返。',
    '申诉通过',
    { type: 'warning' },
  )
  submitting.value = true
  try {
    const data = await approveNetdiskFeedbackAppeal(row.id, note)
    const appeal = data?.appeal || {}
    ElMessage.success(`申诉已处理，返还 ${appeal.returned_points || 0} 积分`)
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '申诉处理失败，请确认工单内容包含上传/补链/资源ID')
  } finally {
    submitting.value = false
  }
}

const submitReply = async () => {
  if (!current.value) return
  submitting.value = true
  try {
    await replyNetdiskFeedback(current.value.id, replyForm.status, replyForm.note.trim(), Number(replyForm.reward_points || 0))
    ElMessage.success('处理结果已保存')
    replyVisible.value = false
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const shortId = (value: string) => `#${String(value || '').replace(/-/g, '').slice(-6).toUpperCase()}`

const formatTime = (value: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'

const typeText = (value: string) => {
  if (value === 'points') return '积分问题'
  if (value === 'feature') return '功能建议'
  return '资源问题'
}

const typeTag = (value: string) => {
  if (value === 'points') return 'warning'
  if (value === 'feature') return 'info'
  return 'success'
}

const statusText = (value: string) => {
  if (value === 'processing') return '处理中'
  if (value === 'resolved') return '已解决'
  if (value === 'rejected') return '已关闭'
  return '待处理'
}

const statusTag = (value: string) => {
  if (value === 'processing') return 'warning'
  if (value === 'resolved') return 'success'
  if (value === 'rejected') return 'info'
  return 'danger'
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

.header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.header h2 {
  margin: 0;
  color: #172033;
  font-size: 20px;
}

.header p {
  margin: 6px 0 0;
  color: #697386;
  font-size: 13px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.ticket-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ticket-id {
  color: #697386;
  font-size: 13px;
}

.content-preview {
  margin-top: 8px;
  color: #25324b;
  line-height: 1.45;
  white-space: pre-wrap;
}

.context-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-block {
  margin-top: 16px;
}

.detail-title {
  margin-bottom: 8px;
  color: #172033;
  font-weight: 700;
}

.appeal-card {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #ffd0d0;
  border-radius: 8px;
  background: #fff8f8;
}

.appeal-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.appeal-sub,
.appeal-preview {
  color: #697386;
  font-size: 13px;
}

.detail-tags {
  margin-top: 10px;
}

.appeal-preview {
  margin-top: 10px;
  word-break: break-all;
}

pre {
  margin: 0;
  padding: 12px;
  border-radius: 6px;
  background: #f6f8fb;
  color: #25324b;
  font-family: inherit;
  line-height: 1.5;
  white-space: pre-wrap;
}

.muted,
.hint {
  color: #697386;
  font-size: 13px;
}

.hint {
  margin-left: 10px;
}
</style>
