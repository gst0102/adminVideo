<template>
  <div class="page">
    <div class="header">
      <div>
        <h2>采集待审核池</h2>
        <p>处理 LinuxDo 低置信、疑似重复和新增网盘补充资源。</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadList">刷新</el-button>
    </div>

    <div class="toolbar">
      <el-radio-group v-model="filters.bucket" @change="reloadFirstPage">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="low_confidence">低置信</el-radio-button>
        <el-radio-button label="duplicate">疑似重复</el-radio-button>
        <el-radio-button label="supplement">新增网盘</el-radio-button>
      </el-radio-group>
      <el-select v-model="filters.status" class="status-select" @change="reloadFirstPage">
        <el-option label="待处理" value="pending" />
        <el-option label="已发布" value="published" />
        <el-option label="已合并" value="merged" />
        <el-option label="已跳过" value="skipped" />
        <el-option label="全部状态" value="all" />
      </el-select>
      <el-input
        v-model="filters.keyword"
        class="keyword-input"
        clearable
        placeholder="搜索标题、分类、网盘"
        @keyup.enter="reloadFirstPage"
        @clear="reloadFirstPage"
      />
      <el-button @click="reloadFirstPage">查询</el-button>
    </div>

    <el-alert
      class="notice"
      type="info"
      show-icon
      :closable="false"
      title="通过会创建正式资源；跳过不会入库；合并适合新增网盘补充或确认重复的候选。"
    />

    <el-table v-loading="loading" :data="items" border stripe>
      <el-table-column label="资源" min-width="280" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="title-cell">
            <strong>{{ row.title }}</strong>
            <span>{{ row.source_url || row.source_ref }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="110" />
      <el-table-column prop="pan" label="网盘" width="90" />
      <el-table-column label="标签" min-width="160">
        <template #default="{ row }">
          <div class="tags">
            <el-tag v-for="tag in row.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="置信度" width="92" align="center">
        <template #default="{ row }">
          <el-tag :type="row.confidence >= 75 ? 'success' : 'warning'" size="small">{{ row.confidence }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="重复状态" width="126" align="center">
        <template #default="{ row }">
          <el-tag :type="duplicateTag(row.duplicate_status)" size="small">{{ row.duplicate_text }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="处理状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTag(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="145">
        <template #default="{ row }">{{ formatTime(row.updated_at || row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="210" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" type="primary" link :loading="handlingId === row.id" @click="handle(row, 'approve')">
            通过
          </el-button>
          <el-button v-if="row.status === 'pending'" type="warning" link :loading="handlingId === row.id" @click="handle(row, 'merge')">
            合并
          </el-button>
          <el-button v-if="row.status === 'pending'" type="info" link :loading="handlingId === row.id" @click="handle(row, 'skip')">
            跳过
          </el-button>
          <span v-if="row.status !== 'pending'" class="muted">已处理</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        layout="total, prev, pager, next, sizes"
        :total="total"
        :page-sizes="[20, 50, 100]"
        @current-change="loadList"
        @size-change="reloadFirstPage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getNetdiskCollectedResources, handleNetdiskCollectedResource } from '@/utils/api'

type ActionType = 'approve' | 'skip' | 'merge'

const loading = ref(false)
const handlingId = ref('')
const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(50)
const filters = reactive({
  bucket: 'all',
  status: 'pending',
  keyword: '',
})

const loadList = async () => {
  loading.value = true
  try {
    const data = await getNetdiskCollectedResources({
      bucket: filters.bucket,
      status: filters.status,
      keyword: filters.keyword,
      page: page.value,
      page_size: pageSize.value,
    })
    items.value = data.collected_resources || []
    total.value = Number(data.total || 0)
  } catch (error: any) {
    ElMessage.error(error.message || '采集待审核池加载失败')
  } finally {
    loading.value = false
  }
}

const reloadFirstPage = () => {
  page.value = 1
  loadList()
}

const handle = async (row: any, action: ActionType) => {
  const actionText = action === 'approve' ? '通过入库' : action === 'merge' ? '合并处理' : '跳过'
  const message = action === 'approve'
    ? '确认将该候选发布为正式资源？'
    : action === 'merge'
      ? '确认合并该候选？新增网盘会作为补充资源入库，重复资源不会重复创建。'
      : '确认跳过该候选？'
  try {
    await ElMessageBox.confirm(message, actionText, {
      confirmButtonText: actionText,
      cancelButtonText: '取消',
      type: action === 'skip' ? 'warning' : 'info',
    })
  } catch {
    return
  }
  handlingId.value = row.id
  try {
    const result = await handleNetdiskCollectedResource(row.id, action, actionText)
    ElMessage.success(result?.message || '处理完成')
    await loadList()
  } catch (error: any) {
    ElMessage.error(error.message || '处理失败')
  } finally {
    handlingId.value = ''
  }
}

const duplicateTag = (value: string) => {
  if (value === 'same_link' || value === 'same_title_same_pan') return 'danger'
  if (value === 'supplement_pan') return 'warning'
  return 'success'
}

const statusText = (value: string) => {
  if (value === 'published') return '已发布'
  if (value === 'merged') return '已合并'
  if (value === 'skipped') return '已跳过'
  return '待处理'
}

const statusTag = (value: string) => {
  if (value === 'published' || value === 'merged') return 'success'
  if (value === 'skipped') return 'info'
  return 'warning'
}

const formatTime = (time: string) => (time ? dayjs(time).format('MM-DD HH:mm') : '-')

onMounted(loadList)
</script>

<style scoped>
.page {
  padding: 18px;
  background: #f6f8fb;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.header h2 {
  margin: 0;
  color: #172033;
  font-size: 22px;
}

.header p {
  margin: 6px 0 0;
  color: #697386;
  font-size: 13px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  background: #fff;
}

.status-select {
  width: 132px;
}

.keyword-input {
  width: 260px;
}

.notice {
  margin-bottom: 12px;
}

.title-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.title-cell strong {
  color: #172033;
}

.title-cell span,
.muted {
  color: #697386;
  font-size: 12px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding: 14px 0;
}
</style>
