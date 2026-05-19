import { Logger } from '../../../utils/logger';
import { CountingService } from '../services/CountingService';

export default {
  name: 'clientReady',
  once: true,
  execute() {
    Logger.info('Counting background workers started.', 'CountingModule' as any);
    
    // Check every 5 minutes
    setInterval(() => {
      CountingService.tickTopCounterRole().catch(err => 
        Logger.error('Error in tickTopCounterRole', err)
      );
    }, 5 * 60 * 1000);
  },
};
