import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const hasAuth = !!req.headers?.authorization;
    const authVal = req.headers?.authorization || '';
    if (process.env.NODE_ENV !== 'production') {
      console.log('[JwtAuthGuard] 请求带 Authorization:', hasAuth, 'path:', req.url, 'Bearer 长度:', authVal.replace(/^Bearer\s+/i, '').length);
    }
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[JwtAuthGuard] JWT 验证失败', e instanceof Error ? e.message : String(e));
      }
      throw e;
    }
  }
}
