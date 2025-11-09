# 🚀 服务器部署指南

本指南将帮助你在服务器上使用 Docker 完整部署 NestJS 项目。

## 📋 前置要求

### 系统要求

- Linux 服务器（推荐 Ubuntu 20.04+ / CentOS 8+）
- 2GB+ RAM
- 10GB+ 磁盘空间
- Root 或 sudo 权限

### 软件要求

- Docker 20.10+
- Docker Compose 2.0+

## 📦 Step 1: 安装 Docker 和 Docker Compose

### Ubuntu/Debian

```bash
# 更新包索引
sudo apt update

# 安装依赖
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加 Docker GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### CentOS/RHEL

```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### 添加当前用户到 docker 组（可选）

```bash
sudo usermod -aG docker $USER
# 需要重新登录才能生效
```

## 📁 Step 2: 上传项目代码

### 方法 1: 使用 Git（推荐）

```bash
# 克隆项目
git clone https://github.com/your-username/nest-demo.git
cd nest-demo
```

### 方法 2: 使用 SCP

```bash
# 在本地执行
scp -r /path/to/nest-demo user@server-ip:/path/to/destination/

# 或使用 rsync（推荐）
rsync -avz --exclude 'node_modules' --exclude '.git' \
  /path/to/nest-demo/ user@server-ip:/path/to/destination/nest-demo/
```

### 方法 3: 使用 FTP/SFTP 工具

使用 FileZilla、WinSCP 等工具上传项目文件。

## 🔧 Step 3: 配置环境

### 进入项目目录

```bash
cd /path/to/nest-demo
```

### 配置环境变量

```bash
# 方法 1: 使用部署脚本自动生成（推荐）
chmod +x deploy.sh
./deploy.sh

# 方法 2: 手动创建
cp .env.example .env
nano .env  # 或使用 vi/vim 编辑
```

### 重要配置项说明

```bash
# .env 文件必须配置的项目：

# 1. 数据库密码（必须修改）
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_PASSWORD=your_secure_password

# 2. Redis 密码（必须修改）
REDIS_PASSWORD=your_redis_password

# 3. JWT 密钥（必须修改，至少32个字符）
JWT_SECRET=your_jwt_secret_min_32_chars_long
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars_long

# 4. 加密密钥（必须修改，至少32个字符）
ENCRYPTION_KEY=your_encryption_key_min_32_chars

# 5. CORS 跨域配置（根据你的前端域名修改）
CORS_ORIGINS=https://yourdomain.com

# 6. 阿里云配置（如果使用短信功能）
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_SMS_SIGN_NAME=your_sms_sign_name
ALIYUN_SMS_TEMPLATE_CODE=your_template_code
```

### 生成安全的随机密钥

```bash
# 生成 JWT Secret
openssl rand -hex 32

# 生成 Encryption Key
openssl rand -hex 32

# 生成数据库密码
openssl rand -hex 16
```

## 🚀 Step 4: 一键部署

### 使用自动化部署脚本（推荐）

```bash
# 添加执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh production
```

脚本会自动完成：

1. ✅ 环境检查
2. ✅ 配置验证
3. ✅ 创建必要目录
4. ✅ 构建 Docker 镜像
5. ✅ 启动所有服务
6. ✅ 数据库迁移
7. ✅ 健康检查

### 手动部署步骤

如果不使用脚本，可以手动执行以下命令：

```bash
# 1. 创建必要的目录
mkdir -p logs uploads
chmod 755 logs uploads

# 2. 构建镜像
docker compose build

# 3. 启动服务
docker compose up -d

# 4. 查看服务状态
docker compose ps

# 5. 等待数据库就绪（约30秒）
sleep 30

# 6. 执行数据库迁移
docker compose exec app pnpm run prisma:migrate:deploy

# 7. 可选：初始化种子数据
docker compose exec app pnpm run prisma:seed:prod

# 8. 检查健康状态
curl http://localhost:3000/health
```

## ✅ Step 5: 验证部署

### 检查服务状态

```bash
# 查看所有容器
docker compose ps

# 应该看到以下容器运行中：
# vibe-mysql   - MySQL 数据库
# vibe-redis   - Redis 缓存
# vibe-app     - NestJS 应用
# vibe-nginx   - Nginx 反向代理
```

### 检查应用健康

```bash
# 健康检查
curl http://localhost:3000/health

# 应返回: {"status":"ok"}
```

### 查看日志

