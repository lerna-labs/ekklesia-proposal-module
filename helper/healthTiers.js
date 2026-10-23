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
 * Build the readiness handler. It answers 200 only when the database is connected and every route
 * has loaded, and 503 otherwise. The body carries the network fields and nothing else, and a
 * failing check answers 503 rather than throwing.
 *
 * @param {object} deps
 * @param {() => boolean} deps.isDatabaseConnected
 * @param {() => boolean} deps.routesLoaded
 * @returns {(req: object, res: object) => void}
 */
export function createReadinessHandler({ isDatabaseConnected, routesLoaded: loaded }) {
  return (req, res) => {
    let ready = false;
    try {
      ready = Boolean(isDatabaseConnected()) && Boolean(loaded());
    } catch {
      ready = false;
    }
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "unavailable",
      network: process.env.NETWORK_NAME,
      networkId: parseInt(process.env.NETWORK_ID),
    });
  };
}
