import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail } from 'class-validator';

import { PageQueryDto } from '../common/pagination.js';

export class LearnerQueryDto extends PageQueryDto {}

export class InviteLearnersDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @IsEmail({}, { each: true }) emails!: string[];
}
