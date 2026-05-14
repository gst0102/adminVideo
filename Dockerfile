
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

# 合并所有 RUN 命令：安装 pnpm → 安装依赖 → 添加缺失依赖
RUN npm install -g pnpm && \
    if [ -f "pnpm-lock.yaml" ]; then \
      pnpm install --frozen-lockfile --prod=false && \
      pnpm add @element-plus/icons-vue -D; \
    else \
      npm install && \
      npm install @element-plus/icons-vue --save-dev; \
    fi

COPY . .

# 构建（跳过类型检查）
RUN if [ -f "pnpm-lock.yaml" ]; then \
      pnpm run build -- --skip-type-check; \
    else \
      npm run build -- --skip-type-check; \
    fi

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
