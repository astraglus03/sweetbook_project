import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import sharp from 'sharp';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StorageService } from '../../common/storage/storage.service';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  @Get('me/profile')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiOkResponse({ type: ProfileResponseDto })
  async getProfile(@CurrentUser() user: User): Promise<ProfileResponseDto> {
    const hasPassword = await this.usersService.hasPassword(user.id);
    return ProfileResponseDto.from(user, hasPassword);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: '프로필 수정 (이름)' })
  @ApiOkResponse({ type: ProfileResponseDto })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const updated = await this.usersService.updateProfile(user.id, dto);
    return ProfileResponseDto.from(updated);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: '아바타 이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ProfileResponseDto })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ProfileResponseDto> {
    const buffer = await sharp(file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();

    const objectPath = `profiles/${user.id}-${Date.now()}.webp`;
    const avatarUrl = await this.storageService.upload(
      objectPath,
      buffer,
      'image/webp',
    );

    const updated = await this.usersService.updateAvatar(user.id, avatarUrl);
    return ProfileResponseDto.from(updated);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '비밀번호 변경' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('me/unlink-oauth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '소셜 계정 연동 해제 (비밀번호 필수)' })
  async unlinkOAuth(@CurrentUser() user: User): Promise<void> {
    await this.usersService.unlinkOAuth(user.id);
  }

  @Post('me/set-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '비밀번호 최초 설정 (소셜 계정용)' })
  async setPassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.setPassword(user.id, dto.newPassword);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '회원 탈퇴 (소프트 삭제)' })
  async withdraw(@CurrentUser() user: User): Promise<void> {
    await this.usersService.withdraw(user.id);
  }
}
