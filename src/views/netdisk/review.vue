<template>
  <div class="page">
    <div class="toolbar">
      <el-radio-group v-model="activeTab" @change="loadCurrent">
        <el-radio-button label="uploads">上传审核</el-radio-button>
        <el-radio-button label="repairs">补链审核</el-radio-button>
        <el-radio-button label="reports">投诉核验</el-radio-button>
      </el-radio-group>
      <el-select v-model="filters.status" clearable placeholder="状态" style="width: 150px" @change="loadCurrent">
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已拒绝" value="rejected" />
        <el-option label="确认失效" value="invalid_confirmed" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="loadCurrent">刷新</el-button>
      <el-button :loading="seedLoading" @click="seedDemo">生成演示数据</el-button>
    </div>

    <el-alert
      v-if="targetUploadId || targetRepairId"
      class="target-alert"
      type="info"
      show-icon
      :closable="false"
      :title="targetUploadId ? '已从待追缴详情定位到指定上传记录' : '已从资源质量详情定位到指定投诉记录'"
    />

    <el-table v-if="activeTab === 'uploads'" v-loading="loading" :data="uploads" border stripe :row-class-name="rowClassName">
      <el-table-column prop="title" label="资源标题" min-width="240" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column prop="pan" label="网盘" width="90" />
      <el-table-column prop="reward_points" label="奖励" width="90" align="center" />
      <el-table-column prop="status" label="状态" width="120" align="center">
        <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="audit_note" label="备注" min-width="240" show-overflow-tooltip />
      <el-table-column prop="created_at" label="提交时间" width="170">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" type="success" link @click="openAction('upload', row, 'approve')">通过</el-button>
          <el-button v-if="row.status === 'pending'" type="danger" link @click="openAction('upload', row, 'reject')">拒绝</el-button>
          <el-button v-if="row.status === 'approved'" type="warning" link :disabled="!isSupervisor" @click="openAction('upload', row, 'confirm-invalid')">确认失效</el-button>
          <el-tag v-if="!['pending', 'approved'].includes(row.status)" size="small">已处理</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-table v-else v-loading="loading" :data="repairs" border stripe :row-class-name="rowClassName">
      <el-table-column prop="resource_title" label="关联资源" min-width="240" show-overflow-tooltip />
      <el-table-column prop="pan" label="网盘" width="90" />
      <el-table-column prop="reward_points" label="奖励" width="90" align="center" />
      <el-table-column prop="status" label="状态" width="120" align="center">
        <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="note" label="说明" min-width="240" show-overflow-tooltip />
      <el-table-column prop="created_at" label="提交时间" width="170">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" type="success" link :disabled="actionForApprove === 'confirm-invalid' && !isSupervisor" @click="openAction('repair', row, actionForApprove)">通过</el-button>
          <el-button v-if="row.status === 'pending'" type="danger" link @click="openAction('repair', row, 'reject')">
            {{ activeTab === 'reports' ? '撤销投诉' : '拒绝' }}
          </el-button>
          <el-button v-if="row.status === 'approved' && activeTab === 'repairs'" type="warning" link :disabled="!isSupervisor" @click="openAction('repair', row, 'confirm-invalid')">确认失效</el-button>
          <el-tag v-if="!['pending', 'approved'].includes(row.status)" size="small">已处理</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px">
      <div v-if="dialog.kind === 'upload' && dialog.action === 'approve'" class="resource-level-box">
        <div class="label">资源等级 / 解锁消耗</div>
        <el-radio-group v-model="dialog.resource_level" @change="syncCostByLevel">
          <el-radio-button label="normal">普通 5分</el-radio-button>
          <el-radio-button label="featured">精选 10分</el-radio-button>
          <el-radio-button label="official">官方 20分</el-radio-button>
        </el-radio-group>
      </div>
      <el-input v-model="dialog.note" type="textarea" :rows="4" placeholder="填写审核备注" />
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.loading" @click="submitAction">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '@/store'
import {
  getNetdiskRepairs,
  getNetdiskUploads,
  reviewNetdiskRepair,
  reviewNetdiskUpload,
  seedNetdiskReviewDemo,
} from '@/utils/api'

const route = useRoute()
const adminStore = useAdminStore()
const activeTab = ref(String(route.query.tab || 'uploads'))
const targetUploadId = ref(String(route.query.upload_id || ''))
const targetRepairId = ref(String(route.query.repair_id || ''))
const filters = reactive({ status: targetUploadId.value || targetRepairId.value ? '' : 'pending' })
const uploads = ref<any[]>([])
const repairs = ref<any[]>([])
const loading = ref(false)
const seedLoading = ref(false)
const dialog = reactive({
  visible: false,
  loading: false,
  title: '',
  note: '',
  kind: 'upload' as 'upload' | 'repair',
  action: 'approve' as 'approve' | 'reject' | 'confirm-invalid',
  resource_level: 'normal',
  cost_points: 5,
  row: null as any,
})

