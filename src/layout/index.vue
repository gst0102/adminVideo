<template>
  <el-container class="ops-shell">
    <el-aside width="232px" class="sidebar">
      <div class="brand">
        <el-icon :size="28"><Collection /></el-icon>
        <div>
          <div class="brand-title">悦享资源库</div>
          <div class="brand-subtitle">运营后台</div>
        </div>
      </div>

      <el-menu :default-active="activeMenu" class="menu" router>
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>运营看板</span>
        </el-menu-item>
        <el-menu-item index="/review">
          <el-icon><FolderChecked /></el-icon>
          <span>审核中心</span>
        </el-menu-item>
        <el-menu-item index="/resources">
          <el-icon><Files /></el-icon>
          <span>资源库</span>
        </el-menu-item>
        <el-menu-item index="/risks">
          <el-icon><Warning /></el-icon>
          <span>风控/待追缴</span>
        </el-menu-item>
        <el-menu-item index="/quality-alerts">
          <el-icon><Warning /></el-icon>
          <span>质量预警</span>
        </el-menu-item>
        <el-menu-item index="/quality-review-pool">
          <el-icon><CircleCheck /></el-icon>
          <span>待复核池</span>
        </el-menu-item>
        <el-menu-item index="/logs">
          <el-icon><Tickets /></el-icon>
          <span>操作日志</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>规则配置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="topbar">
        <div>
          <div class="page-title">{{ currentTitle }}</div>
          <div class="page-subtitle">处理资源审核、投诉、积分风控和运营增长</div>
        </div>
        <div class="topbar-actions">
          <el-tag :type="adminStore.connectionStatus === 'connected' ? 'success' : 'danger'" effect="plain">
            {{ adminStore.connectionStatus === 'connected' ? '后端已连接' : '后端未连接' }}
          </el-tag>
          <el-button link @click="adminStore.testConnection">检测连接</el-button>
          <el-dropdown @command="handleCommand">
            <span class="user-chip">
              <el-avatar :size="30" icon="UserFilled" />
              <span>管理员</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '@/store'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => String(route.meta?.title || '运营后台'))

const handleCommand = (command: string) => {
  if (command === 'logout') {
    adminStore.logout()
    router.push('/login')
  }
}

onMounted(() => {
  adminStore.testConnection()
})
</script>

<style scoped>
.ops-shell {
  width: 100%;
  height: 100vh;
  background: #f5f7fb;
}

.sidebar {
  background: #172033;
  color: #fff;
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  height: 76px;
  padding: 0 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
}

.brand-subtitle {
  margin-top: 4px;
  color: #9ca8bd;
  font-size: 12px;
}

.menu {
  border-right: 0;
  background: transparent;
}

.menu :deep(.el-menu-item) {
  color: #c7d0df;
  height: 48px;
}

.menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: #0f766e;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #e6ebf2;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #172033;
}

.page-subtitle {
  margin-top: 4px;
  color: #697386;
  font-size: 13px;
}

.topbar-actions,
.user-chip {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-chip {
  cursor: pointer;
  color: #25324b;
}

.content {
  padding: 22px;
  overflow-y: auto;
}
</style>
