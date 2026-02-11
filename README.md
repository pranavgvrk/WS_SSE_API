# WS_SSE_API

A real-time word streaming application built with Docker Compose. A Python producer broadcasts random words over WebSocket and exposes a Server-Sent Events (SSE) endpoint for live connection tracking. Two consumer variants (Nginx and Node.js) serve the frontend and proxy traffic to the producer.

## Architecture

```
│ Host Network                 ╎ Docker Network (wordstream)                            │
│                              ╎                                                        │
│                              ╎  ┌─────────────────────┐                               │
│                              ╎  │ shared_web (volume) │                               │
│                              ╎  │ html / css / js     │                               │
│                              ╎  └──────────┬──────────┘                               │
│                              ╎        ┌────┴────┐                                     │
│                              ╎        │         │                                     │
│              ┌───────────────╎────────┼─────────┼────┐         ┌─────────────────┐    │
│              │               ╎   mount│         │    │ WS      │                 │    │
│  :3000 ◄─────  Consumer Nginx╎   (ro) │         │    │◄───────►│                 │    │
│              │               ╎        │         │    │ SSE     │                 │    │
│              │               ╎        │         │    │◄────────│                 │    │
│              └───────────────╎────────┴─────────┼────┘         │    Producer     │    │
│                              ╎                  │              │    (Python)     │    │
│              ┌───────────────╎──────────────────┼────┐         │                 │    │
│              │               ╎             mount│    │ WS      │    :8765 ws     │    │
│  :3001 ◄─────  Consumer Node ╎             (ro) │    │◄───────►│    :8080 http   │    │
│              │               ╎                  │    │ SSE     │                 │    │
│              │               ╎                  │    │◄────────│                 │    │
│              └───────────────╎──────────────────┘────┘         └─────────────────┘    │
│                              ╎                                                        │
```

### Services

| Service | Description | Technology |
|---|---|---|
| **producer** | Generates random words every second and broadcasts them to all connected WebSocket clients. Exposes an SSE endpoint that pushes live active-connection counts. | Python 3.12, aiohttp, websockets, wonderwords |
| **consumer_nginx** | Serves the static frontend and proxies `/ws` and `/api/connections` to the producer. | Nginx (Alpine) |
| **consumer_node** | Same role as the Nginx consumer, implemented with Express and http-proxy-middleware. | Node.js 22 (Alpine), Express |
| **shared_init** | One-shot init container that copies shared frontend assets into a Docker volume consumed by both consumers. | Alpine |

### Shared Volume

The `shared/` directory contains the frontend assets (`index.html`, `style.css`, `app.js`) used by both consumers. At startup, the `shared_init` init container copies these files into a Docker named volume (`shared_web`). This volume is then mounted read-only into each consumer:

- **consumer_nginx** mounts it at `/usr/share/nginx/html`
- **consumer_node** mounts it at `/app/public`

This ensures both consumers serve identical frontend code without duplicating files in their images.

### Endpoints

| Path | Protocol | Description |
|---|---|---|
| `/ws` | WebSocket | Streams random words as JSON (`{"word": "..."}`) every second. |
| `/api/connections` | SSE (`text/event-stream`) | Pushes `{"active_connections": N}` whenever a WebSocket client connects or disconnects. |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

```bash
# Build images (only needed once or after code changes)
docker compose build

# Start services in detached mode
docker compose up -d
```

Once running, open either consumer in a browser:

- **Nginx consumer:** http://localhost:3000
- **Node consumer:** http://localhost:3001

Click **Start** to open a WebSocket connection and begin receiving words. The **Active Connections** counter updates automatically via SSE whenever any client connects or disconnects.

## Project Structure

```
.
├── docker-compose.yml          # Orchestrates all services
├── producer/
│   ├── Dockerfile
│   ├── requirements.txt        # Python dependencies
│   └── server.py               # WebSocket + SSE server
├── consumer_nginx/
│   ├── Dockerfile
│   └── nginx.conf              # Reverse-proxy config (WS + SSE)
├── consumer_node/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js               # Express reverse-proxy (WS + SSE)
└── shared/
    ├── index.html              # Frontend markup
    ├── style.css               # Styles
    └── app.js                  # Client-side JS (WebSocket + EventSource)
```

## Stopping

```bash
docker compose down
```

## References

- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
