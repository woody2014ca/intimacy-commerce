import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsNumber, IsString } from 'class-validator';
import { Min } from 'class-validator';
import { UserService } from './user.service';
import { WithdrawalService } from '../commission/withdrawal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

class ClaimCouponDto {
  @IsString() code!: string;
}

class CreateWithdrawalDto {
  @IsNumber() @Min(0.01) amount!: number;
}

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private user: UserService,
    private withdrawal: WithdrawalService,
  ) {}

  @Get('profile')
  async profile(@CurrentUser() user: { id: string }) {
    return this.user.getProfile(user.id);
  }

  @Get('points')
  async points(@CurrentUser() user: { id: string }) {
    return this.user.getPoints(user.id);
  }

  @Get('coupons')
  async coupons(@CurrentUser() user: { id: string }) {
    return this.user.getClaimedCoupons(user.id);
  }

  @Post('coupons/claim')
  async claimCoupon(@CurrentUser() user: { id: string }, @Body() dto: ClaimCouponDto) {
    return this.user.claimCouponByCode(user.id, dto.code);
  }

  @Get('withdrawals')
  async withdrawals(@CurrentUser() user: { id: string }) {
    const [list, availableBalance] = await Promise.all([
      this.withdrawal.listByUser(user.id),
      this.withdrawal.getAvailableBalance(user.id),
    ]);
    return { list, availableBalance };
  }

  @Post('withdrawals')
  async createWithdrawal(@CurrentUser() user: { id: string }, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawal.create(user.id, dto.amount);
  }
}
