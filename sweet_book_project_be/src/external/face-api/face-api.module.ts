import { Global, Module } from '@nestjs/common';
import { FaceApiService } from './face-api.service';

@Global()
@Module({
  providers: [FaceApiService],
  exports: [FaceApiService],
})
export class FaceApiModule {}
