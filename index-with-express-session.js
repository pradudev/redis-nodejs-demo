const logger = require('./logger');
const express = require('express');
const session = require('express-session');
const connectRedis = require('connect-redis');
const redis = require('redis');
const uuid = require('uuid');
require('dotenv').config({ path: './.env' }); // https://www.npmjs.com/package/dotenv

var app = express();

const RedisStore = connectRedis(session);

const createRedisClient = () => {
    const redisConnectionTimeoutInMilliseconds = process.env.REDIS_CONNECTION_TIMEOUT_IN_MILLISECONDS
        ? parseInt(process.env.REDIS_CONNECTION_TIMEOUT_IN_MILLISECONDS, 10)
        : 20000;

    const retryStrategy = (options) => {
        let delayInMilliseconds = (2 ** (options.attempt - 1)) * redisConnectionTimeoutInMilliseconds;
        if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis - Retry time exhausted.');
            // End reconnecting/retrying
            delayInMilliseconds = undefined;
        }
        if (options.attempt > 3) {
            // End reconnecting/retrying with built in error
            delayInMilliseconds = undefined;
        }
        logger.info(`Redis - Delay ${delayInMilliseconds} with retry options: '${JSON.stringify(options)}'.`);
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

const ttl = process.env.SESSION_MAX_AGE
    ? parseInt(process.env.SESSION_MAX_AGE, 10)
    : 3600;

const fixedSessionOptions = {
    secret: 'secret$%^134',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        maxAge: ttl * 1000, // in milliseconds as documented in https://www.npmjs.com/package/express-session
        httpOnly: true,
        secure: false
    },
};

let redisClient = createRedisClient();

app.use((req, res, next) => {
    logger.info(`redisClient.connected: ${redisClient.connected}`);

    if (!redisClient.connected) {
        logger.warn('Redis client got disconnected!');
        redisClient = createRedisClient();
    }

    const store = new RedisStore({ client: redisClient });
    const options = Object.assign(
        { store },
        fixedSessionOptions
    );

    return session(options)(req, res, next);
});


app.get("/session", (req, res) => {
    logger.info('Reading data from session *****');
    const sess = req.session;
    sess.token = `token-${uuid.v1()}`
    logger.info('****Read data from session');
    res.end("success")
});


app.listen(process.env.SERVER_PORT || 3000);