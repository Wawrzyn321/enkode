<script lang="ts">
	import { createEventDispatcher } from 'svelte';
    import createEncoder from 'json-url';
    import copyToClipboard from 'copy-to-clipboard';

    import { encodings } from './encodings';
 
    export let data: string;
    export let encoding: string;

    let customEncoded = null;

	const dispatch = createEventDispatcher();

    const encoders = Object.fromEntries(encodings
        .map(encoding => [encoding, createEncoder(encoding)]));

    function copy() {
        encoders['lzw'].compress(data).then(compressed => {
            copyToClipboard(compressed);
            copyText = "Copied!";
        });
    }

    function onEncodedChange(e) {
        customEncoded = e.target.value;
    }

    async function tryDecode() {
        try {
            const promises = Object.entries(encoders)
                .map(([name, encoder]) => encoder.decompress(customEncoded)
                .then(v => {
                    if (typeof v !== "object" || !v) throw Error("");
                    return [v, name];
                }));
            const a = await Promise.any(promises);
            console.log(a);
            const [decoded, encodingName] = a;
            console.log(decoded, encodingName)
            dispatch('change', decoded);    
            if (encodingName !== encoding) {
                dispatch('encodingChange', encodingName);
            }
        } catch (e) {
            console.warn(e);
            alert('Decoding failed!');
        }
    }

    let awaitingEncoding: Promise<string>;
    let copyText: string = "Copy";

    $: (awaitingEncoding = encoders[encoding].compress(data), customEncoded = null);

</script>
    
<section id="result">
   {#await awaitingEncoding}
	<p>...waiting</p>
    {:then encodingResult}
        <div>
            <span>Encoded:</span>
            <button on:click={tryDecode} disabled={customEncoded === null}>Decode</button>
        </div>
        <textarea on:input={onEncodedChange}>{encodingResult}</textarea>
        <div>
            <span>Params:</span>
            <button on:click={copy} on:mouseleave={() => copyText="Copy"}>{copyText}</button>
        </div>
        <pre>&auth={encodingResult}</pre>
        <!-- <p>Length: {encodingResult.length}</p>
        <p>Original length: {encodeURIComponent(JSON.stringify(data)).length}</p> -->
    {:catch error}
        <p style="color: red">{error.message}</p>
    {/await}
</section>
    
<style type="text/scss">
    #result {
        grid-area: result;
        padding: 32px;
        border-top: 1px solid black;

        & > * {
            width: 80vw;
        }
    }

    textarea {
        min-height: 60px;
    }

    pre {
        white-space: pre-wrap;
        word-break: break-all;
    }

</style>