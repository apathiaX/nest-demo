import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: '13800138000',
    description: '手机号（必填，系统唯一标识）',
    required: true,
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'Invalid phone number format (China mobile)' })
  phone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nick_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}
