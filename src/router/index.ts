import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '数据看板', icon: 'DataAnalysis' }
      },
      {
        path: 'video',
        name: 'Video',
        component: () => import('@/views/video/index.vue'),
        meta: { title: '视频下载', icon: 'VideoCamera' }
      },
      {
        path: 'anime',
        name: 'Anime',
        component: () => import('@/views/anime/index.vue'),
        meta: { title: '影视资源', icon: 'VideoPlay' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/index.vue'),
        meta: { title: '用户管理', icon: 'User' }
      },
      {
        path: 'users/detail/:id',
        name: 'UserDetail',
        component: () => import('@/views/users/detail.vue'),
        meta: { title: '用户详情', hidden: true }
      },
      {
        path: 'finance',
        name: 'Finance',
        component: () => import('@/views/finance/index.vue'),
        meta: { title: '财务管理', icon: 'Money' }
      },
      {
        path: 'finance/withdrawals',
        name: 'Withdrawals',
        component: () => import('@/views/finance/withdrawals.vue'),
        meta: { title: '提现管理', icon: 'Wallet' }
      },
      {
        path: 'finance/settlements',
        name: 'GameSettlements',
        component: () => import('@/views/finance/settlements.vue'),
        meta: { title: '积分结算', icon: 'Finished' }
      },
      {
        path: 'netdisk/review',
        name: 'NetdiskReview',
        component: () => import('@/views/netdisk/review.vue'),
        meta: { title: '网盘审核', icon: 'FolderChecked' }
      },
      {
        path: 'config',
        name: 'Config',
        component: () => import('@/views/config/index.vue'),
        meta: { title: '系统配置', icon: 'Setting' }
      },
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('@/views/chat/index.vue'),
        meta: { title: '客服中心', icon: 'ChatDotRound' }
      },
      {
        path: 'test-upload',
        name: 'TestUpload',
        component: () => import('@/views/test-upload.vue'),
        meta: { title: '上传测试', hidden: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('admin_token')

  if (to.path !== '/login' && !token) {
    next({ path: '/login' })
  } else {
    next()
  }
})

export default router