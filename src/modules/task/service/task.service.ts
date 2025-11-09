import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { UpdateTaskDto, CreateTaskDto } from '../dto/task.dto';
import { PlanPermissionService } from '@/modules/plan/service/permission.service';

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PlanPermissionService,
  ) {}

  /**
   * 创建任务
   */
  async create(userId: number, createTaskDto: CreateTaskDto) {
    // 验证计划是否存在
    const plan = await this.prisma.plan.findUnique({
      where: { id: createTaskDto.plan_id },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // 权限检查：需要至少 member 角色
    const canCreate = await this.permissionService.canCreateTask(createTaskDto.plan_id, userId);
    if (!canCreate) {
      throw new ForbiddenException(
        'You do not have permission to create tasks in this plan. Required role: member or higher.',
      );
    }

    // 如果有父任务，验证父任务存在
    if (createTaskDto.parent_task_id) {
      const parentTask = await this.prisma.task.findUnique({
        where: { id: createTaskDto.parent_task_id },
      });

      if (!parentTask || parentTask.plan_id !== createTaskDto.plan_id) {
        throw new NotFoundException('Parent task not found or does not belong to this plan');
      }
    }

    const { reminders, ...taskData } = createTaskDto;

    const task = await this.prisma.task.create({
      data: {
        ...taskData,
        reminders: reminders
          ? {
              create: reminders,
            }
          : undefined,
      },
      include: {
        reminders: true,
        subtasks: true,
      },
    });

    return task;
  }

  /**
   * 查找计划的所有任务
   */
  async findPlanTasks(planId: number, userId?: number) {
    // 验证用户权限
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        participants: userId ? { where: { user_id: userId } } : false,
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (!plan.is_public && userId) {
      const isParticipant =
        plan.participants && Array.isArray(plan.participants) && plan.participants.length > 0;
      if (!isParticipant) {
        throw new ForbiddenException('You do not have permission to view tasks of this plan');
      }
    }

    return this.prisma.task.findMany({
      where: {
        plan_id: planId,
        parent_task_id: null, // 只返回顶层任务
      },
      include: {
        subtasks: {
          include: {
            reminders: true,
            subtasks: true,
          },
        },
        reminders: true,
        _count: {
          select: {
            records: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * 根据ID查找任务
   */
  async findOne(id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            type: true,
            creator: true,
          },
        },
        parent_task: {
          select: {
            id: true,
            name: true,
          },
        },
        subtasks: {
          include: {
            reminders: true,
          },
        },
        reminders: true,
        _count: {
          select: {
            records: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  /**
   * 更新任务
   */
  async update(id: number, userId: number, updateTaskDto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        plan: {
          select: { id: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 权限检查：需要至少 member 角色
    const canModify = await this.permissionService.canModifyTask(task.plan.id, userId);
    if (!canModify) {
      throw new ForbiddenException(
        'You do not have permission to modify tasks in this plan. Required role: member or higher.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { task_id, reminders: _, ...taskData } = updateTaskDto;

    return this.prisma.task.update({
      where: { id: task_id },
      data: taskData,
      include: {
        reminders: true,
        subtasks: true,
      },
    });
  }

  /**
   * 删除任务
   */
  async remove(id: number, userId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        plan: {
          select: { id: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 权限检查：需要至少 admin 角色
    const canDelete = await this.permissionService.canDeleteTask(task.plan.id, userId);
    if (!canDelete) {
      throw new ForbiddenException(
        'You do not have permission to delete tasks in this plan. Required role: admin or higher.',
      );
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return { message: 'Task deleted successfully' };
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStats(taskId: number) {
    const [totalRecords, completedRecords] = await Promise.all([
      this.prisma.taskRecord.count({
        where: { task_id: taskId },
      }),
      this.prisma.taskRecord.count({
        where: {
          task_id: taskId,
          completion_status: 'completed',
        },
      }),
    ]);

    return {
      total_records: totalRecords,
      completed_records: completedRecords,
      completion_rate: totalRecords > 0 ? (completedRecords / totalRecords) * 100 : 0,
    };
  }

  /**
   * 递归获取任务的所有父任务
   */
  private async getTaskParentChain(taskId: number): Promise<any[]> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        name: true,
        description: true,
        mode: true,
        parent_task_id: true,
      },
    });

    if (!task) {
      return [];
    }

    // 如果有父任务，递归获取
    if (task.parent_task_id) {
      const parentChain = await this.getTaskParentChain(task.parent_task_id);
      return [...parentChain, task];
    }

    // 顶层任务
    return [task];
  }

  /**
   * 获取用户指定日期的任务
   * 返回任务列表，包含完整的父任务链和计划信息
   * @param userId 用户ID
   * @param date 指定日期，不传则为今天
   * @param taskId 可选的任务ID，用于查询指定任务
   */
  async getUserTodayTasks(userId: number, date?: Date, taskId?: number) {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 获取用户参与的所有计划
    const userPlans = await this.prisma.planParticipant.findMany({
      where: { user_id: userId },
      select: { plan_id: true },
    });

    const planIds = userPlans.map((p) => p.plan_id);

    if (planIds.length === 0) {
      return [];
    }

    // 构建查询条件
    const whereCondition: any = {
      plan_id: { in: planIds },
    };

    // 如果指定了任务 ID，添加到筛选条件
    if (taskId) {
      whereCondition.id = taskId;
    }

    // 获取这些计划的所有任务（不限定是否重复）
    const tasks = await this.prisma.task.findMany({
      where: whereCondition,
      include: {
        plan: {
          select: {
            name: true,
            type: true,
            icon: true,
            description: true,
          },
        },
        reminders: {
          select: {
            reminder_time: true,
            days_of_week: true,
            is_active: true,
          },
        },
        records: {
          where: {
            user_id: userId,
            completion_date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          select: {
            completion_status: true,
            count_value: true,
            notes: true,
            recorded_at: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    // 为每个任务添加父任务链
    const tasksWithParentChain = await Promise.all(
      tasks.map(async (task) => {
        let parentChain: any[] = [];
        if (task.parent_task_id) {
          parentChain = await this.getTaskParentChain(task.parent_task_id);
        }

        return {
          // 任务基本信息
          id: task.id,
          name: task.name,
          description: task.description,
          mode: task.mode,
          is_repeating: task.is_repeating,
          repeat_interval: task.repeat_interval,
          repeat_unit: task.repeat_unit,
          counting_start: task.counting_start,
          counting_target: task.counting_target,
          counting_method: task.counting_method,
          data_source: task.data_source,
          created_at: task.created_at,

          // 计划信息
          plan: task.plan,

          // 父任务链（从根任务到直接父任务）
          parentChain: parentChain,

          // 提醒信息
          reminders: task.reminders,

          // 今日完成记录
          todayRecords: task.records,

          // 完成状态
          isCompletedToday: task.records.length > 0,
        };
      }),
    );

    return tasksWithParentChain;
  }
}
