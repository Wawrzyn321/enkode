<script lang="ts">
	import { createEventDispatcher } from 'svelte';
    import { encodings } from './encodings';

    export let data: string;
    export let encoding: string;

	const dispatch = createEventDispatcher();

    function updateEncoding(e) {
        dispatch('encodingChange', e.target.value);
    }

    function updateUsePKCE(e) {
        dispatch('change', {...data, usePKCE: e.target.checked});
    }
</script>
    
<section id="form">
    <div>
        <label for="encoding">Encoding</label>
        <select name="encoding" bind:value={encoding} on:change={updateEncoding}>
        { #each encodings as e }
            <option value={e}>
                {e}
            </option>
        { /each }
        </select>
    </div>

    <div>
        <label for="usePKCE" style="display: inline-block">Use PKCE</label>
        <input type="checkbox" checked={data.usePKCE === undefined ? true : data.usePKCE} on:change={updateUsePKCE}>
    </div>
</section>
    
<style type="text/scss">
    #form {
        grid-area: form;
        padding: 32px;

        & > div {
            margin-bottom: 16px;
        }
    }

    label {
        margin-bottom: 8px;
    }
</style>