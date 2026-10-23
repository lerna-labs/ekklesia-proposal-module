let routesLoaded = false;

/**
 * Record whether every route has finished loading. Set by server.js once loadRoutes returns and
 * cleared when shutdown begins.
 *
 * @param {boolean} loaded
 */
export function setRoutesLoaded(loaded) {
  routesLoaded = Boolean(loaded);
}

/**
 * @returns {boolean} Whether every route has finished loading
 */
export function areRoutesLoaded() {
  return routesLoaded;
}

/**
 * Liveness handler: the process is up and able to answer.
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
export function liveHandler(req, res) {
  res.status(200).json({ status: "alive" });
}

/**
 * Wrap an async database check so the unauthenticated readiness endpoint cannot multiply database
 * load. A result is reused for ttlMs, concurrent callers share one in-flight check, and a check
 * that has not answered within timeoutMs counts as failed.
 *
 * @param {() => Promise<boolean>} check
 * @param {object} [options]
 * @param {number} [options.ttlMs]
 * @param {number} [options.timeoutMs]
 * @param {() => number} [options.now]
 * @returns {() => Promise<boolean>}
 */
export function createBoundedCheck(check, { ttlMs = 3000, timeoutMs = 2000, now = Date.now } = {}) {
  let cached = null;
  let inflight = null;
  return () => {
    if (cached && now() - cached.at < ttlMs) return Promise.resolve(cached.value);
    if (inflight) return inflight;
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });
    inflight = Promise.race([Promise.resolve().then(check), timeout])
      .then((value) => Boolean(value))
      .catch(() => false)
      .then((value) => {
        clearTimeout(timer);
        cached = { value, at: now() };
        inflight = null;
        return value;
      });
    return inflight;
  };
}

/**
 * Build the readiness handler. It answers 200 only when the database check passes and every route
 * has loaded, and 503 otherwise. The body carries the network fields and nothing else, and a
 * failing check answers 503 rather than throwing.
 *
 * @param {object} deps
 * @param {() => boolean | Promise<boolean>} deps.checkDatabase
 * @param {() => boolean} deps.routesLoaded
 * @returns {(req: object, res: object) => Promise<void>}
 */
export function createReadinessHandler({ checkDatabase, routesLoaded: loaded }) {
  return async (req, res) => {
    let ready = false;
    try {
      ready = Boolean(await checkDatabase()) && Boolean(loaded());
    } catch {
      ready = false;
    }
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "unavailable",
      network: process.env.NETWORK_NAME ?? null,
      networkId: parseInt(process.env.NETWORK_ID),
    });
  };
}
