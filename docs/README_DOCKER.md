# 🐳 Docker 部署指南（支持 Seed 自动初始化）

本项目支持使用 Docker 一键部署，包括**自动数据库迁移**和**Seed 初始化**。

## ✨ 特性

- ✅ **完全容器化** - MySQL、Redis、NestJS、Nginx 全部容器化
- ✅ **自动迁移** - 容器启动时自动执行数据库迁移
- ✅ **自动 Seed** - 自动初始化角色、权限等基础数据
- ✅ **健康检查** - 内置服务健康检查
- ✅ **一键部署** - 单个命令完成所有操作
- ✅ **持久化存储** - 数据库数据持久化保存

---

## 🚀 快速开始（3 步）

### Step 1: 克隆代码

```bash
git clone https://github.com/your-username/nest-demo.git
cd nest-demo
```

### Step 2: 一键部署

```bash
# 添加执行权限
chmod +x deploy-docker.sh

# 执行部署
./deploy-docker.sh
```

**自动完成**:
1. ✅ 检查 Docker 环境
2. ✅ 生成配置文件（如不存在）
3. ✅ 构建 Docker 镜像
4. ✅ 启动所有服务
5. ✅ **自动执行数据库迁移**
6. ✅ **自动执行 Seed 初始化**
7. ✅ 健康检查

### Step 3: 验证

```bash
# 健康检查
curl http://localhost:3000/health

# 应返回: {"status":"ok"}
```

---

## 📊 Seed 初始化内容

容器启动时会**自动初始化**以下数据：

### ✅ 16 个系统权限

| 权限代码 | 说明 |
|---------|------|
| `user:read` | 查看用户 |
| `user:create` | 创建用户 |
| `user:update` | 更新用户 |
| `user:delete` | 删除用户 |
| `plan:read` | 查看计划 |
| `plan:create` | 创建计划 |
| `plan:update` | 更新计划 |
| `plan:delete` | 删除计划 |
| `task:read` | 查看任务 |
| `task:create` | 创建任务 |
| `task:update` | 更新任务 |
| `task:delete` | 删除任务 |
| `role:read` | 查看角色 |
| `role:manage` | 管理角色 |
| `permission:read` | 查看权限 |
| `permission:manage` | 管理权限 |

### ✅ 4 个系统角色

| 角色 | 权限数 | 说明 |
|------|--------|------|
| 超级管理员 (`admin`) | 16 | 拥有所有权限 |
| 普通用户 (`user`) | 8 | 计划和任务的增删改查 |
| 访客 (`guest`) | 2 | 只读权限 |
| 内容审核员 (`moderator`) | 7 | 审核相关权限 |

### ✅ 测试账号（可选）

**生产环境**（默认）:
- ❌ 不创建测试账号

**开发/测试环境**:
- ✅ 管理员: `admin` / `admin123`
- ✅ 普通用户: `testuser` / `admin123`

---

## ⚙️ 配置说明

### 环境变量控制

在 `.env` 文件中配置：

```bash
# 环境（影响是否创建测试账号）
NODE_ENV=production          # production: 不创建测试账号
# NODE_ENV=development       # development: 创建测试账号

# 控制是否执行 seed（默认: false，即执行 seed）
SKIP_SEED=false              # false: 执行 seed
# SKIP_SEED=true             # true: 跳过 seed
```

### 如何跳过 Seed 初始化

如果你想跳过 seed 初始化（例如数据已存在）：

```bash
# 在 .env 文件中设置
SKIP_SEED=true

# 然后重启容器
docker-compose restart app
```

---

## 📝 完整部署流程

### 方法 1: 使用部署脚本（推荐）

```bash
./deploy-docker.sh
```

### 方法 2: 手动部署

```bash
# 1. 创建 .env 文件
cp .env.example .env
nano .env

# 2. 创建目录
mkdir -p logs uploads

# 3. 构建镜像
docker-compose build

# 4. 启动服务（自动执行迁移和 seed）
docker-compose up -d

# 5. 查看日志
docker-compose logs -f app

# 6. 验证
curl http://localhost:3000/health
```

---

## 🔍 查看 Seed 初始化日志

```bash
# 查看完整应用日志
docker-compose logs app

# 查看 seed 初始化部分
docker-compose logs app | grep -A 30 "开始初始化数据库"

# 实时查看日志
docker-compose logs -f app
```

**输出示例**:
```
🚀 应用启动中...
⏳ 等待数据库就绪...
✅ 数据库已就绪
📊 执行数据库迁移...
✅ 数据库迁移完成
🌱 执行数据库 seed 初始化...
📝 创建权限...
✅ 创建了 16 个权限
👥 创建角色...
✅ 创建了 4 个角色
🔗 分配权限给角色...
✅ Seed 初始化完成
✨ 启动应用...
```

---

## 🗄️ 验证数据库数据

