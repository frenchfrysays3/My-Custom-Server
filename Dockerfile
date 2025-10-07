FROM node:alpine/node

WORKDIR /app

COPY . .

RUN npm i

EXPOSE 3000 8080 1111 2222 3333 4444 5555 6666 7777 8888 9999 1234 5678

CMD [ "node", "index" ]
