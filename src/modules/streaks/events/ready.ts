import { StreakService } from '../services/StreakService';
import { Logger } from '../../../utils/logger';

export default {
  name: 'clientReady',
  once: true,
  execute() {
    Logger.info('Streaks background workers started.', 'StreaksModule' as any);
    
    // Tick every 5 minutes
    setInterval(async () => {
      await StreakService.tickTopStreakerRole();
    }, 300000);
  }
};
