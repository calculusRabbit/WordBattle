FROM node:24.14.0-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x start.sh

CMD ["sh", "start.sh"]
