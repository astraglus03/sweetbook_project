import { Global, Module } from '@nestjs/common';
import { SweetbookApiService } from './sweetbook.service';

@Global()
@Module({
  providers: [SweetbookApiService],
  exports: [SweetbookApiService],
})
export class SweetbookModule {}
