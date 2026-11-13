---
"proposal-module-server": minor
---

Add a public `GET /version` endpoint that reports the running build as `name`, `version`, `gitSha` and `buildTime`. It answers while the database is down and is cacheable for 60 seconds. Release packages now carry a `build-info.json` holding the first 7 characters of the tagged commit and the build time, and release-candidate packages report their candidate version. When no such file is present, as in a development checkout, the `GIT_SHA`, `BUILD_TIME` and `APP_VERSION` environment variables are used, and the sha and time are null if neither exists.
