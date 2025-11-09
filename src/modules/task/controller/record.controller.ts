import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CompletionStatus } from 'prisma-mysql';
import { TaskRecordService } from '../service/record.service';
import {
  CreateTaskRecordDto,
  GetCalendarDto,
  GetRecordsDto,
  GetStatsDto,
  RemoveTaskRecordDto,
  UpdateTaskRecordDto,
} from '../dto/record.dto';

@ApiTags('Records')
@ApiBearerAuth('JWT-auth')
@Controller('task/records')
export class TaskRecordController {
  constructor(private readonly recordService: TaskRecordService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new task record' })
  @ApiResponse({ status: 201, description: 'Record successfully created' })
  async create(@CurrentUser() user: any, @Body() createRecordDto: CreateTaskRecordDto) {
    return this.recordService.create(user.id, createRecordDto);
  }

  @Post('list')
  @ApiOperation({ summary: 'Get current user records' })
  @ApiBody({ type: GetRecordsDto })
  @ApiResponse({ status: 200, description: 'User records retrieved' })
  async getMyRecords(@CurrentUser() user: any, @Body() getRecordsDto: GetRecordsDto) {
    const skip =
      getRecordsDto.page && getRecordsDto.page_size
        ? (getRecordsDto.page - 1) * getRecordsDto.page_size
        : undefined;
    const take = getRecordsDto.page_size || 50;

    return this.recordService.findUserRecords(user.id, {
      taskId: getRecordsDto.task_id ? Number(getRecordsDto.task_id) : undefined,
      startDate: getRecordsDto.start_date ? new Date(getRecordsDto.start_date) : undefined,
      endDate: getRecordsDto.end_date ? new Date(getRecordsDto.end_date) : undefined,
      status: getRecordsDto.status ? (getRecordsDto.status as CompletionStatus) : undefined,
      skip,
      take,
    });
  }

  @Post('stats')
  @ApiOperation({ summary: 'Get current user statistics' })
  @ApiBody({ type: GetStatsDto })
  @ApiResponse({ status: 200, description: 'User statistics retrieved' })
  async getMyStats(@CurrentUser() user: any, @Body() getStatsDto: GetStatsDto) {
    const { start_date, end_date, plan_id } = getStatsDto;
    return this.recordService.getUserStats(user.id, {
      startDate: start_date ? new Date(start_date) : undefined,
      endDate: end_date ? new Date(end_date) : undefined,
      planId: plan_id ? Number(plan_id) : undefined,
    });
  }

  @Post('calendar')
  @ApiOperation({ summary: 'Get current user calendar data' })
  @ApiBody({ type: GetCalendarDto })
  @ApiResponse({ status: 200, description: 'Calendar data retrieved' })
  async getMyCalendar(@CurrentUser() user: any, @Body() getCalendarDto: GetCalendarDto) {
    return this.recordService.getUserCalendarData(
      user.id,
      getCalendarDto.year,
      getCalendarDto.month,
    );
  }

  @Post('update')
  @ApiOperation({ summary: 'Update task record' })
  @ApiResponse({ status: 200, description: 'Record updated' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async update(@CurrentUser() user: any, @Body() updateRecordDto: UpdateTaskRecordDto) {
    return this.recordService.update(updateRecordDto.record_id, user.id, updateRecordDto);
  }

  @Post('remove')
  @ApiOperation({ summary: 'Delete task record' })
  @ApiResponse({ status: 200, description: 'Record deleted' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async remove(@CurrentUser() user: any, @Body() removeRecordDto: RemoveTaskRecordDto) {
    return this.recordService.remove(removeRecordDto.record_id, user.id);
  }
}
