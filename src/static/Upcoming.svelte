<style lang="scss">
	.upcoming {
		background: var(--sx-gray-transparent);
		padding: var(--sx-spacing-3);
		border-radius: 5px;
		line-height: 1.4;
		margin: 0;

		.time {
			color: var(--sx-gray-100);
			text-align: right;
		}
	}
	.title {
		text-transform: uppercase;
		color: var(--sx-gray-100);
	}
	.upcoming-container {
		display: grid;
		grid-template-columns: repeat(1, 1fr);
	}
	.countdown p {
		font-family: monospace;
	}
	@media (min-width: 800px) {
		.upcoming-container {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>

<div class="upcoming-container gap-3 my-3">
	{#if $eventStatus.isBefore}
		<div class="upcoming countdown f-column justify-content-between">
			<div class="title">Event starts in</div>
			<p class="m-0 sx-font-size-8">
				{$eventStatus.countdown}
			</p>
			<div />
		</div>
	{/if}
	{#each upcoming as { title, run, showCountdown }}
		{#if run}
			<button class="upcoming fw-normal text-align-left" on:click={() => scrollToRun(run)}>
				<div class="f-row gap-3 justify-content-between">
					<div class="title">{title}</div>
					{#if showCountdown}
						<div class="time">in {formatDistance(run.startTime, $now)}</div>
					{/if}
				</div>
				<div class="run">
					<div class="game-name fw-bold sx-font-size-5">{run.gameName}</div>
					<div class="f-row gap-1">
						<Platform platform={run.platform} />
						<Estimate estimate={run.estimate} />
					</div>
				</div>
			</button>
		{/if}
	{/each}
</div>

<script lang="ts">
	import { eventStatus, now, ongoingRun, nextRun, nextInterestedRun, schedule, Speedrun } from "./stores/schedule";
	import Platform from "./Platform.svelte";
	import { formatDistance } from "date-fns";
	import Estimate from "./Estimate.svelte";

	type Upcoming = {
		run: Speedrun;
		title: string;
		showCountdown: boolean;
	};

	let upcoming: Upcoming[];
	$: upcoming = [
		{
			title: "Ongoing",
			run: $ongoingRun,
			showCountdown: false,
		},
		{
			title: "Up Next",
			run: $nextRun,
			showCountdown: true,
		},
		{
			title: "Next Interested Run",
			run: $nextInterestedRun,
			showCountdown: true,
		},
	];

	async function scrollToRun(run: Speedrun) {
		const index = $schedule.indexOf(run);

		const runRow = document.getElementById("run-" + index);

		if (runRow) {
			runRow.scrollIntoView({
				block: "center",
				behavior: "smooth",
				inline: "start",
			});

			runRow.classList.add("highlight");
			await new Promise((resolve) => setTimeout(resolve, 1500));
			runRow.classList.remove("highlight");
		}
	}
</script>
