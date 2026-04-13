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
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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
    private readonly configService: ConfigService,
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
    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${user.id}.webp`;
    const filePath = path.join(uploadDir, filename);

    await sharp(file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(filePath);

    const baseUrl = this.configService.getOrThrow<string>('BASE_URL');
    const avatarUrl = `${baseUrl}/uploads/profiles/${filename}`;

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
