// Clear Strava cookies (disconnect this browser).
module.exports = (req, res) => {
  res.setHeader("Set-Cookie", [
    "sv_at=; Path=/; Max-Age=0",
    "sv_rt=; Path=/; Max-Age=0",
    "sv_exp=; Path=/; Max-Age=0"
  ]);
  res.statusCode = 302; res.setHeader("Location", "/"); res.end();
};
