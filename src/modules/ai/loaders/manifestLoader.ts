import { ActionRouter } from '../services/ActionRouter';
import { ModerationManifest } from '../../moderation/ai.manifest';
import { EconomyManifest } from '../../economy/ai.manifest';
import { LevelingManifest } from '../../leveling/ai.manifest';
import { ShopManifest } from '../../shop/ai.manifest';
import { TerritoryManifest } from '../../territory/ai.manifest';
import { MusicManifest } from '../../music/ai.manifest';
import { TransportManifest } from '../../transport/ai.manifest';
import { GiveawayManifest } from '../../giveaway/ai.manifest';
import { InviteManifest } from '../../invite/ai.manifest';
import { SocialManifest } from '../../social/ai.manifest';
import { StreakManifest } from '../../streaks/ai.manifest';
import { BoosterManifest } from '../../booster/ai.manifest';
import { CountingManifest } from '../../counting/ai.manifest';
import { TodManifest } from '../../truth_or_dare/ai.manifest';
import { FactionManifest } from '../../faction/ai.manifest';
import { ProfileManifest } from '../../profile/ai.manifest';
import { FunManifest } from '../../fun/ai.manifest';
import { ActivityManifest } from '../../activity/ai.manifest';
import { UtilityManifest } from '../../utility/ai.manifest';
import { Logger } from '../../../utils/logger';

export async function loadAiManifests() {
  Logger.loader('Cognitive Engine: Registering distributed manifests...');
  
  const manifests = [
    ModerationManifest,
    EconomyManifest,
    LevelingManifest,
    ShopManifest,
    TerritoryManifest,
    MusicManifest,
    TransportManifest,
    GiveawayManifest,
    InviteManifest,
    SocialManifest,
    StreakManifest,
    BoosterManifest,
    CountingManifest,
    TodManifest,
    FactionManifest,
    ProfileManifest,
    FunManifest,
    ActivityManifest,
    UtilityManifest
  ];

  for (const manifest of manifests) {
    ActionRouter.register(manifest);
    Logger.loader(`Cognitive Engine: Linked module [${manifest.moduleName}] with ${manifest.actions.length} actions.`);
  }

  const actions = ActionRouter.getActions();
  Logger.loader(`Cognitive Engine: Registered ${actions.length} action capabilities.`);
}
