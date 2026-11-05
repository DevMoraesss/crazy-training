const { proxyApi } = require('../scripts/api-proxy.cjs');

module.exports = (req, res) => {
  const pathname = new URL(req.url, 'https://localhost').searchParams.get('route');
  proxyApi(req, res, process.env.API_PROXY_URL ?? '', pathname ?? '');
};
// Preserva o stream original de POST/PUT, inclusive para snapshots grandes.
module.exports.config = { api: { bodyParser: false } };
