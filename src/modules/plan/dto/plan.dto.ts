import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  PlanType,
  PlanSource,
  ParticipantRole,
  RepeatUnit,
  TaskMode,
  CountingMethod,
  DataSource,
} from 'prisma-mysql';

export class GetPlanInfoDto {
  @ApiProperty({ example: 1, description: 'Plan ID' })
  @IsInt()
  @IsNotEmpty()
  plan_id: number;
}

export class GetPlanStatsDto {
  @ApiProperty({ example: 1, description: 'Plan ID' })
  @IsInt()
  @IsNotEmpty()
  plan_id: number;
}

export class DeletePlanDto {
  @ApiProperty({ example: 1, description: 'Plan ID' })
  @IsInt()
  @IsNotEmpty()
  plan_id: number;
}

/**
 * 任务提醒 DTO（用于计划创建时）
 */
export class CreatePlanTaskReminderDto {
  @ApiProperty({ example: '08:00:00' })
  @IsString()
  reminder_time: string;

  @ApiProperty({ required: false, example: '1,2,3,4,5', description: '星期几提醒，逗号分隔 1-7' })
  @IsOptional()
  @IsString()
  days_of_week?: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/**
 * 创建计划时的任务树 DTO
 * 支持递归嵌套子任务
 */
export class CreatePlanTaskDto {
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
  @IsOptional()
  @IsEnum(TaskMode)
  mode?: TaskMode;

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

  @ApiProperty({ required: false, type: [CreatePlanTaskReminderDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlanTaskReminderDto)
  reminders?: CreatePlanTaskReminderDto[];

  @ApiProperty({
    required: false,
    type: [CreatePlanTaskDto],
    description: '子任务列表（支持多层嵌套）',
    example: [
      {
        name: 'Warm up',
        mode: 'completion',
      },
      {
        name: 'Main run',
        mode: 'counting',
        counting_target: 5,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlanTaskDto)
  subtasks?: CreatePlanTaskDto[];
}

/**
 * 邀请参与者 DTO（用于计划创建时）
 * 必须提供 user_key 或 phone 之一
 */
export class InviteParticipantInPlanDto {
  @ApiProperty({
    required: false,
    example: 'uuid-xxx-xxx',
    description: '用户唯一标识（优先使用）',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.phone) // 如果没有 phone，则 user_key 必填
  user_key?: string;

  @ApiProperty({
    required: false,
    example: '13800138000',
    description: '用户手机号（当 user_key 不存在时使用）',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.user_key) // 如果没有 user_key，则 phone 必填
  phone?: string;

  @ApiProperty({
    enum: ParticipantRole,
    default: ParticipantRole.member,
    description: '角色：owner/admin/member/viewer',
    example: ParticipantRole.member,
  })
  @IsOptional()
  @IsEnum(ParticipantRole)
  role?: ParticipantRole;
}

export class CreatePlanDto {
  @ApiProperty({ example: 'Morning Exercise Routine' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ required: false, example: '🏃' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  background_image?: string;

  @ApiProperty({ required: false, example: 'Daily exercise to stay healthy' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: 'Fitness tracker as reward' })
  @IsOptional()
  @IsString()
  bonus?: string;

  @ApiProperty({ required: false, example: 'Gold, Silver, Bronze medals' })
  @IsOptional()
  @IsString()
  medals?: string;

  @ApiProperty({ enum: PlanType, default: PlanType.habit })
  @IsEnum(PlanType)
  type: PlanType;

  @ApiProperty({ enum: PlanSource, default: PlanSource.custom })
  @IsEnum(PlanSource)
  @IsOptional()
  create_source?: PlanSource;

  @ApiProperty({ default: false })
  @IsBoolean()
  @IsOptional()
  is_public?: boolean;

  @ApiProperty({
    required: false,
    type: [InviteParticipantInPlanDto],
    description: '创建计划时邀请的参与者列表',
    example: [
      { user_id: 2, role: 'member' },
      { user_id: 3, role: 'viewer' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteParticipantInPlanDto)
  participants?: InviteParticipantInPlanDto[];

  @ApiProperty({
    required: false,
    type: [CreatePlanTaskDto],
    description: '任务树（支持嵌套子任务）',
    example: [
      {
        name: 'Morning Routine',
        mode: 'completion',
        subtasks: [
          { name: 'Meditation', mode: 'completion' },
          { name: 'Exercise', mode: 'counting', counting_target: 30 },
        ],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePlanTaskDto)
  tasks?: CreatePlanTaskDto[];
}

export class UpdatePlanDto {
  @ApiProperty({ example: 1, description: 'Plan ID' })
  @IsInt()
  @IsNotEmpty()
  plan_id: number;

  @ApiProperty({ required: false, description: '计划名称' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, enum: PlanType, description: '计划类型' })
  @IsOptional()
  @IsEnum(PlanType)
  type?: PlanType;

  @ApiProperty({ required: false, description: '图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false, description: '背景图片' })
  @IsOptional()
  @IsString()
  background_image?: string;

  @ApiProperty({ required: false, description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: '奖励说明' })
  @IsOptional()
  @IsString()
  bonus?: string;

  @ApiProperty({ required: false, description: '勋章说明' })
  @IsOptional()
  @IsString()
  medals?: string;

  @ApiProperty({ required: false, description: '是否公开' })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;
}
