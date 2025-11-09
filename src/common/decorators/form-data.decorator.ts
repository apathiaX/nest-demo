import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 从 FormData 中提取字段值的装饰器
 * 使用方式：@FormDataField('fieldName') fieldValue: string
 */
export const FormDataField = createParamDecorator((fieldName: string, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return fieldName ? request.body?.[fieldName] : request.body;
});
