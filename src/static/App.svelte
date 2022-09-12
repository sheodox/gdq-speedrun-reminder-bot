<style>
	main {
		width: 90rem;
		max-width: 90%;
		margin: 0 auto;
	}
	:global(:root) {
		--sx-hue-gray: 255;
	}
	:global(header h1) {
		font-size: var(--sx-font-size-5);
		font-family: 'Press Start 2P', sans-serif;
	}
</style>

<Header appName="GDQ Speedrun Reminder Bot">
	<span class="sx-font-size-8" slot="logo">
		<Icon icon="gamepad" />
	</span>
	<nav slot="headerEnd">
		<ul>
			{#each links as link}
				<li>
					<a href={link.href} target="_blank" rel={linkRel}>
						<Icon icon={link.icon} iconVariant={link.iconVariant} />
						{link.text}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</Header>
<main class="f-column f-1">
	{#if !$scheduleInitialized}
		<div class="f-column justify-content-center align-items-center f-1">
			<Loading />
		</div>
	{:else if !$isEventScheduled}
		<div class="f-column justify-content-center align-items-center f-1">
			<p class="sx-font-size-12 m-0 p-2">
				<Icon icon="calendar-times" variant="icon-only" />
			</p>
			<p class="sx-font-size-6 m-0">No event is currently scheduled. Check back later!</p>
			<p class="sx-font-size-6">
				Check <a class="inline-link" href="https://gamesdonequick.com/" rel={linkRel}>Games Done Quick</a> for event news.
			</p>
		</div>
	{:else}
		<Schedule />
	{/if}
</main>

<Toasts />

<script lang="ts">
	import { Header, Toasts, Icon, Loading } from 'sheodox-ui';
	import { eventStatus, isEventScheduled, scheduleInitialized } from './stores/schedule';
	import Schedule from './Schedule.svelte';

	const linkRel = 'noreferrer noopener';

	const links = [
		{
			text: 'Twitch',
			icon: 'twitch',
			iconVariant: 'brand',
			href: 'https://www.twitch.tv/gamesdonequick',
		},
		{
			text: 'GDQ',
			icon: 'arrow-up-right-from-square',
			iconVariant: 'solid',
			href: 'https://gamesdonequick.com/',
		},
	] as const;
</script>