const actionForApprove = computed(() => (activeTab.value === 'reports' ? 'confirm-invalid' : 'approve') as 'approve' | 'confirm-invalid')
const isSupervisor = computed(() => ['admin', 'supervisor'].includes(adminStore.role))

const loadCurrent = async () => {
  loading.value = true
  try {
    if (activeTab.value === 'uploads') {
      const data = await getNetdiskUploads({
        status: filters.status || undefined,
        upload_id: targetUploadId.value || undefined,
        page_size: 100,
      })
      uploads.value = data.uploads || []
      if (targetUploadId.value && uploads.value.length === 0) {
        ElMessage.warning('没有找到这条上传记录，可能已被删除或参数无效')
      }
    } else {
      const data = await getNetdiskRepairs({
        status: filters.status || undefined,
        mode: activeTab.value === 'reports' ? 'report' : 'repair',
        repair_id: targetRepairId.value || undefined,
        page_size: 100,
      })
      repairs.value = data.repairs || []
      if (targetRepairId.value && repairs.value.length === 0) {
        ElMessage.warning('没有找到这条投诉记录，可能已被删除或参数无效')
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '列表加载失败，请确认后端 8000 已启动')
  } finally {
    loading.value = false
  }
}

const seedDemo = async () => {
  seedLoading.value = true
  try {
    await seedNetdiskReviewDemo()
    ElMessage.success('演示数据已生成')
    await loadCurrent()
  } catch (error: any) {
    ElMessage.error(error.message || '生成演示数据失败')
  } finally {
    seedLoading.value = false
  }
}

const openAction = (kind: 'upload' | 'repair', row: any, action: 'approve' | 'reject' | 'confirm-invalid') => {
  if (action === 'confirm-invalid' && !isSupervisor.value) {
    ElMessage.warning('普通运营不能确认失效，请主管处理')
    return
  }
  dialog.kind = kind
  dialog.action = action
  dialog.row = row
  dialog.note = ''
  dialog.resource_level = 'normal'
  dialog.cost_points = 5
  dialog.title = `${row.title || row.resource_title} - ${actionLabel(action)}`
  dialog.visible = true
}

const syncCostByLevel = () => {
  dialog.cost_points = ({ normal: 5, featured: 10, official: 20 } as Record<string, number>)[dialog.resource_level] || 5
}

const submitAction = async () => {
  if (!dialog.row) return
  if (dialog.action === 'confirm-invalid' && !isSupervisor.value) {
    ElMessage.warning('普通运营不能确认失效，请主管处理')
    return
  }
  dialog.loading = true
  try {
    if (dialog.kind === 'upload') {
      await reviewNetdiskUpload(dialog.row.id, dialog.action, dialog.note, {
        resource_level: dialog.action === 'approve' ? dialog.resource_level : undefined,
        cost_points: dialog.action === 'approve' ? dialog.cost_points : undefined,
      })
    } else {
      await reviewNetdiskRepair(dialog.row.id, dialog.action, dialog.note)
    }
    ElMessage.success('操作已完成')
    dialog.visible = false
    await loadCurrent()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    dialog.loading = false
  }
}

const actionLabel = (action: string) => ({ approve: '通过', reject: '拒绝/撤销', 'confirm-invalid': '确认失效' }[action] || action)
const statusText = (status: string) => ({ pending: '待审核', approved: '已通过', rejected: '已拒绝', invalid_confirmed: '确认失效' }[status] || status)
type TagType = 'success' | 'primary' | 'warning' | 'info' | 'danger'
const statusType = (status: string): TagType => ({ pending: 'warning', approved: 'success', rejected: 'danger', invalid_confirmed: 'info' }[status] || 'info') as TagType
const formatTime = (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')
const rowClassName = ({ row }: { row: any }) => {
  const targetId = activeTab.value === 'uploads' ? targetUploadId.value : targetRepairId.value
  return targetId && row.id === targetId ? 'target-row' : ''
}

onMounted(loadCurrent)
</script>

<style scoped>
.page {
  background: #fff;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  padding: 18px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.target-alert {
  margin-bottom: 12px;
}

.resource-level-box {
  margin-bottom: 14px;
}

.label {
  margin-bottom: 8px;
  color: #667085;
  font-size: 13px;
}

:deep(.target-row) {
  --el-table-tr-bg-color: #fff7ed;
}
</style>
