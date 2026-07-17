// Start Strava OAuth: set a CSRF state cookie, redirect to Strava's authorize screen.
const crypto = require("crypto");
module.exports = (req, res) => {
  const cid = process.env.STRAVA_CLIENT_ID;
  if (!cid) { res.statusCode = 302; res.setHeader("Location", "/?strava=unconfigured"); return res.end(); }
  const state = crypto.randomBytes(16).toString("hex");
  const redirect = `https://${req.headers.host}/api/strava/callback`;
  res.setHeader("Set-Cookie", `sv_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  const url = "https://www.strava.com/oauth/authorize"
    + `?client_id=${encodeURIComponent(cid)}`
    + `&redirect_uri=${encodeURIComponent(redirect)}`
    + "&response_type=code&approval_prompt=auto&scope=activity:read_all"
    + `&state=${state}`;
  res.statusCode = 302;
  res.setHeader("Location", url);
  res.end();
};
