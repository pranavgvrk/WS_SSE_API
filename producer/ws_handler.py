import asyncio
import json
import logging
import random

import websockets
from wonderwords import RandomWord

from telugu_words import TELUGU_WORDS

logger = logging.getLogger("word-producer")

CONNECTED_CLIENTS = set()

r = RandomWord()

BROADCAST_INTERVAL = 1.0  # 60 words per minute

_on_connection_change = None


def set_connection_change_callback(callback):
    """Register a callback to be invoked when a client connects or disconnects."""
    global _on_connection_change
    _on_connection_change = callback


async def handler(websocket):
    CONNECTED_CLIENTS.add(websocket)
    logger.info("Client connected. Total clients: %d", len(CONNECTED_CLIENTS))
    if _on_connection_change:
        await _on_connection_change()
    try:
        await websocket.wait_closed()
    finally:
        CONNECTED_CLIENTS.discard(websocket)
        logger.info("Client disconnected. Total clients: %d", len(CONNECTED_CLIENTS))
        if _on_connection_change:
            await _on_connection_change()


def random_word():
    """Return a random English or Telugu word."""
    if random.random() < 0.5:
        return r.word()
    return random.choice(TELUGU_WORDS)


async def broadcast_words():
    """Generate a random word at 60 wpm and send it to all connected clients."""
    while True:
        if CONNECTED_CLIENTS:
            word = random_word()
            message = json.dumps({"word": word})
            logger.info("Broadcasting: %s", word)
            websockets.broadcast(CONNECTED_CLIENTS, message)
        await asyncio.sleep(BROADCAST_INTERVAL)
