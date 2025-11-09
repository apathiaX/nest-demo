# ⚡ 快速开始 - 服务器部署

本指南帮助你在 **5 分钟内** 完成服务器部署。

## 📋 前置条件

- ✅ Linux 服务器（Ubuntu 20.04+ / CentOS 8+）
- ✅ 2GB+ RAM，10GB+ 磁盘空间
- ✅ Root 或 sudo 权限
- ✅ 代码已上传到服务器

## 🚀 一键部署（3 步）

### Step 1: 初始化服务器环境

```bash
# 进入项目目录
cd /path/to/nest-demo

# 运行服务器初始化脚本（安装 Docker）
chmod +x scripts/server-setup.sh
./scripts/server-setup.sh

# 重新登录或执行
newgrp docker
```

### Step 2: 一键部署

```bash
# 添加执行权限
chmod +x deploy.sh

# 执行部署（会自动生成配置）
./deploy.sh production
```

### Step 3: 验证部署

```bash
# 检查健康状态
curl http://localhost:3000/health

# 应返回: {"status":"ok"}
```

✅ **完成！** 你的应用现在已经运行在 http://your-server-ip:3000

---

## 🔧 手动部署（详细步骤）

如果自动部署遇到问题，可以手动执行以下步骤：

### 1. 安装 Docker

#### Ubuntu/Debian

```bash
# 更新包索引
sudo apt update

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo apt install docker-compose-plugin

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

#### CentOS/RHEL

```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 配置环境

```bash
# 进入项目目录
cd /path/to/nest-demo

# 生成安全密钥
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
MYSQL_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)

# 创建 .env 文件
cat > .env << EOF
NODE_ENV=production
PORT=3000
CORS_ORIGINS=https://yourdomain.com

# 数据库
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
MYSQL_DATABASE=vibe
MYSQL_USER=vibe_user
MYSQL_PASSWORD=$MYSQL_PASSWORD
DATABASE_URL=mysql://vibe_user:$MYSQL_PASSWORD@mysql:3306/vibe

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379

# JWT
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 加密
ENCRYPTION_KEY=$ENCRYPTION_KEY

# API 文档
ENABLE_API_DOCS=false
EOF
```

### 3. 部署应用

```bash
# 创建目录
mkdir -p logs uploads

# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 等待数据库就绪（约 30 秒）
sleep 30

# 执行数据库迁移
docker compose exec app pnpm run prisma:migrate:deploy

# 可选：初始化种子数据
docker compose exec app pnpm run prisma:seed:prod
```

### 4. 验证部署

```bash
# 查看服务状态
docker compose ps

# 健康检查
curl http://localhost:3000/health

# 查看日志
docker compose logs -f app
```

---

## 📦 常用命令

### 查看和管理

```bash
# 查看所有服务状态
docker compose ps

# 查看应用日志
docker compose logs -f app

# 重启服务
docker compose restart

# 停止服务
docker compose stop

# 启动服务
docker compose start

# 停止并删除容器
docker compose down
```

### 进入容器

```bash
# 进入应用容器
docker compose exec app sh

# 进入数据库
docker compose exec mysql mysql -u vibe_user -p vibe

# 进入 Redis
docker compose exec redis redis-cli
```

### 数据库操作

```bash
# 执行数据库迁移
docker compose exec app pnpm run prisma:migrate:deploy

# 查看数据库（Prisma Studio）
docker compose exec app pnpm run prisma:studio

# 备份数据库
docker compose exec mysql mysqldump -u vibe_user -p vibe > backup.sql

# 恢复数据库
docker compose exec -T mysql mysql -u vibe_user -p vibe < backup.sql
```

---

## 🔄 更新部署

```bash
# 方法 1: 使用更新脚本（推荐）
chmod +x scripts/update.sh
./scripts/update.sh

# 方法 2: 手动更新
git pull origin main
docker compose up -d --build
docker compose exec app pnpm run prisma:migrate:deploy
```

---

## 🛡️ 安全配置

### 1. 配置防火墙

```bash
# Ubuntu (UFW)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS (Firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. 配置 HTTPS（推荐）

```bash
# 安装 Certbot
sudo apt install certbot  # Ubuntu
sudo yum install certbot  # CentOS

# 获取 SSL 证书
sudo certbot certonly --standalone -d yourdomain.com

# 复制证书到项目
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/

# 重启 Nginx
docker compose restart nginx
```

---

## 🩺 健康检查

```bash
# 使用健康检查脚本
chmod +x scripts/health-check.sh
./scripts/health-check.sh

# 手动检查
curl http://localhost:3000/health
docker compose ps
docker compose logs --tail=50 app
```

---

## 💾 备份和恢复

### 备份

```bash
# 使用备份脚本（推荐）
chmod +x scripts/backup.sh
./scripts/backup.sh

# 手动备份数据库
docker compose exec mysql mysqldump -u vibe_user -p vibe > backup_$(date +%Y%m%d).sql
```

### 恢复

```bash
# 恢复数据库
docker compose exec -T mysql mysql -u vibe_user -p vibe < backup.sql

# 恢复上传文件
cp -r backup/uploads/* ./uploads/
```

---

## 🐛 故障排查

### 问题 1: 容器无法启动

```bash
# 查看日志
docker compose logs

# 检查端口占用
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3306
```

### 问题 2: 数据库连接失败

```bash
# 检查数据库容器
docker compose ps mysql
docker compose logs mysql

# 测试连接
docker compose exec mysql mysql -u vibe_user -p
```

### 问题 3: 应用无法访问

```bash
# 检查防火墙
sudo ufw status  # Ubuntu
sudo firewall-cmd --list-all  # CentOS

# 检查应用日志
docker compose logs -f app

# 检查健康状态
curl http://localhost:3000/health
```

---

## 📚 更多信息

- 📖 完整部署文档: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🔧 运维脚本说明: [scripts/README.md](./scripts/README.md)
- 📝 项目文档: [README.md](./README.md)

---

## 🆘 获取帮助

遇到问题？

1. 查看日志: `docker compose logs -f`
2. 运行健康检查: `./scripts/health-check.sh`
3. 查看完整文档: `DEPLOYMENT.md`
4. 提交 Issue: GitHub Issues

---

**🎉 祝你部署顺利！**
