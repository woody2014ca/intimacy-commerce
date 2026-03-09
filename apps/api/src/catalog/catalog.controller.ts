import { Controller, Get, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private catalog: CatalogService) {}

  @Get('products')
  async products() {
    return this.catalog.listProducts();
  }

  @Get('products/:id')
  async product(@Param('id') id: string) {
    return this.catalog.getProduct(id);
  }

  @Get('content')
  async content() {
    return this.catalog.listContent();
  }
}
