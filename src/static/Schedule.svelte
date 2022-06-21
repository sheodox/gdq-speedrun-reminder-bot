<style>
	.past-run {
		display: none;
		opacity: 0.5;
	}
	.show-past .past-run {
		display: table-row;
	}
</style>

<div class="p-3">
	<label>
		<input bind:checked={showPast} type="checkbox" />
		Show Past Runs
	</label>
</div>

<table class:show-past={showPast} class="mb-3">
	<thead>
		<tr>
			<th>Interested</th>
			<th>Run</th>
			<th>Time</th>
		</tr>
	</thead>
	<tbody>
		{#each $schedule as run, index}
			<tr class:past-run={isInPast(index)}>
				<td>
					<input
						aria-label="interested"
						checked={$interests.includes(run.id)}
						type="checkbox"
						on:change={(e) => toggleInterest(e, run)}
					/>
				</td>
				<td>{run.gameName} - {run.details}</td>
				<td>
					{formatRelativeTime(run)}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<script lang="ts">
	import { isPast } from "date-fns";
	import { schedule, interests, setInterest, Speedrun, formatRelativeTime } from "./stores/schedule";

	let showPast = false;

	function toggleInterest(e: Event, run: Speedrun) {
		setInterest(run.id, (e.target as HTMLInputElement).checked);
	}

	function isInPast(index: number) {
		if (index + 1 < $schedule.length) {
			// check if the next run has started
			return isPast($schedule[index + 1].startTime);
		}
		return false;
	}
</script>
