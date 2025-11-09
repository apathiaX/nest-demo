import { SetMetadata } from '@nestjs/common';

/**
 * 角色装饰器的元数据 key
 */
export const ROLES_KEY = 'roles';

/**
 * 角色装饰器 - 标记接口需要的角色
 *
 * @param roles 角色代码数组，如 ['admin', 'user']
 *
 * @example
 * ```typescript
 * @Get('admin/dashboard')
 * @Roles('admin')
 * getAdminDashboard() {
 *   return this.adminService.getDashboard();
 * }
 *
 * @Get('moderator/panel')
 * @Roles('admin', 'moderator')
 * getModeratorPanel() {
 *   return this.moderatorService.getPanel();
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * 角色装饰器的别名
 */
export const RequireRoles = Roles;
