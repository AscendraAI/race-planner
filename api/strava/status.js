// Lets the frontend know whether Strava is configured (env vars set) and whether this browser is connected.
function parseCookies(h){const o={};(h||"").split(";").forEach(function(p){var i=p.indexOf("=");if(i>0)o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());});return o;}
module.exports = (req, res) => {
  const c = parseCookies(req.headers.cookie);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({
    configured: !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET),
    connected: !!c.sv_at
  }));
};
