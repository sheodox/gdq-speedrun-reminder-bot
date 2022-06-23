<style lang="scss">
	.upcoming {
		background: var(--sx-gray-transparent);
		padding: var(--sx-spacing-3);
		border-radius: 5px;
		line-height: 1.4;

		.title {
			text-transform: uppercase;
			color: var(--sx-gray-100);
		}
		.time {
			color: var(--sx-gray-100);
			text-align: right;
		}
	}
</style>

<div class="f-row f-wrap gap-3 my-3">
	{#each upcoming as { title, run, showCountdown }}
		<button class="upcoming fw-normal text-align-left" on:click={() => scrollToRun(run)}>
			<div class="f-row gap-3 justify-content-between">
				<div class="title">{title}</div>
				{#if showCountdown}
					<div class="time">in {formatDistanceToNow(run.startTime)}</div>
				{/if}
			</div>
			<div class="run">
				<div class="game-name fw-bold sx-font-size-5">{run.gameName}</div>
				<div>{run.estimate} - <Platform platform={run.platform} /></div>
			</div>
		</button>
	{/each}
</div>

<script lang="ts">
	import { interests, isOngoing, schedule, Speedrun } from "./stores/schedule";
	import Platform from "./Platform.svelte";
	import { formatDistanceToNow } from "date-fns";

	type Upcoming = {
		run: Speedrun;
		title: string;
		showCountdown: boolean;
	};

	let upcoming: Upcoming[] = [];
	$: upcoming = [getOngoing($schedule), getUpcoming($schedule), getUpcomingInterested($schedule, $interests)].filter(
		(run) => !!run
	) as Upcoming[];

	function findOngoingIndex(runs: Speedrun[]) {
		return runs.findIndex((_, index) => {
			return isOngoing(runs, index);
		});
	}

	function getOngoing(runs: Speedrun[]) {
		const ongoingIndex = findOngoingIndex(runs);

		if (ongoingIndex === -1) {
			return;
		}

		return {
			run: runs[ongoingIndex],
			title: "Ongoing",
			showCountdown: false,
		};
	}

	async function scrollToRun(run: Speedrun) {
		const index = $schedule.indexOf(run);

		const runRow = document.getElementById("run-" + index);

		if (runRow) {
			runRow.scrollIntoView({
				block: "center",
				behavior: "smooth",
				inline: "start",
			});

			runRow.classList.add('highlight');
			await new Promise(resolve => setTimeout(resolve, 1500))
			runRow.classList.remove('highlight');
		}
	}

	function getNextRunSatisfyingCondition(runs: Speedrun[], conditionFn: (run: Speedrun) => boolean) {
		const nextUpIndex = findOngoingIndex(runs) + 1;
		for (let i = nextUpIndex; i < runs.length; i++) {
			if (conditionFn(runs[i])) {
				return runs[i];
			}
		}
	}

	function getUpcoming(runs: Speedrun[]) {
		const run = getNextRunSatisfyingCondition(runs, (run) => {
			return true;
		});

		if (run) {
			return {
				title: "Up Next",
				run,
				showCountdown: true,
			};
		}
	}

	function getUpcomingInterested(runs: Speedrun[], interests) {
		const run = getNextRunSatisfyingCondition(runs, (run) => {
			return interests.includes(run.id);
		});

		if (run) {
			return {
				title: "Next Interested Run",
				run,
				showCountdown: true,
			};
		}
	}
</script>
