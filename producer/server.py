import asyncio
import json
import logging

import websockets
from aiohttp import web
from wonderwords import RandomWord

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("word-producer")

CONNECTED_CLIENTS = set()
SSE_CLIENTS = set()

r = RandomWord()


async def broadcast_connections():
    """Send the current connection count to all SSE clients."""
    count = len(CONNECTED_CLIENTS)
    message = f"data: {json.dumps({'active_connections': count})}\n\n"
    for response in list(SSE_CLIENTS):
        try:
            await response.write(message.encode())
        except (ConnectionResetError, ConnectionAbortedError):
            SSE_CLIENTS.discard(response)


async def handler(websocket):
    CONNECTED_CLIENTS.add(websocket)
    logger.info("Client connected. Total clients: %d", len(CONNECTED_CLIENTS))
    await broadcast_connections()
    try:
        await websocket.wait_closed()
    finally:
        CONNECTED_CLIENTS.discard(websocket)
        logger.info("Client disconnected. Total clients: %d", len(CONNECTED_CLIENTS))
        await broadcast_connections()


async def broadcast_words():
    """Every second, generate a random word and send it to all connected clients."""
    while True:
        if CONNECTED_CLIENTS:
            word = r.word()
            message = json.dumps({"word": word})
            logger.info("Broadcasting: %s", word)
            websockets.broadcast(CONNECTED_CLIENTS, message)
        await asyncio.sleep(1)


async def handle_connections(request):
    response = web.StreamResponse(
        status=200,
        reason="OK",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
    await response.prepare(request)
    SSE_CLIENTS.add(response)
    logger.info("SSE client connected. Total SSE clients: %d", len(SSE_CLIENTS))
    # Send current count immediately
    count = len(CONNECTED_CLIENTS)
    await response.write(f"data: {json.dumps({'active_connections': count})}\n\n".encode())
    try:
        # Keep the connection open until the client disconnects
        while True:
            await asyncio.sleep(1)
    except (asyncio.CancelledError, ConnectionResetError, ConnectionAbortedError):
        pass
    finally:
        SSE_CLIENTS.discard(response)
        logger.info("SSE client disconnected. Total SSE clients: %d", len(SSE_CLIENTS))
    return response


async def main():
    host = "0.0.0.0"
    ws_port = 8765
    http_port = 8080

    app = web.Application()
    app.router.add_get("/connections", handle_connections)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, http_port)
    await site.start()
    logger.info("HTTP server started on http://%s:%d/connections", host, http_port)

    async with websockets.serve(handler, host, ws_port):
        logger.info("WebSocket server started on ws://%s:%d", host, ws_port)
        await broadcast_words()


if __name__ == "__main__":
    asyncio.run(main())
