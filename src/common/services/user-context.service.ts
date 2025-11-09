import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';

/**
 * 用户上下文服务
 * 提供轻量级的用户信息获取和缓存
 */
@Injectable()
export class UserContextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取基础用户信息（轻量级，用于大部分请求）
   */
  async getBasicUserInfo(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        user_key: true,
        phone: true,
        nick_name: true,
        avatar: true,
        status: true,
        is_vip: true,
        phone_verified: true,
      },
    });
  }

  /**
   * 获取完整用户上下文（包含角色、权限、认证提供商等）
   * 用于需要权限判断的场景
   */
  async getFullUserContext(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        user_key: true,
        phone: true,
        nick_name: true,
        avatar: true,
        status: true,
        is_vip: true,
        phone_verified: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        // 认证提供商
        auth_providers: {
          select: {
            provider: true,
            provider_user_id: true,
            last_synced_at: true,
          },
        },
        // 角色信息（完整的 RBAC 结构）
        user_roles: {
          select: {
            id: true,
            role: {
              select: {
                id: true,
                name: true,
                code: true,
                description: true,
                is_system: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // 获取用户的所有权限
    const permissions = await this.getUserPermissions(userId);

    // 转换为更友好的格式
    return {
      ...user,
      providers: user.auth_providers.map((ap) => ap.provider),
      roles: user.user_roles.map((ur) => ur.role.code), // 返回角色代码数组
      roleDetails: user.user_roles.map((ur) => ur.role), // 返回完整的角色信息
      permissions, // 用户拥有的所有权限
      authProviders: user.auth_providers,
    };
  }

  /**
   * 获取用户权限信息（从数据库查询）
   * 返回用户通过角色继承的所有权限代码
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: {
        role: {
          include: {
            role_permissions: {
              include: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 收集所有权限（去重）
    const permissions = new Set<string>();
    userRoles.forEach((ur) => {
      ur.role.role_permissions.forEach((rp) => {
        permissions.add(rp.permission.code);
      });
    });

    return Array.from(permissions);
  }

  /**
   * 检查用户是否有特定角色（通过角色代码）
   */
  async hasRole(userId: number, roleCode: string): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        user_id: userId,
        role: {
          code: roleCode,
        },
      },
    });

    return !!userRole;
  }

  /**
   * 检查用户是否有任意一个角色
   */
  async hasAnyRole(userId: number, roleCodes: string[]): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        user_id: userId,
        role: {
          code: {
            in: roleCodes,
          },
        },
      },
    });

    return !!userRole;
  }

  /**
   * 检查用户是否拥有所有指定角色
   */
  async hasAllRoles(userId: number, roleCodes: string[]): Promise<boolean> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        user_id: userId,
      },
      include: {
        role: {
          select: {
            code: true,
          },
        },
      },
    });

    const userRoleCodes = userRoles.map((ur) => ur.role.code);
    return roleCodes.every((code) => userRoleCodes.includes(code));
  }

  /**
   * 检查用户是否有特定权限
   */
  async hasPermission(userId: number, permissionCode: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permissionCode);
  }
}
