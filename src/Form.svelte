<script lang="ts">
	import { createEventDispatcher } from 'svelte';
    import { encodings } from './encodings';

    export let data: object;
    export let encoding: string;

	const dispatch = createEventDispatcher();

    function updateEncoding(e) {
        dispatch('encodingChange', e.target.value);
    }

    function updateUsePKCE(e) {
        dispatch('change', {...data, usePKCE: e.target.checked});
    }

    function updateBebEnabled(e) {
        dispatch('change', {...data, bebEnabled: e.target.checked});
    }

    function updateOidcConfig(e) {
        switch(e.target.value) {
            case 'auth0':
                dispatch('change', {
                    ...data,
                    issuerUrl: 'https://kyma.eu.auth0.com/',
                    clientId: '5W89vBHwn2mu7nT0uzvoN4xCof0h4jtN',
                    scope: "audience:server:client_id:kyma-client audience:server:client_id:console openid email profile groups",
                    usePKCE: true,
                });
            break;
            case 'ias':
                dispatch('change', {
                    ...data,
                    issuerUrl: 'https://apskyxzcl.accounts400.ondemand.com/',
                    clientId: 'd0316c58-b0fe-45cd-9960-0fea0708355a',
                    scope: "openid",
                    usePKCE: false,
                });
            break;
            default:
                break;
        }
    }
</script>
    
<section id="form">
    <div>
        <label for="encoding">Encoding</label>
        <!-- svelte-ignore a11y-no-onchange -->
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
    <div>
        <label for="usePKCE" style="display: inline-block">BEB enabled</label>
        <input type="checkbox" checked={data.bebEnabled} on:change={updateBebEnabled}>
    </div>

    <div>
        <label for="oidc">OIDC config</label>
        <!-- svelte-ignore a11y-no-onchange -->
        <select name="oidc" on:change={updateOidcConfig}>
        <option value="auth0">Auth0</option>
        <option value="ias">IAS</option>
        </select>
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