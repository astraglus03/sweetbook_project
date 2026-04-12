import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Photo } from '../photos/entities/photo.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { User } from '../users/entities/user.entity';
import { KakaoNameMapping } from './entities/kakao-name-mapping.entity';
import { KakaoImportController } from './kakao-import.controller';
import { KakaoImportService } from './kakao-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo, GroupMember, User, KakaoNameMapping]),
  ],
  controllers: [KakaoImportController],
  providers: [KakaoImportService],
})
export class KakaoImportModule {}
