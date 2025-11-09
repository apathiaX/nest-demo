# 🚀 传统部署指南（不使用 Docker）

本指南适用于直接在服务器上部署 NestJS 应用，不使用 Docker。

## 📋 环境要求

- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / macOS
- **Node.js**: 20.x
- **pnpm**: 8.0+
- **MySQL**: 8.0+
- **Redis**: 7.0+
- **内存**: 2GB+
- **磁盘**: 10GB+

---

## 📦 Step 1: 安装依赖软件

### 1.1 安装 Node.js 20.x

#### Ubuntu/Debian

```bash
# 添加 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 安装 Node.js
sudo apt install -y nodejs

# 验证安装
node --version  # 应该显示 v20.x.x
npm --version
```

#### CentOS/RHEL

```bash
# 添加 NodeSource 仓库
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# 安装 Node.js
sudo yum install -y nodejs

# 验证安装
node --version
npm --version
```

#### macOS

```bash
# 使用 Homebrew
brew install node@20

# 验证安装
node --version
```

### 1.2 安装 pnpm

```bash
# 全局安装 pnpm
npm install -g pnpm

# 验证安装
pnpm --version
```

### 1.3 安装 MySQL 8.0

#### Ubuntu/Debian

```bash
# 更新包索引
sudo apt update

# 安装 MySQL Server
sudo apt install -y mysql-server

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation

# 验证安装
mysql --version
```

#### CentOS/RHEL

```bash
# 安装 MySQL 仓库
sudo yum install -y https://dev.mysql.com/get/mysql80-community-release-el8-1.noarch.rpm

# 安装 MySQL Server
sudo yum install -y mysql-server

# 启动 MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 获取临时密码
sudo grep 'temporary password' /var/log/mysqld.log

# 安全配置
sudo mysql_secure_installation
```

### 1.4 安装 Redis

#### Ubuntu/Debian

```bash
# 安装 Redis
sudo apt install -y redis-server

# 启动 Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 验证安装
redis-cli ping  # 应返回 PONG
```

#### CentOS/RHEL

```bash
# 安装 Redis
sudo yum install -y redis

# 启动 Redis
sudo systemctl start redis
sudo systemctl enable redis

# 验证安装
redis-cli ping
```

---

## 🗄️ Step 2: 配置数据库

### 2.1 创建 MySQL 数据库和用户

```bash
# 登录 MySQL
sudo mysql -u root -p

# 在 MySQL 命令行中执行：
```

```sql
-- 创建数据库
CREATE DATABASE vibe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（请修改密码）
CREATE USER 'vibe_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 授予权限
GRANT ALL PRIVILEGES ON vibe.* TO 'vibe_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### 2.2 配置 Redis

```bash
# 编辑 Redis 配置文件
sudo nano /etc/redis/redis.conf

# 设置密码（找到 requirepass 行，取消注释并设置密码）
requirepass your_redis_password

# 重启 Redis
sudo systemctl restart redis
```

---

## 📁 Step 3: 部署项目代码

### 3.1 上传代码到服务器

```bash
# 方法 1: 使用 Git
cd /var/www  # 或你的项目目录
git clone https://github.com/your-username/nest-demo.git
cd nest-demo

# 方法 2: 使用 scp
# 在本地执行
scp -r /path/to/nest-demo user@server:/var/www/

# 方法 3: 使用 rsync（推荐）
rsync -avz --exclude 'node_modules' --exclude '.git' \
  /path/to/nest-demo/ user@server:/var/www/nest-demo/
```

### 3.2 进入项目目录

```bash
cd /var/www/nest-demo
```

---

## ⚙️ Step 4: 配置环境变量

### 4.1 创建 .env 文件

```bash
# 生成安全密钥
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# 创建 .env 文件
cat > .env << EOF
# ============================================
# 环境配置
# ============================================
NODE_ENV=production

# ============================================
# 应用配置
# ============================================
PORT=3000
CORS_ORIGINS=https://yourdomain.com

# ============================================
# 数据库配置
# ============================================
DATABASE_URL=mysql://vibe_user:your_secure_password@localhost:3306/vibe

# ============================================
# Redis 配置
# ============================================
REDIS_URL=redis://:your_redis_password@localhost:6379

# ============================================
# JWT 配置
# ============================================
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# ============================================
# 加密配置
# ============================================
ENCRYPTION_KEY=$ENCRYPTION_KEY

