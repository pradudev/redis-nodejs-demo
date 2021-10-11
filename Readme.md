docker build -t redis-nodejs-demo:v1 .
docker run --rm -it -p 5000:3000 redis-nodejs-demo:v1
