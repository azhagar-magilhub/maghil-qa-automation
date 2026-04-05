import { IsEnum, IsObject, IsNotEmpty } from 'class-validator';

export enum IntegrationType {
  JIRA = 'JIRA',
  CONFLUENCE = 'CONFLUENCE',
  TEAMS = 'TEAMS',
}

export class SaveIntegrationDto {
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @IsObject()
  @IsNotEmpty()
  config: Record<string, string>;
}
