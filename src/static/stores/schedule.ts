import { formatRelative, addDays, isBefore } from 'date-fns';
import { createAutoExpireToast } from 'sheodox-ui';
import { writable, get } from 'svelte/store';
import { apiPath } from './common';

export interface Speedrun {
	id: string;
	startTime: Date;
	gameName: string;
	details: string;
	platform: string;
	runner: string;
	estimate: string;
}

export const schedule = writable<Speedrun[]>([]);
export const interests = writable<string[]>([]);

const startTimeFormat = new Intl.DateTimeFormat('en', {
	timeStyle: "short"
})
export const formatRunStartTime = (run: Speedrun) => {
	return startTimeFormat.format(run.startTime);
	if (isBefore(run.startTime, addDays(new Date, 6))) {
		return formatRelative(run.startTime, new Date())
	}
	return run.startTime.toLocaleString();
}

export const setInterest = async (id: string, interested: boolean) => {
	const res = await fetch(apiPath('interest/' + encodeURIComponent(id)), {
		method: "POST",
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			interested
		})
	});

	if (res.ok) {
		interests.update(int => {
			if (interested) {
				return [...int, id];
			}
			return int.filter(i => i !== id);
		})
	} else {
		createAutoExpireToast({
			variant: 'error',
			message: 'Error',
			title: 'Error',
			technicalDetails: `${res.status} - ${res.text()}`
		})
	}
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
