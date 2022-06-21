import { formatRelative, addDays, isBefore } from 'date-fns';
import { writable, get } from 'svelte/store';
import { apiPath } from './common';

export interface Speedrun {
	id: string;
	startTime: Date;
	gameName: string;
	details: string;
	runner: string;
	estimate: string;
}

export const schedule = writable<Speedrun[]>([]);
export const interests = writable<string[]>([]);

export const formatRelativeTime = (run: Speedrun) => {
	if (isBefore(run.startTime, addDays(new Date, 6))) {
		return formatRelative(run.startTime, new Date())
	}
	return run.startTime.toLocaleString();
}

export const setInterest = async (id: string, interested: boolean) => {
	await fetch(apiPath('interest/' + encodeURIComponent(id)), {
		method: "POST",
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			interested
		})
	})
}

async function init() {
	const { speedruns: runs, interests: intrsts } = await fetch(apiPath('data')).then(res => res.json()) as { speedruns: Speedrun[], interests: string[] }

	schedule.set(runs.map(run => {
		return {
			...run,
			startTime: new Date(run.startTime)
		}
	}))

	interests.set(intrsts)
}
init()
