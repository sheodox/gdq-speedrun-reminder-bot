import fetch from 'node-fetch';
import { config } from './config.js';

export const sendDiscordMessage = async (msg: string) => {
	await fetch(config.discordWebhook, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			content: msg
		})
	})

}
