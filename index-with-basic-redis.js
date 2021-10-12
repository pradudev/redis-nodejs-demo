const logger = require('./logger');
const express = require('express');
const redis = require('redis');
const uuid = require('uuid');
require('dotenv').config({ path: './.env' }); // https://www.npmjs.com/package/dotenv

var app = express();


const createRedisClient = (clientId) => {
    const redisConnectionTimeoutInMilliseconds = process.env.REDIS_CONNECTION_TIMEOUT_IN_MILLISECONDS
        ? parseInt(process.env.REDIS_CONNECTION_TIMEOUT_IN_MILLISECONDS, 10)
        : 20000;

    const retryStrategy = (options) => {
        let delayInMilliseconds = (2 ** (options.attempt - 1)) * redisConnectionTimeoutInMilliseconds;
        if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error(`${clientId} - Redis - Retry time exhausted.`);
            // End reconnecting/retrying
            delayInMilliseconds = undefined;
        }
        if (options.attempt > 3) {
            // End reconnecting/retrying with built in error
            delayInMilliseconds = undefined;
        }
        logger.info(`${clientId} - Redis - Delay ${delayInMilliseconds} with retry options: '${JSON.stringify(options)}'.`);
        return delayInMilliseconds;
    };

    const client = redis.createClient(6380, process.env.REDIS_CACHE_HOST_NAME, {
        auth_pass: process.env.REDIS_CACHE_AUTH_KEY,
        tls: { servername: process.env.REDIS_CACHE_HOST_NAME },
        // commented out as per documentation, this interferes with `retry_strategy`
        // connect_timeout: redisConnectionTimeoutInMilliseconds, // in milliseconds
        retry_strategy: retryStrategy
    });

    client.on('error', error =>
        logger.error(`${clientId} - Redis - Auto-retry expected, error '${error}'.`)
    );
    client.on('ready', () => logger.info(`${clientId} - Redis - Ready.`));
    client.on('connect', () => logger.info(`${clientId} - Redis - Connected.`));
    client.on('reconnecting', params =>
        logger.info(`${clientId} - Redis - Reconnecting '${JSON.stringify(params)}'.`)
    );
    client.on('end', () => logger.info(`${clientId} - Redis - End.`));
    client.on('warning', params =>
        logger.warn(`${clientId} - Redis - Warning '${JSON.stringify(params)}'.`)
    );
    return client;
};

const redisClient1 = createRedisClient('TEST 1');
const redisClient2 = createRedisClient('TEST 2');

app.get('/test1', (req, res) => {
    logger.info('TEST 1 - STARTED');

    if (!redisClient1.connected) {
        logger.warn('TEST 1- Redis client got disconnected!');
        redisClient1 = createRedisClient('TEST 1');
    }

    redisAction('TEST 1', redisClient1, res);
});

app.get('/test2', (req, res) => {
    logger.info('TEST 2 - STARTED');

    if (!redisClient2.connected) {
        logger.warn('TEST 2- Redis client got disconnected!');
        redisClient2 = createRedisClient('TEST 2');
    }

    redisAction('TEST 2', redisClient2, res);
});


function redisAction(clientId, redisClient, res){


    logger.info(`${clientId} - Inserting new item.`);
    const key = uuid.v1();
    const val = (new Date()).toString();
    redisClient.set(key, val, (err, reply) => {
    
       logger.info(`${clientId} - A new item inserted`);

    });


    logger.info(`${clientId} - Searching an item.`);
    redisClient.get(key, (err,reply) => {
        if(err){
            logger.error(err);
        }

        if(!reply){
            logger.warn(`${clientId} - Item not present.`);
        }
        else{
            logger.warn(`${clientId} - Item is present.`);

            var obj = {
                redisHost: process.env.REDIS_CACHE_HOST_NAME,
                key: key,
                value: val
            };
        
           res.send(obj);
        }

        logger.info(`${clientId} - A new request ended...`);
    });
}

// app.get('/', async (req, res) => {

//     logger.info('A new request started...');

//     logger.info('Inserting new item.');
//     const key = uuid.v1();
//     const val = (new Date()).toString();
//     redisClient.set(key, val, (err, reply) => {

//         logger.info('A new item inserted');

//     });


//     logger.info('Searching an item.');
//     redisClient.get(key, (err, reply) => {
//         if (err) {
//             logger.error(err);
//         }

//         if (!reply) {
//             logger.warn('Item not present.');
//         }
//         else {
//             logger.warn('Item is present.');

//             var obj = {
//                 redisHost: process.env.REDIS_CACHE_HOST_NAME,
//                 key: key,
//                 value: val
//             };

//             res.send(obj);
//         }

//         logger.info('A new request ended...');
//     });


// });

app.listen(process.env.SERVER_PORT || 3000);