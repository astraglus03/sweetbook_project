import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { SaveMappingsDto } from './dto/save-mappings.dto';

@ApiTags('kakao-import')
@ApiBearerAuth()
@Controller('groups/:groupId/kakao-import')
export class KakaoImportController {
  constructor(private readonly service: KakaoImportService) {}

  @Post()
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

  @Get('unmatched')
  @ApiOperation({ summary: '매칭 안 된 카톡 닉네임 목록' })
  async getUnmatched(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.service.getUnmatched(groupId);
  }

  @Post('mappings')
  @ApiOperation({ summary: '카톡 닉네임 ↔ 멤버 매칭 저장 (사진 일괄 업데이트)' })
  async saveMappings(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: SaveMappingsDto,
  ) {
    return this.service.saveMappings(groupId, dto.mappings);
  }
}
