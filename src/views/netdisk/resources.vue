<template>
  <div class="page">
    <div class="toolbar">
      <el-input v-model="filters.keyword" clearable placeholder="搜索资源标题 / ID / 分类 / 网盘" style="width: 320px" @keyup.enter="loadData" />
      <el-select v-model="filters.active" clearable placeholder="可见状态" style="width: 150px" @change="loadData">
        <el-option label="可见" :value="true" />
        <el-option label="隐藏" :value="false" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="loadData">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="resources" border stripe>
      <el-table-column prop="id" label="资源ID" width="120" show-overflow-tooltip />
      <el-table-column prop="title" label="标题" min-width="260" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column prop="pan" label="网盘" width="90" />
      <el-table-column prop="level" label="等级" width="110" />
      <el-table-column prop="cost_points" label="消耗积分" width="100" align="center" />
      <el-table-column prop="downloads" label="获取" width="90" align="center" />
      <el-table-column prop="favorites" label="收藏" width="90" align="center" />
      <el-table-column prop="is_active" label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'danger'">{{ row.is_active ? '可见' : '隐藏' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button v-if="!row.is_active" type="success" link @click="restore(row)">恢复上架</el-button>
          <el-tag v-else size="small">无需处理</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getNetdiskResources, restoreNetdiskResource } from '@/utils/api'

const route = useRoute()
const loading = ref(false)
const resources = ref<any[]>([])
const filters = reactive<{ keyword: string; active: boolean | undefined }>({
  keyword: '',
  active: route.query.active === 'false' ? false : undefined,
})

const loadData = async () => {
  loading.value = true
  try {
    const data = await getNetdiskResources({
      keyword: filters.keyword || undefined,
      active: filters.active,
      page_size: 100,
    })
    resources.value = data.resources || []
  } catch (error: any) {
    ElMessage.error(error.message || '资源库加载失败，请确认后端 8000 已启动')
  } finally {
    loading.value = false
  }
}

const restore = async (row: any) => {
  await ElMessageBox.confirm(`确认恢复上架「${row.title}」？`, '恢复上架', { type: 'warning' })
  await restoreNetdiskResource(row.id, '后台恢复上架')
  ElMessage.success('资源已恢复')
  await loadData()
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

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
</style>
