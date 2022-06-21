import dotenv from 'dotenv';
dotenv.config();

function getEnv(name: string) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing "${name}" in .env!`)
	}

	return value;
}

export const config = {
	discordWebhook: getEnv("DISCORD_WEBHOOK"),
	env: getEnv('NODE_ENV')
} as const
