const logger = require('./logger');
const express = require('express');
const redis = require('redis');
const uuid = require('uuid');
require('dotenv').config({path:'./.env'}); // https://www.npmjs.com/package/dotenv

var app = express();


const createRedisClient = () => {
    const redisConnectionTimeoutInMilliseconds = process.env.REDIS_CONNECTION_TIMEOUT_IN_MILLISECONDS
        ? parseInt(process.env.REDIS_CONNECTION_TIMEOUT_IN_MILLISECONDS, 10)
        : 20000;

    const retryStrategy = (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
        }
        if (options.attempt > 3) {
            // End reconnecting/retrying with built in error
            return undefined;
        }
        const delayInMilliseconds = (2 ** (options.attempt - 1)) * redisConnectionTimeoutInMilliseconds;
        return delayInMilliseconds;
    };

    const client = redis.createClient(6380, process.env.REDIS_CACHE_HOST_NAME, {
        auth_pass: process.env.REDIS_CACHE_AUTH_KEY,
        tls: { servername: process.env.REDIS_CACHE_HOST_NAME },
        // commented out as per documentation, this interferes with `retry_strategy`
        // connect_timeout: redisConnectionTimeoutInMilliseconds, // in milliseconds
        retry_strategy: retryStrategy,
    });

    client.on('error', error =>
        logger.error(`Redis - Auto-retry expected, error '${error}'.`)
    );
    client.on('ready', () => logger.info('Redis - Ready.'));
    client.on('connect', () => logger.info('Redis - Connected.'));
    client.on('reconnecting', params =>
        logger.info(`Redis - Reconnecting '${JSON.stringify(params)}'.`)
    );
    client.on('end', () => logger.info('Redis - End.'));
    client.on('warning', params =>
        logger.warn(`Redis - Warning '${JSON.stringify(params)}'.`)
    );
    return client;
};


// app.use(session({
//     store: new RedisStore({ client: createRedisClient() }),
//     saveUninitialized: false,
//     secret: 'keyboard cat',
//     resave: false
// }));


const redisClient = createRedisClient();

app.get('/', async (req, res) => {

    logger.info('A new request started...');

    logger.info('Inserting new item.');
    const key = uuid.v1();
    const val = (new Date()).toString();
    redisClient.set(key, val, (err, reply) => {
    
       logger.info('A new item inserted');

    });


    logger.info('Searching an item.');
    redisClient.get(key, (err,reply) => {
        if(err){
            logger.error(err);
        }

        if(!reply){
            logger.warn('Item not present.');
        }
        else{
            logger.warn('Item is present.');

            var obj = {
                redisHost: process.env.REDIS_CACHE_HOST_NAME,
                key: key,
                value: val
            };
        
           res.send(obj);
        }

        logger.info('A new request ended...');
    });


});

app.listen(process.env.SERVER_PORT || 3000);