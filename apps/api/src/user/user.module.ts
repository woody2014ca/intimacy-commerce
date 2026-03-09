import { Module } from '@nestjs/common';
import { CommissionModule } from '../commission/commission.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [CommissionModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
