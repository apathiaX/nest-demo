import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 创建角色 DTO
 */
export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name',
    example: 'Admin',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Administrator role with full access',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Is system role (system roles cannot be modified or deleted)',
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @ApiProperty({
    description: 'Permission codes to assign to this role',
    example: ['user:read', 'user:write', 'user:delete'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  permissions?: string[];
}

/**
 * 更新角色 DTO
 */
export class UpdateRoleDto {
  @ApiProperty({
    description: 'Role ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  roleId: number;

  @ApiProperty({
    description: 'Role name',
    example: 'Admin',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Administrator role with full access',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Permission codes to assign to this role',
    example: ['user:read', 'user:write', 'user:delete'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsOptional()
  permissions?: string[];
}

/**
 * 更新角色权限 DTO（单独更新权限）
 */
export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: 'Role ID',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  roleId: number;

  @ApiProperty({
    description: 'New permission codes list (will replace all existing permissions)',
    example: ['user:read', 'user:write', 'plan:read'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  permissions: string[];
}
