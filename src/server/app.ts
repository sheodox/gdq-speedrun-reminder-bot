// Require the framework and instantiate it
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { schedule } from './schedule.js';
import { interests } from './interests.js';
import { config } from './config.js';
import { sendDiscordMessage } from './notify.js';
import { httpLogger } from './logger.js';
import type { FastifySchema } from 'fastify';

const fastify = Fastify({ logger: httpLogger }),
	port = process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 5008;

fastify.register(cors, {
	origin: config.env === 'development',
});

fastify.get('/api/data', async () => {
	return {
		speedruns: schedule.getSchedule(),
		interests: interests.getInterests(),
		eventName: schedule.eventName,
		isScheduled: schedule.isEventScheduled(),
	};
});

const toggleSchema: FastifySchema = {
	body: {
		type: 'object',
		required: ['interested'],
		properties: {
			interested: { type: 'boolean' },
		},
		additionalProperties: false,
	},
};

fastify.post<{
	Params: {
		id: string;
	};
	Body: {
		interested: boolean;
	};
}>('/api/interest/:id', { schema: toggleSchema }, async (request) => {
	const runId = request.params.id,
		interested = request.body.interested;

	if (runId) {
		interested ? interests.add(runId) : interests.remove(runId);
	}
});

fastify.register(fastifyStatic, {
	root: path.join(process.cwd(), 'dist/static'),
});

// Run the server!
const start = async () => {
	try {
		await fastify.listen({ port, host: '0.0.0.0' });
		sendDiscordMessage('GDQ Speedrun Reminder Bot started!');
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};
start();
