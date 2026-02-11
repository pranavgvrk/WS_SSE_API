# Word Producer - WebSocket Server

A Python WebSocket server that broadcasts a random English word to all connected clients every second.

## Run locally

```bash
pip install -r requirements.txt
python server.py
```

## Run with Docker

```bash
docker build -t word-producer .
docker run -p 8765:8765 word-producer
```

## Test the connection

```bash
python -c "
import asyncio, websockets
async def listen():
    async with websockets.connect('ws://localhost:8765') as ws:
        while True:
            print(await ws.recv())
asyncio.run(listen())
"
```

## Configuration

- **Port**: `8765`
- **Broadcast interval**: 1 second
- **Message format**: `{"word": "<random_word>"}`
