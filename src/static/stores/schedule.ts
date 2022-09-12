import {
	differenceInDays,
	endOfDay,
	intervalToDuration,
	isAfter,
	isBefore,
	isWithinInterval,
	minutesToMilliseconds,
} from 'date-fns';
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

export interface EventStatus {
	isBefore: boolean;
	isAfter: boolean;
	countdown: string;
}

const NOW_UPDATE_MS = 1000,
	SCHEDULE_POLL_MS = minutesToMilliseconds(15);

export const now = writable<Date>(new Date());
export const schedule = writable<Speedrun[]>([]);
export const isEventScheduled = writable<boolean>(false);
export const interests = writable<string[]>([]);
export const scheduleInitialized = writable(false);
const padTwo = (num: number) => ('' + num).padStart(2, '0');
export const eventStatus = derived([now, schedule], ([now, schedule]): EventStatus => {
	if (!schedule.length) {
		return {
			isBefore: false,
			isAfter: false,
			countdown: '',
		};
	}
	const firstRun = schedule[0],
		lastRun = schedule.at(-1),
		before = isBefore(now, firstRun.startTime),
		interval = {
			start: firstRun.startTime,
			end: now,
		},
		duration = intervalToDuration(interval),
		days = differenceInDays(interval.start, interval.end);

	return {
		isBefore: before,
		isAfter: isAfter(now, endOfDay(lastRun.startTime)),
		countdown: `${days > 0 ? days + ':' : ''}${padTwo(duration.hours)}:${padTwo(duration.minutes)}:${padTwo(
			duration.seconds
		)}`,
	};
});

//test on fast forward!
//let num = 0;
//setInterval(() => {
//now.set(addMinutes(new Date(2022, 5, 26), num++));
//}, 10)

setInterval(() => {
	now.set(new Date());
}, NOW_UPDATE_MS);

const startTimeFormat = new Intl.DateTimeFormat('en', {
	timeStyle: 'short',
});
export const formatRunStartTime = (run: Speedrun) => {
	return startTimeFormat.format(run.startTime);
};

export const ongoingRunIndex = derived([schedule, now, eventStatus], ([schedule, now, eventStatus]) => {
	if (eventStatus.isBefore) {
		return -1;
	}

	return schedule.findIndex((run, index) => {
		const nextRun = schedule[index + 1];

		if (!nextRun) {
			return isBefore(now, endOfDay(run.startTime));
		}

		return isWithinInterval(now, {
			start: run.startTime,
			end: nextRun.startTime,
		});
	});
});

export const ongoingRun = derived(
	[schedule, ongoingRunIndex, eventStatus],
	([schedule, ongoingRunIndex, eventStatus]) => {
		if (eventStatus.isAfter) {
			return;
		}
		return schedule[ongoingRunIndex];
	}
);
export const nextRun = derived([schedule, ongoingRunIndex, eventStatus], ([schedule, ongoingRunIndex, eventStatus]) => {
	if (eventStatus.isAfter) {
		return;
	}
	return schedule[ongoingRunIndex + 1];
});
export const nextInterestedRun = derived(
	[schedule, ongoingRunIndex, interests, eventStatus],
	([schedule, ongoingRunIndex, interests, eventStatus]) => {
		if (eventStatus.isAfter) {
			return;
		}
		for (let i = ongoingRunIndex + 1; i < schedule.length; i++) {
			if (interests.includes(schedule[i].id)) {
				return schedule[i];
			}
		}
	}
);

export const setInterest = async (id: string, interested: boolean) => {
	const res = await fetch(apiPath('interest/' + encodeURIComponent(id)), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			interested,
		}),
	});

	if (res.ok) {
		interests.update((int) => {
			if (interested) {
				return [...int, id];
			}
			return int.filter((i) => i !== id);
		});
	} else {
		createAutoExpireToast({
			variant: 'error',
			message: 'Error',
			title: 'Error',
			technicalDetails: `${res.status} - ${res.text()}`,
		});
	}
};

async function init() {
	const {
		speedruns: runs,
		interests: intrsts,
		isScheduled: scheduled,
	} = (await fetch(apiPath('data')).then((res) => res.json())) as {
		speedruns: Speedrun[];
		interests: string[];
		isScheduled: boolean;
	};

	schedule.set(
		runs.map((run) => {
			return {
				...run,
				startTime: new Date(run.startTime),
			};
		})
	);

	interests.set(intrsts);
	isEventScheduled.set(scheduled);
	scheduleInitialized.set(true);
}
init();

setInterval(init, SCHEDULE_POLL_MS);
