import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { Prisma, PlanType, PlanSource, ParticipantRole } from 'prisma-mysql';
import { PlanPermissionService } from './permission.service';
import { CreatePlanDto, UpdatePlanDto } from '../dto/plan.dto';

@Injectable()
export class PlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PlanPermissionService,
  ) {}

  /**
   * 根据 user_key 或 phone 查找用户
   * 优先使用 user_key，如果不存在则使用 phone
   */
  private async findUserByKeyOrPhone(user_key?: string, phone?: string): Promise<{ id: number }> {
    if (!user_key && !phone) {
      throw new BadRequestException('Must provide user_key or phone');
    }

    let user;

    // 优先使用 user_key
    if (user_key) {
      user = await this.prisma.user.findUnique({
        where: { user_key },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException(`User with user_key "${user_key}" not found`);
      }
    } else if (phone) {
      // 使用 phone
      user = await this.prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException(`User with phone "${phone}" not found`);
      }
    }

    return user!;
  }

  /**
   * 在事务中根据 user_key 或 phone 查找用户
   * 优先使用 user_key，如果不存在则使用 phone
   */
  private async findUserByKeyOrPhoneInTx(
    tx: any,
    user_key?: string,
    phone?: string,
  ): Promise<{ id: number }> {
    if (!user_key && !phone) {
      throw new BadRequestException('Must provide user_key or phone');
    }

    let user;

    // 优先使用 user_key
    if (user_key) {
      user = await tx.user.findUnique({
        where: { user_key },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException(`User with user_key "${user_key}" not found`);
      }
    } else if (phone) {
      // 使用 phone
      user = await tx.user.findUnique({
        where: { phone },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException(`User with phone "${phone}" not found`);
      }
    }

    return user!;
  }

  /**
   * 创建计划
   */
  async create(userId: number, createPlanDto: CreatePlanDto) {
    const { tasks, participants, ...planData } = createPlanDto;

    // 使用事务确保原子性
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 创建计划
      const plan = await tx.plan.create({
        data: {
          ...planData,
          creator: userId,
        },
      });

      // 2. 自动将创建者加入参与者，角色为 owner
      await tx.planParticipant.create({
        data: {
          plan_id: plan.id,
          user_id: userId,
          role: ParticipantRole.owner,
        },
      });

      // 3. 邀请其他参与者（如果有）
      if (participants && participants.length > 0) {
        // 先查找所有用户 ID
        const participantUserIds = await Promise.all(
          participants.map(async (p) => {
            const user = await this.findUserByKeyOrPhoneInTx(tx, p.user_key, p.phone);
            return {
              user_id: user.id,
              role: p.role || ParticipantRole.member,
            };
          }),
        );

        // 批量创建参与者
        await tx.planParticipant.createMany({
          data: participantUserIds.map((p) => ({
            plan_id: plan.id,
            user_id: p.user_id,
            role: p.role,
          })),
          skipDuplicates: true,
        });
      }

      // 4. 创建任务树（如果有）
      if (tasks && tasks.length > 0) {
        await this.createTasksRecursively(tx, plan.id, tasks, null);
      }

      // 5. 返回完整的计划信息
      return tx.plan.findUnique({
        where: { id: plan.id },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  user_key: true,
                  nick_name: true,
                  avatar: true,
                },
              },
            },
          },
          tasks: {
            where: { parent_task_id: null }, // 只返回顶层任务
            include: {
              subtasks: {
                include: {
                  subtasks: true,
                  reminders: true,
                },
              },
              reminders: true,
            },
          },
        },
      });
    });

    return result;
  }

  /**
   * 递归创建任务树
   * @param tx - Prisma 事务对象
   * @param planId - 计划 ID
   * @param tasks - 任务列表
   * @param parentTaskId - 父任务 ID（null 表示顶层任务）
   */
  private async createTasksRecursively(
    tx: any,
    planId: number,
    tasks: any[],
    parentTaskId: number | null,
  ) {
    for (const taskData of tasks) {
      const { subtasks, reminders, ...taskInfo } = taskData;

      // 创建当前任务
      const task = await tx.task.create({
        data: {
          ...taskInfo,
          plan_id: planId,
          parent_task_id: parentTaskId,
          mode: taskInfo.mode || 'completion',
          data_source: taskInfo.data_source || 'manual',
          // 创建提醒
          reminders: reminders
            ? {
                createMany: {
                  data: reminders,
                },
              }
            : undefined,
        },
      });

      // 递归创建子任务
      if (subtasks && subtasks.length > 0) {
        await this.createTasksRecursively(tx, planId, subtasks, task.id);
      }
    }
  }

  /**
   * 查找所有计划
   */
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.PlanWhereInput;
    orderBy?: Prisma.PlanOrderByWithRelationInput;
    userId?: number;
  }) {
    const { skip, take, where, orderBy, userId } = params || {};

    // 构建查询条件：用户参与的计划或公开的计划
    const whereCondition: Prisma.PlanWhereInput = {
      ...where,
      OR: userId
        ? [
            { creator: userId },
            { participants: { some: { user_id: userId } } },
            { is_public: true },
          ]
        : [{ is_public: true }],
    };

    const [plans, total] = await Promise.all([
      this.prisma.plan.findMany({
        skip,
        take,
        where: whereCondition,
        orderBy: orderBy || { created_at: 'desc' },
        select: {
          // 计划基本信息（过滤掉 id 和 creator）
          name: true,
          icon: true,
          background_image: true,
          description: true,
          bonus: true,
          medals: true,
          type: true,
          create_source: true,
          is_public: true,
          created_at: true,
          updated_at: true,
          // 参与者信息（包含用户详情）
          participants: {
            select: {
              role: true,
              joined_at: true,
              user: {
                select: {
                  user_key: true,
                  nick_name: true,
                  avatar: true,
                  status: true,
                },
              },
            },
          },
          // 任务信息（只返回顶层任务概览）
          tasks: {
            where: { parent_task_id: null },
            select: {
              name: true,
              description: true,
              mode: true,
              is_repeating: true,
              created_at: true,
            },
          },
          // 统计信息
          _count: {
            select: {
              participants: true,
              tasks: true,
            },
          },
        },
      }),
      this.prisma.plan.count({ where: whereCondition }),
    ]);

    return {
      list: plans,
      total,
      page: skip ? Math.floor(skip / (take || 10)) + 1 : 1,
      pageSize: take || 10,
    };
  }

  /**
   * 查找用户的计划
   */
  async findUserPlans(userId: number, type?: PlanType) {
    const where: Prisma.PlanWhereInput = {
      participants: {
        some: { user_id: userId },
      },
    };

    if (type) {
      where.type = type;
    }

    return this.prisma.plan.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: {
        name: true,
        icon: true,
        background_image: true,
        description: true,
        type: true,
        create_source: true,
        is_public: true,
        created_at: true,
        updated_at: true,
        participants: {
          select: {
            role: true,
            joined_at: true,
            user: {
              select: {
                user_key: true,
                nick_name: true,
                avatar: true,
              },
            },
          },
        },
        tasks: {
          where: { parent_task_id: null },
          select: {
            name: true,
            description: true,
            mode: true,
            is_repeating: true,
            created_at: true,
          },
        },
        _count: {
          select: {
            participants: true,
            tasks: true,
          },
        },
      },
    });
  }

  /**
   * 查找公开的计划（市场）
   */
  async findPublicPlans(params?: {
    skip?: number;
    take?: number;
    type?: PlanType;
    source?: PlanSource;
  }) {
    const { skip, take, type, source } = params || {};

    const where: Prisma.PlanWhereInput = {
      is_public: true,
    };

    if (type) {
      where.type = type;
    }

    if (source) {
      where.create_source = source;
    }

    const [plans, total] = await Promise.all([
      this.prisma.plan.findMany({
        skip,
        take: take || 20,
        where,
        orderBy: [{ participants: { _count: 'desc' } }, { created_at: 'desc' }],
        select: {
          name: true,
          icon: true,
          background_image: true,
          description: true,
          bonus: true,
          medals: true,
          type: true,
          create_source: true,
          is_public: true,
          created_at: true,
          updated_at: true,
          participants: {
            select: {
              role: true,
              joined_at: true,
              user: {
                select: {
                  user_key: true,
                  nick_name: true,
                  avatar: true,
                },
              },
            },
          },
          _count: {
            select: {
              participants: true,
              tasks: true,
            },
          },
        },
      }),
      this.prisma.plan.count({ where }),
    ]);

    return {
      list: plans,
      total,
      page: skip ? Math.floor(skip / (take || 20)) + 1 : 1,
      pageSize: take || 20,
    };
  }

  /**
   * 根据ID查找计划
   */
  async findOne(id: number, userId?: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      select: {
        name: true,
        icon: true,
        background_image: true,
        description: true,
        bonus: true,
        medals: true,
        type: true,
        create_source: true,
        is_public: true,
        created_at: true,
        updated_at: true,
        participants: {
          select: {
            role: true,
            joined_at: true,
            updated_at: true,
            user: {
              select: {
                user_key: true,
                nick_name: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
        tasks: {
          where: { parent_task_id: null },
          select: {
            name: true,
            description: true,
            mode: true,
            is_repeating: true,
            repeat_interval: true,
            repeat_unit: true,
            needs_reminder: true,
            counting_start: true,
            counting_target: true,
            counting_method: true,
            data_source: true,
            created_at: true,
            updated_at: true,
            subtasks: {
              select: {
                name: true,
                description: true,
                mode: true,
                is_repeating: true,
                created_at: true,
              },
            },
            reminders: {
              select: {
                reminder_time: true,
                days_of_week: true,
                is_active: true,
                created_at: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
            tasks: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // 检查权限：公开计划或参与者可以查看
    if (!plan.is_public && userId) {
      const isParticipant = plan.participants.some((p) => p.user.user_key);
      if (!isParticipant) {
        throw new ForbiddenException('You do not have permission to view this plan');
      }
    }

    return plan;
  }

  /**
   * 更新计划
   */
  async update(id: number, userId: number, updatePlanDto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // 权限检查：需要 admin 或 owner 权限
    const canModify = await this.permissionService.canModifyPlan(id, userId);
    if (!canModify) {
      throw new ForbiddenException(
        'You do not have permission to modify this plan. Required role: admin or higher.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { plan_id: _, ...rest } = updatePlanDto;

    return this.prisma.plan.update({
      where: { id },
      data: rest,
      select: {
        name: true,
        icon: true,
        background_image: true,
        description: true,
        bonus: true,
        medals: true,
        type: true,
        create_source: true,
        is_public: true,
        created_at: true,
        updated_at: true,
        participants: {
          select: {
            role: true,
            joined_at: true,
            user: {
              select: {
                user_key: true,
                nick_name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * 删除计划
   * 会级联删除：参与者关系、任务、任务记录、任务提醒
   */
  async remove(id: number, userId: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        participants: {
          select: { id: true, user_id: true },
        },
        tasks: {
          select: { id: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // 权限检查：只有 owner 可以删除计划
    const canDelete = await this.permissionService.canDeletePlan(id, userId);
    if (!canDelete) {
      throw new ForbiddenException(
        'You do not have permission to delete this plan. Only the owner can delete.',
      );
    }

    // 使用事务删除所有关联数据，确保数据完整性
    const deletionStats = await this.prisma.$transaction(async (tx) => {
      const taskIds = plan.tasks.map((t) => t.id);
      let deletedRecords = 0;
      let deletedReminders = 0;
      let deletedTasks = 0;

      // 1. 删除所有任务的完成记录（task_records 表）
      if (taskIds.length > 0) {
        const recordResult = await tx.taskRecord.deleteMany({
          where: { task_id: { in: taskIds } },
        });
        deletedRecords = recordResult.count;

        // 2. 删除所有任务的提醒（task_reminders 表）
        const reminderResult = await tx.taskReminder.deleteMany({
          where: { task_id: { in: taskIds } },
        });
        deletedReminders = reminderResult.count;

        // 3. 删除所有任务（tasks 表，包括子任务）
        const taskResult = await tx.task.deleteMany({
          where: { plan_id: id },
        });
        deletedTasks = taskResult.count;
      }

      // 4. 删除所有参与者关系（plan_participants 表）
      const participantResult = await tx.planParticipant.deleteMany({
        where: { plan_id: id },
      });

      // 5. 最后删除计划本身（plans 表）
      await tx.plan.delete({
        where: { id },
      });

      return {
        participants: participantResult.count,
        tasks: deletedTasks,
        taskRecords: deletedRecords,
        taskReminders: deletedReminders,
      };
    });

    return {
      message: 'Plan and all related data deleted successfully',
      deleted: deletionStats,
    };
  }

  /**
   * 获取计划统计信息
   */
  async getPlanStats(planId: number) {
    const [participantCount, taskCount, recordCount] = await Promise.all([
      this.prisma.planParticipant.count({
        where: { plan_id: planId },
      }),
      this.prisma.task.count({
        where: { plan_id: planId },
      }),
      this.prisma.taskRecord.count({
        where: {
          task: {
            plan_id: planId,
          },
        },
      }),
    ]);

    return {
      participant_count: participantCount,
      task_count: taskCount,
      record_count: recordCount,
    };
  }
}
