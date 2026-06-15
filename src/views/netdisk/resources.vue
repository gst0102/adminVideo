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

    <div class="stats">
      <el-tag type="info" effect="plain">全部 {{ n(stats.total) }}</el-tag>
      <el-tag type="success" effect="plain">可见 {{ n(stats.active) }}</el-tag>
      <el-tag type="danger" effect="plain">隐藏 {{ n(stats.hidden) }}</el-tag>
      <span>小程序前台只展示可见资源。</span>
      <el-button type="danger" plain :loading="cleanupLoading" @click="previewCleanup">清理隐藏重复资源</el-button>
    </div>

    <el-table v-loading="loading" :data="resources" border stripe>
      <el-table-column prop="id" label="资源ID" width="120" show-overflow-tooltip />
      <el-table-column label="上架时间" width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ formatPublishedAt(row) }}</template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="260" show-overflow-tooltip />
      <el-table-column label="网盘链接" min-width="320" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="link-cell">
            <el-link v-if="row.link" type="primary" :href="row.link" target="_blank" :underline="false">
              {{ row.link }}
            </el-link>
            <span v-else class="muted">暂无链接</span>
            <el-button v-if="row.link" link type="primary" @click="copyText(row.link, '链接已复制')">复制</el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="120" />
      <el-table-column prop="pan" label="网盘" width="90" />
      <el-table-column label="提取码" width="110" align="center">
        <template #default="{ row }">
          <el-button v-if="row.extract_code" link type="primary" @click="copyText(row.extract_code, '提取码已复制')">
            {{ row.extract_code }}
          </el-button>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="解压码" width="110" align="center">
        <template #default="{ row }">
          <el-button v-if="row.unzip_code" link type="primary" @click="copyText(row.unzip_code, '解压码已复制')">
            {{ row.unzip_code }}
          </el-button>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="level" label="等级" width="110" />
      <el-table-column prop="cost_points" label="消耗积分" width="100" align="center" />
      <el-table-column prop="downloads" label="获取" width="90" align="center" />
      <el-table-column prop="favorites" label="收藏" width="90" align="center" />
      <el-table-column prop="is_active" label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'danger'">{{ row.is_active ? '可见' : '隐藏' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button v-if="!row.is_active" type="success" link @click="restore(row)">恢复上架</el-button>
          <el-button v-else type="danger" link @click="hide(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      background
      layout="prev, pager, next, total"
      :total="total"
      :page-size="filters.page_size"
      :current-page="filters.page"
      @current-change="changePage"
    />

    <el-dialog v-model="cleanupDialog.visible" title="清理隐藏重复资源" width="720px">
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        title="只删除隐藏且同链接已有可见资源的重复记录；有收藏、解锁、投诉、质量记录的隐藏资源会保留。"
      />
      <el-descriptions class="cleanup-summary" border :column="2">
        <el-descriptions-item label="重复隐藏资源">{{ n(cleanupPreview.duplicate_count) }}</el-descriptions-item>
        <el-descriptions-item label="重复链接">{{ n(cleanupPreview.duplicate_link_count) }}</el-descriptions-item>
        <el-descriptions-item label="可删除">{{ n(cleanupPreview.deletable_count) }}</el-descriptions-item>
        <el-descriptions-item label="受保护">{{ n(cleanupPreview.protected_count) }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="cleanupPreview.samples || []" border stripe size="small">
        <el-table-column prop="title" label="将删除示例" min-width="240" show-overflow-tooltip />
        <el-table-column prop="pan" label="网盘" width="90" />
        <el-table-column prop="active_resource_id" label="保留资源ID" min-width="160" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="cleanupDialog.visible = false">取消</el-button>
        <el-button
          type="danger"
          :loading="cleanupLoading"
          :disabled="!cleanupPreview.deletable_count"
          @click="executeCleanup"
        >
          确认删除 {{ n(cleanupPreview.deletable_count) }} 条
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  cleanupHiddenDuplicateResources,
  getNetdiskResources,
  hideNetdiskResource,
  previewHiddenDuplicateCleanup,
  restoreNetdiskResource,
} from '@/utils/api'

