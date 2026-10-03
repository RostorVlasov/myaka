const path = require("node:path");

const appDir = process.env.MYAKA_APP_DIR || __dirname;
const runtimeDir = __dirname;

module.exports = {
  apps: [{
    name: "myaka",
    script: process.env.BUN_EXECUTABLE || "bun",
    args: [path.join(runtimeDir, "server.ts")],
    cwd: runtimeDir,
    interpreter: "none",
    exec_mode: "fork",
    instances: 1,
    autorestart: true,
    restart_delay: 1000,
    min_uptime: "5s",
    max_restarts: 10,
    kill_timeout: 5000,
    time: true,
    merge_logs: true,
    out_file: path.join(appDir, "shared/logs/out.log"),
    error_file: path.join(appDir, "shared/logs/err.log"),
    env: {
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: process.env.APP_PORT || "2027",
      MYAKA_RELEASE_ID: process.env.MYAKA_RELEASE_ID || "local",
    },
  }],
};
