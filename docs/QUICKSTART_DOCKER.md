# ⚡ Docker 快速开始

## 🎯 3 步完成部署（支持自动 Seed 初始化）

### Step 1: 一键部署

```bash
# 添加执行权限
chmod +x deploy-docker.sh

# 执行部署
./deploy-docker.sh
```

**自动完成**:

- ✅ 检查 Docker 环境
- ✅ 生成配置文件
- ✅ 构建镜像
- ✅ 启动所有服务
- ✅ **自动执行数据库迁移**
- ✅ **自动执行 Seed 初始化**
- ✅ 健康检查

---

### Step 2: 验证部署

```bash
# 健康检查
curl http://localhost:3000/health

# 应返回: {"status":"ok"}
```

---

### Step 3: 查看 Seed 初始化结果

```bash
# 查看初始化日志
docker-compose logs app | grep -A 30 "开始初始化数据库"

# 或查看数据库
docker-compose exec mysql mysql -u vibe_user -p vibe
SELECT * FROM roles;
SELECT * FROM permissions;
EXIT;
```

---

## ✅ Seed 自动初始化内容

容器启动时会自动创建：

| 数据类型     | 数量 | 说明                                   |
| ------------ | ---- | -------------------------------------- |
| 系统权限     | 16个 | user:read, plan:create, task:update 等 |
| 系统角色     | 4个  | 超级管理员、普通用户、访客、审核员     |
| 角色权限关联 | 33条 | 自动建立关联                           |
| 测试账号     | 0个  | 生产环境不创建（可配置）               |

---

## 🔄 常用命令

```bash
# 查看日志
docker-compose logs -f app

# 重启服务
docker-compose restart app

# 停止服务
docker-compose down

# 查看服务状态
docker-compose ps

# 进入容器
docker-compose exec app sh

# 查看数据库
docker-compose exec mysql mysql -u vibe_user -p vibe
```

---

## ⚙️ 配置选项

### 跳过 Seed 初始化

如果不需要 seed 初始化（例如数据已存在）：

```bash
# 在 .env 文件中设置
SKIP_SEED=true

# 重启容器
docker-compose restart app
```

### 创建测试账号

如果需要测试账号（开发环境）：

```bash
# 在 .env 文件中设置
NODE_ENV=development

# 重新部署
./deploy-docker.sh
```

会创建：

- 管理员: `admin` / `admin123`
- 普通用户: `testuser` / `admin123`

---

## 🐛 常见问题

### Q: 如何重新执行 Seed？

```bash
# 方法 1: 重启容器（会自动执行）
docker-compose restart app

# 方法 2: 手动执行
docker-compose exec app pnpm run prisma:seed:prod
```

### Q: 如何查看 Seed 是否成功？

```bash
# 查看日志
docker-compose logs app | grep seed

# 查看数据库
docker-compose exec mysql mysql -u vibe_user -p -e "SELECT COUNT(*) FROM roles;" vibe
```

### Q: Seed 执行失败怎么办？

**现象**: 日志显示 seed 失败

**原因**: 可能数据已存在（正常，不影响运行）

**说明**: Seed 使用 `upsert`，重复执行不会创建重复数据

---

## 📚 详细文档

- **完整指南**: [README_DOCKER.md](./README_DOCKER.md)
- **Docker Compose**: [docker-compose.yml](./docker-compose.yml)
- **启动脚本**: [docker-entrypoint.sh](./docker-entrypoint.sh)

---

## 🎉 完成！

你的应用现在已经运行在：

- **应用**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **API 文档**（如启用）: http://localhost:3000/api

**所有基础数据（角色、权限）已自动初始化完成！** ✨
