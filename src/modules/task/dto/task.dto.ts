import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { RepeatUnit, TaskMode, CountingMethod, DataSource } from 'prisma-mysql';

export class GetTasksByDateDto {
  @ApiProperty({
    required: false,
    example: '2024-01-01',
    description: '目标日期（YYYY-MM-DD 格式），不提供则默认为今天',
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.task_id)
  date?: string;

  @ApiProperty({
    required: false,
    example: 123,
    description: '任务ID，用于查询指定任务',
  })
  @IsOptional()
  @IsNumber()
  @ValidateIf((o) => !o.date)
  task_id?: number;
}

export class FindPlanTasksDto {
  @ApiProperty({ required: true, description: '计划ID' })
  @IsNotEmpty()
  @IsNumber()
  plan_id: number;
}

export class GetTaskStatsDto {
  @ApiProperty({ required: true, description: '任务ID' })
  @IsNotEmpty()
  @IsNumber()
  task_id: number;
}

export class CreateTaskReminderDto {
  @ApiProperty({ example: '08:00:00', description: 'Time in HH:MM:SS format' })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'reminder_time must be in HH:MM:SS format',
  })
  reminder_time: string;

  @ApiProperty({
    required: false,
    example: '1,2,3,4,5',
    description: 'Comma-separated days (1=Monday, 7=Sunday)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-7](,[1-7])*$/, {
    message: 'days_of_week must be comma-separated numbers from 1 to 7',
  })
  days_of_week?: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateTaskDto {
  @ApiProperty({ required: true, description: '任务ID' })
  @IsNotEmpty()
  @IsNumber()
  task_id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  repeat_interval?: number;

  @ApiProperty({ required: false, enum: RepeatUnit })
  @IsOptional()
  @IsEnum(RepeatUnit)
  repeat_unit?: RepeatUnit;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_repeating?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  needs_reminder?: boolean;

  @ApiProperty({ required: false, enum: TaskMode })
  @IsOptional()
  @IsEnum(TaskMode)
  mode?: TaskMode;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  counting_start?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  counting_target?: number;

  @ApiProperty({ required: false, enum: CountingMethod })
  @IsOptional()
  @IsEnum(CountingMethod)
  counting_method?: CountingMethod;

  @ApiProperty({ required: false, enum: DataSource })
  @IsOptional()
  @IsEnum(DataSource)
  data_source?: DataSource;

  @ApiProperty({ required: false, type: [CreateTaskReminderDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskReminderDto)
  reminders?: CreateTaskReminderDto[];
}

export class CreateTaskDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  plan_id: number;

  @ApiProperty({ required: false, example: null })
  @IsOptional()
  @IsInt()
  parent_task_id?: number;

  @ApiProperty({ example: 'Morning Run' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, example: 'Run 5km every morning' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  repeat_interval?: number;

  @ApiProperty({ required: false, enum: RepeatUnit, default: RepeatUnit.day })
  @IsOptional()
  @IsEnum(RepeatUnit)
  repeat_unit?: RepeatUnit;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  is_repeating?: boolean;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  needs_reminder?: boolean;

  @ApiProperty({ enum: TaskMode, default: TaskMode.completion })
  @IsEnum(TaskMode)
  mode: TaskMode;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  counting_start?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  counting_target?: number;

  @ApiProperty({ required: false, enum: CountingMethod, default: CountingMethod.sum })
  @IsOptional()
  @IsEnum(CountingMethod)
  counting_method?: CountingMethod;

  @ApiProperty({ enum: DataSource, default: DataSource.manual })
  @IsOptional()
  @IsEnum(DataSource)
  data_source?: DataSource;

  @ApiProperty({ required: false, type: [CreateTaskReminderDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskReminderDto)
  reminders?: CreateTaskReminderDto[];
}

export class RemoveTaskDto {
  @ApiProperty({ required: true, description: '任务ID' })
  @IsNotEmpty()
  @IsNumber()
  task_id: number;
}
