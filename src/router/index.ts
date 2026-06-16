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
    redirect: '/ops-center',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '运营看板', icon: 'DataAnalysis' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/index.vue'),
        meta: { title: '用户看板', icon: 'User' },
      },
      {
        path: 'payments',
        name: 'Payments',
        component: () => import('@/views/payments/index.vue'),
        meta: { title: '充值订单', icon: 'Wallet' },
      },
      {
        path: 'equity-ledger',
        name: 'EquityLedger',
        component: () => import('@/views/finance/equity-ledger.vue'),
        meta: { title: '权益金流水', icon: 'Money' },
      },
      {
        path: 'withdrawals',
        name: 'Withdrawals',
        component: () => import('@/views/finance/withdrawals.vue'),
        meta: { title: '提现管理', icon: 'WalletFilled' },
      },
      {
        path: 'ops-center',
        name: 'OpsCenter',
        component: () => import('@/views/netdisk/ops-center.vue'),
        meta: { title: '待处理中心', icon: 'BellFilled' },
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
        path: 'requests',
        name: 'Requests',
        component: () => import('@/views/netdisk/requests.vue'),
        meta: { title: '悬赏管理', icon: 'Aim' },
      },
      {
        path: 'resource-subscriptions',
        name: 'ResourceSubscriptions',
        component: () => import('@/views/netdisk/resource-subscriptions.vue'),
        meta: { title: '追更订阅', icon: 'Bell' },
      },
      {
        path: 'resource-quality/:id',
        name: 'ResourceQualityDetail',
        component: () => import('@/views/netdisk/resource-quality-detail.vue'),
        meta: { title: '资源质量详情', icon: 'Files' },
      },
      {
        path: 'risks',
        name: 'Risks',
        component: () => import('@/views/netdisk/risk.vue'),
        meta: { title: '风控/待追缴', icon: 'Warning' },
      },
      {
        path: 'quality-alerts',
        name: 'QualityAlerts',
        component: () => import('@/views/netdisk/quality-alerts.vue'),
        meta: { title: '质量预警', icon: 'Warning' },
      },
      {
        path: 'quality-review-pool',
        name: 'QualityReviewPool',
        component: () => import('@/views/netdisk/quality-review-pool.vue'),
        meta: { title: '待复核池', icon: 'CircleCheck' },
      },
      {
        path: 'collected-resources',
        name: 'CollectedResources',
        component: () => import('@/views/netdisk/collected-resources.vue'),
        meta: { title: '采集待审核池', icon: 'Download' },
      },
      {
        path: 'feedbacks',
        name: 'Feedbacks',
        component: () => import('@/views/netdisk/feedbacks.vue'),
        meta: { title: '问题反馈', icon: 'ChatDotRound' },
      },
      {
        path: 'logs',
        name: 'Logs',
        component: () => import('@/views/netdisk/logs.vue'),
        meta: { title: '操作日志', icon: 'Tickets' },
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
