docker build -t redis-nodejs-demo:node-12 .
docker run --rm -it -p 5000:3000 redis-nodejs-demo:node-12
docker tag redis-nodejs-demo:node-12 az104practiceacr01.azurecr.io/redis-nodejs-demo:node-12
docker push az104practiceacr01.azurecr.io/redis-nodejs-demo:node-12


docker build -t redis-nodejs-demo:node-14 .
docker run --rm -it -p 5000:3000 redis-nodejs-demo:node-14
docker tag redis-nodejs-demo:node-14 az104practiceacr01.azurecr.io/redis-nodejs-demo:node-14
docker push az104practiceacr01.azurecr.io/redis-nodejs-demo:node-14


helm package --version 1.0.0 --destination .\deploy\redis-nodejs-demo\packages\ .\deploy\redis-nodejs-demo
helm upgrade --namespace redis-nodejs-demo-ns --install --wait --create-namespace redis-nodejs-demo .\deploy\redis-nodejs-demo\packages\redis-nodejs-demo-1.0.0.tgz
helm uninstall redis-nodejs-demo -n redis-nodejs-demo-ns


=============
redisClient.connected => this will return true if there is an active TCP connection from the client to the REDIS server. The Connection could be idle as well. 
Whenever there is a update in the Redis Server, the active connections from the client to the server should RESET, so that new connections are established but in K8S, the connection does not get RESET and there is no activity over the connection, so it gets stuck until the connection gets TIMEOUT (~ 15 mins). This affects the web application.