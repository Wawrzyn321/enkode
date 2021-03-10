<script lang="ts">
	import { createEventDispatcher } from 'svelte';

    export let data: object;

	const dispatch = createEventDispatcher();

    function onChange(e) {
        try {
            const json = JSON.parse(e.target.value);
            dispatch('change', json);
        } catch(_) {}
    }
    </script>
    
<section id="json">
    <textarea value={JSON.stringify(data, null, 2)} on:input={onChange}/>
</section>
    
<style>
    #json {
        grid-area: json;
        width: 65vw;
    }
    textarea {
        width: 100%;
        height: 100%;
    }
</style>