<style lang="scss">
	.hide {
		display: none;
	}
	tr {
		transition: background 0.1s, outline 0.1s;
		border-radius: 3px;
	}
	td,
	th {
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
	.ongoing {
		outline: 2px solid var(--sx-blue-500);
	}
	.start-time {
		white-space: nowrap;
	}
	tr:global(.highlight) {
		background: var(--sx-pink-transparent);
		outline: 2px solid var(--sx-pink-500);
	}
</style>

<Upcoming />

<div class="f-row p-3 justify-content-between">
	<div class="f-row gap-3">
		<label>
			<input bind:checked={showPast} type="checkbox" />
			Show Past Runs
		</label>
		<label>
			<input bind:checked={showOnlyInterested} type="checkbox" />
			Show Only Interested
		</label>
	</div>
	<span>
		Interested in {interestedCount} run{interestedCount === 1 ? "" : "s"}, {remainingRuns} left.
	</span>
</div>

<table class:show-past={showPast} class="mb-3">
	<thead>
		<tr>
			<th>Interested</th>
			<th>Run</th>
			<th>Estimate</th>
			<th>Runners & <Icon icon="microphone" /> Host</th>
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
				id={`run-${index}`}
				class:hide={(isInPast(index) && !showPast) || (!$interests.includes(run.id) && showOnlyInterested)}
				class:ongoing={isOngoing($schedule, index)}
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
					<Platform platform={run.platform} />
					<br />
					{run.details}
				</td>
				<td>
					<Estimate estimate={run.estimate} />
				</td>
				<td>
					{run.runner}
					<br />
					<Icon icon="microphone" />{run.host}
				</td>
				<td class="start-time">
					{formatRunStartTime(run)}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<script lang="ts">
	import { Icon } from "sheodox-ui";
	import { isPast, isSameDay, isFuture } from "date-fns";
	import { isOngoing, schedule, interests, setInterest, Speedrun, formatRunStartTime } from "./stores/schedule";
	import Upcoming from "./Upcoming.svelte";
	import Platform from "./Platform.svelte";
	import Estimate from "./Estimate.svelte";

	const daySplitFormat = new Intl.DateTimeFormat("en", {
		dateStyle: "full",
	});

	let showPast = false,
		showOnlyInterested = false;

	$: interestedCount = $interests.length;
	$: remainingRuns = $schedule.reduce((left, run) => {
		return isFuture(run.startTime) && $interests.includes(run.id) ? left + 1 : left;
	}, 0);

	function toggleInterest(e: Event, run: Speedrun) {
		setInterest(run.id, (e.target as HTMLInputElement).checked);
	}

	function showDaySplit(index: number) {
		const run = $schedule[index],
			prevRun = $schedule[index - 1];

		return !prevRun || !isSameDay(run.startTime, prevRun.startTime);
	}

	function isInPast(index: number) {
		if (index + 1 < $schedule.length) {
			// check if the next run has started
			return isPast($schedule[index + 1].startTime);
		}
		return false;
	}
</script>
