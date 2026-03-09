import { Injectable, OnModuleInit } from '@nestjs/common';
import { SettingsService } from './settings/settings.service';

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(private settings: SettingsService) {}

  async onModuleInit() {
    await this.settings.loadFromDb();
  }
}
