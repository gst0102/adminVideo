<template>
  <div class="page">
    <div class="toolbar">
      <el-input
        v-model="filters.keyword"
        clearable
        placeholder="搜索昵称 / openid / 邀请码"
        style="width: 340px"
        @keyup.enter="searchUsers"
      />
      <el-select v-model="filters.is_vip" clearable placeholder="会员状态" style="width: 150px" @change="loadUsers">
        <el-option label="会员" :value="true" />
        <el-option label="非会员" :value="false" />
      </el-select>
      <el-button type="primary" :loading="loading" @click="searchUsers">查询</el-button>
    </div>

    <el-table v-loading="loading" :data="users" border stripe @row-click="openDetail">
      <el-table-column prop="nickname" label="用户" min-width="180">
        <template #default="{ row }">
          <div class="user-cell">
            <el-avatar :size="34" :src="row.avatar" />
            <div>
              <strong>{{ row.nickname || '微信用户' }}</strong>
              <small>{{ row.openid }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="invite_code" label="邀请码" width="110" />
      <el-table-column prop="account.consumable_points" label="可用积分" width="130" align="right">
        <template #default="{ row }">{{ n(row.account?.consumable_points) }}</template>
      </el-table-column>
      <el-table-column prop="account.total_points" label="总积分" width="130" align="right">
        <template #default="{ row }">{{ n(row.account?.total_points) }}</template>
      </el-table-column>
      <el-table-column prop="account.frozen_points" label="待验证" width="110" align="right">
        <template #default="{ row }">{{ n(row.account?.frozen_points) }}</template>
      </el-table-column>
      <el-table-column prop="account.withdrawable_points" label="可提现" width="110" align="right">
        <template #default="{ row }">{{ n(row.account?.withdrawable_points) }}</template>
      </el-table-column>
      <el-table-column prop="is_vip" label="会员" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.is_vip ? 'success' : 'info'">{{ row.is_vip ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click.stop="openDetail(row)">详情</el-button>
          <el-button type="success" link @click.stop="openAdjust(row, 'add')">新增积分</el-button>
          <el-button type="warning" link @click.stop="openAdjust(row, 'consume')">消耗积分</el-button>
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

    <el-drawer v-model="detailVisible" title="用户详情" size="720px">
      <template v-if="current">
        <div class="summary">
          <div>
            <span>可用积分</span>
            <strong>{{ n(current.account?.consumable_points) }}</strong>
          </div>
          <div>
            <span>总积分</span>
            <strong>{{ n(current.account?.total_points) }}</strong>
          </div>
          <div>
            <span>待验证</span>
            <strong>{{ n(current.account?.frozen_points) }}</strong>
          </div>
          <div>
            <span>可提现</span>
            <strong>{{ n(current.account?.withdrawable_points) }}</strong>
          </div>
        </div>

        <el-descriptions :column="1" border>
          <el-descriptions-item label="昵称">{{ current.nickname }}</el-descriptions-item>
          <el-descriptions-item label="openid">{{ current.openid }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="邀请码">{{ current.invite_code }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ current.created_at }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-actions">
          <el-button type="success" @click="openAdjust(current, 'add')">新增积分</el-button>
          <el-button type="warning" @click="openAdjust(current, 'consume')">消耗积分</el-button>
        </div>

        <h3>最近积分流水</h3>
        <el-table :data="current.points_ledger || []" border size="small">
          <el-table-column prop="created_at" label="时间" width="160" />
          <el-table-column prop="source" label="来源" width="120" />
          <el-table-column prop="change_type" label="类型" min-width="150" />
          <el-table-column prop="points_delta" label="积分" width="100" align="right">
            <template #default="{ row }">
              <span :class="{ plus: row.points_delta > 0, minus: row.points_delta < 0 }">{{ n(row.points_delta) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="balance_consumable_after" label="可用余额" width="120" align="right">
            <template #default="{ row }">{{ n(row.balance_consumable_after) }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        </el-table>
      </template>
    </el-drawer>

    <el-dialog v-model="adjustVisible" :title="adjustForm.action === 'add' ? '新增积分' : '消耗积分'" width="460px">
      <el-form label-width="90px">
        <el-form-item label="用户">
          <div>{{ adjustUser?.nickname }} / {{ adjustUser?.openid }}</div>
        </el-form-item>
        <el-form-item label="当前可用">
          <strong>{{ n(adjustUser?.account?.consumable_points) }}</strong>
        </el-form-item>
        <el-form-item label="积分数量">
          <el-input-number v-model="adjustForm.points" :min="1" :max="10000000" :step="10" style="width: 220px" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="adjustForm.note" type="textarea" :rows="3" placeholder="例如：客服补发 / 违规扣除" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjusting" @click="submitAdjust">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adjustAdminUserPoints, getAdminUserDetail, getAdminUsers } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const users = ref<any[]>([])
const total = ref(0)
const detailVisible = ref(false)
const current = ref<any | null>(null)
const adjustVisible = ref(false)
const adjusting = ref(false)
const adjustUser = ref<any | null>(null)
const filters = reactive<{ keyword: string; is_vip: boolean | undefined; page: number; page_size: number }>({
  keyword: '',
  is_vip: undefined,
  page: 1,
  page_size: 20,
})
const adjustForm = reactive<{ action: 'add' | 'consume'; points: number; note: string }>({
  action: 'add',
  points: 100,
  note: '',
})

const n = (value: any) => Number(value || 0).toLocaleString()

const applyRouteQuery = () => {
  filters.keyword = typeof route.query.keyword === 'string' ? route.query.keyword : ''
}

const loadUsers = async () => {
  loading.value = true
  try {
    const data = await getAdminUsers({
      keyword: filters.keyword || undefined,
      is_vip: filters.is_vip,
      page: filters.page,
      page_size: filters.page_size,
    })
    users.value = data.list || []
    total.value = data.total || 0
  } catch (error: any) {
    ElMessage.error(error.message || '用户看板加载失败')
  } finally {
    loading.value = false
  }
}

const searchUsers = () => {
  filters.page = 1
  router.replace({ path: '/users', query: { keyword: filters.keyword || undefined } })
  loadUsers()
}

const changePage = (page: number) => {
  filters.page = page
  loadUsers()
}

const openDetail = async (row: any) => {
  try {
    current.value = await getAdminUserDetail(row.id)
    detailVisible.value = true
  } catch (error: any) {
    ElMessage.error(error.message || '用户详情加载失败')
  }
}

const openAdjust = (row: any, action: 'add' | 'consume') => {
  adjustUser.value = row
  adjustForm.action = action
  adjustForm.points = action === 'add' ? 100 : Math.min(100, Number(row.account?.consumable_points || 1))
  adjustForm.note = action === 'add' ? '客服补发积分' : '后台人工扣除积分'
  adjustVisible.value = true
}

const submitAdjust = async () => {
  if (!adjustUser.value) return
  const label = adjustForm.action === 'add' ? '新增' : '消耗'
  await ElMessageBox.confirm(
    `确认给「${adjustUser.value.nickname || adjustUser.value.openid}」${label} ${n(adjustForm.points)} 积分？`,
    `${label}积分`,
    { type: 'warning' },
  )
  adjusting.value = true
  try {
    const data = await adjustAdminUserPoints(adjustUser.value.id, {
      action: adjustForm.action,
      points: adjustForm.points,
      note: adjustForm.note,
    })
    ElMessage.success('用户积分已调整')
    adjustVisible.value = false
    adjustUser.value.account = data.account
    if (current.value?.id === adjustUser.value.id) {
      current.value = await getAdminUserDetail(adjustUser.value.id)
    }
    await loadUsers()
  } catch (error: any) {
    ElMessage.error(error.message || '积分调整失败')
  } finally {
    adjusting.value = false
  }
}

watch(
  () => route.query,
  () => {
    applyRouteQuery()
    filters.page = 1
    loadUsers()
  },
)

onMounted(() => {
  applyRouteQuery()
  loadUsers()
})
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

.user-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}

.user-cell small {
  display: block;
  max-width: 360px;
  overflow: hidden;
  color: #697386;
  text-overflow: ellipsis;
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}

.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.summary div {
  padding: 14px;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  background: #f8fafc;
}

.summary span,
.summary strong {
  display: block;
}

.summary span {
  color: #697386;
  font-size: 12px;
}

.summary strong {
  margin-top: 6px;
  font-size: 20px;
}

.detail-actions {
  margin: 14px 0;
}

.plus {
  color: #1f9d55;
  font-weight: 700;
}

.minus {
  color: #c2410c;
  font-weight: 700;
}
</style>
