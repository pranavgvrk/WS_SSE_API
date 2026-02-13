# WS_SSE_API

A real-time word streaming application built with Docker Compose. A Python producer broadcasts random English and Telugu words over WebSocket and exposes a Server-Sent Events (SSE) endpoint for live connection tracking. Two consumer variants (Nginx and Node.js) serve the frontend and proxy traffic to the producer.

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
│  :8000 ◄─────  Consumer Nginx╎   (ro) │         │    │◄───────►│                 │    │
│              │               ╎        │         │    │ SSE     │                 │    │
│              │               ╎        │         │    │◄────────│                 │    │
│              └───────────────╎────────┴─────────┼────┘         │    Producer     │    │
│                              ╎                  │              │    (Python)     │    │
│              ┌───────────────╎──────────────────┼────┐         │                 │    │
│              │               ╎             mount│    │ WS      │    :8765 ws     │    │
│  :8001 ◄─────  Consumer Node ╎             (ro) │    │◄───────►│    :8080 http   │    │
│              │               ╎                  │    │ SSE     │                 │    │
│              │               ╎                  │    │◄────────│                 │    │
│              └───────────────╎──────────────────┘────┘         └─────────────────┘    │
│                              ╎                                                        │
```

### Services

| Service | Description | Technology |
|---|---|---|
| **producer** | Generates random English and Telugu words at 60 wpm (50/50 split) and broadcasts them to all connected WebSocket clients. Exposes an SSE endpoint that pushes live active-connection counts. | Python 3.12, aiohttp, websockets, wonderwords |
| **consumer_nginx** | Serves the static frontend and proxies `/ws` and `/api/connections` to the producer. | Nginx (Alpine) |
| **consumer_node** | Same role as the Nginx consumer, implemented with Express and http-proxy-middleware. | Node.js 22 (Alpine), Express |
| **shared_init** | One-shot init container that copies shared frontend assets into a Docker volume consumed by both consumers. | Alpine |

### Shared Volume

The `shared/` directory contains the frontend assets (`index.html`, `style.css`, `app.js`, `favicon.svg`) used by both consumers. At startup, the `shared_init` init container copies these files into a Docker named volume (`shared_web`). This volume is then mounted read-only into each consumer:

- **consumer_nginx** mounts it at `/usr/share/nginx/html`
- **consumer_node** mounts it at `/app/public`

This ensures both consumers serve identical frontend code without duplicating files in their images.

### Endpoints

| Path | Protocol | Description |
|---|---|---|
| `/ws` | WebSocket | Streams random English and Telugu words as JSON (`{"word": "..."}`) at 60 words per minute. |
| `/api/connections` | SSE (`text/event-stream`) | Pushes `{"active_connections": N}` whenever a WebSocket client connects or disconnects. |

### Client-Side Display Speed

The server always emits words at 60 wpm. A slider on the UI (10–60 wpm, step 5) controls how fast words are displayed on the client. The client buffers incoming words and renders the latest one at the chosen interval. The history panel on the right side of the page records all displayed words with timestamps and can be toggled open or closed.

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

- **Nginx consumer:** http://localhost:8000
- **Node consumer:** http://localhost:8001

Click **Start** to open a WebSocket connection and begin receiving words. Use the **Speed** slider to control how fast words appear on screen (10–60 wpm). The **Active Connections** counter at the bottom updates automatically via SSE. A collapsible **History** panel on the right edge logs all displayed words with timestamps.

## Project Structure

```
.
├── docker-compose.yml          # Orchestrates all services
├── producer/
│   ├── Dockerfile
│   ├── requirements.txt        # Python dependencies
│   ├── server.py               # WebSocket + SSE server
│   └── telugu_words.py         # Telugu word list
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
    ├── app.js                  # Client-side JS (WebSocket + EventSource)
    └── favicon.svg             # App icon
```

## Stopping

```bash
docker compose down
```

## References

- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
