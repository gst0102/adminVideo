<template>
  <div class="netdisk-review">
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="上传审核" name="uploads">
        <div class="toolbar">
          <el-select v-model="uploadFilters.status" clearable placeholder="状态" style="width: 150px" @change="loadUploads">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="确认失效" value="invalid_confirmed" />
          </el-select>
          <el-button type="primary" :loading="loading.uploads" @click="loadUploads">刷新</el-button>
          <el-button :loading="seedLoading" @click="seedDemoData">生成演示数据</el-button>
        </div>

        <el-table v-loading="loading.uploads" :data="uploads" border stripe>
          <el-table-column prop="title" label="资源标题" min-width="220" show-overflow-tooltip />
          <el-table-column prop="category" label="分类" width="110" />
          <el-table-column prop="pan" label="网盘" width="90" />
          <el-table-column prop="reward_points" label="奖励" width="90" align="center" />
          <el-table-column prop="status" label="状态" width="120" align="center">
            <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="audit_note" label="备注" min-width="220" show-overflow-tooltip />
          <el-table-column prop="created_at" label="提交时间" width="170">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status === 'pending'" type="success" link @click="openAction('upload', row, 'approve')">通过</el-button>
              <el-button v-if="row.status === 'pending'" type="danger" link @click="openAction('upload', row, 'reject')">拒绝</el-button>
              <el-button v-if="row.status === 'approved'" type="warning" link @click="openAction('upload', row, 'confirm-invalid')">确认失效</el-button>
              <el-tag v-if="!['pending', 'approved'].includes(row.status)" size="small">已处理</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="补链/投诉" name="repairs">
        <div class="toolbar">
          <el-select v-model="repairFilters.mode" clearable placeholder="类型" style="width: 150px" @change="loadRepairs">
            <el-option label="补链" value="repair" />
            <el-option label="投诉" value="report" />
          </el-select>
          <el-select v-model="repairFilters.status" clearable placeholder="状态" style="width: 150px" @change="loadRepairs">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
            <el-option label="确认失效" value="invalid_confirmed" />
          </el-select>
          <el-button type="primary" :loading="loading.repairs" @click="loadRepairs">刷新</el-button>
        </div>

        <el-table v-loading="loading.repairs" :data="repairs" border stripe>
          <el-table-column prop="resource_title" label="关联资源" min-width="220" show-overflow-tooltip />
          <el-table-column prop="mode" label="类型" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.mode === 'repair' ? 'success' : 'warning'">{{ row.mode === 'repair' ? '补链' : '投诉' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="pan" label="网盘" width="90" />
          <el-table-column prop="reward_points" label="奖励" width="90" align="center" />
          <el-table-column prop="status" label="状态" width="120" align="center">
            <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="note" label="说明" min-width="220" show-overflow-tooltip />
          <el-table-column prop="created_at" label="提交时间" width="170">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status === 'pending'" type="success" link @click="openAction('repair', row, 'approve')">通过</el-button>
              <el-button v-if="row.status === 'pending'" type="danger" link @click="openAction('repair', row, 'reject')">拒绝/撤销投诉</el-button>
              <el-button v-if="row.status === 'approved'" type="warning" link @click="openAction('repair', row, 'confirm-invalid')">确认失效</el-button>
              <el-button v-if="row.mode === 'report' && row.status === 'pending'" type="warning" link @click="openAction('repair', row, 'confirm-invalid')">确认投诉</el-button>
              <el-tag v-if="!['pending', 'approved'].includes(row.status)" size="small">已处理</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="隐藏资源" name="resources">
        <div class="toolbar">
          <el-input v-model="resourceFilters.keyword" clearable placeholder="资源标题 / ID / 分类" style="width: 260px" @keyup.enter="loadResources" />
          <el-select v-model="resourceFilters.active" clearable placeholder="可见状态" style="width: 150px" @change="loadResources">
            <el-option label="隐藏中" :value="false" />
            <el-option label="可见" :value="true" />
          </el-select>
          <el-button type="primary" :loading="loading.resources" @click="loadResources">查询</el-button>
        </div>

        <el-table v-loading="loading.resources" :data="resources" border stripe>
          <el-table-column prop="id" label="资源ID" width="100" />
          <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
          <el-table-column prop="category" label="分类" width="120" />
          <el-table-column prop="pan" label="网盘" width="90" />
          <el-table-column prop="cost_points" label="消耗" width="90" align="center" />
          <el-table-column prop="is_active" label="状态" width="110" align="center">
            <template #default="{ row }"><el-tag :type="row.is_active ? 'success' : 'danger'">{{ row.is_active ? '可见' : '隐藏' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button v-if="!row.is_active" type="success" link @click="restoreResource(row)">恢复上架</el-button>
              <el-tag v-else size="small">无需处理</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="待追缴" name="risks">
        <div class="toolbar">
          <el-select v-model="riskFilters.status" clearable placeholder="状态" style="width: 150px" @change="loadRisks">
            <el-option label="待追缴" value="open" />
            <el-option label="已处理" value="cleared" />
          </el-select>
          <el-button type="primary" :loading="loading.risks" @click="loadRisks">刷新</el-button>
        </div>

        <el-table v-loading="loading.risks" :data="riskRecords" border stripe>
          <el-table-column prop="user_id" label="用户ID" min-width="220" show-overflow-tooltip />
          <el-table-column prop="related_type" label="来源" width="130" />
          <el-table-column prop="reason" label="原因" width="170" />
          <el-table-column prop="points_due" label="待追缴" width="100" align="center" />
          <el-table-column prop="points_collected" label="已扣" width="90" align="center" />
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }"><el-tag :type="row.status === 'open' ? 'warning' : 'success'">{{ row.status === 'open' ? '待追缴' : row.status }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="note" label="备注" min-width="260" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="170">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="规则配置" name="config">
        <el-form label-width="170px" class="config-form">
          <el-form-item label="上传奖励积分">
            <el-input-number v-model="config.upload_reward_points" :min="0" :step="1" />
          </el-form-item>
          <el-form-item label="补链奖励积分">
            <el-input-number v-model="config.repair_reward_points" :min="0" :step="1" />
          </el-form-item>
          <el-form-item label="投诉隐藏阈值">
            <el-input-number v-model="config.report_hide_threshold" :min="1" :step="1" />
          </el-form-item>
          <el-form-item label="失效处罚倍数">
            <el-input-number v-model="config.invalid_penalty_multiplier" :min="1" :step="1" />
          </el-form-item>
          <el-form-item label="投诉达阈值自动隐藏">
            <el-switch v-model="config.auto_hide_on_report" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading.config" @click="saveConfig">保存配置</el-button>
            <el-button @click="loadConfig">重载</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="actionVisible" :title="actionTitle" width="520px">
      <el-input v-model="actionNote" type="textarea" :rows="4" placeholder="填写审核备注" />
      <template #footer>
        <el-button @click="actionVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="submitAction">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import {
  getNetdiskAuditConfig,
  getNetdiskRepairs,
  getNetdiskResources,
  getNetdiskRiskRecords,
  getNetdiskUploads,
  restoreNetdiskResource,
  reviewNetdiskRepair,
  reviewNetdiskUpload,
  seedNetdiskReviewDemo,
  updateNetdiskAuditConfig,
} from '@/utils/api'

