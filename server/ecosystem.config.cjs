const os = require('os');

/**
 * COLYSEUS CLOUD WARNING:
 * ----------------------
 * PLEASE DO NOT UPDATE THIS FILE MANUALLY AS IT MAY CAUSE DEPLOYMENT ISSUES
 */

module.exports = {
  apps : [{
    name: "colyseus-app",
    script: 'lib/index.js',
    time: true,
    watch: false,
    instances: process.env.INSTANCES || os.cpus().length,
    exec_mode: process.env.EXEC_MODE || 'fork',
    wait_ready: true,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],
  deploy : {
    production : {
      "user" : process.env.DEPLOY_USER || "deploy",
      "host" : process.env.DEPLOY_HOST ? process.env.DEPLOY_HOST.split(',') : [],
      "ref"  : process.env.DEPLOY_REF || "origin/main",
      "repo" : process.env.DEPLOY_REPO || "git@github.com:viktorasbuivydas/pixel-game.git",
      "path" : process.env.DEPLOY_PATH || "/home/deploy",
      "post-deploy" : process.env.POST_DEPLOY || "npm install && npm run build && npm run colyseus-post-deploy"
    }
  }
};
