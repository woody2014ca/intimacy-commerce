import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { WithdrawalService } from './withdrawal.service';

@Module({
  imports: [SettingsModule],
  controllers: [CommissionController],
  providers: [CommissionService, WithdrawalService],
  exports: [CommissionService, WithdrawalService],
})
export class CommissionModule {}
