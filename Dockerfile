FROM node:10.19.0-alpine

#RUN apk add --no-cache g++ make python3
WORKDIR /root
COPY ./package*.json ./
RUN npm ci
COPY . .
EXPOSE 3006
CMD ["npm", "run", "start"]