# ============================================
# 阿里云配置（可选）
# ============================================
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=

# ============================================
# API 文档配置
# ============================================
ENABLE_API_DOCS=false

# ============================================
# 日志配置
# ============================================
LOG_LEVEL=info
EOF
```

### 4.2 编辑配置

```bash
# 编辑 .env 文件，填写实际的数据库密码和 Redis 密码
nano .env
```

**重要配置项**:

- `DATABASE_URL`: 修改数据库密码
- `REDIS_URL`: 修改 Redis 密码
- `CORS_ORIGINS`: 设置允许的前端域名

---

## 📦 Step 5: 安装项目依赖

```bash
# 安装依赖
pnpm install --prod --frozen-lockfile

# 如果需要开发依赖（用于构建）
pnpm install --frozen-lockfile
```

---

## 🗄️ Step 6: 数据库初始化

### 6.1 生成 Prisma Client

```bash
pnpm run prisma:generate
```

### 6.2 执行数据库迁移

```bash
# 生产环境迁移
pnpm run prisma:migrate:deploy

# 或使用完整命令
NODE_ENV=production pnpm run prisma:migrate:deploy
```

### 6.3 初始化种子数据（重要！）⭐

种子数据包含：

- **16 个系统权限**（user:read, plan:create, task:update 等）
- **4 个系统角色**（超级管理员、普通用户、访客、内容审核员）
- **角色权限关联**
- **测试账号**（仅开发/测试环境）

#### 生产环境（不创建测试账号）

```bash
NODE_ENV=production pnpm run prisma:seed:prod
```

#### 开发/测试环境（创建测试账号）

```bash
# 开发环境（会创建测试账号）
NODE_ENV=development pnpm run prisma:seed:dev

# 测试环境
NODE_ENV=test pnpm run prisma:seed:test
```

**测试账号信息**（仅开发/测试环境）:

- 管理员：`admin` / `admin123`
- 普通用户：`testuser` / `admin123`

#### 验证种子数据

```bash
# 查看数据库
mysql -u vibe_user -p vibe

# 在 MySQL 中执行
SELECT * FROM roles;
SELECT * FROM permissions;
SELECT COUNT(*) FROM role_permissions;
SELECT * FROM users;
```

---

## 🏗️ Step 7: 构建应用

```bash
# 构建生产代码
pnpm run build

# 构建完成后，dist 目录包含编译后的代码
ls -la dist/
```

---

## 🚀 Step 8: 启动应用

### 8.1 直接启动（测试用）

```bash
# 生产模式启动
NODE_ENV=production pnpm run start:prod

# 或
node dist/main.js
```

### 8.2 使用 PM2（推荐）

PM2 是 Node.js 应用的生产级进程管理器。

#### 安装 PM2

```bash
# 全局安装 PM2
npm install -g pm2
```

#### 创建 PM2 配置文件

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'nest-demo',
      script: 'dist/main.js',
      instances: 'max', // 使用所有 CPU 核心
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
EOF
```

#### 启动应用

```bash
# 创建日志目录
mkdir -p logs uploads

# 使用 PM2 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs nest-demo

# 设置开机自启
pm2 startup
pm2 save
```

#### PM2 常用命令

```bash
# 重启应用
pm2 restart nest-demo

# 停止应用
pm2 stop nest-demo

# 删除应用
pm2 delete nest-demo

# 查看详细信息
pm2 show nest-demo

# 监控
pm2 monit
```

---

## ✅ Step 9: 验证部署

### 9.1 健康检查

```bash
# 检查应用是否运行
curl http://localhost:3000/health

# 应返回
# {"status":"ok"}
```

### 9.2 检查服务状态

```bash
# 检查应用进程
pm2 status

# 检查端口
sudo netstat -tlnp | grep :3000

# 检查日志
pm2 logs nest-demo --lines 50
```

---

## 🌐 Step 10: 配置 Nginx 反向代理（可选但推荐）

### 10.1 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 10.2 配置 Nginx

```bash
# 创建配置文件
sudo nano /etc/nginx/sites-available/nest-demo
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 日志
    access_log /var/log/nginx/nest-demo-access.log;
    error_log /var/log/nginx/nest-demo-error.log;

    # 代理到 NestJS 应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件（上传文件）
    location /uploads {
        alias /var/www/nest-demo/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/nest-demo /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 10.3 配置 HTTPS（推荐）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu
sudo yum install -y certbot python3-certbot-nginx  # CentOS

# 获取 SSL 证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

---

## 🔐 Step 11: 配置防火墙

### Ubuntu (UFW)

```bash
# 启用防火墙
sudo ufw enable

