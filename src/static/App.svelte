<style>
	main {
		width: 90rem;
		max-width: 90%;
		margin: 0 auto;
	}
	:global(:root) {
		--sx-hue-gray: 180;
	}
	:global(header h1) {
		font-size: var(--sx-font-size-6);
		font-family: "Press Start 2P", sans-serif;
	}
</style>

<Header appName="GDQ Speedrun Reminder Bot">
	<span class="sx-font-size-9" slot="logo">
		<Icon icon="gamepad" />
	</span>
</Header>
<main>
	<Schedule />
</main>

<Toasts />

<script lang="ts">
	import { Header, Toasts, Icon } from "sheodox-ui";
	import Schedule from "./Schedule.svelte";
</script>
