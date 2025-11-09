import { SetMetadata } from '@nestjs/common';

/**
 * 权限装饰器的元数据 key
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * 权限装饰器 - 标记接口需要的权限
 *
 * @param permissions 权限代码数组，如 ['user:read', 'user:write']
 *
 * @example
 * ```typescript
 * @Get()
 * @RequirePermissions('user:read')
 * findAll() {
 *   return this.userService.findAll();
 * }
 *
 * @Delete(':id')
 * @RequirePermissions('user:delete')
 * remove(@Param('id') id: number) {
 *   return this.userService.remove(id);
 * }
 * ```
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * 权限装饰器的别名，更语义化
 */
export const Permissions = RequirePermissions;
