import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActivitiesService } from './activities.service';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups/:groupId/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: '그룹 활동 피드 조회' })
  @ApiParam({ name: 'groupId', type: Number, description: '모임 ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 (기본 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '페이지당 항목 수 (1~50, 기본 20)' })
  @ApiResponse({ status: 200, description: '활동 피드 목록' })
  @ApiResponse({ status: 403, description: '모임 멤버가 아닌 경우' })
  async list(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: { id: number },
  ) {
    return this.activitiesService.list(groupId, user!.id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }
}
