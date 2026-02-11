FROM node:22-alpine

WORKDIR /app

COPY consumer_node/package.json .
RUN npm install --production

COPY consumer_node/server.js .

EXPOSE 80

CMD ["node", "server.js"]
