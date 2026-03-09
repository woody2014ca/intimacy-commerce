import { Controller, Get, UseGuards } from '@nestjs/common';
import { CommissionService } from '../commission/commission.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../user/current-user.decorator';

@Controller('commission')
@UseGuards(JwtAuthGuard)
export class CommissionController {
  constructor(private commission: CommissionService) {}

  @Get()
  async list(@CurrentUser() user: { id: string }) {
    return this.commission.listByUser(user.id);
  }
}
