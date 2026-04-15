const path = require("path");

module.exports = {
  apps: [
    {
      name: "pm-mainnet",
      script: path.resolve(__dirname, "server.js"),
      exec_mode: "cluster",
      instances: "max",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: path.resolve(__dirname, "logs/pm-mainnet-error.log"),
      out_file: path.resolve(__dirname, "logs/pm-mainnet-output.log"),
      combine_logs: true,
      merge_logs: true,
      time: true,
      max_logs: "30d",
      log_size: "50M",
    },
    {
      name: "pm-mainnet-backup",
      script: path.resolve(__dirname, "backup/backup.js"),
      watch: false,
      autorestart: false,
      cron_restart: "0 */6 * * *",
      env: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: path.resolve(__dirname, "logs/pm-mainnet-backup-error.log"),
      out_file: path.resolve(__dirname, "logs/pm-mainnet-backup-output.log"),
      combine_logs: true,
      merge_logs: true,
      time: true,
      max_logs: "30d",
      log_size: "10M",
    },
  ],
};
