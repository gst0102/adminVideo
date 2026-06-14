import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'

const staleChunkPattern = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('admin_chunk_reload') === '1') return
  sessionStorage.setItem('admin_chunk_reload', '1')
  window.location.reload()
})
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason || '')
  if (!staleChunkPattern.test(message) || sessionStorage.getItem('admin_chunk_reload') === '1') return
  sessionStorage.setItem('admin_chunk_reload', '1')
  window.location.reload()
})
window.addEventListener('load', () => {
  sessionStorage.removeItem('admin_chunk_reload')
})

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
