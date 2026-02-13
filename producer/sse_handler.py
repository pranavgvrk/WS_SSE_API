import asyncio
import json
import logging

from aiohttp import web

from ws_handler import CONNECTED_CLIENTS

logger = logging.getLogger("word-producer")

SSE_CLIENTS = set()


async def broadcast_connections():
    """Send the current connection count to all SSE clients."""
    count = len(CONNECTED_CLIENTS)
    message = f"data: {json.dumps({'active_connections': count})}\n\n"
    for response in list(SSE_CLIENTS):
        try:
            await response.write(message.encode())
        except (ConnectionResetError, ConnectionAbortedError):
            SSE_CLIENTS.discard(response)


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
