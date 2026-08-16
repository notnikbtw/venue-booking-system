import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateFeatureDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({
    example: 'WiFi',
    description: 'Name of the feature',
    required: false,
  })
  readonly name?: string;
}
