// Return the connected athlete's recent activities (with route polylines). Refreshes the token if expired.
function parseCookies(h){const o={};(h||"").split(";").forEach(function(p){var i=p.indexOf("=");if(i>0)o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());});return o;}
const COOKIE = "HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000";
module.exports = async (req, res) => {
  const cid = process.env.STRAVA_CLIENT_ID, cs = process.env.STRAVA_CLIENT_SECRET;
  const c = parseCookies(req.headers.cookie);
  let at = c.sv_at; const exp = +c.sv_exp || 0, rt = c.sv_rt;
  res.setHeader("Content-Type", "application/json");
  if (!at) { res.statusCode = 401; return res.end(JSON.stringify({ error: "not_connected" })); }
  try {
    if (Date.now() / 1000 > exp - 60 && rt && cid && cs) {
      const rr = await fetch("https://www.strava.com/oauth/token", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: cid, client_secret: cs, grant_type: "refresh_token", refresh_token: rt })
      });
      const rd = await rr.json();
      if (rd.access_token) {
        at = rd.access_token;
        res.setHeader("Set-Cookie", [
          `sv_at=${rd.access_token}; ${COOKIE}`,
          `sv_rt=${rd.refresh_token}; ${COOKIE}`,
          `sv_exp=${rd.expires_at}; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
        ]);
      }
    }
    const r = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=30", {
      headers: { Authorization: `Bearer ${at}` }
    });
    if (r.status === 401) { res.statusCode = 401; return res.end(JSON.stringify({ error: "not_connected" })); }
    if (!r.ok) { res.statusCode = 502; return res.end(JSON.stringify({ error: "strava_error" })); }
    const acts = await r.json();
    const out = (acts || [])
      .filter(function (a) { return a && a.map && a.map.summary_polyline; })
      .map(function (a) {
        return {
          id: a.id, name: a.name, type: a.type,
          distance: a.distance, moving_time: a.moving_time, elapsed_time: a.elapsed_time,
          total_elevation_gain: a.total_elevation_gain, start_date_local: a.start_date_local,
          polyline: a.map.summary_polyline
        };
      });
    res.statusCode = 200; res.end(JSON.stringify({ activities: out }));
  } catch (e) {
    res.statusCode = 500; res.end(JSON.stringify({ error: "server" }));
  }
};
