import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' },
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
        meta: { title: '运营看板', icon: 'DataAnalysis' },
      },
      {
        path: 'review',
        name: 'Review',
        component: () => import('@/views/netdisk/review.vue'),
        meta: { title: '审核中心', icon: 'FolderChecked' },
      },
      {
        path: 'resources',
        name: 'Resources',
        component: () => import('@/views/netdisk/resources.vue'),
        meta: { title: '资源库', icon: 'Files' },
      },
      {
        path: 'risks',
        name: 'Risks',
        component: () => import('@/views/netdisk/risk.vue'),
        meta: { title: '风控/待追缴', icon: 'Warning' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/netdisk/config.vue'),
        meta: { title: '规则配置', icon: 'Setting' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.path !== '/login' && !token) {
    next({ path: '/login' })
    return
  }
  next()
})

export default router
