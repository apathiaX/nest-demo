import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TaskService } from '../service/task.service';
import {
  CreateTaskDto,
  FindPlanTasksDto,
  GetTasksByDateDto,
  GetTaskStatsDto,
  RemoveTaskDto,
  UpdateTaskDto,
} from '../dto/task.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task successfully created' })
  async createTask(@CurrentUser() user: any, @Body() createTaskDto: CreateTaskDto) {
    return this.taskService.create(user.id, createTaskDto);
  }

  @Post('info')
  @ApiOperation({
    summary: 'Get user tasks for specified date and/or task ID',
    description:
      'Returns tasks filtered by date and/or task ID, including complete parent task chain and plan information. Can query by date only, task ID only, or both.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Tasks retrieved successfully with parent chain and plan info. Each task includes: task details, parent task chain (from root to direct parent), plan info, reminders, and completion records for the specified date',
  })
  async getTaskInfo(@CurrentUser() user: any, @Body() getTasksDto: GetTasksByDateDto) {
    const targetDate = getTasksDto.date ? new Date(getTasksDto.date) : new Date();
    return this.taskService.getUserTodayTasks(user.id, targetDate, getTasksDto.task_id);
  }

  @Post('list')
  @ApiOperation({ summary: 'Get all tasks of a plan' })
  @ApiResponse({ status: 200, description: 'Plan tasks retrieved' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async findPlanTasks(@Body() findPlanTasksDto: FindPlanTasksDto, @CurrentUser() user: any) {
    return this.taskService.findPlanTasks(findPlanTasksDto.plan_id, user.id);
  }

  @Post('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiResponse({ status: 200, description: 'Task statistics retrieved' })
  async getTaskStats(@Body() getTaskStatsDto: GetTaskStatsDto) {
    return this.taskService.getTaskStats(getTaskStatsDto.task_id);
  }

  @Post('update')
  @ApiOperation({ summary: 'Update task by ID' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateTask(@CurrentUser() user: any, @Body() updateTaskDto: UpdateTaskDto) {
    return this.taskService.update(updateTaskDto.task_id, user.id, updateTaskDto);
  }

  @Post('delete')
  @ApiOperation({ summary: 'Delete task by ID' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async removeTask(@Body() removeTaskDto: RemoveTaskDto, @CurrentUser() user: any) {
    return this.taskService.remove(removeTaskDto.task_id, user.id);
  }
}
