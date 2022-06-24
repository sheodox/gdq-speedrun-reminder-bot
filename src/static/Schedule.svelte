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
		font-family: "Press Start 2P", sans-serif;
	}
	table {
		width: 100%;
	}
	table :global(:is(input, .checkbox-icon)) {
		width: 1.25rem;
		height: 1.25rem;
		font-size: 1.25rem;
		line-height: 1;
		padding: 0;
	}
	.is-past {
		opacity: 0.6;
	}
	.ongoing {
		outline: 2px solid var(--sx-blue-500);
		background: var(--sx-blue-transparent);
	}
	.start-time {
		white-space: nowrap;
	}
	tr:global(.highlight) {
		background: var(--sx-pink-transparent);
		outline: 2px solid var(--sx-pink-500);
	}
	.interested-column {
		width: 45px;
		text-align: center;
	}

	@media (max-width: 600px) {
		:is(td, th).desktop {
			display: none;
		}
	}
	@media (min-width: 601px) {
		:is(td, th).mobile {
			display: none;
		}
	}
</style>

<Upcoming />

<div class="f-row p-3 justify-content-between">
	<div class="f-row gap-3">
		<Checkbox id="show-past" bind:checked={showPast}>Show Past Runs</Checkbox>
		<Checkbox id="show-only-interested" bind:checked={showOnlyInterested}>Show Only Interested</Checkbox>
	</div>
	<span>
		Interested in {interestedCount} run{interestedCount === 1 ? "" : "s"}, {remainingRuns} left.
	</span>
</div>

<table class:show-past={showPast} class="mb-3">
	<thead>
		<tr>
			<th class="interested-column"
				><Icon icon="heart" variant="icon-only" /><span class="sr-only">Interested</span></th
			>
			<th class="desktop">Run</th>
			<th class="desktop">Estimate</th>
			<th class="desktop">Runners & <Icon icon="microphone" /> Host</th>
			<th class="mobile">Run</th>
			<th>Time</th>
		</tr>
	</thead>
	<tbody>
		{#each $schedule as run, index}
			{#if showDaySplit($schedule, index, $now, showPast)}
				<tr class="day-split sx-font-size-4 fw-bold text-align-center">
					<td colspan="10" class="py-4">{daySplitFormat.format(run.startTime)}</td>
				</tr>
			{/if}
			<tr
				id={`run-${index}`}
				class:hide={(isInPast(index, $now) && !showPast) ||
					(!$interests.includes(run.id) && showOnlyInterested)}
				class:is-past={isInPast(index, $now)}
				class:ongoing={$ongoingRun?.id === run.id}
			>
				<td>
					<Checkbox
						id="interested-run-{index}"
						checked={$interests.includes(run.id)}
						on:change={(e) => toggleInterest(e, run)}
					>
						<span class="sr-only">interested</span>
					</Checkbox>
				</td>
				<td class="desktop">
					<span class="fw-bold sx-font-size-4">{run.gameName}</span>
					<Platform platform={run.platform} />
					<br />
					{run.details}
				</td>
				<td class="desktop">
					<Estimate estimate={run.estimate} />
				</td>
				<td class="desktop">
					{run.runner}
					<br />
					<Icon icon="microphone" />{run.host}
				</td>
				<td class="mobile f-column gap-2">
					<div>
						<div class="mb-2">
							<span class="fw-bold sx-font-size-4">{run.gameName}</span>
							<br />
							{run.details}
						</div>
						<div class="f-row gap-2">
							<Platform platform={run.platform} />
							<Estimate estimate={run.estimate} />
						</div>
					</div>
					<div>
						{run.runner}
						<br />
						<Icon icon="microphone" />{run.host}
					</div>
				</td>
				<td class="start-time">
					{formatRunStartTime(run)}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<script lang="ts">
	import { Checkbox, Icon } from "sheodox-ui";
	import { isSameDay, isBefore, endOfDay, isAfter } from "date-fns";
	import { now, ongoingRun, schedule, interests, setInterest, Speedrun, formatRunStartTime } from "./stores/schedule";
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
		return isAfter(run.startTime, $now) && $interests.includes(run.id) ? left + 1 : left;
	}, 0);

	function toggleInterest(e: Event, run: Speedrun) {
		setInterest(run.id, (e.target as HTMLInputElement).checked);
	}

	function showDaySplit(schedule: Speedrun[], index: number, now: Date, showPast: boolean) {
		const run = schedule[index],
			prevRun = schedule[index - 1];

		// don't show splits for days which we're not going to show any runs for,
		// i.e. those for past days the past when hiding past runs
		if (!showPast && isBefore(endOfDay(run.startTime), now)) {
			return false;
		}

		return (
			!prevRun || // show the banner for the first day
			!isSameDay(run.startTime, prevRun.startTime) // show the banner before runs that are the first run on a day
		);
	}

	function isInPast(index: number, now: Date) {
		if (index + 1 < $schedule.length) {
			// check if the next run has started
			return isBefore($schedule[index + 1].startTime, now);
		}
		return false;
	}
</script>
