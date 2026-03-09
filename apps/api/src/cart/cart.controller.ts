import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../user/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cart: CartService) {}

  @Get()
  async get(@CurrentUser() user: { id: string }) {
    return this.cart.getOrCreateCart(user.id);
  }

  @Post('items')
  async addItem(
    @CurrentUser() user: { id: string },
    @Body() body: { productId: string; quantity?: number },
  ) {
    return this.cart.addItem(user.id, body.productId, body.quantity ?? 1);
  }

  @Patch('items')
  async updateItem(
    @CurrentUser() user: { id: string },
    @Body() body: { productId: string; quantity: number },
  ) {
    return this.cart.updateItem(user.id, body.productId, body.quantity);
  }

  @Delete('items/:productId')
  async removeItem(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    return this.cart.removeItem(user.id, productId);
  }
}