### 方法 1: 进入 MySQL 容器

```bash
# 进入 MySQL 容器
docker-compose exec mysql mysql -u vibe_user -p vibe

# 查看角色
SELECT * FROM roles;

# 查看权限
SELECT * FROM permissions;

# 查看角色权限关联
SELECT r.name, COUNT(*) as permission_count
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
GROUP BY r.name;

# 退出
EXIT;
```

### 方法 2: 使用 Prisma Studio

```bash
# 在应用容器中启动 Prisma Studio
docker-compose exec app pnpm run prisma:studio

# 在浏览器中打开: http://localhost:5555
```

---

## 🔄 常用命令

### 服务管理

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 重启服务
docker-compose restart app

# 停止服务
docker-compose stop

# 启动服务
docker-compose start

# 停止并删除容器
docker-compose down

# 完全清理（包括数据卷）⚠️
docker-compose down -v
```

### 进入容器

```bash
# 进入应用容器
docker-compose exec app sh

# 进入 MySQL
docker-compose exec mysql mysql -u vibe_user -p vibe

# 进入 Redis
docker-compose exec redis redis-cli
```

### 数据库操作

```bash
# 手动执行迁移
docker-compose exec app pnpm run prisma:migrate:deploy

# 手动执行 seed（生产环境）
docker-compose exec app pnpm run prisma:seed:prod

# 手动执行 seed（开发环境，创建测试账号）
docker-compose exec app sh -c "NODE_ENV=development pnpm run prisma:seed:dev"

# 查看数据库状态
docker-compose exec app npx prisma migrate status
```

---

## 🔄 更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建并启动（会自动执行迁移和 seed）
docker-compose up -d --build

# 3. 查看日志
docker-compose logs -f app
```

---

## 🐛 故障排查

### 问题 1: 容器无法启动

```bash
# 查看日志
docker-compose logs app

# 检查容器状态
docker-compose ps

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

### 问题 2: 数据库连接失败

```bash
# 检查数据库容器
docker-compose ps mysql
docker-compose logs mysql

# 检查网络
docker network ls
docker network inspect nest-demo_nest-network
```

### 问题 3: Seed 初始化失败

**现象**: 日志显示 seed 失败

**原因**: 可能数据已存在（正常，seed 使用 upsert）

**解决**: 
```bash
# 查看详细日志
docker-compose logs app | grep -i seed

# 验证数据是否存在
docker-compose exec mysql mysql -u vibe_user -p -e "SELECT COUNT(*) FROM roles;" vibe

# 如果需要重新初始化，删除数据后重启
docker-compose restart app
```

### 问题 4: 端口被占用

```bash
# 查看端口占用
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3306

# 修改 docker-compose.yml 中的端口映射
# 或停止占用端口的服务
```

---

## 📊 监控和维护

### 资源监控

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df
```

### 日志管理

```bash
# 查看最近 100 行日志
docker-compose logs --tail=100 app

# 清理日志
docker-compose down
docker system prune -a
```

### 数据备份

```bash
# 备份数据库
docker-compose exec mysql mysqldump -u vibe_user -p vibe > backup_$(date +%Y%m%d).sql

# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# 恢复数据库
docker-compose exec -T mysql mysql -u vibe_user -p vibe < backup.sql
```

---

## 🔐 生产环境建议

### 1. 修改默认密码

编辑 `.env` 文件，使用强密码：

```bash
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
MYSQL_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
```

### 2. 配置 HTTPS

参考 `docker/nginx/conf.d/default.conf` 配置 SSL 证书

### 3. 设置定时备份

```bash
# 添加到 crontab
0 2 * * * cd /path/to/nest-demo && docker-compose exec mysql mysqldump -u vibe_user -p$MYSQL_PASSWORD vibe > backups/db_$(date +\%Y\%m\%d).sql
```

### 4. 监控告警

配置 Docker 健康检查和日志告警

---

## 📚 相关文件

| 文件 | 说明 |
|------|------|
| `docker-compose.yml` | Docker Compose 配置 |
| `Dockerfile` | 应用镜像构建文件 |
| `docker-entrypoint.sh` | 容器启动脚本（执行迁移和 seed）|
| `deploy-docker.sh` | 一键部署脚本 |
| `.env` | 环境变量配置 |

---

## 🆘 获取帮助

- 查看日志: `docker-compose logs -f app`
- 进入容器调试: `docker-compose exec app sh`
- 查看服务状态: `docker-compose ps`

---

## 🎉 总结

使用本 Docker 部署方案，你可以：

✅ **一键部署** - 单个命令完成所有操作  
✅ **自动初始化** - 数据库迁移和 seed 自动执行  
✅ **开箱即用** - 角色、权限等基础数据自动创建  
✅ **易于维护** - Docker 容器化管理  
✅ **可扩展** - 支持横向扩展和集群部署  

**祝你部署顺利！** 🎊

