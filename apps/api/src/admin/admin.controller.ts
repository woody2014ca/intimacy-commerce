import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, SetMetadata } from '@nestjs/common';
import { IsString, IsOptional, IsNumber, IsBoolean, IsUUID, Min } from 'class-validator';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.guard';
import { RoleCode, OrderStatus } from '@prisma/client';

class CreateProductDto {
  @IsString() sku!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsNumber() @Min(0) supplierPrice!: number;
  @IsNumber() @Min(0) retailPrice!: number;
  @IsOptional() @IsNumber() @Min(0) inventory?: number;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class UpdateProductDto {
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsNumber() @Min(0) supplierPrice?: number;
  @IsOptional() @IsNumber() @Min(0) retailPrice?: number;
  @IsOptional() @IsNumber() @Min(0) inventory?: number;
  @IsOptional() categoryId?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@SetMetadata(ROLES_KEY, [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.FINANCE, RoleCode.OPERATOR])
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('dashboard')
  async dashboard() {
    return this.admin.getDashboard();
  }

  @Get('users')
  @SetMetadata(ROLES_KEY, [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.OPERATOR])
  async users() {
    return this.admin.listUsers();
  }

  @Get('categories')
  async categories() {
    return this.admin.listCategories();
  }

  @Get('products')
  async products(@Query('includeInactive') includeInactive?: string) {
    return this.admin.listProducts(includeInactive !== 'false');
  }

  @Post('products')
  @SetMetadata(ROLES_KEY, [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.OPERATOR])
  async createProduct(@Body() dto: CreateProductDto) {
    return this.admin.createProduct(dto);
  }

  @Patch('products/:id')
  @SetMetadata(ROLES_KEY, [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.OPERATOR])
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.admin.updateProduct(id, dto);
  }

  @Get('orders')
  async orders() {
    return this.admin.listOrders();
  }

  @Patch('orders/:id')
  @SetMetadata(ROLES_KEY, [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.OPERATOR])
  async updateOrderStatus(@Param('id') id: string, @Body() body: { status: OrderStatus }) {
    return this.admin.updateOrderStatus(id, body.status);
  }

  @Get('commissions')
  @SetMetadata(ROLES_KEY, [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.FINANCE])
  async commissions() {
    return this.admin.listCommissions();
  }

  @Get('withdrawals')
  @SetMetadata(ROLES_KEY, [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.FINANCE])
  async withdrawals() {
    return this.admin.listWithdrawals();
  }

  @Patch('withdrawals/:id')
  @SetMetadata(ROLES_KEY, [RoleCode.SUPER_ADMIN, RoleCode.ADMIN, RoleCode.FINANCE])
  async reviewWithdrawal(@Param('id') id: string, @Body() body: { status: 'APPROVED' | 'REJECTED' }) {
    return this.admin.reviewWithdrawal(id, body.status);
  }
}
