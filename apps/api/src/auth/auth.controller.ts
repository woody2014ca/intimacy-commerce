import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  phoneOrEmail!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

class RegisterDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Auth] 收到登录请求:', dto.phoneOrEmail);
    }
    return this.auth.login(dto.phoneOrEmail, dto.password);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  /** 仅开发环境：重置超级管理员密码为 Admin123!，浏览器访问一次即可 */
  @Get('dev-reset-super-admin')
  async devResetSuperAdmin() {
    return this.auth.devResetSuperAdminPassword();
  }
}
