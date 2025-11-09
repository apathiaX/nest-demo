import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsEnum, IsString, Min, IsDateString } from 'class-validator';
import { CompletionStatus } from 'prisma-mysql';

export class UpdateTaskRecordDto {
  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  record_id: number;

  @ApiProperty({ required: false, enum: CompletionStatus })
  @IsOptional()
  @IsEnum(CompletionStatus)
  completion_status?: CompletionStatus;

  @ApiProperty({ required: false, example: 150 })
  @IsOptional()
  @IsInt()
  @Min(0)
  count_value?: number;

  @ApiProperty({ required: false, example: 'Updated notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTaskRecordDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  task_id: number;

  @ApiProperty({ required: false, example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  completion_date?: string;

  @ApiProperty({ required: false, example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  count_value?: number;

  @ApiProperty({ required: false, example: 'Felt great today!' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetRecordsDto {
  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  task_id?: number;

  @ApiProperty({ required: false, example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ required: false, example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ required: false, example: CompletionStatus.not_completed })
  @IsOptional()
  @IsEnum(CompletionStatus)
  status?: CompletionStatus;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiProperty({ required: false, example: 10 })
  @IsOptional()
  @IsInt()
  page_size?: number;
}

export class GetStatsDto {
  @ApiProperty({ required: false, example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ required: false, example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  plan_id?: number;
}

export class GetCalendarDto {
  @ApiProperty({ required: false, example: 2024 })
  @IsInt()
  year: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  month: number;
}

export class RemoveTaskRecordDto {
  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  record_id: number;
}
