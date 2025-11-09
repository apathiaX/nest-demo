import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import { UserContextService } from '@/common/services/user-context.service';

/**
 * 角色守卫
 * 检查用户是否拥有访问接口所需的角色
 *
 * 使用方式：
 * 1. 在 Controller 或方法上使用 @Roles() 装饰器
 * 2. 守卫会自动检查当前用户是否拥有所需角色
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userContextService: UserContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取接口需要的角色
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果没有设置角色要求，则放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 获取当前用户
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User not authenticated');
    }

    // 检查用户是否拥有任意一个所需角色
    const hasAnyRole = await this.userContextService.hasAnyRole(user.id, requiredRoles);

    if (!hasAnyRole) {
      throw new ForbiddenException(
        `Insufficient roles. Required one of: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
