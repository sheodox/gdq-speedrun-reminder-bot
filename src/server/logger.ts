import pino from 'pino';

const options =
	process.env.NODE_ENV === 'development'
		? {
				transport: {
					target: 'pino-pretty',
				},
				level: 'debug',
		  }
		: {};

const logger = pino(options);

export const scheduleLogger = logger.child({ concern: 'schedule' });
export const interestLogger = logger.child({ concern: 'interest' });
export const discordLogger = logger.child({ concern: 'discord' });
export const httpLogger = logger.child({ concern: 'http' });
