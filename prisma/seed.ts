import { PrismaClient } from 'prisma-mysql';

const prisma = new PrismaClient();

// 获取环境
const ENV = process.env.NODE_ENV || 'development';
const isDevelopment = ENV === 'development';
const isTest = ENV === 'test';
// const isProduction = ENV === 'production';

async function main() {
  console.log('🌱 开始初始化数据库...');
  console.log(`📋 环境: ${ENV}`);
  console.log('');

  // 1. 创建权限
  console.log('📝 创建权限...');

  const permissions = [
    // 用户权限
    {
      name: '查看用户',
      code: 'user:read',
      resource: 'user',
      action: 'read',
      description: '查看用户信息',
    },
    {
      name: '创建用户',
      code: 'user:create',
      resource: 'user',
      action: 'create',
      description: '创建新用户',
    },
    {
      name: '更新用户',
      code: 'user:update',
      resource: 'user',
      action: 'update',
      description: '更新用户信息',
    },
    {
      name: '写入用户',
      code: 'user:write',
      resource: 'user',
      action: 'write',
      description: '创建或更新用户信息',
    },
    {
      name: '删除用户',
      code: 'user:delete',
      resource: 'user',
      action: 'delete',
      description: '删除用户',
    },

    // 计划权限
    {
      name: '查看计划',
      code: 'plan:read',
      resource: 'plan',
      action: 'read',
      description: '查看计划信息',
    },
    {
      name: '创建计划',
      code: 'plan:create',
      resource: 'plan',
      action: 'create',
      description: '创建新计划',
    },
    {
      name: '更新计划',
      code: 'plan:update',
      resource: 'plan',
      action: 'update',
      description: '更新计划信息',
    },
    {
      name: '删除计划',
      code: 'plan:delete',
      resource: 'plan',
      action: 'delete',
      description: '删除计划',
    },

    // 任务权限
    {
      name: '查看任务',
      code: 'task:read',
      resource: 'task',
      action: 'read',
      description: '查看任务信息',
    },
    {
      name: '创建任务',
      code: 'task:create',
      resource: 'task',
      action: 'create',
      description: '创建新任务',
    },
    {
      name: '更新任务',
      code: 'task:update',
      resource: 'task',
      action: 'update',
      description: '更新任务信息',
    },
    {
      name: '删除任务',
      code: 'task:delete',
      resource: 'task',
      action: 'delete',
      description: '删除任务',
    },

    // 角色权限管理
    {
      name: '查看角色',
      code: 'role:read',
      resource: 'role',
      action: 'read',
      description: '查看角色信息',
    },
    {
      name: '管理角色',
      code: 'role:manage',
      resource: 'role',
      action: 'manage',
      description: '创建、更新、删除角色',
    },

    // 权限管理
    {
      name: '查看权限',
      code: 'permission:read',
      resource: 'permission',
      action: 'read',
      description: '查看权限信息',
    },
    {
      name: '管理权限',
      code: 'permission:manage',
      resource: 'permission',
      action: 'manage',
      description: '创建、更新、删除权限',
    },

    // 系统管理
    {
      name: '系统配置',
      code: 'system:config',
      resource: 'system',
      action: 'config',
      description: '修改系统配置',
    },
    {
      name: '系统监控',
      code: 'system:monitor',
      resource: 'system',
      action: 'monitor',
      description: '查看系统监控数据',
    },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: permission,
      create: permission,
    });
  }

  console.log(`✅ 创建了 ${permissions.length} 个权限`);

  // 2. 创建角色
  console.log('👥 创建角色...');

  const adminRole = await prisma.role.upsert({
    where: { code: 'admin' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'admin',
      description: '拥有系统所有权限的最高管理员',
      is_system: true,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { code: 'user' },
    update: {},
    create: {
      name: '普通用户',
      code: 'user',
      description: '系统普通用户，可以管理自己的数据',
      is_system: true,
    },
  });

  const guestRole = await prisma.role.upsert({
    where: { code: 'guest' },
    update: {},
    create: {
      name: '访客',
      code: 'guest',
      description: '只读访问权限的访客用户',
      is_system: true,
    },
  });

  const moderatorRole = await prisma.role.upsert({
    where: { code: 'moderator' },
    update: {},
    create: {
      name: '内容审核员',
      code: 'moderator',
      description: '负责内容审核的管理员',
      is_system: false,
    },
  });

  console.log('✅ 创建了 4 个角色');

  // 3. 分配权限给角色
  console.log('🔗 分配权限给角色...');

  // 超级管理员 - 拥有所有权限
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        unique_role_permission: {
          role_id: adminRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: adminRole.id,
        permission_id: permission.id,
      },
    });
  }
  console.log(`  ✅ 超级管理员获得所有 ${allPermissions.length} 个权限`);

  // 普通用户 - 基础权限
  const userPermissions = await prisma.permission.findMany({
    where: {
      code: {
        in: [
          'plan:read',
          'plan:create',
          'plan:update',
          'plan:delete',
          'task:read',
          'task:create',
          'task:update',
          'task:delete',
        ],
      },
    },
  });
  for (const permission of userPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        unique_role_permission: {
          role_id: userRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: userRole.id,
        permission_id: permission.id,
      },
    });
  }
  console.log(`  ✅ 普通用户获得 ${userPermissions.length} 个权限`);

  // 访客 - 只读权限
  const guestPermissions = await prisma.permission.findMany({
    where: {
      code: {
        in: ['plan:read', 'task:read'],
      },
    },
  });
  for (const permission of guestPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        unique_role_permission: {
          role_id: guestRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: guestRole.id,
        permission_id: permission.id,
      },
    });
  }
  console.log(`  ✅ 访客获得 ${guestPermissions.length} 个权限`);

  // 内容审核员 - 审核相关权限
  const moderatorPermissions = await prisma.permission.findMany({
    where: {
      code: {
        in: [
          'user:read',
          'plan:read',
          'plan:update',
          'plan:delete',
          'task:read',
          'task:update',
          'task:delete',
        ],
      },
    },
  });
  for (const permission of moderatorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        unique_role_permission: {
          role_id: moderatorRole.id,
          permission_id: permission.id,
        },
      },
      update: {},
      create: {
        role_id: moderatorRole.id,
        permission_id: permission.id,
      },
    });
  }
  console.log(`  ✅ 内容审核员获得 ${moderatorPermissions.length} 个权限`);

  // 4. 根据环境创建测试数据
  let testUsersCount = 0;

  if (isDevelopment || isTest) {
    console.log('');
    console.log('👤 创建测试用户...');

    // 创建测试管理员
    await prisma.user.upsert({
      where: { user_key: 'admin' },
      update: {},
      create: {
        user_key: 'admin',
        password: '$2a$10$Xhx3yq5z4YpC9/s1Cv5kkuBP8Yq4xI6s4h8P8E9e1B9Q1Y8E1B9Q1', // password: admin123
        phone: '13800138000',
        nick_name: '系统管理员',
        status: 'active',
        user_roles: {
          create: {
            role_id: adminRole.id,
          },
        },
      },
    });
    testUsersCount++;

    // 创建测试普通用户
    await prisma.user.upsert({
      where: { user_key: 'testuser' },
      update: {},
      create: {
        user_key: 'testuser',
        password: '$2a$10$Xhx3yq5z4YpC9/s1Cv5kkuBP8Yq4xI6s4h8P8E9e1B9Q1Y8E1B9Q1', // password: admin123
        phone: '13800138001',
        nick_name: '测试用户',
        status: 'active',
        user_roles: {
          create: {
            role_id: userRole.id,
          },
        },
      },
    });
    testUsersCount++;

    console.log(`  ✅ 创建了 ${testUsersCount} 个测试用户`);
    console.log('     - 管理员: admin / admin123');
    console.log('     - 普通用户: testuser / admin123');

    // 仅在开发环境创建示例计划和任务
    // if (isDevelopment) {
    //   console.log('');
    //   console.log('📋 创建示例计划和任务...');

    //   // 创建示例计划
    //   const plan1 = await prisma.plan.create({
    //     data: {
    //       creator: testUser.id,
    //       name: '2024年度健康计划',
    //       description: '保持健康的生活方式，每天运动30分钟',
    //     },
    //   });
    //   testPlansCount++;

    //   const plan2 = await prisma.plan.create({
    //     data: {
    //       creator: testUser.id,
    //       name: '学习 NestJS 框架',
    //       description: '深入学习 NestJS 框架和最佳实践',
    //     },
    //   });
    //   testPlansCount++;

    //   // 创建示例任务
    //   const tasks = [
    //     {
    //       plan_id: plan1.id,
    //       name: '晨跑30分钟',
    //       description: '每天早上7点开始跑步',
    //       mode: TaskMode.completion,
    //       counting_start: 0,
    //       counting_target: 1,
    //       counting_method: CountingMethod.sum,
    //       data_source: DataSource.manual,
    //     },
    //     {
    //       plan_id: plan1.id,
    //       name: '健康饮食',
    //       description: '控制饮食，多吃蔬菜水果',
    //       mode: TaskMode.completion,
    //       counting_start: 0,
    //       counting_target: 1,
    //       counting_method: CountingMethod.sum,
    //       data_source: DataSource.manual,
    //     },
    //     {
    //       plan_id: plan2.id,
    //       creator: testUser.id,
    //       name: '学习 NestJS 基础',
    //       description: '完成官方文档的阅读',
    //       mode: TaskMode.completion,
    //       counting_start: 0,
    //       counting_target: 1,
    //       counting_method: CountingMethod.sum,
    //       data_source: DataSource.manual,
    //     },
    //     {
    //       plan_id: plan2.id,
    //       creator: testUser.id,
    //       name: '实现 RBAC 权限系统',
    //       description: '基于角色的访问控制系统',
    //       mode: TaskMode.completion,
    //       counting_start: 0,
    //       counting_target: 1,
    //       counting_method: CountingMethod.sum,
    //       data_source: DataSource.manual,
    //     },
    //   ];

    //   for (const task of tasks) {
    //     await prisma.task.create({ data: task });
    //     testTasksCount++;
    //   }

    //   console.log(`  ✅ 创建了 ${testPlansCount} 个示例计划`);
    //   console.log(`  ✅ 创建了 ${testTasksCount} 个示例任务`);
    // }
  }

  console.log('');
  console.log('✨ 数据库初始化完成！');
  console.log('');
  console.log('📊 初始化统计：');
  console.log(`  - 环境: ${ENV}`);
  console.log(`  - 权限数量: ${allPermissions.length}`);
  console.log(`  - 角色数量: 4`);
  console.log(
    `  - 角色权限关联: ${allPermissions.length + userPermissions.length + guestPermissions.length + moderatorPermissions.length}`,
  );

  if (isDevelopment || isTest) {
    console.log(`  - 测试用户: ${testUsersCount}`);
  }

  console.log('');

  if (isDevelopment || isTest) {
    console.log('🔐 测试账号：');
    console.log('   管理员：admin / admin123');
    console.log('   普通用户：testuser / admin123');
    console.log('');
  }

  console.log('💡 提示：运行以下命令打开 Prisma Studio 查看数据：');
  if (isDevelopment) {
    console.log('   pnpm run prisma:studio');
  } else {
    console.log(`   NODE_ENV=${ENV} pnpm run prisma:studio`);
  }
}

main()
  .catch((e) => {
    console.error('❌ 数据库初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
