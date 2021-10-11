const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
    format: winston.format.combine(
        winston.format.label({
            label: `Label🏷️`
        }),
        winston.format.timestamp({
            format: 'DD-MMM-YYYY HH:mm:ss'
        }),
        winston.format.printf(info => `${[info.timestamp]} [${info.level}] ${info.message}`),
    )
});


module.exports = logger;