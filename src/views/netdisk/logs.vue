<template>
  <div class="page">
    <div class="toolbar">
      <el-select v-model="filters.action" clearable placeholder="动作" style="width: 190px" @change="loadData">
        <el-option v-for="item in actionOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="filters.target_type" clearable placeholder="对象类型" style="width: 170px" @change="loadData">
        <el-option label="上传" value="netdisk_upload" />
        <el-option label="补链/投诉" value="netdisk_repair" />
        <el-option label="资源" value="netdisk_resource" />
        <el-option label="待追缴" value="netdisk_risk_record" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        style="width: 260px"
        @change="loadData"
      />
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
      <el-button :loading="exporting" @click="exportLogs">导出CSV</el-button>
    </div>

    <el-table v-loading="loading" :data="logs" border stripe>
      <el-table-column prop="created_at" label="时间" width="170">
        <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column prop="admin_name" label="管理员" width="110" />
      <el-table-column prop="action" label="动作" width="150">
        <template #default="{ row }">{{ actionText(row.action) }}</template>
      </el-table-column>
      <el-table-column prop="target_type" label="对象" width="120">
        <template #default="{ row }">{{ targetText(row.target_type) }}</template>
      </el-table-column>
      <el-table-column prop="target_title" label="标题" min-width="240" show-overflow-tooltip />
      <el-table-column prop="target_id" label="记录ID" min-width="220" show-overflow-tooltip />
      <el-table-column prop="note" label="备注" min-width="240" show-overflow-tooltip />
      <el-table-column prop="result" label="结果" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.result === 'success' ? 'success' : 'danger'">{{ row.result }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { exportNetdiskAuditLogs, getNetdiskAuditLogs } from '@/utils/api'

const loading = ref(false)
const exporting = ref(false)
const logs = ref<any[]>([])
const filters = reactive({ action: '', target_type: '' })
const dateRange = ref<string[]>([])
const actionOptions = [
  { label: '上传通过', value: 'upload_approve' },
  { label: '上传拒绝', value: 'upload_reject' },
  { label: '上传确认失效', value: 'upload_confirm_invalid' },
  { label: '补链通过', value: 'repair_approve' },
  { label: '补链拒绝', value: 'repair_reject' },
  { label: '补链确认失效', value: 'repair_confirm_invalid' },
  { label: '投诉确认', value: 'report_confirm' },
  { label: '投诉撤销', value: 'report_reject' },
  { label: '资源恢复上架', value: 'resource_restore' },
  { label: '待追缴扣除', value: 'risk_collect' },
  { label: '待追缴关闭', value: 'risk_waive' },
]

const buildParams = () => ({
  action: filters.action || undefined,
  target_type: filters.target_type || undefined,
  start_date: dateRange.value?.[0],
  end_date: dateRange.value?.[1],
  page_size: 100,
})

const loadData = async () => {
  loading.value = true
  try {
    const data = await getNetdiskAuditLogs(buildParams())
    logs.value = data.logs || []
  } catch (error: any) {
    ElMessage.error(error.message || '操作日志加载失败，请确认后端 8000 已启动')
  } finally {
    loading.value = false
  }
}

const exportLogs = async () => {
  exporting.value = true
  try {
    await exportNetdiskAuditLogs(buildParams())
    ElMessage.success('日志已导出')
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

const formatTime = (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')
const actionText = (value: string) => actionOptions.find(item => item.value === value)?.label || value
const targetText = (value: string) => ({ netdisk_upload: '上传', netdisk_repair: '补链/投诉', netdisk_resource: '资源', netdisk_risk_record: '待追缴' }[value] || value)

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
</style>
