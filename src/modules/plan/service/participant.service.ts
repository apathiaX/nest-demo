import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { ParticipantRole } from 'prisma-mysql';
import { PlanPermissionService } from './permission.service';
import { InviteParticipantDto, UpdateParticipantRoleDto } from '../dto/participant.dto';

@Injectable()
export class PlanParticipantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PlanPermissionService,
  ) {}

  /**
   * 根据 user_key 或 phone 查找用户
   * 优先使用 user_key，如果不存在则使用 phone
   */
  private async findUserByKeyOrPhone(user_key?: string, phone?: string): Promise<{ id: number }> {
    if (!user_key && !phone) {
      throw new BadRequestException('Must provide user_key or phone');
    }

    let user;

    // 优先使用 user_key
    if (user_key) {
      user = await this.prisma.user.findUnique({
        where: { user_key },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException(`User with user_key "${user_key}" not found`);
      }
    } else if (phone) {
      // 使用 phone
      user = await this.prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException(`User with phone "${phone}" not found`);
      }
    }

    return user!;
  }

  /**
   * 加入计划（自主加入，默认为 member 角色）
   */
  async joinPlan(planId: number, userId: number) {
    // 检查计划是否存在且是公开的
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (!plan.is_public) {
      throw new ForbiddenException('Cannot join private plan without invitation');
    }

    // 检查是否已经加入
    const existing = await this.prisma.planParticipant.findUnique({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Already joined this plan');
    }

    return this.prisma.planParticipant.create({
      data: {
        plan_id: planId,
        user_id: userId,
        role: ParticipantRole.member, // 自主加入默认为 member
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            type: true,
            icon: true,
          },
        },
        user: {
          select: {
            user_key: true,
            nick_name: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * 邀请参与者（需要 admin 或 owner 权限）
   */
  async inviteParticipant(planId: number, inviterId: number, inviteDto: InviteParticipantDto) {
    // 检查权限
    const canInvite = await this.permissionService.canInviteMembers(planId, inviterId);
    if (!canInvite) {
      throw new ForbiddenException('You do not have permission to invite members');
    }

    // 根据 user_key 或 phone 查找用户
    const targetUser = await this.findUserByKeyOrPhone(inviteDto.user_key, inviteDto.phone);

    // 检查目标用户是否已经是参与者
    const existing = await this.prisma.planParticipant.findUnique({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: targetUser.id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User is already a participant');
    }

    // 只有 owner 可以邀请 admin 或 owner
    if (
      inviteDto.role &&
      (inviteDto.role === ParticipantRole.admin || inviteDto.role === ParticipantRole.owner)
    ) {
      const inviterRole = await this.permissionService.getUserRole(planId, inviterId);
      if (inviterRole !== ParticipantRole.owner) {
        throw new ForbiddenException('Only owner can invite admin or owner');
      }
    }

    return this.prisma.planParticipant.create({
      data: {
        plan_id: planId,
        user_id: targetUser.id,
        role: inviteDto.role || ParticipantRole.member,
      },
      include: {
        user: {
          select: {
            id: true,
            user_key: true,
            nick_name: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * 退出计划
   */
  async leavePlan(planId: number, userId: number) {
    const participant = await this.prisma.planParticipant.findUnique({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: userId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('You are not a participant of this plan');
    }

    // owner 不能退出自己的计划
    if (participant.role === ParticipantRole.owner) {
      throw new ConflictException('Owner cannot leave their own plan. Transfer ownership first.');
    }

    await this.prisma.planParticipant.delete({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: userId,
        },
      },
    });

    return { message: 'Successfully left the plan' };
  }

  /**
   * 获取计划的所有参与者
   */
  async getPlanParticipants(planId: number) {
    const participants = await this.prisma.planParticipant.findMany({
      where: { plan_id: planId },
      include: {
        user: {
          select: {
            user_key: true,
            nick_name: true,
            avatar: true,
            status: true,
          },
        },
      },
      orderBy: [
        { role: 'desc' }, // owner > admin > member > viewer
        { joined_at: 'asc' },
      ],
    });

    return participants;
  }

  /**
   * 移除参与者（需要权限检查）
   * 支持通过 user_key 或 phone 标识用户
   */
  async removeParticipant(
    planId: number,
    user_key: string | undefined,
    phone: string | undefined,
    operatorId: number,
  ) {
    // 根据 user_key 或 phone 查找目标用户
    const targetUser = await this.findUserByKeyOrPhone(user_key, phone);

    // 权限检查
    const canRemove = await this.permissionService.canRemoveMember(
      planId,
      operatorId,
      targetUser.id,
    );

    if (!canRemove) {
      throw new ForbiddenException('You do not have permission to remove this participant');
    }

    // 不能移除自己
    if (targetUser.id === operatorId) {
      throw new ConflictException('Cannot remove yourself. Use leave instead.');
    }

    const participant = await this.prisma.planParticipant.findUnique({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: targetUser.id,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // 不能移除 owner
    if (participant.role === ParticipantRole.owner) {
      throw new ForbiddenException('Cannot remove plan owner');
    }

    await this.prisma.planParticipant.delete({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: targetUser.id,
        },
      },
    });

    return { message: 'Participant removed successfully' };
  }

  /**
   * 更新参与者角色（仅 owner 可操作）
   * 支持通过 user_key 或 phone 标识用户
   */
  async updateParticipantRole(
    planId: number,
    operatorId: number,
    updateDto: UpdateParticipantRoleDto,
  ) {
    // 检查权限
    const canChange = await this.permissionService.canChangeRole(planId, operatorId);
    if (!canChange) {
      throw new ForbiddenException('Only owner can change participant roles');
    }

    // 根据 user_key 或 phone 查找目标用户
    const targetUser = await this.findUserByKeyOrPhone(updateDto.user_key, updateDto.phone);

    // 检查目标参与者是否存在
    const participant = await this.prisma.planParticipant.findUnique({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: targetUser.id,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    // 不能修改自己的角色
    if (targetUser.id === operatorId) {
      throw new ConflictException('Cannot change your own role');
    }

    // 不能修改 owner 的角色（需要通过转让所有权）
    if (participant.role === ParticipantRole.owner) {
      throw new ForbiddenException('Cannot change owner role. Use transfer ownership instead.');
    }

    // 不能将其他人设置为 owner（需要通过转让所有权）
    if (updateDto.role === ParticipantRole.owner) {
      throw new ForbiddenException('Cannot assign owner role. Use transfer ownership instead.');
    }

    return this.prisma.planParticipant.update({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: targetUser.id,
        },
      },
      data: {
        role: updateDto.role,
      },
      include: {
        user: {
          select: {
            user_key: true,
            nick_name: true,
            avatar: true,
          },
        },
      },
    });
  }

  /**
   * 转让所有权
   */
  async transferOwnership(planId: number, currentOwnerId: number, newOwnerId: number) {
    // 验证当前用户是 owner
    const currentOwner = await this.prisma.planParticipant.findUnique({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: currentOwnerId,
        },
      },
    });

    if (!currentOwner || currentOwner.role !== ParticipantRole.owner) {
      throw new ForbiddenException('Only owner can transfer ownership');
    }

    // 验证新 owner 是参与者
    const newOwner = await this.prisma.planParticipant.findUnique({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: newOwnerId,
        },
      },
    });

    if (!newOwner) {
      throw new NotFoundException('New owner must be a participant of the plan');
    }

    // 在事务中更新
    return this.prisma.$transaction([
      // 将当前 owner 降级为 admin
      this.prisma.planParticipant.update({
        where: {
          unique_plan_user: {
            plan_id: planId,
            user_id: currentOwnerId,
          },
        },
        data: { role: ParticipantRole.admin },
      }),
      // 将新用户升级为 owner
      this.prisma.planParticipant.update({
        where: {
          unique_plan_user: {
            plan_id: planId,
            user_id: newOwnerId,
          },
        },
        data: { role: ParticipantRole.owner },
      }),
      // 更新计划的 creator 字段
      this.prisma.plan.update({
        where: { id: planId },
        data: { creator: newOwnerId },
      }),
    ]);
  }
}
