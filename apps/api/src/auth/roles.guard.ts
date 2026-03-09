import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** 仅用于方法上的角色限制；类上请用 @SetMetadata(ROLES_KEY, [RoleCode.XXX, ...]) */
export function Roles(...roles: RoleCode[]) {
  return (target: object, key: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
    return descriptor;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<RoleCode[]>(ROLES_KEY, context.getHandler())
      ?? this.reflector.get<RoleCode[]>(ROLES_KEY, context.getClass());
    if (!required?.length) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user?.role?.code) return false;
    return required.includes(user.role.code as RoleCode) || user.role.code === 'SUPER_ADMIN';
  }
}
