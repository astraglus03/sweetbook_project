import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TemplateKind } from '../entities/cover-candidate.entity';

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

  @ApiProperty({ enum: ['CLASSIC', 'MINIMAL'] })
  templateKind: TemplateKind;

  @ApiProperty()
  voteCount: number;

  @ApiProperty()
  votedByMe: boolean;

  @ApiProperty()
  createdAt: Date;
}
