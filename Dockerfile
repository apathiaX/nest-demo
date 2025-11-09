# ============================================
# 多阶段构建 Dockerfile
# ============================================

# ============================================
# 阶段 1: 依赖安装
# ============================================
FROM node:20-alpine AS deps

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖配置文件
COPY package.json pnpm-lock.yaml ./

# 复制 Prisma schema
COPY prisma ./prisma/

# 安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 安装所有依赖（用于构建）
RUN pnpm install --frozen-lockfile

# 生成 Prisma Client
RUN pnpm run prisma:generate

# ============================================
# 阶段 2: 构建应用
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# ============================================
# 阶段 3: 生产运行
# ============================================
FROM node:20-alpine AS runner

# 设置工作目录
WORKDIR /app

# 设置 NODE_ENV
ENV NODE_ENV=production

# 安装 dumb-init (用于处理信号)
RUN apk add --no-cache dumb-init

# 创建非特权用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# 安装 pnpm
RUN npm install -g pnpm

# 复制必要的文件
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# 创建日志和上传目录
RUN mkdir -p logs uploads && \
    chown -R nestjs:nodejs logs uploads

# 切换到非特权用户
USER nestjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 作为入口点
ENTRYPOINT ["dumb-init", "--"]

# 启动命令
CMD ["node", "dist/main.js"]

