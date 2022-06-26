import fs from 'fs/promises';
import path from 'path';
import { schedule, Speedrun } from './schedule.js'
import { addMinutes, endOfDay, isToday, isWithinInterval, minutesToMilliseconds, startOfDay } from 'date-fns'
import { sendDiscordMessage } from './notify.js';

const SAVE_PATH = "./data/interests.json",
	UPCOMING_CHECK_INTERVAL_MS = minutesToMilliseconds(1),
	SOON_THRESHOLD_MINUTES = 5;

await fs.mkdir(path.dirname(SAVE_PATH), { recursive: true })

function today() {
	return new Date().toLocaleDateString();
}

const startTimeFormat = new Intl.DateTimeFormat('en', {
	timeStyle: "short"
})
const formatRunStartTime = (run: Speedrun) => {
	return startTimeFormat.format(run.startTime);
}

class Interests {
	interestedSpeedruns = new Set<string>();
	notifiedSpeedruns = new Set<string>();
	lastNotifiedDay: string = '';

	savePromise = Promise.resolve();

	constructor() {
		this.load().then(async () => {
			await schedule.ready
			this.checkUpcoming()
			setInterval(() => this.checkUpcoming(), UPCOMING_CHECK_INTERVAL_MS)
		});
	}

	add(id: string) {
		this.interestedSpeedruns.add(id);
		this.save();
	}
	remove(id: string) {
		this.interestedSpeedruns.delete(id);
		this.save();
	}

	isEventOngoing() {
		const runs = schedule.getSchedule(),
			firstRun = runs[0],
			lastRun = runs.at(-1);

		return isWithinInterval(new Date(), {
			start: startOfDay(firstRun.startTime),
			end: endOfDay(lastRun.startTime)
		})
	}

	getInterests() {
		return Array.from(this.interestedSpeedruns);
	}

	private isSoon(date: Date) {
		return isWithinInterval(
			date,
			{
				start: new Date(),
				end: addMinutes(new Date(), SOON_THRESHOLD_MINUTES)
			}
		)
	}

	async checkUpcoming() {
		if (!this.isEventOngoing()) {
			return;
		}

		const runs = schedule.getSchedule();
		for (const run of runs) {
			if (this.isSoon(run.startTime)) {
				this.notify(run);
			}
		}

		// sometimes runs get removed or replaced, the schedule will notify of these changes, this
		// just needs to get rid of interests that are no longer valid
		for (const interest of this.interestedSpeedruns.values()) {
			const stillOnSchedule = runs.some(run => run.id === interest);

			if (!stillOnSchedule) {
				this.remove(interest);
			}
		}

		this.checkToday()
	}

	async checkToday() {
		if (this.lastNotifiedDay === today()) {
			return;
		}
		this.lastNotifiedDay = today();
		this.save();

		const runs = schedule.getSchedule(),
			todayRuns = runs.filter(run => isToday(run.startTime)),
			todayInterested = todayRuns.filter(run => this.interestedSpeedruns.has(run.id));

		if (!todayInterested.length) {
			sendDiscordMessage("There are no speedruns you are interested in today.");
			return;
		}

		const games = todayInterested.map(run => {
			return `**${run.gameName} - ${run.details}** at ${formatRunStartTime(run)}`
		})
		const plural = todayInterested.length !== 1;
		sendDiscordMessage(`There ${plural ? 'are' : 'is'} ${todayInterested.length} speedrun${plural ? 's' : ''} you are interested in today, ${new Date().toLocaleDateString()}.\n${games.join('\n')}`)
	}

	async notify(run: Speedrun) {
		if (this.notifiedSpeedruns.has(run.id) || !this.interestedSpeedruns.has(run.id)) {
			return;
		}

		this.notifiedSpeedruns.add(run.id);
		this.save();

		await sendDiscordMessage(`**${run.gameName} - ${run.details}** starts soon! (${formatRunStartTime(run)})`)
	}

	async load() {
		try {
			const saved = JSON.parse((await fs.readFile(SAVE_PATH)).toString()),
				{ interestedSpeedruns, notifiedSpeedruns, lastNotifiedDay } = saved;
			this.interestedSpeedruns = new Set(interestedSpeedruns);
			this.notifiedSpeedruns = new Set(notifiedSpeedruns);
			this.lastNotifiedDay = lastNotifiedDay
		}
		catch (e) {
			console.log("No previous interested speedruns found, starting fresh.")
		}
	}
	save() {
		this.savePromise = this.savePromise.then(async () => {
			await fs.writeFile(SAVE_PATH, JSON.stringify({
				interestedSpeedruns: Array.from(this.interestedSpeedruns),
				notifiedSpeedruns: Array.from(this.notifiedSpeedruns),
				lastNotifiedDay: this.lastNotifiedDay
			}, null, 2));
		})
	}
}

export const interests = new Interests();
