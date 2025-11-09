import { PrismaService } from '@/database/prisma/prisma.service';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { CreateRoleDto, UpdateRoleDto } from '../dto/role.dto';
import { Permission } from 'prisma-mysql';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取角色列表（包含权限信息）
   */
  async getRoleList() {
    return this.prisma.role.findMany({
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            user_roles: true, // 统计使用该角色的用户数
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * 根据ID获取角色详情
   */
  async getRoleById(roleId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        role_permissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                code: true,
                resource: true,
                action: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            user_roles: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    return role;
  }

  /**
   * 创建角色
   */
  async createRole(createRoleDto: CreateRoleDto) {
    // 1. 检查角色名称和代码是否已存在
    const existingRole = await this.prisma.role.findFirst({
      where: {
        OR: [{ name: createRoleDto.name }, { code: createRoleDto.name.toLowerCase() }],
      },
    });

    if (existingRole) {
      throw new ConflictException('Role name or code already exists');
    }

    // 2. 验证权限是否存在
    const permissionCodes = createRoleDto.permissions || [];
    let permissions: Permission[] = [];

    if (permissionCodes.length > 0) {
      permissions = await this.prisma.permission.findMany({
        where: {
          code: {
            in: permissionCodes,
          },
        },
      });

      // 检查是否有不存在的权限
      const foundPermissionCodes = permissions.map((p) => p.code);
      const notFoundPermissions = permissionCodes.filter(
        (code) => !foundPermissionCodes.includes(code),
      );

      if (notFoundPermissions.length > 0) {
        throw new BadRequestException(`Permissions not found: ${notFoundPermissions.join(', ')}`);
      }
    }

    // 3. 使用事务创建角色和权限关联
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: createRoleDto.name,
          code: createRoleDto.name.toLowerCase(),
          description: createRoleDto.description,
          is_system: createRoleDto.isSystem || false,
        },
      });

      // 创建角色权限关联
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            role_id: role.id,
            permission_id: permission.id,
          })),
        });
      }

      this.logger.log(
        `✅ Role created: ${role.name} (ID: ${role.id}) with ${permissions.length} permissions`,
      );

      // 返回包含权限信息的角色
      return tx.role.findUnique({
        where: { id: role.id },
        include: {
          role_permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });
  }

  /**
   * 更新角色的权限列表
   * 使用事务保证数据一致性：先删除所有旧权限，再添加新权限
   * @param roleId 角色ID
   * @param permissionCodes 新的权限代码列表
   */
  async updateRolePermissions(roleId: number, permissionCodes: string[]) {
    // 1. 检查角色是否存在
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // 2. 检查是否为系统角色
    if (role.is_system) {
      this.logger.warn(`⚠️ Attempting to update permissions for system role: ${role.name}`);
      // 可以选择是否允许修改系统角色的权限
      // throw new BadRequestException('Cannot modify system role permissions');
    }

    // 3. 验证新权限是否都存在
    let newPermissions: Permission[] = [];
    if (permissionCodes.length > 0) {
      newPermissions = await this.prisma.permission.findMany({
        where: {
          code: {
            in: permissionCodes,
          },
        },
      });

      // 检查是否有不存在的权限
      // const foundPermissionCodes = newPermissions.map((p) => p.code);
      // const notFoundPermissions = permissionCodes.filter(
      //   (code) => !foundPermissionCodes.includes(code),
      // );

      // if (notFoundPermissions.length > 0) {
      //   throw new BadRequestException(`Permissions not found: ${notFoundPermissions.join(', ')}`);
      // }
    }

    // 4. 使用事务更新权限列表
    return this.prisma.$transaction(
      async (tx) => {
        // 4.1 删除所有旧的权限关联
        const deletedCount = await tx.rolePermission.deleteMany({
          where: {
            role_id: roleId,
          },
        });

        this.logger.log(`🗑️ Deleted ${deletedCount.count} old permissions for role: ${role.name}`);

        // 4.2 创建新的权限关联
        if (newPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: newPermissions.map((permission) => ({
              role_id: roleId,
              permission_id: permission.id,
            })),
          });

          this.logger.log(
            `✅ Added ${newPermissions.length} new permissions for role: ${role.name}`,
          );
        }

        // 4.3 更新角色的 updated_at 时间
        await tx.role.update({
          where: { id: roleId },
          data: {
            updated_at: new Date(),
          },
        });

        // 4.4 返回更新后的角色信息（包含新的权限列表）
        return tx.role.findUnique({
          where: { id: roleId },
          include: {
            role_permissions: {
              include: {
                permission: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    resource: true,
                    action: true,
                    description: true,
                  },
                },
              },
            },
          },
        });
      },
      {
        maxWait: 5000, // 最大等待时间 5秒
        timeout: 10000, // 事务超时 10秒
      },
    );
  }

  /**
   * 更新角色基本信息
   */
  async updateRole(updateRoleDto: UpdateRoleDto) {
    // 1. 检查角色是否存在
    const existingRole = await this.prisma.role.findUnique({
      where: { id: updateRoleDto.roleId },
    });

    if (!existingRole) {
      throw new NotFoundException(`Role with ID ${updateRoleDto.roleId} not found`);
    }

    // 2. 检查是否为系统角色
    // if (existingRole.is_system) {
    //   throw new BadRequestException('Cannot modify system role');
    // }

    // 3. 检查名称是否与其他角色冲突
    if (updateRoleDto.name && updateRoleDto.name !== existingRole.name) {
      const duplicateRole = await this.prisma.role.findFirst({
        where: {
          name: updateRoleDto.name,
          id: {
            not: updateRoleDto.roleId,
          },
        },
      });

      if (duplicateRole) {
        throw new ConflictException('Role name already exists');
      }
    }

    // 4. 如果提供了权限列表，先更新权限
    if (updateRoleDto.permissions) {
      await this.updateRolePermissions(updateRoleDto.roleId, updateRoleDto.permissions);
    }

    // 5. 更新角色基本信息
    return this.prisma.role.update({
      where: { id: updateRoleDto.roleId },
      data: {
        name: updateRoleDto.name,
        description: updateRoleDto.description,
        updated_at: new Date(),
      },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * 删除角色
   */
  async deleteRole(roleId: number) {
    // 1. 检查角色是否存在
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            user_roles: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // 2. 检查是否为系统角色
    if (role.is_system) {
      throw new BadRequestException('Cannot delete system role');
    }

    // 3. 检查是否有用户正在使用该角色
    if (role._count.user_roles > 0) {
      throw new BadRequestException(
        `Cannot delete role: ${role._count.user_roles} user(s) are using this role`,
      );
    }

    // 4. 删除角色（级联删除权限关联）
    await this.prisma.role.delete({
      where: { id: roleId },
    });

    this.logger.log(`🗑️ Role deleted: ${role.name} (ID: ${roleId})`);

    return {
      message: 'Role deleted successfully',
      roleId,
      roleName: role.name,
    };
  }
}
