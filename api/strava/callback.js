// OAuth callback: verify state, exchange code for tokens, store them in httpOnly cookies (stateless — no DB).
function parseCookies(h){const o={};(h||"").split(";").forEach(function(p){var i=p.indexOf("=");if(i>0)o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());});return o;}
const COOKIE = "HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000";
module.exports = async (req, res) => {
  const cid = process.env.STRAVA_CLIENT_ID, cs = process.env.STRAVA_CLIENT_SECRET;
  const u = new URL(req.url, `https://${req.headers.host}`);
  const code = u.searchParams.get("code"), state = u.searchParams.get("state");
  const c = parseCookies(req.headers.cookie);
  if (!cid || !cs || !code || !state || state !== c.sv_state) {
    res.statusCode = 302; res.setHeader("Location", "/?strava=error"); return res.end();
  }
  try {
    const r = await fetch("https://www.strava.com/oauth/token", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: cid, client_secret: cs, code, grant_type: "authorization_code" })
    });
    const d = await r.json();
    if (!d.access_token) throw new Error("no_token");
    res.setHeader("Set-Cookie", [
      `sv_at=${d.access_token}; ${COOKIE}`,
      `sv_rt=${d.refresh_token}; ${COOKIE}`,
      `sv_exp=${d.expires_at}; Secure; SameSite=Lax; Path=/; Max-Age=2592000`,
      "sv_state=; Path=/; Max-Age=0"
    ]);
    res.statusCode = 302; res.setHeader("Location", "/?strava=1"); res.end();
  } catch (e) {
    res.statusCode = 302; res.setHeader("Location", "/?strava=error"); res.end();
  }
};
