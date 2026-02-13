import asyncio
import logging

import websockets
from aiohttp import web

from ws_handler import handler, broadcast_words, set_connection_change_callback
from sse_handler import handle_connections, broadcast_connections

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("word-producer")

set_connection_change_callback(broadcast_connections)


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
