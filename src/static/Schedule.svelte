<style lang="scss">
	.hide {
		display: none;
	}
	td {
		padding: var(--sx-spacing-2);
	}
	td {
		border-bottom: 1px solid var(--sx-gray-300);
	}
	.day-split {
		background: var(--sx-gray-500);
		position: sticky;
		top: 0;
		z-index: 1;
	}
	table {
		width: 100%;
	}
	table input {
		width: 1.25rem;
		height: 1.25rem;
		&:not(:checked) {
			opacity: 0.3;
		}
	}
	.ongoing td {
		border-top: 2px solid var(--sx-blue-500);
		border-bottom: 2px solid var(--sx-blue-500);
		background: var(--sx-blue-transparent);

		&:first-child {
			border-left: 2px solid var(--sx-blue-500);
		}
		&:last-child {
			border-right: 2px solid var(--sx-blue-500);
		}
	}
	.start-time {
		white-space: nowrap;
	}
</style>

<div class="p-3 f-row gap-3">
	<label>
		<input bind:checked={showPast} type="checkbox" />
		Show Past Runs
	</label>
	<label>
		<input bind:checked={showOnlyInterested} type="checkbox" />
		Show Only Interested
	</label>
</div>

<table class:show-past={showPast} class="mb-3">
	<thead>
		<tr>
			<th>Interested</th>
			<th>Run</th>
			<th>Estimate</th>
			<th>Runner</th>
			<th>Time</th>
		</tr>
	</thead>
	<tbody>
		{#each $schedule as run, index}
			{#if showDaySplit(index)}
				<tr class="day-split sx-font-size-5 fw-bold text-align-center">
					<td colspan="10" class="py-4">{daySplitFormat.format(run.startTime)}</td>
				</tr>
			{/if}
			<tr
				class:hide={(isInPast(index) && !showPast) || (!$interests.includes(run.id) && showOnlyInterested)}
				class:ongoing={isOngoing(index)}
			>
				<td>
					<input
						aria-label="interested"
						checked={$interests.includes(run.id)}
						type="checkbox"
						on:change={(e) => toggleInterest(e, run)}
					/>
				</td>
				<td>
					<span class="fw-bold sx-font-size-4">{run.gameName}</span>
					{#if run.platform}
						<span class="fw-bold sx-badge-{platformColor(run.platform)}">{run.platform}</span>
					{/if}
					<br />
					{run.details}
				</td>
				<td>
					{run.estimate}
				</td>
				<td>
					{run.runner}
				</td>
				<td class="start-time">
					{formatRunStartTime(run)}
				</td>
			</tr>
		{/each}
	</tbody>
</table>
<span>
	Interested in {interestedCount} runs.
</span>

<script lang="ts">
	import { isAfter, isPast, isSameDay, isWithinInterval } from "date-fns";
	import { schedule, interests, setInterest, Speedrun, formatRunStartTime } from "./stores/schedule";

	const daySplitFormat = new Intl.DateTimeFormat("en", {
		dateStyle: "full",
	});

	let showPast = false,
		showOnlyInterested = false;

	$: interestedCount = $interests.length;

	const platformColors = new Map([
		["pc", "orange"],
		["pc - vr", "orange"],
		["dos", "orange"],
		["gcn", "purple"],
		["gba", "yellow"],
		["gbc", "yellow"],
		["3ds", "yellow"],
		["snes", "purple"],
		["n64", "purple"],
		["nes", "purple"],
		["switch", "red"],
		["saturn", "purple"],
		["genesis", "purple"],
	]);

	function platformColor(platform: string) {
		platform = platform.toLowerCase();
		if (/^ps\d?$/.test(platform)) {
			return "blue";
		} else if (/xbox/.test(platform)) {
			return "green";
		} else if (/wii/.test(platform)) {
			return "purple";
		}
		return platformColors.has(platform) ? platformColors.get(platform) : "red";
	}

	function toggleInterest(e: Event, run: Speedrun) {
		setInterest(run.id, (e.target as HTMLInputElement).checked);
	}

	function showDaySplit(index: number) {
		const run = $schedule[index],
			prevRun = $schedule[index - 1];

		return !prevRun || !isSameDay(run.startTime, prevRun.startTime);
	}

	function isOngoing(index: number) {
		const run = $schedule[index],
			nextRun = $schedule[index + 1];

		if (!nextRun) {
			return isAfter(new Date(), run.startTime);
		}

		return isWithinInterval(new Date(), {
			start: run.startTime,
			end: nextRun.startTime,
		});
	}

	function isInPast(index: number) {
		if (index + 1 < $schedule.length) {
			// check if the next run has started
			return isPast($schedule[index + 1].startTime);
		}
		return false;
	}
</script>