```bash
# 查看所有服务日志
docker compose logs

# 查看应用日志
docker compose logs -f app

# 查看数据库日志
docker compose logs -f mysql

# 查看最近 100 行日志
docker compose logs --tail=100 app
```

## 🔐 Step 6: 配置防火墙

### UFW（Ubuntu）

```bash
# 启用防火墙
sudo ufw enable

# 开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 查看状态
sudo ufw status
```

### Firewalld（CentOS）

```bash
# 开放端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

## 🌐 Step 7: 配置域名和 HTTPS（可选）

### 配置 SSL 证书

#### 使用 Let's Encrypt（免费）

```bash
# 安装 certbot
sudo apt install certbot  # Ubuntu
sudo yum install certbot  # CentOS

# 获取证书
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# 证书路径
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

#### 配置 Nginx

编辑 `docker/nginx/conf.d/default.conf`：

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # ... 其他配置
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

复制证书并重启：

```bash
# 复制证书到项目目录
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/

# 重启 Nginx
docker compose restart nginx
```

## 🛠️ 常用运维命令

### 查看和管理服务

```bash
# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart app

# 停止服务
docker compose stop

# 启动服务
docker compose start

# 完全停止并删除容器
docker compose down

# 停止并删除所有数据（危险）
docker compose down -v
```

### 进入容器

```bash
# 进入应用容器
docker compose exec app sh

# 进入 MySQL 容器
docker compose exec mysql bash

# 连接 MySQL 数据库
docker compose exec mysql mysql -u vibe_user -p vibe

# 进入 Redis
docker compose exec redis redis-cli
```

### 数据库操作

```bash
# 执行数据库迁移
docker compose exec app pnpm run prisma:migrate:deploy

# 查看 Prisma Studio（开发工具）
docker compose exec app pnpm run prisma:studio

# 执行种子数据
docker compose exec app pnpm run prisma:seed:prod

# 数据库备份
docker compose exec mysql mysqldump -u vibe_user -p vibe > backup_$(date +%Y%m%d_%H%M%S).sql

# 数据库恢复
docker compose exec -T mysql mysql -u vibe_user -p vibe < backup.sql
```

### 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker compose up -d --build

# 执行数据库迁移
docker compose exec app pnpm run prisma:migrate:deploy

# 查看日志
docker compose logs -f app
```

## 📊 监控和日志

### 查看资源使用

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
df -h

# 清理未使用的镜像和容器
docker system prune -a
```

### 日志管理

应用日志位于 `./logs` 目录：

```bash
# 查看应用日志
tail -f logs/application-*.log

# 查看错误日志
tail -f logs/error-*.log

# 清理旧日志（保留最近7天）
find logs/ -name "*.log" -mtime +7 -delete
```

## 🐛 故障排查

### 服务无法启动

```bash
# 1. 查看详细日志
docker compose logs

# 2. 检查端口占用
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3306

# 3. 检查磁盘空间
df -h

# 4. 检查 Docker 状态
sudo systemctl status docker
```

### 数据库连接失败

```bash
# 1. 检查数据库容器状态
docker compose ps mysql

# 2. 检查数据库日志
docker compose logs mysql

# 3. 测试数据库连接
docker compose exec mysql mysql -u vibe_user -p

# 4. 验证 .env 配置
cat .env | grep DATABASE_URL
```

### 应用健康检查失败

```bash
# 1. 查看应用日志
docker compose logs app

# 2. 进入容器手动测试
docker compose exec app sh
curl http://localhost:3000/health

# 3. 检查端口绑定
docker compose port app 3000
```

## 🔒 安全建议

1. **修改默认密码**：确保所有密码都是强密码
2. **限制端口访问**：只开放必要的端口
3. **定期备份**：定期备份数据库和重要文件
4. **更新系统**：定期更新系统和 Docker
5. **使用 HTTPS**：生产环境必须使用 HTTPS
6. **禁用 API 文档**：生产环境设置 `ENABLE_API_DOCS=false`
7. **限制日志大小**：配置日志轮转避免磁盘占满

## 📞 获取帮助

如遇到问题，可以：

1. 查看日志：`docker compose logs -f`
2. 检查文档：`README.md`
3. 提交 Issue：GitHub Issues
4. 联系开发团队

## 🎉 部署完成

恭喜！你的应用现在已经在服务器上运行了。

**访问地址：**

- 应用：http://your-server-ip:3000
- 健康检查：http://your-server-ip:3000/health
- API 文档（如启用）：http://your-server-ip:3000/api