const route = useRoute()
const loading = ref(false)
const cleanupLoading = ref(false)
const resources = ref<any[]>([])
const total = ref(0)
const stats = reactive({ total: 0, active: 0, hidden: 0 })
const cleanupDialog = reactive({ visible: false })
const cleanupPreview = reactive({
  duplicate_count: 0,
  duplicate_link_count: 0,
  deletable_count: 0,
  protected_count: 0,
  samples: [] as any[],
})
const filters = reactive<{ keyword: string; active: boolean | undefined; page: number; page_size: number }>({
  keyword: '',
  active: route.query.active === 'false' ? false : undefined,
  page: 1,
  page_size: 100,
})

const n = (value: any) => Number(value || 0).toLocaleString()

const formatPublishedAt = (row: any) => {
  const precise = row?.published_at_precise
  if (precise) return precise
  const raw = row?.created_at || row?.published_at
  if (!raw) return '-'

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return String(raw).replace('T', ' ').slice(0, 16)

  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const copyText = async (text: string, message: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const input = document.createElement('textarea')
      input.value = text
      input.setAttribute('readonly', 'readonly')
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    ElMessage.success(message)
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const data = await getNetdiskResources({
      keyword: filters.keyword || undefined,
      active: filters.active,
      page: filters.page,
      page_size: filters.page_size,
    })
    resources.value = data.resources || []
    total.value = data.total || 0
    Object.assign(stats, data.stats || { total: 0, active: 0, hidden: 0 })
  } catch (error: any) {
    ElMessage.error(error.message || '资源库加载失败，请确认后端 8000 已启动')
  } finally {
    loading.value = false
  }
}

const changePage = (page: number) => {
  filters.page = page
  loadData()
}

const restore = async (row: any) => {
  await ElMessageBox.confirm(`确认恢复上架「${row.title}」？`, '恢复上架', { type: 'warning' })
  await restoreNetdiskResource(row.id, '后台恢复上架')
  ElMessage.success('资源已恢复')
  await loadData()
}

const hide = async (row: any) => {
  const result = await ElMessageBox.prompt(
    `确认删除「${row.title}」？删除后小程序不再展示，可在隐藏资源中恢复。`,
    '删除资源',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      inputPlaceholder: '删除原因，例如：链接失效 / 内容不符合 / 重复资源',
      inputValue: '后台人工删除不符合资源',
      type: 'warning',
    },
  )
  await hideNetdiskResource(row.id, result.value || '后台人工删除不符合资源')
  ElMessage.success('资源已删除，小程序不再展示')
  await loadData()
}

const previewCleanup = async () => {
  cleanupLoading.value = true
  try {
    const data = await previewHiddenDuplicateCleanup()
    Object.assign(cleanupPreview, data || {})
    cleanupDialog.visible = true
  } catch (error: any) {
    ElMessage.error(error.message || '清理预览加载失败')
  } finally {
    cleanupLoading.value = false
  }
}

const executeCleanup = async () => {
  await ElMessageBox.confirm(`确认删除 ${n(cleanupPreview.deletable_count)} 条隐藏重复资源？`, '确认清理', { type: 'warning' })
  cleanupLoading.value = true
  try {
    const data = await cleanupHiddenDuplicateResources('后台清理隐藏重复资源')
    ElMessage.success(`已删除 ${n(data.deleted_count)} 条隐藏重复资源`)
    cleanupDialog.visible = false
    await loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '清理失败')
  } finally {
    cleanupLoading.value = false
  }
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

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  color: #697386;
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}

.cleanup-summary {
  margin: 14px 0;
}

.link-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.link-cell .el-link {
  display: inline-block;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: #9aa4b2;
}
</style>
