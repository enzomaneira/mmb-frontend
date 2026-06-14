FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
<<<<<<< HEAD

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist /app/dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
=======
EXPOSE 3000
CMD ["npm", "start"]
>>>>>>> 3820ff8a9dedc09c7c4b3a76ef61a2471b1b315f
