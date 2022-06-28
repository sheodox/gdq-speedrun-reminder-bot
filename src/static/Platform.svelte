{#if platform}
	<span class="m-0 fw-bold sx-badge-{platformColor(platform)}">{platform}</span>
{/if}

<script lang="ts">
	export let platform: string;

	const platformColors = new Map([
		["pc", "mint"],
		["pc - vr", "mint"],
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

</script>
