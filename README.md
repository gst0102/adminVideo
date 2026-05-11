# 视频平台管理后台

基于 Vue3 + TypeScript + Element Plus 的 PC 端管理系统，用于管理微信小程序的运营数据。

## 📦 技术栈

- **框架**: Vue 3.4+ (Composition API)
- **语言**: TypeScript
- **UI库**: Element Plus 2.6+
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **图表**: ECharts 5


## 🚀 快速开始

### 1️⃣ 安装依赖

```bash
cd admin
npm install
# 或使用 pnpm
pnpm install
```

### 2️⃣ 启动开发服务器

```bash
npm run dev
# 或
pnpm dev
```

访问: http://localhost:3000

### 3️⃣ 构建生产版本

```bash
npm run build
# 或
pnpm build
```

## 📁 项目结构

```
admin/
├── src/
│   ├── main.ts                 # 应用入口
│   ├── App.vue                 # 根组件
│   ├── router/                 # 路由配置
│   │   └── index.ts
│   ├── store/                  # Pinia 状态管理
│   │   └── index.ts            # 管理后台 Store
│   ├── utils/                  # 工具函数
│   │   └── cloud.ts           # 云开发连接工具
│   ├── layout/                 # 布局组件
│   │   └── index.vue          # 主布局（侧边栏+顶栏）
│   └── views/                  # 页面组件
│       ├── login/              # 登录页
│       │   └── index.vue
│       ├── dashboard/          # 数据看板
│       │   └── index.vue
│       ├── users/              # 用户管理
│       │   ├── index.vue      # 用户列表
│       │   └── detail.vue     # 用户详情
│       ├── finance/            # 财务管理
│       │   ├── index.vue      # 收益统计
│       │   └── withdrawals.vue# 提现管理
│       ├── config/             # 系统配置
│       │   └── index.vue      # VIP/客服配置
│       └── chat/               # 客服中心
│           └── index.vue      # 聊天界面
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

## 🔐 登录信息

**默认账号**: `admin`  
**默认密码**: `admin123`  

> ⚠️ 请在生产环境中修改默认密码！

## 📊 功能模块

### 1️⃣ 数据看板 (Dashboard)
- 用户总数 / VIP用户数 / 今日新增
- 总收益 / 提现订单 / 待处理数
- 用户增长趋势图 (ECharts)
- 用户类型分布饼图
- 最近注册用户列表
- 待处理提现列表

### 2️⃣ 用户管理 (Users)
- 用户列表（支持搜索、筛选）
- 查看用户详情：
  - 基本信息（昵称、邀请码、OpenID等）
  - 收益数据（总收益、未提现、已提现、冻结金额）
  - 下线统计（一级、二级下线数量）
  - 提现记录历史
- 一级/二级用户层级关系查看

### 3️⃣ 财务管理 (Finance)
#### 收益统计
- 总提现金额 / 今日提现
- 成功笔数 / 待处理数
- 收益趋势图表
- 提现记录列表

#### 提现管理
- 状态筛选（全部/待处理/已完成/失败）
- 关键词搜索（用户名、订单号）
- 日期范围筛选
- 批量操作（批量通过/拒绝）
- 单条操作（通过/拒绝/重试/查看详情）
- 数据导出功能

### 4️⃣ 系统配置 (Config)

#### VIP会员配置
- 开关控制（是否开启会员功能）
- 套餐管理：
  - 套餐名称、价格、时长
  - 原价（显示折扣）
  - 权益描述
- 提现配置：
  - 最低/最高提现金额
  - 提现说明文案

#### 客服配置
- 自动回复开关
- 欢迎语设置
- 离线回复设置
- 快捷回复管理

#### 其他配置
- 平台名称
- Logo上传
- 客服联系方式

### 5️⃣ 客服中心 (Chat)
- 咨询用户列表（显示最近消息、未读数）
- 实时聊天窗口
- 消息时间线展示
- 快捷回复功能
- 用户资料快速查看
- 未读消息标记

## 🔗 数据库连接

系统直接连接微信云开发数据库，无需后端服务器。

**环境ID**: `cloud1-0gnyce4y6d0e6caa`

**主要数据集合**:
- `user-info`: 用户信息表
- `withdraw_records`: 提现记录表
- `chat_messages`: 聊天消息表
- `system_config`: 系统配置表

## ⚙️ 配置说明

### 云开发初始化
在 `src/utils/cloud.ts` 中配置：

```typescript
app = Tcb.init({
  env: '你的环境ID'
})
```

### 权限要求
确保云开发数据库权限设置为：
- 管理员可读写所有集合
- 或创建专门的管理员角色

## 🎨 UI 特性

✅ **响应式布局** - 适配不同屏幕尺寸  
✅ **暗色侧边栏** - 专业的后台风格  
✅ **数据可视化** - ECharts 图表  
✅ **表格操作** - 排序、筛选、分页  
✅ **表单验证** - 完整的数据校验  
✅ **消息提示** - 操作反馈  
✅ **快捷回复** - 提高客服效率  

## 🚀 部署建议

### 开发环境
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

构建产物在 `dist/` 目录，可部署到：
- Nginx
- Vercel
- Netlify
- 静态网站托管服务

## 📝 开发计划

- [x] 基础架构搭建
- [x] 登录认证
- [x] 数据看板
- [x] 用户管理
- [x] 财务管理
- [x] 系统配置
- [x] 客服中心
- [ ] 数据导出 (Excel/CSV)
- [ ] 操作日志记录
- [ ] 多管理员支持
- [ ] 权限管理 (RBAC)
- [ ] 数据备份/恢复

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License
