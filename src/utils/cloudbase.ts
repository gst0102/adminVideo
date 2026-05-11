import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = 'cloud1-0gnyce4y6d0e6caa'

let app: ReturnType<typeof cloudbase.init> | null = null
let initialized = false

export async function getCloudBase() {
  if (app && initialized) return app

  app = cloudbase.init({
    env: ENV_ID,
    persistence: 'local'
  })

  const auth = app.auth()
  try {
    await auth.signInAnonymously()
    initialized = true
    console.log('[Cloudbase] ✓ 匿名登录成功')
  } catch (err) {
    console.error('[Cloudbase] 匿名登录失败:', err)
    throw err
  }

  return app
}

export async function callFunction(name: string, data: any = {}) {
  const tcb = await getCloudBase()
  console.log(`[Cloudbase] 调用云函数: ${name}`, JSON.stringify(data)?.substring(0, 200))
  
  const res = await tcb.callFunction({
    name,
    data
  })

  const result = res.result as any
  console.log(`[Cloudbase] ${name} 响应:`, result)

  return result
}
