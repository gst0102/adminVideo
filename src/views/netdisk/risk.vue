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
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'open'" type="primary" link @click="openAction(row, 'collect')">追缴扣除</el-button>
          <el-button v-if="row.status === 'open'" type="warning" link @click="openAction(row, 'waive')">人工关闭</el-button>
          <el-tag v-else size="small">已处理</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="520px">
      <el-input v-model="dialog.note" type="textarea" :rows="4" placeholder="填写处理备注" />
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button :type="dialog.action === 'waive' ? 'warning' : 'primary'" :loading="dialog.loading" @click="submitAction">
          {{ dialog.action === 'waive' ? '人工关闭' : '确认扣除' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { collectNetdiskRiskRecord, getNetdiskRiskRecords, waiveNetdiskRiskRecord } from '@/utils/api'

const loading = ref(false)
const records = ref<any[]>([])
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
