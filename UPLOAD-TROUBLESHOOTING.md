# admin-upload 接口测试与排查指南

## 🔧 **快速测试步骤**

### 方法1：浏览器控制台测试（推荐）

1. 打开 Admin 管理系统页面（http://localhost:5173）
2. 按 `F12` 打开开发者工具
3. 切换到 **Console（控制台）** 标签
4. 复制下面的代码并粘贴到控制台，按回车执行：

```javascript
// ========== 接口连通性测试 ==========
async function testUploadAPI() {
  const URL = 'https://cloud1-0gnyce4y6d0e6caa-1403550175.ap-shanghai.app.tcloudbase.com/admin-upload'
  
  console.log('🚀 开始测试接口...')
  
  try {
    // 测试1：基础连通性
    console.log('\n📋 [测试1] 基础连通性')
    const res1 = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test', data: {} })
    })
    const data1 = await res1.json()
    console.log('状态码:', res1.status)
    console.log('响应:', data1)
    
    if (data1.code === 200) {
      console.log('✅ 接口连通正常！')
      
      // 测试2：图片上传
      console.log('\n📋 [测试2] 图片上传功能')
      const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      
      const res2 = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uploadImage',
          data: {
            base64Data: testImage,
            fileName: 'test.png',
            folder: 'banner'
          }
        })
      })
      
      const data2 = await res2.json()
      console.log('状态码:', res2.status)
      console.log('完整响应:', data2)
      
      if (data2.code === 200 && data2.data?.success) {
        console.log('\n🎉 上传成功！')
        console.log('FileID:', data2.data.fileID)
        console.log('URL:', data2.data.tempFileURL)
      } else {
        console.error('\n❌ 上传失败:', data2.msg)
      }
    } else {
      console.error('❌ 接口异常:', data1.msg)
    }
    
  } catch (err) {
    console.error('❌ 请求失败:', err.message)
  }
}

// 执行测试
testUploadAPI()
```

5. 查看控制台输出的结果

---

### 方法2：使用 Postman / Apifox 测试

#### 请求配置：

```
URL: https://cloud1-0gnyce4y6d0e6caa-1403550175.ap-shanghai.app.tcloudbase.com/admin-upload
Method: POST
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "action": "test",
  "data": {}
}
```

#### 预期成功响应：

```json
{
  "code": 200,
  "data": {
    "message": "接口测试成功",
    "timestamp": "2026-05-11T12:00:00.000Z"
  }
}
```

---

## 🐛 **常见问题排查**

### 问题1：返回 404 Not Found

**原因**：
- 云函数未部署
- HTTP触发器未配置
- URL地址错误

**解决**：
1. 确认云函数已上传部署
2. 在云开发控制台检查HTTP触发器是否添加
3. 确认环境ID和函数名正确

---

### 问题2：返回 403 Forbidden

**原因**：
- 身份验证配置问题
- IP白名单限制
- CORS跨域问题

**解决**：
1. 开发阶段：将触发器设为"免鉴权"
2. 检查是否有IP白名单限制
3. 确保请求来源允许

---

### 问题3：返回 500 Internal Error

**原因**：
- 云函数代码错误
- 云存储权限不足
- 参数格式错误

**解决**：
1. 查看**云函数日志**（最重要！）
2. 检查云存储读写权限
3. 使用上面的测试脚本查看详细错误信息

**查看日志位置**：
```
腾讯云控制台 → 云开发 → 环境 → 日志 → 实时日志
或
微信开发者工具 → 云开发 → 云函数 → admin-upload → 日志
```

---

### 问题4：CORS 跨域错误

**现象**：浏览器控制台显示 CORS policy 错误

**原因**：前端域名不在白名单中

**解决**：
在云开发控制台 → 设置 → 安全规则 → 添加你的Admin域名：
```
http://localhost:5173
https://your-admin-domain.com
```

---

## 📊 **测试结果分析**

| 测试项 | 成功标志 | 失败表现 | 解决方案 |
|--------|----------|----------|----------|
| 连通性测试 | 返回 `{code:200}` 或 `{code:400}` | 404/403/网络错误 | 检查部署和权限 |
| 图片上传 | 返回 `success:true` + fileID | 返回错误消息 | 查看云函数日志 |
| 数据库保存 | Banner表格显示新行 | 表格无变化 | 检查数据绑定 |

---

## ✅ **检查清单**

在报告问题前，请确认以下项目：

- [ ] 云函数代码已更新（使用新的优化版本）
- [ ] 云函数已重新部署到云端
- [ ] HTTP触发器已添加并启用
- [ ] 触发器的身份验证设为"免鉴权"（开发阶段）
- [ ] 云存储权限已开启（允许读写）
- [ ] Admin系统正在运行（npm run dev）
- [ ] 浏览器控制台无CORS错误
- [ ] 已运行测试脚本并获得具体错误信息

---

## 💡 **获取帮助**

如果测试后仍有问题，请提供以下信息：

1. **测试脚本的完整输出**
2. **浏览器控制台的Network标签截图**（显示失败的请求）
3. **云函数日志截图**（如果有500错误）
4. **具体的错误提示信息**

这样我可以快速定位问题所在！🎯
