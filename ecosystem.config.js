/**
 * ======================================================
 * 🚀 PM2 Ecosystem Configuration (ecosystem.config.js)
 * ======================================================
 * 
 * Manages all 4 Flameborn bot instances (Ember, Kai, Saphy, Liber)
 * Each bot runs independently with its own Discord token, database, and config.
 * 
 * 📚 USAGE:
 * 
 * Start all bots:
 *   pm2 start ecosystem.config.js
 * 
 * Start specific bot:
 *   pm2 start ecosystem.config.js --only flameborn-ember
 *   pm2 start ecosystem.config.js --only flameborn-kai
 *   pm2 start ecosystem.config.js --only flameborn-saphy
 *   pm2 start ecosystem.config.js --only flameborn-liber
 * 
 * Monitor status:
 *   pm2 monit
 *   pm2 status
 * 
 * View logs:
 *   pm2 logs flameborn-ember
 *   pm2 logs flameborn-kai
 * 
 * Restart all:
 *   pm2 restart ecosystem.config.js
 * 
 * Stop all:
 *   pm2 stop ecosystem.config.js
 * 
 * Delete all:
 *   pm2 delete ecosystem.config.js
 */

module.exports = {
  apps: [
    /**
     * 🔥 EMBER - The Flame Guardian
     * Energetic, passionate, warm
     */
    {
      name: 'flameborn-ember',
      script: 'dist/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        FLAMEBORN_CONFIG: 'ember',
      },
      env_file: '.env.ember',
      error_file: 'logs/ember.error.log',
      out_file: 'logs/ember.out.log',
      log_file: 'logs/ember.combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
    },

    /**
     * ❄️ KAI - The Ice Sentinel
     * Cool, calm, thoughtful
     */
    {
      name: 'flameborn-kai',
      script: 'dist/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        FLAMEBORN_CONFIG: 'kai',
      },
      env_file: '.env.kai',
      error_file: 'logs/kai.error.log',
      out_file: 'logs/kai.out.log',
      log_file: 'logs/kai.combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
    },

    /**
     * 🔮 SAPHY - The Mystic Seer
     * Mystical, wise, spiritual
     */
    {
      name: 'flameborn-saphy',
      script: 'dist/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        FLAMEBORN_CONFIG: 'saphy',
      },
      env_file: '.env.saphy',
      error_file: 'logs/saphy.error.log',
      out_file: 'logs/saphy.out.log',
      log_file: 'logs/saphy.combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
    },

    /**
     * 🎭 LIBER - The Chaos Agent
     * Free-spirited, fun, rebellious
     */
    {
      name: 'flameborn-liber',
      script: 'dist/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        FLAMEBORN_CONFIG: 'liber',
      },
      env_file: '.env.liber',
      error_file: 'logs/liber.error.log',
      out_file: 'logs/liber.out.log',
      log_file: 'logs/liber.combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
    },
  ],

  /**
   * Deploy configuration (optional)
   */
  deploy: {
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/flameborn.git',
      path: '/var/www/flameborn',
      'post-deploy': 'npm install && npm run build && pm2 startOrRestart ecosystem.config.js --env production',
    },
  },
};
