FROM node:20-alpine
WORKDIR /usr/src/app

COPY package*.json ./

# Install any additional packages if needed using apk
# RUN apk add --no-cache python3 make g++

RUN npm install

COPY . .

CMD ["node", "server.js"]


