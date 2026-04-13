import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PhotosService } from './photos.service';
import { PhotoResponseDto } from './dto/photo-response.dto';
import { PhotoListQueryDto } from './dto/photo-list-query.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';

@ApiTags('photos')
@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('groups/:groupId')
  @Throttle({ upload: { limit: 30, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: '사진 업로드 (다중)' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: [PhotoResponseDto] })
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: User,
    @Param('groupId', ParseIntPipe) groupId: number,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<PhotoResponseDto[]> {
    return this.photosService.uploadPhotos(groupId, user.id, files);
  }

  @Get('groups/:groupId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '모임 사진 목록' })
  getPhotos(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query() query: PhotoListQueryDto,
  ) {
    return this.photosService.getPhotos(groupId, query);
  }

  @Get('groups/:groupId/chapters')
  @ApiBearerAuth()
  @ApiOperation({ summary: '모임 챕터 목록' })
  getChapters(@Param('groupId', ParseIntPipe) groupId: number) {
    return this.photosService.getChapters(groupId);
  }

  @Get('groups/:groupId/uploader-ranking')
  @ApiBearerAuth()
  @ApiOperation({ summary: '업로더 순위 (사진 많이 올린 사람 순)' })
  getUploaderRanking(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Math.min(20, Math.max(1, Number(limit))) : 10;
    return this.photosService.getUploaderRanking(groupId, n);
  }

  @Get(':photoId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '사진 상세' })
  @ApiOkResponse({ type: PhotoResponseDto })
  getPhoto(
    @Param('photoId', ParseIntPipe) photoId: number,
  ): Promise<PhotoResponseDto> {
    return this.photosService.getPhoto(photoId);
  }

  @Patch(':photoId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '사진 정보 수정 (챕터 등)' })
  @ApiOkResponse({ type: PhotoResponseDto })
  update(
    @CurrentUser() user: User,
    @Param('photoId', ParseIntPipe) photoId: number,
    @Body() dto: UpdatePhotoDto,
  ): Promise<PhotoResponseDto> {
    return this.photosService.updatePhoto(photoId, user.id, dto);
  }

  @Delete(':photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: '사진 삭제' })
  async delete(
    @CurrentUser() user: User,
    @Param('photoId', ParseIntPipe) photoId: number,
  ): Promise<void> {
    await this.photosService.deletePhoto(photoId, user.id);
  }
}
