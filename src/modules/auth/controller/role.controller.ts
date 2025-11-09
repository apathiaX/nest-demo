import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { RequirePermissions, Roles } from '@/common/decorators';
import { CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from '../dto/role.dto';
import { RoleService } from '../service/role.service';

/**
 * 角色管理 Controller
 * 路由：/auth/role
 */
@ApiTags('Auth - Role Management')
@ApiBearerAuth('JWT-auth')
@RequirePermissions('auth:role:manage')
@Controller('auth/role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('list')
  @Roles('admin')
  @ApiOperation({
    summary: '获取角色列表',
    description: '获取所有角色及其权限信息（仅管理员）',
  })
  @ApiResponse({ status: 200, description: 'Role list retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getRoleList() {
    return this.roleService.getRoleList();
  }

  @Post('info')
  @Roles('admin')
  @ApiOperation({
    summary: '获取角色详情',
    description: '根据ID获取角色的详细信息和权限列表（仅管理员）',
  })
  @ApiParam({ name: 'id', description: 'Role ID', example: 1 })
  @ApiResponse({ status: 200, description: 'Role details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async getRoleById(@Body() body: { id: number }) {
    return this.roleService.getRoleById(body.id);
  }

  @Post('create')
  @Roles('admin')
  @ApiOperation({
    summary: '创建角色',
    description: '创建新角色并分配权限（仅管理员）',
  })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or permissions not found' })
  @ApiResponse({ status: 409, description: 'Role name or code already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.createRole(createRoleDto);
  }

  @Post('update')
  @Roles('admin')
  @ApiOperation({
    summary: '更新角色',
    description: '更新角色的基本信息和权限（仅管理员）',
  })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or system role cannot be modified' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async updateRole(@Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.updateRole(updateRoleDto);
  }

  @Post('update-perms')
  @Roles('admin')
  @ApiOperation({
    summary: '更新角色权限列表',
    description:
      '更新指定角色的权限列表（会替换所有现有权限）。使用事务保证数据一致性。（仅管理员）',
  })
  @ApiResponse({
    status: 200,
    description: 'Role permissions updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input or permissions not found' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async updateRolePermissions(@Body() updatePermissionsDto: UpdateRolePermissionsDto) {
    return this.roleService.updateRolePermissions(
      updatePermissionsDto.roleId,
      updatePermissionsDto.permissions,
    );
  }

  @Post('delete')
  @Roles('admin')
  @ApiOperation({
    summary: '删除角色',
    description: '删除指定角色。系统角色和被用户使用的角色不能删除。（仅管理员）',
  })
  @ApiParam({ name: 'id', description: 'Role ID to delete', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Role deleted successfully',
    schema: {
      example: {
        message: 'Role deleted successfully',
        roleId: 1,
        roleName: 'Manager',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete system role or role in use',
  })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async deleteRole(@Body() body: { id: number }) {
    return this.roleService.deleteRole(body.id);
  }
}
