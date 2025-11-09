import { Controller, Get, Body, Post, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserService } from '../service/user.service';
import { BatchUpdateUserDto, UpdateUserDto } from '../dto/update-user.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { InfoUserDto } from '../dto/info-user.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { CurrentUser } from '@/common/decorators';
import {
  AssignRolesDto,
  RemoveRoleDto,
  UpdateUserRolesDto,
  DeleteUserByKeyDto,
} from '../dto/user-role.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('list')
  @Roles('admin') // 需要管理员角色
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Users list retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async findAll(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;
    const take = pageSize || 10;

    return this.userService.findAll({
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('info')
  @ApiOperation({ summary: 'Get user info' })
  @ApiResponse({ status: 200, description: 'User info retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid user ID' })
  async getInfo(@Body() infoUserDto: InfoUserDto) {
    console.log(infoUserDto);
    const phones = infoUserDto.phones?.filter((phone) => !!phone) || [];
    const userKeys = infoUserDto.user_keys?.filter((userKey) => !!userKey) || [];
    if (phones.length === 0 && userKeys.length === 0) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.userService.findAll({
      where: {
        OR: [
          {
            phone: {
              in: phones,
            },
          },
          {
            user_key: {
              in: userKeys,
            },
          },
        ],
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  @Post('update-info')
  @ApiOperation({ summary: 'Update user info' })
  @ApiResponse({ status: 200, description: 'User info updated' })
  @ApiResponse({ status: 400, description: 'Invalid user ID' })
  async updateInfo(@CurrentUser() user: any, @Body() infoUserDto: UpdateUserDto) {
    return this.userService.update(user.phone, infoUserDto);
  }

  @Post('update')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - user:write permission required' })
  async update(@Body() updateUserDto: BatchUpdateUserDto[]) {
    console.log('xzc', updateUserDto);
    return this.userService.batchUpdate(updateUserDto);
  }

  @Post('delete')
  @RequirePermissions('user:delete')
  @ApiOperation({
    summary: '删除用户（通过 user_key）',
    description: '🎯 企业级设计：使用 user_key 作为用户标识，更安全。需要 user:delete 权限。',
  })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - user:delete permission required' })
  async remove(@Body() deleteDto: DeleteUserByKeyDto) {
    const user = await this.userService.findByUserKey(deleteDto.userKey);
    if (!user.phone) {
      throw new BadRequestException('Cannot delete user without phone number');
    }
    return this.userService.remove(user.phone);
  }

  @Post('create')
  @RequirePermissions('user:create') // 需要用户创建权限
  @ApiOperation({ summary: 'Create user (Requires user:create permission)' })
  @ApiResponse({ status: 200, description: 'User created' })
  @ApiResponse({ status: 403, description: 'Forbidden - user:create permission required' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('roles')
  @Roles('admin')
  @ApiOperation({
    summary: '获取用户的所有角色',
    description:
      '🎯 企业级设计：支持 user_key 或 phone 作为用户标识。查看指定用户拥有的所有角色。（仅管理员）',
  })
  @ApiResponse({
    status: 200,
    description: 'User roles retrieved successfully',
    schema: {
      example: {
        userId: 1,
        userKey: '550e8400-e29b-41d4-a716-446655440000',
        phone: '13800138000',
        roles: [
          { id: 1, name: '管理员', code: 'admin', description: '系统管理员' },
          { id: 2, name: '普通用户', code: 'user', description: '普通用户' },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getUserRoles(@Body() body: { userIdentifier: string }) {
    return this.userService.getUserRoles(body.userIdentifier);
  }

  @Post('assign-roles')
  @Roles('admin')
  @ApiOperation({
    summary: '为用户批量分配角色',
    description:
      '🎯 企业级设计：支持 user_key 或 phone 作为用户标识，使用 role code（如 admin、user）作为角色标识。为指定用户一次性分配多个角色，会自动跳过已有的角色。（仅管理员）',
  })
  @ApiResponse({
    status: 200,
    description: 'Roles assigned successfully',
    schema: {
      example: {
        message: '2 role(s) assigned successfully',
        userId: 1,
        userKey: '550e8400-e29b-41d4-a716-446655440000',
        assignedRoles: [
          { id: 2, name: '编辑', code: 'editor' },
          { id: 3, name: '访客', code: 'guest' },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User or roles not found' })
  @ApiResponse({ status: 409, description: 'All roles are already assigned' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async assignRoles(@Body() assignRolesDto: AssignRolesDto) {
    return this.userService.assignRoles(assignRolesDto.userIdentifier, assignRolesDto.roleCodes);
  }

  @Post('remove-role')
  @Roles('admin')
  @ApiOperation({
    summary: '移除用户的单个角色',
    description:
      '🎯 企业级设计：支持 user_key 或 phone 作为用户标识，使用 role code 作为角色标识。移除用户的指定角色。用户必须至少保留一个角色。（仅管理员）',
  })
  @ApiResponse({
    status: 200,
    description: 'Role removed successfully',
    schema: {
      example: {
        message: 'Role removed successfully',
        userId: 1,
        userKey: '550e8400-e29b-41d4-a716-446655440000',
        removedRole: { id: 3, name: '访客', code: 'guest' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  @ApiResponse({ status: 409, description: 'Cannot remove the last role' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async removeRole(@Body() removeRoleDto: RemoveRoleDto) {
    return this.userService.removeRole(removeRoleDto.userIdentifier, removeRoleDto.roleCode);
  }

  @Post('update-roles')
  @Roles('admin')
  @ApiOperation({
    summary: '更新用户的角色列表（完全替换）',
    description:
      '🎯 企业级设计：支持 user_key 或 phone 作为用户标识，使用 role code 作为角色标识。使用新的角色列表完全替换用户的所有角色。使用事务保证数据一致性。用户必须至少拥有一个角色。（仅管理员）',
  })
  @ApiResponse({
    status: 200,
    description: 'User roles updated successfully',
    schema: {
      example: {
        message: 'User roles updated successfully',
        userId: 1,
        userKey: '550e8400-e29b-41d4-a716-446655440000',
        roles: [
          { id: 1, name: '管理员', code: 'admin', description: '系统管理员' },
          { id: 2, name: '编辑', code: 'editor', description: '内容编辑' },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User or roles not found' })
  @ApiResponse({ status: 409, description: 'User must have at least one role' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async updateUserRoles(@Body() updateUserRolesDto: UpdateUserRolesDto) {
    return this.userService.updateUserRoles(
      updateUserRolesDto.userIdentifier,
      updateUserRolesDto.roleCodes,
    );
  }
}
