const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 80;

const PRODUCER_WS = "http://producer:8765";
const PRODUCER_HTTP = "http://producer:8080";

// Proxy WebSocket — must be registered before the static middleware
app.use(
  "/ws",
  createProxyMiddleware({
    target: PRODUCER_WS,
    ws: true,
    changeOrigin: true,
    pathRewrite: { "^/ws": "/" },
  })
);

// Proxy SSE stream for active connections
app.use(
  "/api/connections",
  createProxyMiddleware({
    target: PRODUCER_HTTP,
    changeOrigin: true,
    pathRewrite: { "^/": "/connections" },
    onProxyRes: (proxyRes) => {
      proxyRes.headers["cache-control"] = "no-cache";
      proxyRes.headers["content-type"] = "text/event-stream";
    },
  })
);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Consumer (Node) listening on port ${PORT}`);
});
