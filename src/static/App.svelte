<style>
	main {
		width: 90rem;
		max-width: 90%;
		margin: 0 auto;
	}
	:global(:root) {
		--sx-hue-gray: 180;
	}
</style>

<Header appName="GDQ Speedrun Reminder Bot" />
<main>
	<Schedule />
</main>

<Toasts />

<script lang="ts">
	import { Header, Toasts } from "sheodox-ui";
	import Schedule from "./Schedule.svelte";
</script>
