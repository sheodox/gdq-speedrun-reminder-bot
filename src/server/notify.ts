import fetch from 'node-fetch';
import { config } from './config.js';
import { discordLogger } from './logger.js';

export const sendDiscordMessage = async (msg: string) => {
	discordLogger.info(`Sending Discord message: ${msg}`, msg);

	await fetch(config.discordWebhook, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			content: msg,
		}),
	});
};
