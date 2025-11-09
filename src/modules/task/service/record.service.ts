import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { UpdateTaskRecordDto, CreateTaskRecordDto } from '../dto/record.dto';
import { Prisma, CompletionStatus } from 'prisma-mysql';

@Injectable()
export class TaskRecordService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建任务记录
   */
  async create(userId: number, createRecordDto: CreateTaskRecordDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: createRecordDto.task_id },
      include: {
        plan: {
          include: {
            participants: {
              where: { user_id: userId },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // 验证用户是否有权限
    if (task.plan.participants.length === 0) {
      throw new ConflictException('You are not a participant of this plan');
    }

    const completionDate = createRecordDto.completion_date
      ? new Date(createRecordDto.completion_date)
      : new Date();

    // 检查是否已存在记录
    const existing = await this.prisma.taskRecord.findUnique({
      where: {
        unique_task_user_date: {
          task_id: createRecordDto.task_id,
          user_id: userId,
          completion_date: completionDate,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Record already exists for this date');
    }

    return this.prisma.taskRecord.create({
      data: {
        ...createRecordDto,
        user_id: userId,
        completion_date: completionDate,
      },
      include: {
        task: {
          select: {
            id: true,
            name: true,
            counting_target: true,
          },
        },
      },
    });
  }

  /**
   * 查找用户的任务记录
   */
  async findUserRecords(
    userId: number,
    params?: {
      taskId?: number;
      startDate?: Date;
      endDate?: Date;
      status?: CompletionStatus;
      skip?: number;
      take?: number;
    },
  ) {
    const { taskId, startDate, endDate, status, skip, take } = params || {};

    const where: Prisma.TaskRecordWhereInput = {
      user_id: userId,
    };

    if (taskId) {
      where.task_id = taskId;
    }

    if (startDate || endDate) {
      where.completion_date = {};
      if (startDate) {
        where.completion_date.gte = startDate;
      }
      if (endDate) {
        where.completion_date.lte = endDate;
      }
    }

    if (status) {
      where.completion_status = status;
    }

    const [records, total] = await Promise.all([
      this.prisma.taskRecord.findMany({
        skip,
        take: take || 50,
        where,
        include: {
          task: {
            select: {
              id: true,
              name: true,
              mode: true,
              counting_target: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: { completion_date: 'desc' },
      }),
      this.prisma.taskRecord.count({ where }),
    ]);

    return {
      list: records,
      total,
      page: skip ? Math.floor(skip / (take || 50)) + 1 : 1,
      pageSize: take || 50,
    };
  }

  /**
   * 查找任务的所有记录
   */
  async findTaskRecords(
    taskId: number,
    params?: {
      startDate?: Date;
      endDate?: Date;
      userId?: number;
    },
  ) {
    const { startDate, endDate, userId } = params || {};

    const where: Prisma.TaskRecordWhereInput = {
      task_id: taskId,
    };

    if (userId) {
      where.user_id = userId;
    }

    if (startDate || endDate) {
      where.completion_date = {};
      if (startDate) {
        where.completion_date.gte = startDate;
      }
      if (endDate) {
        where.completion_date.lte = endDate;
      }
    }

    return this.prisma.taskRecord.findMany({
      where,
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
      orderBy: { completion_date: 'desc' },
    });
  }

  /**
   * 更新任务记录
   */
  async update(id: number, userId: number, updateRecordDto: UpdateTaskRecordDto) {
    const record = await this.prisma.taskRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    // 只能更新自己的记录
    if (record.user_id !== userId) {
      throw new ConflictException('You can only update your own records');
    }

    return this.prisma.taskRecord.update({
      where: { id },
      data: updateRecordDto,
      include: {
        task: {
          select: {
            id: true,
            name: true,
            mode: true,
          },
        },
      },
    });
  }

  /**
   * 删除任务记录
   */
  async remove(id: number, userId: number) {
    const record = await this.prisma.taskRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    // 只能删除自己的记录
    if (record.user_id !== userId) {
      throw new ConflictException('You can only delete your own records');
    }

    await this.prisma.taskRecord.delete({
      where: { id },
    });

    return { message: 'Record deleted successfully' };
  }

  /**
   * 获取用户的统计信息
   */
  async getUserStats(
    userId: number,
    params?: {
      startDate?: Date;
      endDate?: Date;
      planId?: number;
    },
  ) {
    const { startDate, endDate, planId } = params || {};

    const where: Prisma.TaskRecordWhereInput = {
      user_id: userId,
    };

    if (startDate || endDate) {
      where.completion_date = {};
      if (startDate) {
        where.completion_date.gte = startDate;
      }
      if (endDate) {
        where.completion_date.lte = endDate;
      }
    }

    if (planId) {
      where.task = {
        plan_id: planId,
      };
    }

    const [totalRecords, completedRecords, totalCountValue] = await Promise.all([
      this.prisma.taskRecord.count({ where }),
      this.prisma.taskRecord.count({
        where: {
          ...where,
          completion_status: 'completed',
        },
      }),
      this.prisma.taskRecord.aggregate({
        where,
        _sum: {
          count_value: true,
        },
      }),
    ]);

    return {
      total_records: totalRecords,
      completed_records: completedRecords,
      completion_rate: totalRecords > 0 ? (completedRecords / totalRecords) * 100 : 0,
      total_count_value: totalCountValue._sum.count_value || 0,
    };
  }

  /**
   * 获取用户的日历视图数据
   */
  async getUserCalendarData(userId: number, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const records = await this.prisma.taskRecord.findMany({
      where: {
        user_id: userId,
        completion_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        completion_date: true,
        completion_status: true,
        count_value: true,
      },
    });

    // 按日期分组统计
    const calendarData: Record<string, any> = {};

    records.forEach((record) => {
      const dateKey = record.completion_date.toISOString().split('T')[0];
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = {
          date: dateKey,
          total: 0,
          completed: 0,
        };
      }
      calendarData[dateKey].total += 1;
      if (record.completion_status === 'completed') {
        calendarData[dateKey].completed += 1;
      }
    });

    return Object.values(calendarData);
  }
}
