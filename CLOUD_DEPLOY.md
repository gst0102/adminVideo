# Admin 云函数部署指南

## 📋 架构说明

```
Admin (Vue前端) 
    ↓ HTTP请求 (fetch)
云函数 admin-api (部署在微信云端)
    ↓ 最高权限
微信云数据库
```

**优点：**
- ✅ 无需本地服务器（node server.js）
- ✅ 无需配置腾讯云密钥（SECRET_ID/KEY）
- ✅ 云函数天然有数据库操作权限
- ✅ 简单直接，符合你的理解

---

## 🚀 部署步骤

### 第1步：上传云函数

在**微信开发者工具**中操作：

1. 打开项目 `d:\Desktop\vedo-project\video-ts`
2. 左侧文件树找到 `cloudfunctions/admin-api`
3. **右键点击** `admin-api` 文件夹
4. 选择 **"上传并部署：云端安装依赖"**
5. 等待部署完成（约30秒-1分钟）

### 第2步：开启HTTP访问权限

部署完成后，需要开启云函数的HTTP访问：

#### 方法A：通过微信开发者工具

1. 在 `cloudfunctions/admin-api` 上**右键**
2. 选择 **"详情"** 或 **"属性"**
3. 找到 **"HTTP访问"** 选项卡
4. 点击 **"开启"** 按钮
5. 复制显示的 **HTTP访问地址**

#### 方法B：通过云开发控制台

1. 访问 [微信云开发控制台](https://cloud.weixin.qq.com)
2. 进入你的环境 `cloud1-0gnyce4y6d0e6caa`
3. 左侧菜单 → **"云函数"**
4. 找到 `admin-api` 函数
5. 点击进入详情页
6. 找到 **"触发方式"** 或 **"HTTP访问"**
7. 开启并复制地址

### 第3步：获取HTTP访问地址

开启后你会得到类似这样的地址：

```
https://cloud1-0gnyce4y6d0e6caa.service.tcloudbase.com/admin-api
```

**把这个地址更新到代码中！**

打开文件：`admin/src/store/index.ts`

找到第11行：
```javascript
let CLOUD_FUNCTION_URL = `https://${ENV_ID}.service.tcloudbase.com/${FUNCTION_NAME}`
```

如果地址不同，改成你实际的地址。

---

## ✅ 测试是否成功

### 启动前端

```bash
cd d:\Desktop\vedo-project\video-ts\admin
npm run dev
```

### 登录测试

1. 打开浏览器访问 http://localhost:5173
2. 用户名: `admin` 密码: `admin123`
3. 登录后查看控制台日志：

**如果成功连接到云函数：**
```
[Cloud] 调用云函数: getDashboardStats
[Cloud] 云函数响应: {code: 200, data: {...}}
[Store] ✓ 已连接到云函数（真实数据库模式）
```

**如果使用模拟数据（云函数未部署）：**
```
[Cloud] 调用失败 (getDashboardStats): Failed to fetch...
[Cloud] 无法连接到云函数，使用模拟数据
[Store] ⚠ 未连接到云函数，使用模拟数据模式
```

---

## 🔧 常见问题

### Q1：找不到"HTTP访问"选项？

**可能原因：**
- 微信开发者工具版本太旧 → 更新到最新版
- 该环境未开通HTTP访问功能 → 检查云开发控制台设置

**解决方案：**
使用云开发控制台开启：
```
云开发控制台 → 你的环境 → 云函数 → admin-api → 触发管理 → 开启HTTP触发
```

### Q2：提示404或网络错误？

**检查清单：**
- [ ] 云函数已成功部署？
- [ ] HTTP访问已开启？
- [ ] 地址正确？（区分大小写）
- [ ] 网络能访问外网？

### Q3：想关闭模拟模式？

一旦云函数部署成功并开启了HTTP访问，代码会**自动切换到真实模式**，无需手动修改！

---

## 📝 支持的操作接口

| 接口名称 | 功能 | 参数示例 |
|---------|------|---------|
| `getDashboardStats` | 获取统计数据 | 无 |
| `getConfig` | 获取系统配置 | `{type: 'vip_settings'}` |
| `updateConfig` | 更新系统配置 | `{type, enabled, packages}` |
| `getUserList` | 获取用户列表 | `{page: 1, pageSize: 20}` |
| `getWithdrawalList` | 获取提现列表 | `{status: 1}` |
| `processWithdrawal` | 审核提现 | `{recordId, action: 'approve'}` |

所有接口都通过统一的云函数入口调用，由云函数内部分发处理。

---

## 💡 开发流程建议

### 阶段1：开发调试（当前）

```
不部署云函数 → 自动使用模拟数据 → 快速迭代UI和逻辑
```

### 阶段2：功能联调

```
部署云函数 → 开启HTTP访问 → 自动连接真实数据库 → 测试完整流程
```

### 阶段3：生产上线

```
保持云函数运行 → 前端打包部署 → 正式对外服务
```

---

## 🎯 下一步

1. ✅ 部署云函数（第1步）
2. ✅ 开启HTTP访问（第2步）
3. ✅ 启动前端测试（第3步）
4. ✅ 开始正常开发和调试！

有问题随时问我！🚀
