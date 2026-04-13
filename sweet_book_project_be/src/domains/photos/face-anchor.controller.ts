import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FaceAnchorService } from './face-anchor.service';

interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@ApiTags('face-anchor')
@ApiBearerAuth()
@Controller('groups/:groupId/face-anchor')
export class FaceAnchorController {
  constructor(private readonly faceAnchorService: FaceAnchorService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('photos', 5))
  @ApiOperation({ summary: '얼굴 앵커 등록 (1~5장, 1인 얼굴만)' })
  async register(
    @Req() req: AuthenticatedRequest,
    @Param('groupId', ParseIntPipe) groupId: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.faceAnchorService.registerAnchor(req.user.id, groupId, files);
  }

  @Get()
  @ApiOperation({ summary: '내 얼굴 앵커 조회' })
  async get(
    @Req() req: AuthenticatedRequest,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.faceAnchorService.getMyAnchor(req.user.id, groupId);
  }

  @Delete()
  @ApiOperation({ summary: '내 얼굴 앵커 삭제' })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    await this.faceAnchorService.deleteAnchor(req.user.id, groupId);
    return { deleted: true };
  }
}
