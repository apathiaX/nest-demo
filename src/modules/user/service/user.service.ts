import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { BatchUpdateUserDto, UpdateUserDto } from '../dto/update-user.dto';
import { Prisma } from 'prisma-mysql';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建用户
   * 📱 手机号是系统唯一标识，必须提供且不可重复
   */
  async create(data: CreateUserDto | Prisma.UserCreateInput) {
    // 验证手机号唯一性（数据库层面也有约束，这里做二次检查）
    if ('phone' in data && data.phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: data.phone },
      });

      if (existingUser) {
        throw new Error(`Phone number ${data.phone} is already registered`);
      }
    }

    return this.prisma.user.create({
      data: {
        ...data,
        status: 'active',
        phone_verified: false,
        last_login_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        user_key: true,
        phone: true,
        nick_name: true,
        avatar: true,
        is_vip: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  /**
   * 查找所有用户
   */
  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params || {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where,
        orderBy,
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
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page: skip ? Math.floor(skip / (take || 10)) + 1 : 1,
      pageSize: take || 10,
    };
  }

  /**
   * 根据ID查找用户
   */
  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * 根据 user_key 查找用户
   * 🎯 企业级设计：user_key 作为对外唯一标识
   */
  async findByUserKey(userKey: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_key: userKey },
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
      },
    });

    if (!user) {
      throw new NotFoundException(`User with user_key ${userKey} not found`);
    }

    return user;
  }

  /**
   * 智能查找用户：支持 user_key 或 phone
   * 🎯 企业级设计：统一入口，自动识别标识符类型
   */
  async findByIdentifier(identifier: string) {
    // 判断是 user_key 还是 phone（user_key 格式：8-4-4-4-12）
    const isUserKey = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier,
    );

    if (isUserKey) {
      return this.findByUserKey(identifier);
    } else {
      const user = await this.findByPhone(identifier);
      if (!user) {
        throw new NotFoundException(`User with identifier ${identifier} not found`);
      }
      return user;
    }
  }

  /**
   * 根据手机号查找用户
   */
  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * 根据ID查找用户（包含密码）
   * 仅用于身份验证，不应返回给客户端
   */
  async findByIdWithPassword(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * 更新用户
   */
  async update(phone: string, updateUserDto: UpdateUserDto) {
    const user = await this.findByPhone(phone);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: updateUserDto,
      select: {
        user_key: true,
        phone: true,
        nick_name: true,
        avatar: true,
        status: true,
        is_vip: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async batchUpdate(updateUserDto: BatchUpdateUserDto[]) {
    return this.prisma.$transaction(
      updateUserDto.map((dto) => {
        const { user_key, ...rest } = dto;
        return this.prisma.user.update({
          where: { user_key },
          data: rest,
          select: {
            user_key: true,
            phone: true,
            nick_name: true,
            avatar: true,
            status: true,
            is_vip: true,
          },
        });
      }),
    );
  }

  /**
   * 删除用户
   */
  async remove(phone: string) {
    const user = await this.findByPhone(phone);
    if (!user) {
      throw new NotFoundException(`User with phone ${phone} not found`);
    }

    await this.prisma.user.delete({
      where: { id: user.id },
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { last_login_at: new Date() },
    });
  }

  /**
   * 创建认证关系
   */
  async createAuthRelation(data: Prisma.AuthRelationUncheckedCreateInput) {
    return this.prisma.authRelation.create({
      data,
    });
  }

  /**
   * 查找用户的认证关系
   */
  async findAuthRelations(userId: number) {
    return this.prisma.authRelation.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        provider: true,
        provider_user_id: true,
        expires_at: true,
        last_synced_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  /**
   * 根据第三方提供商和用户ID查找认证关系
   */
  async findAuthRelationByProvider(provider: string, providerUserId: string) {
    return this.prisma.authRelation.findUnique({
      where: {
        unique_provider_user: {
          provider: provider as any,
          provider_user_id: providerUserId,
        },
      },
    });
  }

  /**
   * 更新认证关系
   */
  async updateAuthRelation(id: number, data: Prisma.AuthRelationUpdateInput) {
    return this.prisma.authRelation.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除认证关系
   */
  async deleteAuthRelation(id: number) {
    return this.prisma.authRelation.delete({
      where: { id },
    });
  }

  /**
   * 查找用户的手机号认证关系
   */
  async findUserPhoneAuth(userId: number) {
    return this.prisma.authRelation.findUnique({
      where: {
        unique_user_provider: {
          user_id: userId,
          provider: 'phone',
        },
      },
    });
  }

  /**
   * 更新用户手机号
   */
  async updatePhone(userId: number, newPhone: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: newPhone,
        phone_verified: false, // 新手机号需要重新验证
      },
    });
  }

  /**
   * 更新用户密码
   */
  async updatePassword(userId: number, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
      select: {
        id: true,
        user_key: true,
        phone: true,
        updated_at: true,
      },
    });
  }

  /**
   * 换绑手机号（使用事务确保数据一致性）
   */
  async changePhoneTransaction(userId: number, oldPhone: string, newPhone: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. 更新用户表的手机号
      await tx.user.update({
        where: { id: userId },
        data: {
          phone: newPhone,
          phone_verified: true, // 通过验证码验证，标记为已验证
        },
      });

      // 2. 更新认证关系表
      const phoneAuth = await tx.authRelation.findUnique({
        where: {
          unique_user_provider: {
            user_id: userId,
            provider: 'phone',
          },
        },
      });

      if (phoneAuth) {
        await tx.authRelation.update({
          where: { id: phoneAuth.id },
          data: {
            provider_user_id: newPhone,
          },
        });
      }
    });
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(userId: number) {
    const [planCount, taskRecordCount] = await Promise.all([
      this.prisma.planParticipant.count({
        where: { user_id: userId },
      }),
      this.prisma.taskRecord.count({
        where: { user_id: userId },
      }),
    ]);

    return {
      total_plans: planCount,
      total_records: taskRecordCount,
    };
  }

  // ==================== 用户角色管理（企业级优化版）====================

  /**
   * 获取用户的所有角色
   * 🎯 支持 user_key 或 phone 作为用户标识
   */
  async getUserRoles(userIdentifier: string) {
    const user = await this.findByIdentifier(userIdentifier);
    return this._getUserRolesByUserId(user.id, user.user_key, user.phone);
  }

  /**
   * 为用户批量分配角色
   * 🎯 支持 user_key 或 phone 作为用户标识，使用 role code
   */
  async assignRoles(userIdentifier: string, roleCodes: string[]) {
    const user = await this.findByIdentifier(userIdentifier);
    return this._assignRolesByUserId(user.id, user.user_key, roleCodes);
  }

  /**
   * 移除用户的单个角色
   * 🎯 支持 user_key 或 phone 作为用户标识，使用 role code
   */
  async removeRole(userIdentifier: string, roleCode: string) {
    const user = await this.findByIdentifier(userIdentifier);
    return this._removeRoleByUserId(user.id, user.user_key, roleCode);
  }

  /**
   * 更新用户的角色列表（完全替换）
   * 🎯 支持 user_key 或 phone 作为用户标识，使用 role code
   */
  async updateUserRoles(userIdentifier: string, roleCodes: string[]) {
    const user = await this.findByIdentifier(userIdentifier);
    return this._updateUserRolesByUserId(user.id, user.user_key, roleCodes);
  }

  // ==================== 私有方法：内部使用 ID 操作（高性能）====================

  /**
   * 通过 user ID 获取用户角色（内部方法）
   * ⚡ 性能优化：直接使用数字 ID 查询
   */
  private async _getUserRolesByUserId(userId: number, userKey: string, phone: string | null) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId }, // ✅ 使用 ID 查询
      include: {
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
    });

    return {
      userId,
      userKey,
      phone,
      roles: userRoles.map((ur) => ur.role),
    };
  }

  /**
   * 通过 user ID 分配角色（内部方法）
   * ⚡ 性能优化：使用数字 ID 进行数据库操作
   */
  private async _assignRolesByUserId(userId: number, userKey: string, roleCodes: string[]) {
    // 1. 通过 code 查询角色，转换为 ID
    const roles = await this.prisma.role.findMany({
      where: { code: { in: roleCodes } },
      select: { id: true, code: true, name: true },
    });

    if (roles.length !== roleCodes.length) {
      const foundCodes = roles.map((r) => r.code);
      const notFoundCodes = roleCodes.filter((c) => !foundCodes.includes(c));
      throw new NotFoundException(`Roles not found: ${notFoundCodes.join(', ')}`);
    }

    const roleIds = roles.map((r) => r.id);

    // 2. 获取用户已有角色（使用 ID 查询）
    const existingUserRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId }, // ✅ 使用 ID 查询
      select: { role_id: true },
    });

    const existingRoleIds = existingUserRoles.map((ur) => ur.role_id);
    const newRoleIds = roleIds.filter((id) => !existingRoleIds.includes(id));

    if (newRoleIds.length === 0) {
      throw new ConflictException('All roles are already assigned to this user');
    }

    // 3. 批量创建（使用 ID 关联，性能最优）
    await this.prisma.userRole.createMany({
      data: newRoleIds.map((roleId) => ({
        user_id: userId, // ✅ 数字ID
        role_id: roleId, // ✅ 数字ID
      })),
    });

    this.logger.log(`✅ ${newRoleIds.length} roles assigned to user_key: ${userKey}`);

    return {
      message: `${newRoleIds.length} role(s) assigned successfully`,
      userId,
      userKey,
      assignedRoles: roles.filter((r) => newRoleIds.includes(r.id)),
    };
  }

  /**
   * 通过 user ID 移除角色（内部方法）
   * ⚡ 性能优化：使用数字 ID 进行数据库操作
   */
  private async _removeRoleByUserId(userId: number, userKey: string, roleCode: string) {
    // 1. 通过 code 查询角色
    const role = await this.prisma.role.findUnique({
      where: { code: roleCode },
      select: { id: true, code: true, name: true },
    });

    if (!role) {
      throw new NotFoundException(`Role with code ${roleCode} not found`);
    }

    // 2. 检查用户角色关联是否存在（使用 ID 查询）
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        unique_user_role: {
          user_id: userId, // ✅ 使用 ID
          role_id: role.id, // ✅ 使用 ID
        },
      },
    });

    if (!userRole) {
      throw new NotFoundException(`User does not have role: ${role.name}`);
    }

    // 3. 检查是否至少保留一个角色
    const userRolesCount = await this.prisma.userRole.count({
      where: { user_id: userId }, // ✅ 使用 ID
    });

    if (userRolesCount === 1) {
      throw new ConflictException('Cannot remove the last role. User must have at least one role.');
    }

    // 4. 删除用户角色关联
    await this.prisma.userRole.delete({
      where: { id: userRole.id },
    });

    this.logger.log(`🗑️ Role removed: ${role.name} from user_key: ${userKey}`);

    return {
      message: 'Role removed successfully',
      userId,
      userKey,
      removedRole: {
        id: role.id,
        name: role.name,
        code: role.code,
      },
    };
  }

  /**
   * 通过 user ID 更新角色列表（内部方法）
   * ⚡ 性能优化：使用事务 + 数字 ID 进行数据库操作
   */
  private async _updateUserRolesByUserId(userId: number, userKey: string, roleCodes: string[]) {
    if (roleCodes.length === 0) {
      throw new ConflictException('User must have at least one role');
    }

    // 1. 通过 code 查询角色，转换为 ID
    const roles = await this.prisma.role.findMany({
      where: { code: { in: roleCodes } },
      select: { id: true, code: true, name: true, description: true },
    });

    if (roles.length !== roleCodes.length) {
      const foundCodes = roles.map((r) => r.code);
      const notFoundCodes = roleCodes.filter((c) => !foundCodes.includes(c));
      throw new NotFoundException(`Roles not found: ${notFoundCodes.join(', ')}`);
    }

    const roleIds = roles.map((r) => r.id);

    // 2. 使用事务更新用户角色列表
    return this.prisma.$transaction(
      async (tx) => {
        // 2.1 删除用户所有旧角色（使用 ID）
        const deletedCount = await tx.userRole.deleteMany({
          where: { user_id: userId }, // ✅ 使用 ID
        });

        this.logger.log(`🗑️ Deleted ${deletedCount.count} old roles for user_key: ${userKey}`);

        // 2.2 创建新的角色关联（使用 ID）
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            user_id: userId, // ✅ 数字ID
            role_id: roleId, // ✅ 数字ID
          })),
        });

        this.logger.log(`✅ Assigned ${roleIds.length} new roles to user_key: ${userKey}`);

        // 2.3 返回更新后的用户角色信息
        const updatedUserRoles = await tx.userRole.findMany({
          where: { user_id: userId }, // ✅ 使用 ID
          include: {
            role: {
              select: {
                id: true,
                name: true,
                code: true,
                description: true,
              },
            },
          },
        });

        return {
          message: 'User roles updated successfully',
          userId,
          userKey,
          roles: updatedUserRoles.map((ur) => ur.role),
        };
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );
  }
}
