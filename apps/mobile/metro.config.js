const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// O Expo detecta o monorepo (npm workspaces) sozinho.
const config = getDefaultConfig(__dirname);

// Migrações do Drizzle (.sql) e o SQLite da web (.wasm).
config.resolver.sourceExts.push('sql');
config.resolver.assetExts.push('wasm');

// Na web, o expo-sqlite usa SharedArrayBuffer, que exige estes cabeçalhos.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = withNativeWind(config, { input: './src/global.css' });
