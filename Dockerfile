FROM node:alpine/node

WORKDIR /app

COPY . .

RUN npm i

CMD [ "node", "index" ]