const activeTab = ref('uploads')
const uploads = ref<any[]>([])
const repairs = ref<any[]>([])
const resources = ref<any[]>([])
const riskRecords = ref<any[]>([])
const loading = reactive({ uploads: false, repairs: false, resources: false, risks: false, config: false })
const seedLoading = ref(false)
const uploadFilters = reactive({ status: 'pending' })
const repairFilters = reactive({ status: 'pending', mode: '' })
const resourceFilters = reactive<{ active: boolean | undefined; keyword: string }>({ active: false, keyword: '' })
const riskFilters = reactive({ status: 'open' })
const config = reactive({
  upload_reward_points: 5,
  repair_reward_points: 5,
  report_hide_threshold: 3,
  invalid_penalty_multiplier: 1,
  auto_hide_on_report: true,
})

const actionVisible = ref(false)
const actionLoading = ref(false)
const actionTitle = ref('')
const actionNote = ref('')
const activeRow = ref<any | null>(null)
const activeKind = ref<'upload' | 'repair'>('upload')
const activeAction = ref<'approve' | 'reject' | 'confirm-invalid'>('approve')

const loadUploads = async () => {
  loading.uploads = true
  try {
    const data = await getNetdiskUploads({ status: uploadFilters.status || undefined, page_size: 100 })
    uploads.value = data.uploads || []
  } catch (error: any) {
    ElMessage.error(buildErrorMessage(error, '上传列表加载失败，请确认后端 8000 已启动'))
  } finally {
    loading.uploads = false
  }
}

const loadRepairs = async () => {
  loading.repairs = true
  try {
    const data = await getNetdiskRepairs({
      status: repairFilters.status || undefined,
      mode: repairFilters.mode || undefined,
      page_size: 100,
    })
    repairs.value = data.repairs || []
  } catch (error: any) {
    ElMessage.error(buildErrorMessage(error, '补链/投诉列表加载失败，请确认后端 8000 已启动'))
  } finally {
    loading.repairs = false
  }
}

