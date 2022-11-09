import fs from 'fs/promises';
import path from 'path';
import { schedule } from './schedule.js';
import { addMinutes, isToday, isWithinInterval, minutesToMilliseconds, startOfDay } from 'date-fns';
import { sendDiscordMessage } from './notify.js';
import { interestLogger } from './logger.js';
import type { Speedrun } from './schedule.js';

const SAVE_PATH = './data/interests.json',
	UPCOMING_CHECK_INTERVAL_MS = minutesToMilliseconds(1),
	SOON_THRESHOLD_MINUTES = 5;

await fs.mkdir(path.dirname(SAVE_PATH), { recursive: true });

function today() {
	return new Date().toLocaleDateString();
}

const startTimeFormat = new Intl.DateTimeFormat('en', {
	timeStyle: 'short',
});
const formatRunStartTime = (run: Speedrun) => {
	return startTimeFormat.format(run.startTime);
};

class Interests {
	interestedSpeedruns = new Set<string>();
	notifiedSpeedruns = new Set<string>();
	lastNotifiedDay: string = '';

	savePromise = Promise.resolve();

	constructor() {
		schedule.ready.then(async () => {
			await this.load();
			this.checkUpcoming();
			setInterval(() => this.checkUpcoming(), UPCOMING_CHECK_INTERVAL_MS);
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

	getInterests() {
		return Array.from(this.interestedSpeedruns);
	}

	private isSoon(date: Date) {
		return isWithinInterval(date, {
			start: new Date(),
			end: addMinutes(new Date(), SOON_THRESHOLD_MINUTES),
		});
	}
	private isRecent(date: Date) {
		return isWithinInterval(date, {
			start: addMinutes(new Date(), -30),
			end: new Date(),
		});
	}

	async checkUpcoming() {
		if (!schedule.isEventOngoing()) {
			return;
		}

		const runs = schedule.getSchedule();
		for (const run of runs) {
			if (this.isSoon(run.startTime)) {
				this.notify(run, true);
			} else if (this.isRecent(run.startTime)) {
				this.notify(run, false);
			}
		}

		// sometimes runs get removed or replaced, the schedule will notify of these changes, this
		// just needs to get rid of interests that are no longer valid
		for (const interest of this.interestedSpeedruns.values()) {
			const stillOnSchedule = runs.some((run) => run.id === interest);

			if (!stillOnSchedule) {
				this.remove(interest);
			}
		}

		this.checkToday();
	}

	async checkToday() {
		if (this.lastNotifiedDay === today()) {
			return;
		}
		this.lastNotifiedDay = today();
		this.save();

		const runs = schedule.getSchedule(),
			todayRuns = runs.filter((run) => isToday(run.startTime)),
			todayInterested = todayRuns.filter((run) => this.interestedSpeedruns.has(run.id));

		if (!todayInterested.length) {
			sendDiscordMessage('There are no speedruns you are interested in today.');
			return;
		}

		const games = todayInterested.map((run) => {
			return `> **${run.gameName} - ${run.details}** at ${formatRunStartTime(run)}`;
		});
		const plural = todayInterested.length !== 1;
		sendDiscordMessage(
			`There ${plural ? 'are' : 'is'} ${todayInterested.length} speedrun${
				plural ? 's' : ''
			} you are interested in today, ${new Date().toLocaleDateString()}.\n${games.join('\n')}`
		);
	}

	async notify(run: Speedrun, isFuture: boolean) {
		if (this.notifiedSpeedruns.has(run.id) || !this.interestedSpeedruns.has(run.id)) {
			return;
		}

		this.notifiedSpeedruns.add(run.id);
		this.save();

		const msg = isFuture ? 'starts soon' : 'recently started';
		await sendDiscordMessage(`**${run.gameName} - ${run.details}** ${msg}! (${formatRunStartTime(run)})`);
	}

	async load() {
		try {
			const eventName = schedule.eventName;

			const saved = JSON.parse((await fs.readFile(SAVE_PATH)).toString()),
				{ interestedSpeedruns, notifiedSpeedruns, lastNotifiedDay, eventName: oldEventName } = saved;

			if (oldEventName !== eventName) {
				interestLogger.info('New event since last time, starting fresh.');
				return;
			}

			this.interestedSpeedruns = new Set(interestedSpeedruns);
			this.notifiedSpeedruns = new Set(notifiedSpeedruns);
			this.lastNotifiedDay = lastNotifiedDay;
		} catch (e) {
			interestLogger.info('No previous interested speedruns found, starting fresh.');
		}
	}
	save() {
		this.savePromise = this.savePromise.then(async () => {
			await fs.writeFile(
				SAVE_PATH,
				JSON.stringify(
					{
						interestedSpeedruns: Array.from(this.interestedSpeedruns),
						notifiedSpeedruns: Array.from(this.notifiedSpeedruns),
						lastNotifiedDay: this.lastNotifiedDay,
						eventName: schedule.eventName,
					},
					null,
					2
				)
			);
		});
	}
}

export const interests = new Interests();
