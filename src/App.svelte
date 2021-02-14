<script lang="ts">
	import Form from './Form.svelte';
	import JSON from './JSON.svelte';
	import Result from './Result.svelte';

    import { encodings } from './encodings';

	let data = {
		issuerUrl:"https://kyma.eu.auth0.com/",
		clientId:"5W89vBHwn2mu7nT0uzvoN4xCof0h4jtN",
		kubernetesApiUrl: "api.wave.kyma.fun",
		usePKCE: true,
	};

	let encoding = 'lzstring';

	const onChange = e => data = e.detail;
	const onEncodingChange = e => encoding = e.detail;
</script>

<main>
	<Form {data} {encoding} on:change={onChange} on:encodingChange={onEncodingChange}/>
	<JSON {data} on:change={onChange} />
	<Result {data} {encoding} on:change={onChange} on:encodingChange={onEncodingChange} />
</main>

<style>
	main {
		display: grid;
		grid-template-areas: 
            "form json"
            "result result";
		grid-template-rows: 1fr minmax(400px, 20vh);
		grid-template-columns: 1fr;
    	height: 100vh;
	}
</style>