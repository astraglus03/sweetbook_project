import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CoverVotingService } from './cover-voting.service';
import { CreateCoverCandidateDto } from './dto/create-cover-candidate.dto';
import { CoverCandidateResponseDto } from './dto/cover-candidate-response.dto';

@ApiTags('cover-voting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/cover-candidates')
export class CoverVotingController {
  constructor(private readonly coverVotingService: CoverVotingService) {}

  @Post()
  @ApiOperation({ summary: '표지 후보 추가' })
  @ApiOkResponse({ type: CoverCandidateResponseDto })
  create(
    @Param('groupId', ParseIntPipe) groupId: number,
    @CurrentUser() user: User,
    @Body() dto: CreateCoverCandidateDto,
  ): Promise<CoverCandidateResponseDto> {
    return this.coverVotingService.create(groupId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '표지 후보 목록 (투표수 내림차순)' })
  @ApiOkResponse({ type: [CoverCandidateResponseDto] })
  list(
    @Param('groupId', ParseIntPipe) groupId: number,
    @CurrentUser() user: User,
  ): Promise<CoverCandidateResponseDto[]> {
    return this.coverVotingService.list(groupId, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '표지 후보 삭제 (본인 또는 방장)' })
  delete(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.coverVotingService.delete(groupId, id, user.id);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: '표지 투표 토글 (투표/취소)' })
  toggleVote(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<{ voted: boolean; voteCount: number }> {
    return this.coverVotingService.toggleVote(groupId, id, user.id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: '표지 후보 확정 (방장 전용)' })
  confirm(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<{ photoId: number; title: string; subtitle: string | null; templateUid: string; bookSpecUid: string }> {
    return this.coverVotingService.confirm(groupId, id, user.id);
  }
}
