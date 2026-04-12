import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class KakaoNameMappingItemDto {
  @ApiProperty({ description: '카카오톡 표시명' })
  @IsString()
  @MaxLength(100)
  kakaoName: string;

  @ApiProperty({ description: '매칭할 모임 멤버 userId (null이면 매칭 안함)', nullable: true })
  @IsOptional()
  @IsInt()
  userId: number | null;
}

export class SaveMappingsDto {
  @ApiProperty({ type: [KakaoNameMappingItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => KakaoNameMappingItemDto)
  mappings: KakaoNameMappingItemDto[];
}
