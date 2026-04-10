import { Module } from '@nestjs/common';
import { SweetbookApiService } from './sweetbook.service';

@Module({
  providers: [SweetbookApiService],
  exports: [SweetbookApiService],
})
export class SweetbookModule {}