const loadResources = async () => {
  loading.resources = true
  try {
    const data = await getNetdiskResources({
      active: resourceFilters.active,
      keyword: resourceFilters.keyword || undefined,
      page_size: 100,
    })
    resources.value = data.resources || []
  } catch (error: any) {
    ElMessage.error(buildErrorMessage(error, '资源列表加载失败，请确认后端 8000 已启动'))
  } finally {
    loading.resources = false
  }
}

const loadRisks = async () => {
  loading.risks = true
  try {
    const data = await getNetdiskRiskRecords({ status: riskFilters.status || undefined, page_size: 100 })
    riskRecords.value = data.risk_records || []
  } catch (error: any) {
    ElMessage.error(buildErrorMessage(error, '待追缴列表加载失败，请确认后端 8000 已启动'))
  } finally {
    loading.risks = false
  }
}

const loadConfig = async () => {
  loading.config = true
  try {
    Object.assign(config, await getNetdiskAuditConfig())
  } catch (error: any) {
    ElMessage.error(buildErrorMessage(error, '配置加载失败，请确认后端 8000 已启动'))
  } finally {
    loading.config = false
  }
}

const saveConfig = async () => {
  loading.config = true
  try {
    await updateNetdiskAuditConfig({ ...config })
    ElMessage.success('网盘审核规则已保存')
  } catch (error: any) {
    ElMessage.error(buildErrorMessage(error, '保存失败'))
  } finally {
    loading.config = false
  }
}

const seedDemoData = async () => {
  seedLoading.value = true
  try {
    await seedNetdiskReviewDemo()
    ElMessage.success('演示数据已生成')
    await Promise.all([loadUploads(), loadRepairs(), loadResources(), loadRisks()])
  } catch (error: any) {
    ElMessage.error(buildErrorMessage(error, '生成演示数据失败，请确认后端以开发模式启动'))
  } finally {
    seedLoading.value = false
  }
}

const openAction = (kind: 'upload' | 'repair', row: any, action: 'approve' | 'reject' | 'confirm-invalid') => {
  activeKind.value = kind
  activeAction.value = action
  activeRow.value = row
  actionNote.value = ''
  actionTitle.value = `${kind === 'upload' ? '上传' : row.mode === 'repair' ? '补链' : '投诉'} - ${actionLabel(action)}`
  actionVisible.value = true
}

const submitAction = async () => {
  if (!activeRow.value) return
  actionLoading.value = true
  try {
    if (activeKind.value === 'upload') {
      await reviewNetdiskUpload(activeRow.value.id, activeAction.value, actionNote.value)
      await loadUploads()
    } else {
      await reviewNetdiskRepair(activeRow.value.id, activeAction.value, actionNote.value)
      await loadRepairs()
      await loadResources()
    }
    ElMessage.success('操作已完成')
    actionVisible.value = false
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

const restoreResource = async (row: any) => {
  await ElMessageBox.confirm(`确认恢复上架「${row.title}」？`, '恢复上架', { type: 'warning' })
  await restoreNetdiskResource(row.id, '后台恢复上架')
  ElMessage.success('资源已恢复')
  await loadResources()
}

const handleTabChange = () => {
  if (activeTab.value === 'uploads') loadUploads()
  if (activeTab.value === 'repairs') loadRepairs()
  if (activeTab.value === 'resources') loadResources()
  if (activeTab.value === 'risks') loadRisks()
  if (activeTab.value === 'config') loadConfig()
}

const actionLabel = (action: string) => ({ approve: '通过', reject: '拒绝', 'confirm-invalid': '确认失效' }[action] || action)
const statusText = (status: string) => ({ pending: '待审核', approved: '已通过', rejected: '已拒绝', invalid_confirmed: '确认失效' }[status] || status)
const buildErrorMessage = (error: any, fallback: string) => {
  const raw = error?.message || ''
  if (raw.includes('status code 500')) return `${fallback}：接口返回 500`
  if (raw.includes('Network Error')) return `${fallback}：网络不可用`
  return raw || fallback
}
type TagType = 'success' | 'primary' | 'warning' | 'info' | 'danger'
const statusType = (status: string): TagType => (
  { pending: 'warning', approved: 'success', rejected: 'danger', invalid_confirmed: 'info' }[status] || 'info'
) as TagType
const formatTime = (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')

loadUploads()
</script>

<style scoped>
.netdisk-review {
  padding: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 16px;
}

.config-form {
  max-width: 520px;
  padding-top: 12px;
}
</style>
