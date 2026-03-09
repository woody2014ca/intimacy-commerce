import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../user/current-user.decorator';

@Controller('referral')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  constructor(private referral: ReferralService) {}

  @Get()
  async my(@CurrentUser() user: { id: string }) {
    return this.referral.getMyReferralInfo(user.id);
  }
}
