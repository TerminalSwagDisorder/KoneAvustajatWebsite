FROM node:20.7.0

WORKDIR /app

COPY ../package*.json ./

RUN npm install -g nodemon

RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "server"]
