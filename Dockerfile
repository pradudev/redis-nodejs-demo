FROM node:12.22.6-alpine
# FROM node:14.18.0-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# RUN npm install
# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3000
RUN chown -R node:node /app
USER node
CMD [ "node", "index-with-basic-http-server.js" ]