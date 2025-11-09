import { Module } from '@nestjs/common';
import { TaskService } from './service/task.service';
import { TaskController } from './controller/task.controller';
import { TaskReminderService } from './service/reminder.service';
import { TaskRecordService } from './service/record.service';
import { TaskRecordController } from './controller/record.controller';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [PlanModule],
  controllers: [TaskController, TaskRecordController],
  providers: [TaskService, TaskReminderService, TaskRecordService],
  exports: [TaskService, TaskReminderService, TaskRecordService],
})
export class TaskModule {}
