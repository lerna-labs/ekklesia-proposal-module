import http from "http";

const SERVER_BASE_URL = process.env.SERVER_BASE_URL || "http://localhost:3000";
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
const SHARE_TEST_VOTE_SLUG = process.env.SHARE_TEST_VOTE_SLUG;
const SHARE_TEST_PROPOSAL_ID = process.env.SHARE_TEST_PROPOSAL_ID;

function requestShare(pathname, hostHeader) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, SERVER_BASE_URL);
    const req = http.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: "GET",
        headers: hostHeader ? { Host: hostHeader } : {},
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

const shouldRun = Boolean(SHARE_TEST_VOTE_SLUG && SHARE_TEST_PROPOSAL_ID);
const describeIfReady = shouldRun ? describe : describe.skip;

describeIfReady("Share route host-header poisoning regression", () => {
  it("keeps canonical and redirect URLs pinned to FRONTEND_URL", async () => {
    const path = `/share/votes/${encodeURIComponent(SHARE_TEST_VOTE_SLUG)}/${SHARE_TEST_PROPOSAL_ID}`;
    const attackerHost = "attacker.example";
    const expectedTarget = `${FRONTEND_URL}/votes/${encodeURIComponent(SHARE_TEST_VOTE_SLUG)}/${SHARE_TEST_PROPOSAL_ID}`;
    const res = await requestShare(path, attackerHost);

    expect(res.status).toBe(200);
    expect(res.body).toContain(`<link rel="canonical" href="${expectedTarget}" />`);
    expect(res.body).toContain(`<meta property="og:url" content="${expectedTarget}" />`);
    expect(res.body).toContain(`<meta http-equiv="refresh" content="0;url=${expectedTarget}" />`);
    expect(res.body).toContain(`window.location.replace(${JSON.stringify(expectedTarget)});`);
    expect(res.body).not.toContain(`https://${attackerHost}/votes/`);
  });
});
