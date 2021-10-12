const logger = require('./logger');
const redis = require('redis');
const uuid = require('uuid');
require('dotenv').config({path:'./.env'}); // https://www.npmjs.com/package/dotenv


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

const redisClient = createRedisClient();

redisClient.keys('*',(err,keys) => {
    if(err) logger.error(err);

    keys.forEach((e,i) => {
        logger.info(`Key - ${e}`);
    });
    logger.info('All keys are read');
});
redisClient.quit();
