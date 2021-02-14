<script lang="ts">
	import { createEventDispatcher } from 'svelte';
    import { JSONEditor } from 'svelte-jsoneditor'

    export let data: string;

	const dispatch = createEventDispatcher();

    function onChange(content) {
        dispatch('change', content.json);
    }
    </script>
    
<section id="json">
   <JSONEditor json={data} onChange={onChange} mainMenuBar={false}/>
</section>
    
<style>
    #json {
        grid-area: json;
        width: 65vw;
    }
</style>