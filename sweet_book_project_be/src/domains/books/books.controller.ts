import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { AddPagesDto } from './dto/add-pages.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { UpdateCoverDto } from './dto/update-cover.dto';

@ApiTags('books')
@ApiBearerAuth()
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get('specs')
  @ApiOperation({
    summary: '포토북 판형 목록 조회 (Sweetbook book-specs 프록시)',
  })
  getBookSpecs(@CurrentUser() _user: User) {
    return this.booksService.getBookSpecs();
  }

  @Get('specs/:uid/templates')
  @ApiOperation({
    summary: '판형별 템플릿 목록 조회 (Sweetbook templates 프록시)',
  })
  getTemplates(@CurrentUser() _user: User, @Param('uid') uid: string) {
    return this.booksService.getTemplates(uid);
  }

  @Get('specs/:uid/cover-templates')
  @ApiOperation({
    summary: '판형별 표지 템플릿 목록 조회 (enriched — parameters.definitions + elements 포함, theme 필터 없음)',
  })
  getCoverTemplates(@CurrentUser() _user: User, @Param('uid') uid: string) {
    return this.booksService.getCoverTemplates(uid);
  }

  @Get('specs/:uid/themes')
  @ApiOperation({ summary: '판형별 사용 가능한 테마 목록 조회' })
  getThemes(@CurrentUser() _user: User, @Param('uid') uid: string) {
    return this.booksService.getThemes(uid);
  }

  @Post('groups/:groupId')
  @ApiOperation({ summary: '그룹 포토북 생성' })
  createBook(
    @CurrentUser() user: User,
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: CreateBookDto,
  ) {
    return this.booksService.createBook(groupId, user.id, dto);
  }

  @Get('groups/:groupId')
  @ApiOperation({ summary: '그룹 포토북 목록 조회' })
  getGroupBooks(
    @CurrentUser() user: User,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.booksService.getGroupBooks(groupId, user.id);
  }

  @Get('my')
  @ApiOperation({ summary: '내 전체 포토북 목록 조회' })
  getMyBooks(@CurrentUser() user: User) {
    return this.booksService.getMyBooks(user.id);
  }

  @Get(':bookId')
  @ApiOperation({ summary: '포토북 상세 조회' })
  getBook(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.booksService.getBook(bookId, user.id);
  }

  @Get(':bookId/pages')
  @ApiOperation({ summary: '포토북 페이지 목록 조회' })
  getBookPages(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.booksService.getBookPages(bookId, user.id);
  }

  @Post(':bookId/pages')
  @ApiOperation({ summary: '포토북 페이지 일괄 추가' })
  addPages(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: AddPagesDto,
  ) {
    return this.booksService.addPages(bookId, user.id, dto);
  }

  @Patch(':bookId/pages/:pageId')
  @ApiOperation({ summary: '포토북 페이지 수정' })
  updatePage(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('pageId', ParseIntPipe) pageId: number,
    @Body() dto: UpdatePageDto,
  ) {
    return this.booksService.updatePage(bookId, pageId, user.id, dto);
  }

  @Delete(':bookId/pages/:pageId')
  @ApiOperation({ summary: '포토북 페이지 삭제' })
  deletePage(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('pageId', ParseIntPipe) pageId: number,
  ) {
    return this.booksService.deletePage(bookId, pageId, user.id);
  }

  @Get(':bookId/available-templates')
  @ApiOperation({
    summary: '포토북 테마의 사용 가능한 내지 템플릿 목록 (레이아웃 포함)',
  })
  getAvailableTemplates(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.booksService.getAvailableTemplates(bookId, user.id);
  }

  @Get(':bookId/template-layout')
  @ApiOperation({ summary: '포토북 테마의 content/cover 템플릿 레이아웃 조회' })
  getTemplateLayout(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.booksService.getTemplateLayout(bookId, user.id);
  }

  @Get(':bookId/spec-info')
  @ApiOperation({ summary: '포토북 판형 스펙 + 현재 페이지 수 조회' })
  getBookSpecInfo(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.booksService.getBookSpecInfo(bookId, user.id);
  }

  @Get(':bookId/cover')
  @ApiOperation({ summary: '포토북 표지 정보 조회' })
  getCover(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.booksService.getCover(bookId, user.id);
  }

  @Post(':bookId/cover')
  @ApiOperation({ summary: '포토북 표지 정보 저장' })
  updateCover(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: UpdateCoverDto,
  ) {
    return this.booksService.updateCover(bookId, user.id, dto);
  }

  @Post(':bookId/finalize')
  @ApiOperation({ summary: '포토북 최종화 (Sweetbook finalization)' })
  finalize(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.booksService.finalize(bookId, user.id);
  }

  @Post(':bookId/retry')
  @ApiOperation({ summary: 'FAILED 포토북 재시도 (DRAFT로 초기화)' })
  retryFinalize(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.booksService.retryFinalize(bookId, user.id);
  }

  @Post(':bookId/toggle-share')
  @ApiOperation({ summary: '포토북 디지털 공유 토글' })
  toggleShare(
    @CurrentUser() user: User,
    @Param('bookId', ParseIntPipe) bookId: number,
  ) {
    return this.booksService.toggleShare(bookId, user.id);
  }
}
