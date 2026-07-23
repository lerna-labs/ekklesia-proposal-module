const path = require("path");

module.exports = {
  apps: [
    {
      name: "preprod-proposal-module",
      script: path.resolve(__dirname, "server.js"),
      watch: true,
      ignore_watch: ["node_modules", "logs", "backup", "scripts", "public", "preprod-logs", "mainnet-logs", ".git", ".DS_Store", "__frontend", "__scripts"],
      watch_options: {
        followSymlinks: false,
        usePolling: true,
      },
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: path.resolve(__dirname, "logs/preprod-proposal-module-error.log"),
      out_file: path.resolve(__dirname, "logs/preprod-proposal-module-output.log"),
      combine_logs: true,
      merge_logs: true,
      time: true,
      max_logs: "30d",
      log_size: "50M",
    },
    {
      name: "preprod-proposal-module-notifications-cron",
      script: path.resolve(__dirname, "cron/notification-milestones.js"),
      watch: false,
      autorestart: false,
      cron_restart: "*/5 * * * *",
      env: {
        NODE_ENV: "development",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: path.resolve(__dirname, "logs/preprod-proposal-module-notifications-cron-error.log"),
      out_file: path.resolve(__dirname, "logs/preprod-proposal-module-notifications-cron-output.log"),
      combine_logs: true,
      merge_logs: true,
      time: true,
      max_logs: "30d",
      log_size: "10M",
    },
    // Backup job - runs in both environments
    // {
    //   name: "mainnet-backup",
    //   script: path.resolve(__dirname, "backup/backup.js"),
    //   watch: false,
    //   autorestart: false,
    //   cron_restart: "0 */1 * * *",
    //   env: {
    //     NODE_ENV: "production",
    //   },
    //   log_date_format: "YYYY-MM-DD HH:mm:ss",
    //   error_file: path.resolve(__dirname, "logs/backup-error.log"),
    //   out_file: path.resolve(__dirname, "logs/backup-output.log"),
    //   combine_logs: true,
    //   merge_logs: true,
    //   time: true,
    //   max_logs: "30d",
    //   log_size: "10M",
    // },
  ],
};
