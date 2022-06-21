import { Cheerio, load } from 'cheerio';
import { minutesToMilliseconds } from 'date-fns';
import fetch from 'node-fetch';

const REFRESH_INTERVAL_MS = minutesToMilliseconds(15);

export interface Speedrun {
	id: string;
	startTime: Date;
	gameName: string;
	details: string;
	platform: string;
	runner: string;
	estimate: string;
}

class Schedule {
	private schedule: Speedrun[]
	public ready: Promise<void>

	constructor() {
		this.ready = this.refresh()
		setInterval(() => this.refresh(), REFRESH_INTERVAL_MS)
	}

	async refresh() {
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
			[details, platform] = $secondRowCells.eq(1).text().split('—').map(str => str.trim());

		return {
			id: `${gameName}|${details}`,
			startTime,
			gameName,
			platform,
			details,
			runner,
			estimate: $secondRowCells.eq(0).text().trim()
		}
	}
}

export const schedule = new Schedule();
