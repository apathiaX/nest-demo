import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * 批量分配角色 DTO
 * 🎯 企业级设计：使用 user_key 作为用户标识，使用 role code 作为角色标识
 */
export class AssignRolesDto {
  @ApiProperty({
    description: 'User key (recommended) or phone number',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  userIdentifier: string;

  @ApiProperty({
    description: 'Array of role codes to assign',
    example: ['admin', 'editor', 'user'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  roleCodes: string[];
}

/**
 * 移除用户角色 DTO
 */
export class RemoveRoleDto {
  @ApiProperty({
    description: 'User key (recommended) or phone number',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  userIdentifier: string;

  @ApiProperty({
    description: 'Role code to remove',
    example: 'editor',
  })
  @IsString()
  @IsNotEmpty()
  roleCode: string;
}

/**
 * 更新用户角色列表 DTO（完全替换）
 */
export class UpdateUserRolesDto {
  @ApiProperty({
    description: 'User key (recommended) or phone number',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  userIdentifier: string;

  @ApiProperty({
    description: 'Array of role codes (will replace all existing roles)',
    example: ['admin', 'user'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  roleCodes: string[];
}

/**
 * 查询用户信息 DTO（通过 user_key）
 */
export class GetUserByKeyDto {
  @ApiProperty({
    description: 'User key',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  userKey: string;
}

/**
 * 更新用户信息 DTO（通过 user_key）
 */
export class UpdateUserByKeyDto {
  @ApiProperty({
    description: 'User key',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  userKey: string;
}

/**
 * 删除用户 DTO（通过 user_key）
 */
export class DeleteUserByKeyDto {
  @ApiProperty({
    description: 'User key',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  userKey: string;
}
