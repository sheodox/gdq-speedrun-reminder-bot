import path from 'path';
import fs from 'fs/promises';
import { Cheerio, load } from 'cheerio';
import { minutesToMilliseconds } from 'date-fns';
import fetch from 'node-fetch';
import { sendDiscordMessage } from './notify.js';

const REFRESH_INTERVAL_MS = minutesToMilliseconds(15),
	SAVE_PATH = "./data/schedule.json",
	NEW_RUN_TIME_FORMAT = new Intl.DateTimeFormat('en', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}),
	WEEKDAY_FORMAT = new Intl.DateTimeFormat('en', {
		weekday: 'short',
	});

await fs.mkdir(path.dirname(SAVE_PATH), { recursive: true })

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
			this.schedule = schedule;
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
			this.schedule.push(this.parseRun($run));
		}
		this.save();

		if (oldSchedule) {
			const newRuns = this.schedule.filter(run => {
				return !oldSchedule.some(oldRun => oldRun.id === run.id);
			});

			if (newRuns.length) {
				const games = newRuns.map(run => {
					return `**${run.gameName} - ${run.details}** at ${WEEKDAY_FORMAT.format(run.startTime)}, ${NEW_RUN_TIME_FORMAT.format(run.startTime)}`
				}).join('\n')

				sendDiscordMessage(`New run${newRuns.length === 1 ? '' : 's'} added to the schedule!\n${games}`)
			}
		}
	}

	getSchedule() {
		return this.schedule.map(run => ({ ...run }));
	}

	parseRun($run: Cheerio<any>): Speedrun {
		const $secondLine = $run.next('tr.second-row'),
			$runCells = $run.find('td'),
			$secondRowCells = $secondLine.find('td'),
			startTime = new Date($runCells.eq(0).text()),
			gameName = $runCells.eq(1).text(),
			runner = $runCells.eq(2).text(),
			fullDetails = $secondRowCells.eq(1).text(),
			[details, platform] = fullDetails.split('—').map(str => str.trim());

		return {
			id: `${gameName}|${fullDetails}`,
			startTime,
			gameName,
			platform,
			details,
			runner,
			estimate: $secondRowCells.eq(0).text().trim(),
			host: $secondRowCells.eq(2).text().trim(),
		}
	}
}

export const schedule = new Schedule();
