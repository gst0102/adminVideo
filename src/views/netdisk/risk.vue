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
      <el-table-column prop="related_type" label="来源" width="150" />
      <el-table-column prop="related_id" label="关联记录" min-width="180" show-overflow-tooltip />
      <el-table-column prop="reason" label="原因" width="180" />
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
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { getNetdiskRiskRecords } from '@/utils/api'

const loading = ref(false)
const records = ref<any[]>([])
const filters = reactive({ status: 'open' })

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

const formatTime = (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-')

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