# 开放端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 如果不使用 Nginx，开放应用端口
# sudo ufw allow 3000/tcp

# 查看状态
sudo ufw status
```

### CentOS (Firewalld)

```bash
# 开放端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

---

## 💾 Step 12: 设置定时备份

### 12.1 创建备份脚本

```bash
cat > /var/www/nest-demo/backup-manual.sh << 'EOF'
#!/bin/bash

# 配置
PROJECT_DIR="/var/www/nest-demo"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_USER="vibe_user"
DB_PASSWORD="your_password"  # 替换为实际密码
DB_NAME="vibe"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份数据库
echo "备份数据库..."
mysqldump -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_DIR/db_$TIMESTAMP.sql"

# 备份上传文件
echo "备份上传文件..."
tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" -C "$PROJECT_DIR" uploads/

# 清理旧备份（保留最近 7 天）
find "$BACKUP_DIR" -name "db_*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +7 -delete

echo "备份完成: $TIMESTAMP"
EOF

chmod +x /var/www/nest-demo/backup-manual.sh
```

### 12.2 设置定时任务

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 2 点备份）
0 2 * * * /var/www/nest-demo/backup-manual.sh >> /var/log/nest-demo-backup.log 2>&1
```

---

## 🔄 更新部署

### 更新流程

```bash
# 1. 进入项目目录
cd /var/www/nest-demo

# 2. 拉取最新代码
git pull origin main

# 3. 安装依赖
pnpm install --frozen-lockfile

# 4. 生成 Prisma Client
pnpm run prisma:generate

# 5. 执行数据库迁移
NODE_ENV=production pnpm run prisma:migrate:deploy

# 6. 构建应用
pnpm run build

# 7. 重启应用
pm2 restart nest-demo

# 8. 查看日志
pm2 logs nest-demo
```

---

## 🐛 故障排查

### 问题 1: 应用无法启动

```bash
# 查看日志
pm2 logs nest-demo

# 检查 .env 文件
cat .env | grep DATABASE_URL

# 测试数据库连接
mysql -u vibe_user -p vibe
```

### 问题 2: 数据库连接失败

```bash
# 检查 MySQL 状态
sudo systemctl status mysql

# 检查用户权限
mysql -u root -p
SHOW GRANTS FOR 'vibe_user'@'localhost';
```

### 问题 3: Redis 连接失败

```bash
# 检查 Redis 状态
sudo systemctl status redis

# 测试连接
redis-cli -a your_password ping
```

### 问题 4: 端口被占用

```bash
# 查看端口占用
sudo netstat -tlnp | grep :3000

# 停止占用端口的进程
sudo kill -9 <PID>
```

---

## 📊 监控和日志

### 查看应用日志

```bash
# PM2 日志
pm2 logs nest-demo

# 应用日志文件
tail -f logs/application-*.log
tail -f logs/error-*.log

# Nginx 日志
sudo tail -f /var/log/nginx/nest-demo-access.log
sudo tail -f /var/log/nginx/nest-demo-error.log
```

### 监控资源使用

```bash
# PM2 监控
pm2 monit

# 系统资源
top
htop
df -h
free -h
```

---

## 📝 完整命令速查

```bash
# 启动应用
pm2 start ecosystem.config.js

# 重启应用
pm2 restart nest-demo

# 停止应用
pm2 stop nest-demo

# 查看日志
pm2 logs nest-demo

# 数据库迁移
NODE_ENV=production pnpm run prisma:migrate:deploy

# 初始化种子数据
NODE_ENV=production pnpm run prisma:seed:prod

# 备份数据库
/var/www/nest-demo/backup-manual.sh

# 健康检查
curl http://localhost:3000/health
```

---

## 🎉 部署完成！

你的应用现在已经在服务器上运行了！

**访问地址**:

- 应用: http://your-server-ip:3000 或 http://yourdomain.com
- 健康检查: http://yourdomain.com/health
- API 文档（如启用）: http://yourdomain.com/api

**下一步**:

1. 配置域名和 HTTPS
2. 设置定时备份
3. 配置监控告警
4. 定期更新系统和依赖

**需要帮助？** 查看日志或联系技术支持。
