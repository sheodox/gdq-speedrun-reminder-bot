// Require the framework and instantiate it
import Fastify, { FastifySchema } from 'fastify';
import cors from '@fastify/cors';
import { schedule } from './schedule.js';
import { interests } from './interests.js';
import { config } from './config.js'

const fastify = Fastify({ logger: true }),
	port = process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 5008;

fastify.register(cors, {
	origin: config.env === 'development'
})

fastify.get('/api/data', async (request, reply) => {
	return {
		speedruns: schedule.getSchedule(),
		interests: interests.getInterests(),
	}
})

const toggleSchema: FastifySchema = {
	body: {
		type: 'object',
		required: ['interested'],
		properties: {
			interested: { type: 'boolean' }
		},
		additionalProperties: false
	}
}

fastify.post<{
	Params: {
		id: string
	},
	Body: {
		interested: boolean;
	}
}>('/api/interest/:id', { schema: toggleSchema }, async (request, reply) => {
	const runId = request.params.id,
		interested = request.body.interested;

	if (runId) {
		interested ? interests.add(runId) : interests.remove(runId);
	}
})

// Run the server!
const start = async () => {
	try {
		await fastify.listen({ port })
	} catch (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}
start()

