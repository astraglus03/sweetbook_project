import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoverCandidateResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  groupId: number;

  @ApiProperty()
  creatorUserId: number;

  @ApiProperty()
  creatorName: string;

  @ApiProperty()
  photoId: number;

  @ApiProperty()
  photoUrl: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  subtitle: string | null;

  @ApiProperty({ description: 'Sweetbook 템플릿 UID' })
  templateUid: string;

  @ApiProperty({ description: 'Sweetbook 판형 UID' })
  bookSpecUid: string;

  @ApiProperty()
  voteCount: number;

  @ApiProperty()
  votedByMe: boolean;

  @ApiProperty()
  createdAt: Date;
}
