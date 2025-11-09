# 🗄️ 数据库初始化指南

本指南说明如何初始化数据库和执行种子数据。

## 📋 初始化流程

数据库初始化分为 **3 个步骤**：

1. **生成 Prisma Client** - 根据 schema 生成数据库操作代码
2. **执行数据库迁移** - 创建数据库表结构
3. **初始化种子数据** - 插入初始数据（角色、权限等）

---

## 🚀 快速执行（推荐）

### 完整初始化（一键执行）

```bash
# 1. 生成 Prisma Client
pnpm run prisma:generate

# 2. 执行数据库迁移
NODE_ENV=production pnpm run prisma:migrate:deploy

# 3. 初始化种子数据
NODE_ENV=production pnpm run prisma:seed:prod
```

---

## 📝 详细说明

### Step 1: 生成 Prisma Client

**作用**: 根据 `prisma/schema.prisma` 生成 TypeScript 类型和数据库操作接口。

```bash
pnpm run prisma:generate
```

**输出**:
```
✔ Generated Prisma Client to ./prisma/client
```

**何时需要**:
- 首次部署
- 修改了 `schema.prisma` 文件后
- 删除了 `node_modules` 后

---

### Step 2: 执行数据库迁移

**作用**: 根据迁移文件创建/更新数据库表结构。

#### 生产环境

```bash
NODE_ENV=production pnpm run prisma:migrate:deploy
```

#### 开发环境

```bash
NODE_ENV=development pnpm run prisma:migrate
```

**输出示例**:
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": MySQL database "vibe" at "localhost:3306"

1 migration found in prisma/migrations

Applying migration `20251028160555_vibe`

✔ All migrations have been successfully applied.
```

**创建的表**:
- `users` - 用户表
- `roles` - 角色表
- `permissions` - 权限表
- `role_permissions` - 角色权限关联表
- `user_roles` - 用户角色关联表
- `auth_providers` - 认证提供商表
- `plans` - 计划表
- `plan_participants` - 计划参与者表
- `tasks` - 任务表
- `task_reminders` - 任务提醒表
- `task_records` - 任务记录表

---

### Step 3: 初始化种子数据（重要！）⭐

**作用**: 插入系统必需的初始数据。

#### 3.1 生产环境（推荐）

```bash
NODE_ENV=production pnpm run prisma:seed:prod
```

**插入的数据**:
- ✅ 16 个系统权限
- ✅ 4 个系统角色（超级管理员、普通用户、访客、内容审核员）
- ✅ 角色权限关联
- ❌ **不创建**测试账号

---

#### 3.2 开发/测试环境

```bash
# 开发环境
NODE_ENV=development pnpm run prisma:seed:dev

# 或测试环境
NODE_ENV=test pnpm run prisma:seed:test
```

**插入的数据**:
- ✅ 16 个系统权限
- ✅ 4 个系统角色
- ✅ 角色权限关联
- ✅ **创建测试账号**:
  - 管理员: `admin` / `admin123`
  - 普通用户: `testuser` / `admin123`

---

#### 3.3 执行输出示例

```
🌱 开始初始化数据库...
📋 环境: production

📝 创建权限...
✅ 创建了 16 个权限
👥 创建角色...
✅ 创建了 4 个角色
🔗 分配权限给角色...
  ✅ 超级管理员获得所有 16 个权限
  ✅ 普通用户获得 8 个权限
  ✅ 访客获得 2 个权限
  ✅ 内容审核员获得 7 个权限

✨ 数据库初始化完成！

📊 初始化统计：
  - 环境: production
  - 权限数量: 16
  - 角色数量: 4
  - 角色权限关联: 33

💡 提示：运行以下命令打开 Prisma Studio 查看数据：
   NODE_ENV=production pnpm run prisma:studio
```

---

## 📊 种子数据详情

### 权限列表（16个）

| 权限代码 | 权限名称 | 资源 | 操作 |
|---------|---------|------|------|
| `user:read` | 查看用户 | user | read |
| `user:create` | 创建用户 | user | create |
| `user:update` | 更新用户 | user | update |
| `user:write` | 写入用户 | user | write |
| `user:delete` | 删除用户 | user | delete |
| `plan:read` | 查看计划 | plan | read |
| `plan:create` | 创建计划 | plan | create |
| `plan:update` | 更新计划 | plan | update |
| `plan:delete` | 删除计划 | plan | delete |
| `task:read` | 查看任务 | task | read |
| `task:create` | 创建任务 | task | create |
| `task:update` | 更新任务 | task | update |
| `task:delete` | 删除任务 | task | delete |
| `role:read` | 查看角色 | role | read |
| `role:manage` | 管理角色 | role | manage |
| `permission:read` | 查看权限 | permission | read |

### 角色列表（4个）

| 角色代码 | 角色名称 | 权限数量 | 说明 |
|---------|---------|---------|------|
| `admin` | 超级管理员 | 16 | 所有权限 |
| `user` | 普通用户 | 8 | 计划和任务的增删改查 |
| `guest` | 访客 | 2 | 只读权限 |
| `moderator` | 内容审核员 | 7 | 审核相关权限 |

### 测试账号（仅开发/测试环境）

| 用户名 | 密码 | 角色 | 手机号 |
|-------|------|------|--------|
| `admin` | `admin123` | 超级管理员 | 13800138000 |
| `testuser` | `admin123` | 普通用户 | 13800138001 |

---

## ✅ 验证初始化

### 方法 1: 使用 MySQL 命令行

```bash
# 登录数据库
mysql -u vibe_user -p vibe

