# 视频平台管理后台

基于 Vue 3 + TypeScript + Element Plus 的 PC 管理端。

## 运行

1. 启动后端

```bash
cd d:\Desktop\vedo-project\myproject
uv sync
uv run python main.py
```

2. 启动管理端

```bash
cd d:\Desktop\vedo-project\adminVideo
npm install
npm run dev
```

默认访问地址：

- 管理端：[http://localhost:5173](http://localhost:5173)
- 后端接口：[http://localhost:8000](http://localhost:8000)

Vite 会把 `/api` 代理到本地 `8000`，所以后端需要一起启动。

## 默认登录

- 用户名：`admin`
- 密码：`admin123`
