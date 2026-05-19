import { SOFT_QUESTIONS } from './tiers/soft';
import { PARTY_QUESTIONS } from './tiers/party';
import { SPICY_QUESTIONS } from './tiers/spicy';

export type TodType = 'TRUTH' | 'DARE';
export type TodTier = 'SOFT' | 'PARTY' | 'SPICY';

export interface TodQuestion {
  id: string;
  type: TodType;
  tier: TodTier;
  text: string;
}

export const QUESTIONS: TodQuestion[] = [
  ...SOFT_QUESTIONS,
  ...PARTY_QUESTIONS,
  ...SPICY_QUESTIONS
];
