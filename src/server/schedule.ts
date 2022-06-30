import path from 'path';
import fs from 'fs/promises';
import { Cheerio, CheerioAPI, load } from 'cheerio';
import { minutesToMilliseconds } from 'date-fns';
import fetch from 'node-fetch';
import { sendDiscordMessage } from './notify.js';

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
const REFRESH_INTERVAL_MS = minutesToMilliseconds(5),
	SAVE_PATH = "./data/schedule.json",
	NEW_RUN_TIME_FORMAT = new Intl.DateTimeFormat('en', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}),
	WEEKDAY_FORMAT = new Intl.DateTimeFormat('en', {
		weekday: 'short',
	}),
	formatRunWithTime = (run: Speedrun) => {
		return `> **${run.gameName} - ${run.details}** at ${WEEKDAY_FORMAT.format(run.startTime)}, ${NEW_RUN_TIME_FORMAT.format(run.startTime)}`
	};

await fs.mkdir(path.dirname(SAVE_PATH), { recursive: true })


class Schedule {
	private schedule: Speedrun[]
	private savePromise = Promise.resolve();
	public ready: Promise<void>

	constructor() {
		this.ready = this.load().then(() => this.refresh())
		setInterval(() => this.refresh(), REFRESH_INTERVAL_MS)
	}

	async load() {
		try {
			const saved = JSON.parse((await fs.readFile(SAVE_PATH)).toString()),
				{ schedule } = saved;
			this.schedule = schedule.map((run: Speedrun) => {
				return {
					...run,
					startTime: new Date(run.startTime)
				}
			});
		}
		catch (e) {
			console.log("No previous schedule found, starting fresh.")
		}
	}
	save() {
		this.savePromise = this.savePromise.then(async () => {
			await fs.writeFile(SAVE_PATH, JSON.stringify({
				schedule: this.schedule
			}, null, 2));
		})
	}
	async refresh() {
		const oldSchedule = this.schedule;

		this.schedule = [];
		const scheduleHTML = await fetch('https://gamesdonequick.com/schedule')
			.then(res => res.text()),
			$ = load(scheduleHTML),
			$startTimes = $('td.start-time'),
			$runs = $startTimes.map(function() {
				return $(this.parentNode)
			});

		for (const $run of $runs) {
			this.schedule.push(this.parseRun($run, $));
		}
		this.save();

		if (oldSchedule) {
			const newRuns = this.schedule.filter(run => {
				return !oldSchedule.some(oldRun => oldRun.id === run.id);
			}),
				removedRuns = oldSchedule.filter(run => {
					return this.schedule.every(oldRun => oldRun.id !== run.id);
				});


			if (newRuns.length) {
				const games = newRuns.map(formatRunWithTime).join('\n')

				sendDiscordMessage(`New run${newRuns.length === 1 ? '' : 's'} added to the schedule!\n${games}`)
			}
			if (removedRuns.length) {
				const plural = removedRuns.length !== 1;

				const games = removedRuns.map(formatRunWithTime).join('\n')

				sendDiscordMessage(`Notice: ${plural ? `${removedRuns.length} runs were` : 'A run was'} removed from the schedule!\n${games}`)
			}
		}
	}

	getSchedule(): Speedrun[] {
		return this.schedule.map(run => ({ ...run }));
	}

	parseRun($run: Cheerio<any>, $: CheerioAPI): Speedrun {
		function getElementText() {
			return $(this).text().trim()
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
		}
	}
}

export const schedule = new Schedule();
