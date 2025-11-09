import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class UpdateTaskReminderDto {
  @ApiProperty({ required: false, example: '08:00:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'reminder_time must be in HH:MM:SS format',
  })
  reminder_time?: string;

  @ApiProperty({ required: false, example: '1,2,3,4,5' })
  @IsOptional()
  @IsString()
  @Matches(/^[1-7](,[1-7])*$/, {
    message: 'days_of_week must be comma-separated numbers from 1 to 7',
  })
  days_of_week?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