# 查看角色
SELECT * FROM roles;

# 查看权限
SELECT * FROM permissions;

# 查看角色权限关联
SELECT r.name as role_name, p.name as permission_name
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
ORDER BY r.name, p.name;

# 查看用户（如果有）
SELECT user_key, nick_name, phone, status FROM users;

# 退出
EXIT;
```

### 方法 2: 使用 Prisma Studio

```bash
# 启动 Prisma Studio（可视化数据库管理工具）
NODE_ENV=production pnpm run prisma:studio

# 在浏览器中打开: http://localhost:5555
```

---

## 🔄 重新初始化

### 场景 1: 只重新执行种子数据

```bash
# 生产环境
NODE_ENV=production pnpm run prisma:seed:prod

# 说明：种子脚本使用 upsert，不会创建重复数据
```

### 场景 2: 完全重置数据库（危险！）

```bash
# ⚠️ 警告：会删除所有数据！

# 重置数据库（开发环境）
pnpm run prisma:reset

# 手动重置（生产环境）
NODE_ENV=production pnpm run prisma:migrate:deploy
NODE_ENV=production pnpm run prisma:seed:prod
```

---

## 🐛 常见问题

### Q1: 执行 seed 时报错 "Table doesn't exist"

**原因**: 没有先执行数据库迁移

**解决**:
```bash
# 先执行迁移
NODE_ENV=production pnpm run prisma:migrate:deploy

# 再执行 seed
NODE_ENV=production pnpm run prisma:seed:prod
```

### Q2: 数据库连接失败

**原因**: 环境变量配置错误或数据库未启动

**解决**:
```bash
# 检查 .env 文件
cat .env | grep DATABASE_URL

# 测试数据库连接
mysql -u vibe_user -p vibe

# 检查 MySQL 状态
sudo systemctl status mysql
```

### Q3: seed 执行后没有看到测试账号

**原因**: 使用了生产环境命令

**说明**: 
- `NODE_ENV=production` 不会创建测试账号
- 使用 `NODE_ENV=development` 才会创建测试账号

**解决**:
```bash
# 如果需要测试账号，使用开发环境
NODE_ENV=development pnpm run prisma:seed:dev
```

### Q4: 如何添加新的超级管理员？

**方法 1: 使用 API（推荐）**
```bash
# 先创建普通用户，然后通过 API 分配管理员角色
```

**方法 2: 直接插入数据库**
```sql
-- 1. 创建用户（密码为 admin123 的 bcrypt hash）
INSERT INTO users (user_key, password, phone, nick_name, status)
VALUES ('newadmin', '$2a$10$Xhx3yq5z4YpC9/s1Cv5kkuBP8Yq4xI6s4h8P8E9e1B9Q1Y8E1B9Q1', 
        '13900139000', '新管理员', 'active');

-- 2. 获取角色 ID
SELECT id FROM roles WHERE code = 'admin';

-- 3. 分配角色（假设 admin 角色 ID 为 1，用户 ID 为 3）
INSERT INTO user_roles (user_id, role_id)
VALUES (3, 1);
```

---

## 📝 完整命令清单

```bash
# === 完整初始化流程 ===

# 1. 生成 Prisma Client
pnpm run prisma:generate

# 2. 执行数据库迁移
NODE_ENV=production pnpm run prisma:migrate:deploy

# 3. 初始化种子数据
NODE_ENV=production pnpm run prisma:seed:prod


# === 验证 ===

# 查看数据库
mysql -u vibe_user -p vibe

# 或使用 Prisma Studio
NODE_ENV=production pnpm run prisma:studio


# === 其他有用命令 ===

# 查看迁移状态
npx prisma migrate status

# 查看数据库结构
npx prisma db pull

# 格式化 schema
npx prisma format
```

---

## 🎯 下一步

初始化完成后：

1. ✅ 启动应用
2. ✅ 验证健康检查: `curl http://localhost:3000/health`
3. ✅ 测试登录（如果有测试账号）
4. ✅ 查看 API 文档（如启用）: `http://localhost:3000/api`

---

**💡 提示**: 种子数据是系统运行的基础，确保在启动应用前完成初始化！

