import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../user/current-user.decorator';

@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private order: OrderService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() body: { items: { productId: string; quantity: number }[]; couponId?: string },
  ) {
    return this.order.create(user.id, body.items, body.couponId);
  }

  @Post(':id/pay')
  async pay(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.order.pay(id, user.id);
  }

  @Get()
  async list(@CurrentUser() user: { id: string }) {
    return this.order.listByUser(user.id);
  }
}
