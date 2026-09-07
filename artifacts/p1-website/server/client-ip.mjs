import { isIP } from 'node:net';

// Railway's public edge supplies X-Real-IP. Enable this trust boundary only
// inside Railway; local/direct servers never trust visitor-supplied headers.
export function clientIp(req, env = process.env) {
  const edgeIp = req.headers['x-real-ip'];
  if (env.NODE_ENV === 'production' && env.RAILWAY_ENVIRONMENT_ID &&
      typeof edgeIp === 'string' && isIP(edgeIp)) return edgeIp;
  return req.socket.remoteAddress || '';
}
