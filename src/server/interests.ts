import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { config } from './config.js';
import { schedule, Speedrun } from './schedule.js'
import { addMinutes, isWithinInterval, minutesToMilliseconds } from 'date-fns'

const SAVE_PATH = "./data/interests.json",
	UPCOMING_CHECK_INTERVAL_MS = minutesToMilliseconds(1);

await fs.mkdir(path.dirname(SAVE_PATH), { recursive: true })

class Interests {
	interestedSpeedruns = new Set<string>();
	notifiedSpeedruns = new Set<string>();

	savePromise = Promise.resolve();

	constructor() {
		this.load();
		schedule.ready.then(() => this.checkUpcoming())
		setInterval(() => this.checkUpcoming(), UPCOMING_CHECK_INTERVAL_MS)
	}

	add(id: string) {
		this.interestedSpeedruns.add(id);
		this.save();
	}
	remove(id: string) {
		this.interestedSpeedruns.delete(id);
		this.save();
	}

	getInterests() {
		return Array.from(this.interestedSpeedruns);
	}

	private isSoon(date: Date) {
		return isWithinInterval(
			date,
			{
				start: new Date(),
				end: addMinutes(new Date(), 15)
			}
		)
	}

	async checkUpcoming() {
		const runs = schedule.getSchedule();
		for (const run of runs) {
			if (this.isSoon(run.startTime)) {
				this.notify(run);
			}
		}
	}

	async notify(run: Speedrun) {
		if (this.notifiedSpeedruns.has(run.id) || !this.interestedSpeedruns.has(run.id)) {
			return;
		}

		await fetch(config.discordWebhook, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				content: `**${run.gameName} - ${run.details}** starts soon (${run.startTime.toLocaleString()})`
			})
		})
		this.notifiedSpeedruns.add(run.id);
		this.save();
	}

	async load() {
		try {
			const saved = JSON.parse((await fs.readFile(SAVE_PATH)).toString()),
				{ interestedSpeedruns, notifiedSpeedruns } = saved;
			this.interestedSpeedruns = new Set(interestedSpeedruns);
			this.notifiedSpeedruns = new Set(notifiedSpeedruns);
		}
		catch (e) {
			console.log("No previous interested speedruns found, starting fresh.")
		}
	}
	save() {
		this.savePromise = this.savePromise.then(async () => {
			await fs.writeFile(SAVE_PATH, JSON.stringify({
				interestedSpeedruns: Array.from(this.interestedSpeedruns),
				notifiedSpeedruns: Array.from(this.notifiedSpeedruns)
			}, null, 2));
		})
	}
}

export const interests = new Interests();
