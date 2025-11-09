import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ParticipantRole } from 'prisma-mysql';

/**
 * 邀请参与者 DTO
 * 必须提供 user_key 或 phone 之一
 */
export class InviteParticipantDto {
  @ApiProperty({ required: true, description: '计划ID' })
  @IsNotEmpty()
  @IsNumber()
  plan_id: number;

  @ApiProperty({
    required: false,
    example: 'uuid-xxx-xxx',
    description: '用户唯一标识（优先使用）',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.phone)
  user_key?: string;

  @ApiProperty({
    required: false,
    example: '13800138000',
    description: '用户手机号（当 user_key 不存在时使用）',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.user_key)
  phone?: string;

  @ApiProperty({
    enum: ParticipantRole,
    required: false,
    description: '分配的角色，默认为 member',
    example: ParticipantRole.member,
    default: ParticipantRole.member,
  })
  @IsOptional()
  @IsEnum(ParticipantRole)
  role?: ParticipantRole;
}

export class UpdateParticipantRoleDto {
  @ApiProperty({ required: true, description: '计划ID' })
  @IsNotEmpty()
  @IsNumber()
  plan_id: number;

  @ApiProperty({
    required: false,
    example: 'uuid-xxx-xxx',
    description: '用户唯一标识（优先使用）',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.phone)
  user_key?: string;

  @ApiProperty({
    required: false,
    example: '13800138000',
    description: '用户手机号（当 user_key 不存在时使用）',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.user_key)
  phone?: string;

  @ApiProperty({
    enum: ParticipantRole,
    required: true,
    description: '新角色',
    example: ParticipantRole.member,
  })
  @IsNotEmpty()
  @IsEnum(ParticipantRole)
  role: ParticipantRole;
}

export class JoinPlanDto {
  @ApiProperty({ required: true, description: '计划ID' })
  @IsNotEmpty()
  @IsNumber()
  plan_id: number;
}

export class LeavePlanDto {
  @ApiProperty({ required: true, description: '计划ID' })
  @IsNotEmpty()
  @IsNumber()
  plan_id: number;
}

export class RemoveParticipantDto {
  @ApiProperty({ required: true, description: '计划ID' })
  @IsNotEmpty()
  @IsNumber()
  plan_id: number;

  @ApiProperty({
    required: false,
    example: 'uuid-xxx-xxx',
    description: '用户唯一标识（优先使用）',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.phone)
  user_key?: string;

  @ApiProperty({
    required: false,
    example: '13800138000',
    description: '用户手机号（当 user_key 不存在时使用）',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.user_key)
  phone?: string;
}
