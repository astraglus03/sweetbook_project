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

  @ApiProperty({ description: '슬롯별 파라미터: { [slotId]: photoId(number) | text(string) }' })
  params: Record<string, string | number>;

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
