import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import type { Request } from 'express';
import { PersonalBookService } from './personal-book.service';
import { QUEUE_NAMES } from '../../config/bull.config';
import { NotFoundException } from '../../common/exceptions';

interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@ApiTags('personal-books')
@ApiBearerAuth()
@Controller('groups/:groupId/books/personal')
export class PersonalBookController {
  constructor(
    private readonly personalBookService: PersonalBookService,
    @InjectQueue(QUEUE_NAMES.PERSONAL_BOOK)
    private readonly queue: Queue,
  ) {}

  @Post('generate')
  @ApiOperation({
    summary: '방장 — 전체 멤버 대상 개인 포토북 일괄 생성 (비동기)',
  })
  async generateForGroup(
    @Req() req: AuthenticatedRequest,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    await this.personalBookService.assertOwner(groupId, req.user.id);
    const job = await this.queue.add('generate-for-group', {
      groupId,
      requesterUserId: req.user.id,
    });
    return { jobId: String(job.id), status: 'QUEUED' };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: '일괄 생성 진행 상태 조회 (폴링)' })
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('JOB_NOT_FOUND', '작업을 찾을 수 없어요');
    }
    const state = await job.getState();
    return {
      jobId: String(job.id),
      state,
      progress: job.progress(),
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    };
  }

  @Post('generate/me')
  @ApiOperation({ summary: '멤버 — 본인 개인 포토북 생성' })
  async generateForMe(
    @Req() req: AuthenticatedRequest,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.personalBookService.generateForMember(groupId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '내 개인 포토북 조회' })
  async getMine(
    @Req() req: AuthenticatedRequest,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.personalBookService.getMyPersonalBook(groupId, req.user.id);
  }

  @Get(':bookId/matches')
  @ApiOperation({ summary: '개인 포토북 얼굴 매칭 사진 목록 조회' })
  async getMatches(
    @Req() req: AuthenticatedRequest,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.personalBookService.getMatchedPhotos(bookId, req.user.id);
  }

  @Delete(':bookId/photos/:photoId')
  @ApiOperation({ summary: '개인 포토북에서 사진 제외 (오탐 교정)' })
  async exclude(
    @Req() req: AuthenticatedRequest,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('photoId', ParseIntPipe) photoId: number,
  ) {
    return this.personalBookService.excludeMatch(bookId, photoId, req.user.id);
  }
}
