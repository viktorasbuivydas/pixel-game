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
    instances: os.cpus().length,
    exec_mode: 'fork',
    wait_ready: true,
    env_production: {
      NODE_ENV: 'production'
    }
  }],
  deploy : {
    production : {
      "user" : "deploy",
      "host" : ["70.34.250.153"],
      "ref"  : "origin/main",
      "repo" : "git@github.com:viktorasbuivydas/pixel-game.git",
      "path" : "/home/deploy",
      "post-deploy" : "npm install && npm run build && npm exec colyseus-post-deploy"
    }
  }
};
