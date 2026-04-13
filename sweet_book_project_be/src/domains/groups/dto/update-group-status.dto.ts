import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { GroupStatus } from '../entities/group.entity';

const TRANSITIONS: Record<GroupStatus, GroupStatus[]> = {
  COLLECTING: ['EDITING'],
  EDITING: ['VOTING', 'COLLECTING'],
  VOTING: ['ORDERED', 'EDITING'],
  ORDERED: ['COMPLETED'],
  COMPLETED: [],
  DELETED: [],
};

export function isValidTransition(from: GroupStatus, to: GroupStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export class UpdateGroupStatusDto {
  @ApiProperty({
    enum: ['COLLECTING', 'EDITING', 'VOTING', 'ORDERED', 'COMPLETED'],
  })
  @IsIn(['COLLECTING', 'EDITING', 'VOTING', 'ORDERED', 'COMPLETED'])
  status: GroupStatus;
}
