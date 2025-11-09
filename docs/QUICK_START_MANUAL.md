# ⚡ 快速开始 - 传统部署（不使用 Docker）

## 🎯 5 步完成部署

### Step 1: 安装依赖软件

```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
npm install -g pnpm

# MySQL 8.0
sudo apt install -y mysql-server

# Redis
sudo apt install -y redis-server
```

---

### Step 2: 创建数据库

```bash
# 登录 MySQL
sudo mysql -u root -p
```

```sql
-- 创建数据库和用户
CREATE DATABASE vibe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vibe_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON vibe.* TO 'vibe_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

### Step 3: 配置项目

```bash
# 进入项目目录
cd /path/to/nest-demo

# 安装依赖
pnpm install --frozen-lockfile

# 创建 .env 文件
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://vibe_user:your_password@localhost:3306/vibe
REDIS_URL=redis://:your_redis_password@localhost:6379
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
CORS_ORIGINS=https://yourdomain.com
ENABLE_API_DOCS=false
LOG_LEVEL=info
EOF

# 编辑 .env，填写实际密码
nano .env
```

---

### Step 4: 初始化数据库（重要！）⭐

```bash
# 1. 生成 Prisma Client
pnpm run prisma:generate

# 2. 执行数据库迁移（创建表结构）
NODE_ENV=production pnpm run prisma:migrate:deploy

# 3. 初始化种子数据（插入角色、权限等）
NODE_ENV=production pnpm run prisma:seed:prod
```

**种子数据包含**:
- ✅ 16 个系统权限（user:read, plan:create, task:update 等）
- ✅ 4 个系统角色（超级管理员、普通用户、访客、内容审核员）
- ✅ 角色权限关联

**如需测试账号**（开发环境）:
```bash
NODE_ENV=development pnpm run prisma:seed:dev
# 会创建：admin/admin123, testuser/admin123
```

---

### Step 5: 启动应用

#### 方法 1: 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 构建项目
pnpm run build

# 启动应用
pm2 start dist/main.js --name nest-demo

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs nest-demo
```

#### 方法 2: 直接启动

```bash
# 构建项目
pnpm run build

# 启动
NODE_ENV=production node dist/main.js
```

---

## ✅ 验证部署

```bash
# 健康检查
curl http://localhost:3000/health

# 应返回: {"status":"ok"}
```

---

## 📊 查看种子数据

```bash
# 方法 1: MySQL 命令行
mysql -u vibe_user -p vibe
SELECT * FROM roles;
SELECT * FROM permissions;
EXIT;

# 方法 2: Prisma Studio（可视化）
NODE_ENV=production pnpm run prisma:studio
# 打开: http://localhost:5555
```

---

## 🔄 常用命令

```bash
# PM2 管理
pm2 restart nest-demo    # 重启
pm2 stop nest-demo        # 停止
pm2 logs nest-demo        # 查看日志
pm2 monit                 # 监控

# 数据库操作
pnpm run prisma:migrate:deploy      # 执行迁移
pnpm run prisma:seed:prod            # 初始化种子数据
pnpm run prisma:studio               # 查看数据库

# 更新部署
git pull origin main                 # 拉取代码
pnpm install --frozen-lockfile       # 安装依赖
pnpm run build                       # 构建
pm2 restart nest-demo                # 重启
```

---

## 🐛 常见问题

### Q: 数据库连接失败

```bash
# 检查配置
cat .env | grep DATABASE_URL

# 测试连接
mysql -u vibe_user -p vibe

# 检查 MySQL 状态
sudo systemctl status mysql
```

### Q: 种子数据没有初始化

```bash
# 确保先执行迁移
NODE_ENV=production pnpm run prisma:migrate:deploy

# 再执行种子
NODE_ENV=production pnpm run prisma:seed:prod

# 验证
mysql -u vibe_user -p -e "SELECT * FROM roles;" vibe
```

### Q: 应用无法启动

```bash
# 查看日志
pm2 logs nest-demo

# 检查端口占用
sudo netstat -tlnp | grep :3000

# 重新构建
pnpm run build
pm2 restart nest-demo
```

---

## 📚 详细文档

- **完整部署指南**: [DEPLOY_MANUAL.md](./DEPLOY_MANUAL.md)
- **数据库初始化**: [DATABASE_INIT.md](./DATABASE_INIT.md)
- **命令速查**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

---

**🎉 部署完成！访问 http://your-server-ip:3000**

