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

  @ApiPropertyOptional({ description: '등록 시점의 템플릿 이름 스냅샷' })
  templateName: string | null;

  @ApiPropertyOptional({ description: '등록 시점의 테마 스냅샷' })
  theme: string | null;

  @ApiProperty()
  voteCount: number;

  @ApiProperty()
  votedByMe: boolean;

  @ApiProperty()
  createdAt: Date;
}
