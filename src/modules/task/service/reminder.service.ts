import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { UpdateTaskReminderDto } from '../dto/reminder.dto';
import { CreateTaskReminderDto } from '../dto/task.dto';

@Injectable()
export class TaskReminderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建任务提醒
   */
  async create(taskId: number, createReminderDto: CreateTaskReminderDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.taskReminder.create({
      data: {
        ...createReminderDto,
        task_id: taskId,
      },
    });
  }

  /**
   * 查找任务的所有提醒
   */
  async findTaskReminders(taskId: number) {
    return this.prisma.taskReminder.findMany({
      where: { task_id: taskId },
      orderBy: { reminder_time: 'asc' },
    });
  }

  /**
   * 更新提醒
   */
  async update(id: number, updateReminderDto: UpdateTaskReminderDto) {
    const reminder = await this.prisma.taskReminder.findUnique({
      where: { id },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return this.prisma.taskReminder.update({
      where: { id },
      data: updateReminderDto,
    });
  }

  /**
   * 删除提醒
   */
  async remove(id: number) {
    const reminder = await this.prisma.taskReminder.findUnique({
      where: { id },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    await this.prisma.taskReminder.delete({
      where: { id },
    });

    return { message: 'Reminder deleted successfully' };
  }

  /**
   * 切换提醒激活状态
   */
  async toggleActive(id: number) {
    const reminder = await this.prisma.taskReminder.findUnique({
      where: { id },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return this.prisma.taskReminder.update({
      where: { id },
      data: { is_active: !reminder.is_active },
    });
  }
}
