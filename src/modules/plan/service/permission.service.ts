import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma/prisma.service';
import { ParticipantRole } from 'prisma-mysql';

/**
 * 计划权限服务 - 领域服务
 * 集中管理计划相关的权限检查逻辑
 */
@Injectable()
export class PlanPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 权限级别定义（用于比较）
   */
  private readonly roleLevel = {
    [ParticipantRole.owner]: 4,
    [ParticipantRole.admin]: 3,
    [ParticipantRole.member]: 2,
    [ParticipantRole.viewer]: 1,
  };

  /**
   * 获取用户在计划中的角色
   */
  async getUserRole(planId: number, userId: number): Promise<ParticipantRole | null> {
    const participant = await this.prisma.planParticipant.findUnique({
      where: {
        unique_plan_user: {
          plan_id: planId,
          user_id: userId,
        },
      },
      select: { role: true },
    });

    return participant?.role || null;
  }

  /**
   * 检查用户是否是计划参与者
   */
  async isParticipant(planId: number, userId: number): Promise<boolean> {
    const role = await this.getUserRole(planId, userId);
    return role !== null;
  }

  /**
   * 检查用户是否有指定角色或更高权限
   */
  async hasRole(planId: number, userId: number, requiredRole: ParticipantRole): Promise<boolean> {
    const userRole = await this.getUserRole(planId, userId);
    if (!userRole) return false;

    return this.roleLevel[userRole] >= this.roleLevel[requiredRole];
  }

  /**
   * 检查是否可以查看计划
   * 规则：公开计划所有人可见，私有计划仅参与者可见
   */
  async canViewPlan(planId: number, userId?: number): Promise<boolean> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { is_public: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // 公开计划所有人可见
    if (plan.is_public) return true;

    // 私有计划需要是参与者
    if (!userId) return false;
    return this.isParticipant(planId, userId);
  }

  /**
   * 检查是否可以查看任务
   * 规则：同计划查看权限
   */
  async canViewTasks(planId: number, userId?: number): Promise<boolean> {
    return this.canViewPlan(planId, userId);
  }

  /**
   * 检查是否可以创建任务
   * 规则：至少是 member 角色
   */
  async canCreateTask(planId: number, userId: number): Promise<boolean> {
    return this.hasRole(planId, userId, ParticipantRole.member);
  }

  /**
   * 检查是否可以修改任务
   * 规则：至少是 member 角色
   */
  async canModifyTask(planId: number, userId: number): Promise<boolean> {
    return this.hasRole(planId, userId, ParticipantRole.member);
  }

  /**
   * 检查是否可以删除任务
   * 规则：至少是 admin 角色
   */
  async canDeleteTask(planId: number, userId: number): Promise<boolean> {
    return this.hasRole(planId, userId, ParticipantRole.admin);
  }

  /**
   * 检查是否可以修改计划
   * 规则：至少是 admin 角色
   */
  async canModifyPlan(planId: number, userId: number): Promise<boolean> {
    return this.hasRole(planId, userId, ParticipantRole.admin);
  }

  /**
   * 检查是否可以删除计划
   * 规则：仅 owner 可以
   */
  async canDeletePlan(planId: number, userId: number): Promise<boolean> {
    return this.hasRole(planId, userId, ParticipantRole.owner);
  }

  /**
   * 检查是否可以邀请成员
   * 规则：至少是 admin 角色
   */
  async canInviteMembers(planId: number, userId: number): Promise<boolean> {
    return this.hasRole(planId, userId, ParticipantRole.admin);
  }

  /**
   * 检查是否可以移除成员
   * 规则：至少是 admin 角色，且不能移除比自己权限高的成员
   */
  async canRemoveMember(
    planId: number,
    operatorId: number,
    targetUserId: number,
  ): Promise<boolean> {
    const operatorRole = await this.getUserRole(planId, operatorId);
    const targetRole = await this.getUserRole(planId, targetUserId);

    if (!operatorRole || !targetRole) return false;

    // 至少需要 admin 权限
    if (this.roleLevel[operatorRole] < this.roleLevel[ParticipantRole.admin]) {
      return false;
    }

    // 不能移除比自己权限高或相同的成员（owner 除外，owner 可以移除 admin）
    if (operatorRole === ParticipantRole.owner) {
      return targetRole !== ParticipantRole.owner; // owner 不能移除另一个 owner
    }

    return this.roleLevel[operatorRole] > this.roleLevel[targetRole];
  }

  /**
   * 检查是否可以修改成员角色
   * 规则：仅 owner 可以修改角色
   */
  async canChangeRole(planId: number, userId: number): Promise<boolean> {
    return this.hasRole(planId, userId, ParticipantRole.owner);
  }

  /**
   * 确保有权限（无权限则抛出异常）
   */
  async ensurePermission(
    planId: number,
    userId: number,
    requiredRole: ParticipantRole,
    action: string,
  ): Promise<void> {
    const hasPermission = await this.hasRole(planId, userId, requiredRole);
    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to ${action}. Required role: ${requiredRole}`,
      );
    }
  }

  /**
   * 获取权限摘要（用于前端显示）
   */
  async getPermissionSummary(planId: number, userId: number) {
    const role = await this.getUserRole(planId, userId);

    if (!role) {
      return {
        role: null,
        canView: await this.canViewPlan(planId, userId),
        canCreateTask: false,
        canModifyTask: false,
        canDeleteTask: false,
        canModifyPlan: false,
        canDeletePlan: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canChangeRoles: false,
      };
    }

    return {
      role,
      canView: true,
      canCreateTask: await this.canCreateTask(planId, userId),
      canModifyTask: await this.canModifyTask(planId, userId),
      canDeleteTask: await this.canDeleteTask(planId, userId),
      canModifyPlan: await this.canModifyPlan(planId, userId),
      canDeletePlan: await this.canDeletePlan(planId, userId),
      canInviteMembers: await this.canInviteMembers(planId, userId),
      canRemoveMembers: true, // 需要检查具体目标用户
      canChangeRoles: await this.canChangeRole(planId, userId),
    };
  }
}
