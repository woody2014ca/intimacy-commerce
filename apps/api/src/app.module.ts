import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { ReferralModule } from './referral/referral.module';
import { CommissionModule } from './commission/commission.module';
import { AdminModule } from './admin/admin.module';
import { CommissionCronService } from './commission/commission-cron.service';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SettingsModule,
    AuthModule,
    UserModule,
    CatalogModule,
    CartModule,
    OrderModule,
    ReferralModule,
    CommissionModule,
    AdminModule,
  ],
  providers: [BootstrapService, CommissionCronService],
})
export class AppModule {}
