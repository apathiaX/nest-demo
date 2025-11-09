import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserContextService } from '@/common/services/user-context.service';

/**
 * 获取完整的用户上下文信息（包含角色、权限等）
 *
 * 使用场景：需要判断用户权限、角色的接口
 *
 * @example
 * ```typescript
 * @Get('admin/dashboard')
 * async getAdminDashboard(@CurrentUserFull() user: FullUserContext) {
 *   if (!user.roles.includes('admin')) {
 *     throw new ForbiddenException();
 *   }
 *   return this.getDashboardData();
 * }
 * ```
 */
export const CurrentUserFull = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    // 如果已经有完整上下文，直接返回
    if (user.roles !== undefined) {
      return user;
    }

    // 否则，从服务中获取完整上下文
    // 注意：这里需要注入 UserContextService，但装饰器无法直接注入
    // 所以我们在请求中缓存完整信息
    if (!request._fullUserContext) {
      // 这个会在拦截器中处理
      return user;
    }

    return request._fullUserContext;
  },
);

/**
 * 自动加载完整用户上下文的拦截器
 *
 * 使用方式：
 * 1. 在需要的 Controller 上使用 @UseInterceptors(LoadFullUserContextInterceptor)
 * 2. 或者在特定方法上使用
 * 3. 然后使用 @CurrentUserFull() 装饰器获取完整用户信息
 */
@Injectable()
export class LoadFullUserContextInterceptor implements NestInterceptor {
  constructor(private readonly userContextService: UserContextService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && !request._fullUserContext) {
      // 加载完整用户上下文
      request._fullUserContext = await this.userContextService.getFullUserContext(user.id);
    }

    return next.handle();
  }
}
