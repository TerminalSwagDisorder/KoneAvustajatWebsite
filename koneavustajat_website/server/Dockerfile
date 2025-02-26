FROM node:20.17.0 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN nodemon server.js

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 4000

CMD ["nginx", "-g", "daemon off;"]
