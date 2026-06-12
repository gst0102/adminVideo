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
      </el-select>
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
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
import { getNetdiskAuditLogs } from '@/utils/api'

const loading = ref(false)
const logs = ref<any[]>([])
const filters = reactive({ action: '', target_type: '' })
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
]

const loadData = async () => {
  loading.value = true
  try {
    const data = await getNetdiskAuditLogs({
      action: filters.action || undefined,
      target_type: filters.target_type || undefined,
      page_size: 100,
    })
    logs.value = data.logs || []
  } catch (error: any) {
    ElMessage.error(error.message || '操作日志加载失败，请确认后端 8000 已启动')
  } finally {
    loading.value = false
  }
}

const formatTime = (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')
const actionText = (value: string) => actionOptions.find(item => item.value === value)?.label || value
const targetText = (value: string) => ({ netdisk_upload: '上传', netdisk_repair: '补链/投诉', netdisk_resource: '资源' }[value] || value)

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
