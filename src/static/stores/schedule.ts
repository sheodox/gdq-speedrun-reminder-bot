import { isAfter, isWithinInterval, minutesToMilliseconds } from 'date-fns';
import { createAutoExpireToast } from 'sheodox-ui';
import { writable, derived } from 'svelte/store';
import { apiPath } from './common';

export interface Speedrun {
	id: string;
	startTime: Date;
	gameName: string;
	details: string;
	platform: string;
	runner: string;
	host: string;
	estimate: string;
}

const NOW_UPDATE_MS = 1000,
	SCHEDULE_POLL_MS = minutesToMilliseconds(15);

export const now = writable<Date>(new Date());
export const schedule = writable<Speedrun[]>([]);
export const interests = writable<string[]>([]);

//test on fast forward!
//let num = 0;
//setInterval(() => {
//now.set(addMinutes(new Date(2022, 5, 26), num++));
//}, 10)

setInterval(() => {
	now.set(new Date());
}, NOW_UPDATE_MS)

const startTimeFormat = new Intl.DateTimeFormat('en', {
	timeStyle: "short"
})
export const formatRunStartTime = (run: Speedrun) => {
	return startTimeFormat.format(run.startTime);
}

export const ongoingRunIndex = derived([schedule, now], ([schedule, now]) => {
	return schedule.findIndex((run, index) => {
		const nextRun = schedule[index + 1];

		if (!nextRun) {
			return isAfter(now, run.startTime);
		}

		return isWithinInterval(now, {
			start: run.startTime,
			end: nextRun.startTime,
		});
	});
})

export const ongoingRun = derived([schedule, ongoingRunIndex], ([schedule, ongoingRunIndex]) => {
	return schedule[ongoingRunIndex];
})
export const nextRun = derived([schedule, ongoingRunIndex], ([schedule, ongoingRunIndex]) => {
	return schedule[ongoingRunIndex + 1]
})
export const nextInterestedRun = derived([schedule, ongoingRunIndex, interests], ([schedule, ongoingRunIndex, interests]) => {
	for (let i = ongoingRunIndex + 1; i < schedule.length; i++) {
		if (interests.includes(schedule[i].id)) {
			return schedule[i]
		}
	}
})

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

setInterval(init, SCHEDULE_POLL_MS);
