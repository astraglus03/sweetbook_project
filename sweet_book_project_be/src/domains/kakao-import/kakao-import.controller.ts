import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { KakaoImportService } from './kakao-import.service';

@ApiTags('kakao-import')
@ApiBearerAuth()
@Controller('groups/:groupId/kakao-import')
export class KakaoImportController {
  constructor(private readonly service: KakaoImportService) {}

  @Post()
  @Throttle({ upload: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: '카카오톡 zip 업로드 및 사진 import' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async importZip(
    @Param('groupId', ParseIntPipe) groupId: number,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.importZip(groupId, user.id, file);
  }
}
