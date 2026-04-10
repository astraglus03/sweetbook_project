import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitShippingDto {
  @ApiProperty({ description: '수령인 이름', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  recipientName: string;

  @ApiProperty({ description: '수령인 연락처', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  recipientPhone: string;

  @ApiProperty({ description: '배송 주소', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  recipientAddress: string;

  @ApiProperty({ description: '우편번호', maxLength: 10 })
  @IsString()
  @MaxLength(10)
  recipientZipCode: string;

  @ApiPropertyOptional({ description: '상세 주소', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  recipientAddressDetail?: string;

  @ApiPropertyOptional({ description: '배송 메모', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;

  @ApiProperty({ description: '주문 수량', minimum: 1, maximum: 100, default: 1 })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}
