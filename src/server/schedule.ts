import path from 'path';
import fs from 'fs/promises';
import { Cheerio, CheerioAPI, load } from 'cheerio';
import {
	addDays,
	differenceInMilliseconds,
	endOfDay,
	isWithinInterval,
	minutesToMilliseconds,
	startOfDay,
} from 'date-fns';
import fetch from 'node-fetch';
import { sendDiscordMessage } from './notify.js';
import { scheduleLogger } from './logger.js';

export interface Speedrun {
	id: string;
	startTime: Date;
	gameName: string;
	details: string;
	platform: string;
	runner: string;
	estimate: string;
	host: string;
}
const REFRESH_INTERVAL_ACTIVE_MS = minutesToMilliseconds(5),
	SAVE_PATH = './data/schedule.json',
	NEW_RUN_TIME_FORMAT = new Intl.DateTimeFormat('en', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}),
	WEEKDAY_FORMAT = new Intl.DateTimeFormat('en', {
		weekday: 'short',
	}),
	formatRunWithTime = (run: Speedrun) => {
		return `> **${run.gameName} - ${run.details}** at ${WEEKDAY_FORMAT.format(
			run.startTime
		)}, ${NEW_RUN_TIME_FORMAT.format(run.startTime)}`;
	};

await fs.mkdir(path.dirname(SAVE_PATH), { recursive: true });

class Schedule {
	private schedule: Speedrun[];
	public eventName: string;
	private savePromise = Promise.resolve();
	public ready: Promise<void>;

	constructor() {
		this.ready = this.load().then(() => this.refresh());
	}

	getMSToNextRefresh() {
		// during the event, check often
		if (this.isEventOngoing()) {
			return REFRESH_INTERVAL_ACTIVE_MS;
		}

		// while the event is far away, refresh daily in the early morning, so more active refreshing can take over if the event starts
		const nextRefreshDate = startOfDay(addDays(new Date(), 1));
		nextRefreshDate.setHours(2);
		return differenceInMilliseconds(nextRefreshDate, new Date());
	}

	isEventOngoing() {
		const runs = this.getSchedule();
		if (!runs.length) {
			return false;
		}

		const firstRun = runs[0],
			lastRun = runs.at(-1);

		return isWithinInterval(new Date(), {
			start: startOfDay(firstRun.startTime),
			end: endOfDay(lastRun.startTime),
		});
	}

	isEventScheduled() {
		return !!this.eventName;
	}

	async load() {
		try {
			const saved = JSON.parse((await fs.readFile(SAVE_PATH)).toString()),
				{ schedule, eventName } = saved;
			this.schedule = schedule.map((run: Speedrun) => {
				return {
					...run,
					startTime: new Date(run.startTime),
				};
			});
			this.eventName = eventName;
		} catch (e) {
			this.schedule = [];
			this.eventName = '';
			scheduleLogger.info('No previous schedule found, starting fresh.');
		}
	}
	save() {
		this.savePromise = this.savePromise.then(async () => {
			await fs.writeFile(
				SAVE_PATH,
				JSON.stringify(
					{
						schedule: this.schedule,
						eventName: this.eventName,
					},
					null,
					2
				)
			);
		});
	}
	async refresh() {
		setTimeout(() => this.refresh(), this.getMSToNextRefresh());
		scheduleLogger.debug('Refreshing schedule');

		const oldSchedule = this.schedule;
		this.schedule = [];

		const scheduleHTML = await fetch('https://gamesdonequick.com/schedule').then((res) => res.text()),
			$ = load(scheduleHTML),
			$startTimes = $('td.start-time'),
			$runs = $startTimes.map(function () {
				return $(this.parentNode);
			});

		let eventName = $('h1').text();

		// if this isn't the schedule page, stop, nothing useful in this refresh
		if (!/schedule/i.test(eventName)) {
			scheduleLogger.debug(
				`Schedule page title was "${eventName}" but expected something with "Schedule" in it, ignoring this update.`
			);
			return;
		}

		// this h1 text is "<event name> Schedule", trim that out to get just the name
		eventName = this.eventName.replace(/schedule$/i, '').trim();

		for (const $run of $runs) {
			this.schedule.push(this.parseRun($run, $));
		}

		if (!this.schedule.length) {
			scheduleLogger.debug('No runs found on the schedule, ignoring this update.');
			return;
		}

		const isDifferentEvent = eventName !== this.eventName;

		if (isDifferentEvent) {
			// notify of new event
			// only show the date portion of the new event
			const startTime = this.schedule[0].startTime.toLocaleDateString(),
				endTime = this.schedule.at(-1).startTime.toLocaleDateString(),
				firstFewGames = this.schedule.slice(0, 5).map(formatRunWithTime).join('\n');

			sendDiscordMessage(
				`New event schedule is available! "${eventName}" starts ${startTime} and goes until ${endTime}, with ${this.schedule.length} events. Starting with...\n${firstFewGames}`
			);
		}

		this.eventName = eventName;
		this.save();

		// if we got an updated schedule for the current event, notify of differences. for new events everything
		// is assumed to be new, so diffs would be unwanted noise.
		if (oldSchedule && !isDifferentEvent) {
			const newRuns = this.schedule.filter((run) => {
					return !oldSchedule.some((oldRun) => oldRun.id === run.id);
				}),
				removedRuns = oldSchedule.filter((run) => {
					return this.schedule.every((oldRun) => oldRun.id !== run.id);
				});

			if (newRuns.length) {
				const games = newRuns.map(formatRunWithTime).join('\n');

				sendDiscordMessage(`New run${newRuns.length === 1 ? '' : 's'} added to the schedule!\n${games}`);
			}
			if (removedRuns.length) {
				const plural = removedRuns.length !== 1;

				const games = removedRuns.map(formatRunWithTime).join('\n');

				sendDiscordMessage(
					`Notice: ${plural ? `${removedRuns.length} runs were` : 'A run was'} removed from the schedule!\n${games}`
				);
			}
		}
	}

	getSchedule(): Speedrun[] {
		return this.schedule.map((run) => ({ ...run }));
	}

	parseRun($run: Cheerio<any>, $: CheerioAPI): Speedrun {
		function getElementText() {
			return $(this).text().trim();
		}

		const $secondLine = $run.next('tr.second-row'),
			$runCells = $run.find('td'),
			$secondRowCells = $secondLine.find('td'),
			[startTimeStr, gameName, runner] = $runCells.map(getElementText).toArray(),
			[estimate, fullDetails, host] = $secondRowCells.map(getElementText).toArray(),
			[details, platform] = fullDetails.split('—').map((str: string) => str.trim()),
			startTime = new Date(startTimeStr);

		return {
			id: `${gameName}|${fullDetails}`,
			startTime,
			gameName,
			platform,
			details,
			runner,
			estimate,
			host,
		};
	}
}

export const schedule = new Schedule();
