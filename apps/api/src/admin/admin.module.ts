import { Module } from '@nestjs/common';
import { CommissionModule } from '../commission/commission.module';
import { OrderModule } from '../order/order.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [OrderModule, CommissionModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
