
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const encodings = ['lzw', 'lzma', 'lzstring'];

    /* src/Form.svelte generated by Svelte v3.32.3 */

    const { Object: Object_1 } = globals;
    const file = "src/Form.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (34:8) { #each encodings as e }
    function create_each_block(ctx) {
    	let option;
    	let t0_value = /*e*/ ctx[8] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = /*e*/ ctx[8];
    			option.value = option.__value;
    			add_location(option, file, 34, 12, 1479);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(34:8) { #each encodings as e }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let section;
    	let div0;
    	let label0;
    	let t1;
    	let select0;
    	let t2;
    	let div1;
    	let label1;
    	let t4;
    	let input0;
    	let input0_checked_value;
    	let t5;
    	let div2;
    	let label2;
    	let t7;
    	let input1;
    	let input1_checked_value;
    	let t8;
    	let div3;
    	let label3;
    	let t10;
    	let select1;
    	let option0;
    	let option1;
    	let mounted;
    	let dispose;
    	let each_value = encodings;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Encoding";
    			t1 = space();
    			select0 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Use PKCE";
    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "BEB enabled";
    			t7 = space();
    			input1 = element("input");
    			t8 = space();
    			div3 = element("div");
    			label3 = element("label");
    			label3.textContent = "OIDC config";
    			t10 = space();
    			select1 = element("select");
    			option0 = element("option");
    			option0.textContent = "Auth0";
    			option1 = element("option");
    			option1.textContent = "IAS";
    			attr_dev(label0, "for", "encoding");
    			attr_dev(label0, "class", "svelte-h5civ3");
    			add_location(label0, file, 30, 8, 1265);
    			attr_dev(select0, "name", "encoding");
    			if (/*encoding*/ ctx[0] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[6].call(select0));
    			add_location(select0, file, 32, 8, 1360);
    			attr_dev(div0, "class", "svelte-h5civ3");
    			add_location(div0, file, 29, 4, 1251);
    			attr_dev(label1, "for", "usePKCE");
    			set_style(label1, "display", "inline-block");
    			attr_dev(label1, "class", "svelte-h5civ3");
    			add_location(label1, file, 42, 8, 1606);
    			attr_dev(input0, "type", "checkbox");

    			input0.checked = input0_checked_value = /*data*/ ctx[1].usePKCE === undefined
    			? true
    			: /*data*/ ctx[1].usePKCE;

    			add_location(input0, file, 43, 8, 1682);
    			attr_dev(div1, "class", "svelte-h5civ3");
    			add_location(div1, file, 41, 4, 1592);
    			attr_dev(label2, "for", "usePKCE");
    			set_style(label2, "display", "inline-block");
    			attr_dev(label2, "class", "svelte-h5civ3");
    			add_location(label2, file, 46, 8, 1820);
    			attr_dev(input1, "type", "checkbox");
    			input1.checked = input1_checked_value = /*data*/ ctx[1].bebEnabled;
    			add_location(input1, file, 47, 8, 1899);
    			attr_dev(div2, "class", "svelte-h5civ3");
    			add_location(div2, file, 45, 4, 1806);
    			attr_dev(label3, "for", "oidc");
    			attr_dev(label3, "class", "svelte-h5civ3");
    			add_location(label3, file, 51, 8, 2008);
    			option0.__value = "auth0";
    			option0.value = option0.__value;
    			add_location(option0, file, 54, 8, 2160);
    			option1.__value = "ias";
    			option1.value = option1.__value;
    			add_location(option1, file, 55, 8, 2205);
    			attr_dev(select1, "name", "oidc");
    			add_location(select1, file, 53, 8, 2102);
    			attr_dev(div3, "class", "svelte-h5civ3");
    			add_location(div3, file, 50, 4, 1994);
    			attr_dev(section, "id", "form");
    			attr_dev(section, "class", "svelte-h5civ3");
    			add_location(section, file, 28, 0, 1227);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t1);
    			append_dev(div0, select0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select0, null);
    			}

    			select_option(select0, /*encoding*/ ctx[0]);
    			append_dev(section, t2);
    			append_dev(section, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t4);
    			append_dev(div1, input0);
    			append_dev(section, t5);
    			append_dev(section, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t7);
    			append_dev(div2, input1);
    			append_dev(section, t8);
    			append_dev(section, div3);
    			append_dev(div3, label3);
    			append_dev(div3, t10);
    			append_dev(div3, select1);
    			append_dev(select1, option0);
    			append_dev(select1, option1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[6]),
    					listen_dev(select0, "change", /*updateEncoding*/ ctx[2], false, false, false),
    					listen_dev(input0, "change", /*updateUsePKCE*/ ctx[3], false, false, false),
    					listen_dev(input1, "change", /*updateBebEnabled*/ ctx[4], false, false, false),
    					listen_dev(select1, "change", /*updateOidcConfig*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*encodings*/ 0) {
    				each_value = encodings;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*encoding, encodings*/ 1) {
    				select_option(select0, /*encoding*/ ctx[0]);
    			}

    			if (dirty & /*data*/ 2 && input0_checked_value !== (input0_checked_value = /*data*/ ctx[1].usePKCE === undefined
    			? true
    			: /*data*/ ctx[1].usePKCE)) {
    				prop_dev(input0, "checked", input0_checked_value);
    			}

    			if (dirty & /*data*/ 2 && input1_checked_value !== (input1_checked_value = /*data*/ ctx[1].bebEnabled)) {
    				prop_dev(input1, "checked", input1_checked_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Form", slots, []);
    	let { data } = $$props;
    	let { encoding } = $$props;
    	const dispatch = createEventDispatcher();

    	function updateEncoding(e) {
    		dispatch("encodingChange", e.target.value);
    	}

    	function updateUsePKCE(e) {
    		dispatch("change", Object.assign(Object.assign({}, data), { usePKCE: e.target.checked }));
    	}

    	function updateBebEnabled(e) {
    		dispatch("change", Object.assign(Object.assign({}, data), { bebEnabled: e.target.checked }));
    	}

    	function updateOidcConfig(e) {
    		switch (e.target.value) {
    			case "auth0":
    				dispatch("change", Object.assign(Object.assign({}, data), {
    					issuerUrl: "https://kyma.eu.auth0.com/",
    					clientId: "5W89vBHwn2mu7nT0uzvoN4xCof0h4jtN",
    					scope: "audience:server:client_id:kyma-client audience:server:client_id:console openid email profile groups",
    					usePKCE: true
    				}));
    				break;
    			case "ias":
    				dispatch("change", Object.assign(Object.assign({}, data), {
    					issuerUrl: "https://apskyxzcl.accounts400.ondemand.com/",
    					clientId: "d0316c58-b0fe-45cd-9960-0fea0708355a",
    					scope: "openid",
    					usePKCE: false
    				}));
    				break;
    		}
    	}

    	const writable_props = ["data", "encoding"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Form> was created with unknown prop '${key}'`);
    	});

    	function select0_change_handler() {
    		encoding = select_value(this);
    		$$invalidate(0, encoding);
    	}

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    		if ("encoding" in $$props) $$invalidate(0, encoding = $$props.encoding);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		encodings,
    		data,
    		encoding,
    		dispatch,
    		updateEncoding,
    		updateUsePKCE,
    		updateBebEnabled,
    		updateOidcConfig
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    		if ("encoding" in $$props) $$invalidate(0, encoding = $$props.encoding);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		encoding,
    		data,
    		updateEncoding,
    		updateUsePKCE,
    		updateBebEnabled,
    		updateOidcConfig,
    		select0_change_handler
    	];
    }

    class Form extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { data: 1, encoding: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Form",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[1] === undefined && !("data" in props)) {
    			console.warn("<Form> was created without expected prop 'data'");
    		}

    		if (/*encoding*/ ctx[0] === undefined && !("encoding" in props)) {
    			console.warn("<Form> was created without expected prop 'encoding'");
    		}
    	}

    	get data() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get encoding() {
    		throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set encoding(value) {
    		throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/JSON.svelte generated by Svelte v3.32.3 */
    const file$1 = "src/JSON.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let textarea;
    	let textarea_value_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			textarea = element("textarea");
    			textarea.value = textarea_value_value = JSON.stringify(/*data*/ ctx[0], null, 2);
    			attr_dev(textarea, "class", "svelte-1p1f9q3");
    			add_location(textarea, file$1, 13, 4, 306);
    			attr_dev(section, "id", "json");
    			attr_dev(section, "class", "svelte-1p1f9q3");
    			add_location(section, file$1, 12, 0, 282);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, textarea);

    			if (!mounted) {
    				dispose = listen_dev(textarea, "input", /*onChange*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data*/ 1 && textarea_value_value !== (textarea_value_value = JSON.stringify(/*data*/ ctx[0], null, 2))) {
    				prop_dev(textarea, "value", textarea_value_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("JSON", slots, []);
    	let { data } = $$props;
    	const dispatch = createEventDispatcher();

    	function onChange(e) {
    		try {
    			const json = JSON.parse(e.target.value);
    			dispatch("change", json);
    		} catch(_) {
    			
    		}
    	}

    	const writable_props = ["data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<JSON> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		data,
    		dispatch,
    		onChange
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [data, onChange];
    }

    class JSON_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "JSON_1",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !("data" in props)) {
    			console.warn("<JSON> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<JSON>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<JSON>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var jsonUrlSingle = createCommonjsModule(function (module, exports) {
    !function(t,e){module.exports=e();}(window,(function(){return function(t){function e(e){for(var n,r,o=e[0],a=e[1],s=0,f=[];s<o.length;s++)r=o[s],Object.prototype.hasOwnProperty.call(i,r)&&i[r]&&f.push(i[r][0]),i[r]=0;for(n in a)Object.prototype.hasOwnProperty.call(a,n)&&(t[n]=a[n]);for(u&&u(e);f.length;)f.shift()();}function n(e){if(r[e])return r[e].exports;var i=r[e]={i:e,l:!1,exports:{}};return t[e].call(i.exports,i,i.exports,n),i.l=!0,i.exports}var r={},i={0:0};n.e=function(){return Promise.resolve()},n.m=t,n.c=r,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r});},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0});},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)n.d(r,i,function(e){return t[e]}.bind(null,i));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n.oe=function(t){throw console.error(t),t};var o=window.webpackJsonpJsonUrl=window.webpackJsonpJsonUrl||[],a=o.push.bind(o);o.push=e,o=o.slice();for(var s=0;s<o.length;s++)e(o[s]);var u=a;return n(n.s=59)}([function(t,e,n){t.exports=n(33);},function(t,e){function n(t,e,n,r,i,o,a){try{var s=t[o](a),u=s.value;}catch(t){return void n(t)}s.done?e(u):Promise.resolve(u).then(r,i);}t.exports=function(t){return function(){var e=this,r=arguments;return new Promise((function(i,o){function a(t){n(u,i,o,a,s,"next",t);}function s(t){n(u,i,o,a,s,"throw",t);}var u=t.apply(e,r);a(void 0);}))}};},function(t,e,n){var r=n(0),i=n.n(r),o=n(1),a=n.n(o);e.a={msgpack:function(){return a()(i.a.mark((function t(){var e,r;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,Promise.resolve().then(n.t.bind(null,36,7));case 2:return e=t.sent,r=e.default||e,t.abrupt("return",r());case 5:case"end":return t.stop()}}),t)})))()},safe64:function(){return a()(i.a.mark((function t(){return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,Promise.resolve().then(n.t.bind(null,54,7));case 2:return t.abrupt("return",t.sent);case 3:case"end":return t.stop()}}),t)})))()},lzma:function(){return a()(i.a.mark((function t(){var e;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,Promise.resolve().then(n.t.bind(null,56,7));case 2:return e=t.sent,t.abrupt("return",e.compress?e:e.LZMA);case 4:case"end":return t.stop()}}),t)})))()},lzstring:function(){return a()(i.a.mark((function t(){return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,Promise.resolve().then(n.t.bind(null,57,7));case 2:return t.abrupt("return",t.sent);case 3:case"end":return t.stop()}}),t)})))()},lzw:function(){return a()(i.a.mark((function t(){var e,r;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,Promise.resolve().then(n.t.bind(null,58,7));case 2:return e=t.sent,r=e.default||e,t.abrupt("return",r);case 5:case"end":return t.stop()}}),t)})))()}};},function(t,e){"function"==typeof Object.create?t.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}});}:t.exports=function(t,e){t.super_=e;var n=function(){};n.prototype=e.prototype,t.prototype=new n,t.prototype.constructor=t;};},function(t,e,n){(function(t){function n(t){return Object.prototype.toString.call(t)}e.isArray=function(t){return Array.isArray?Array.isArray(t):"[object Array]"===n(t)},e.isBoolean=function(t){return "boolean"==typeof t},e.isNull=function(t){return null===t},e.isNullOrUndefined=function(t){return null==t},e.isNumber=function(t){return "number"==typeof t},e.isString=function(t){return "string"==typeof t},e.isSymbol=function(t){return "symbol"==typeof t},e.isUndefined=function(t){return void 0===t},e.isRegExp=function(t){return "[object RegExp]"===n(t)},e.isObject=function(t){return "object"==typeof t&&null!==t},e.isDate=function(t){return "[object Date]"===n(t)},e.isError=function(t){return "[object Error]"===n(t)||t instanceof Error},e.isFunction=function(t){return "function"==typeof t},e.isPrimitive=function(t){return null===t||"boolean"==typeof t||"number"==typeof t||"string"==typeof t||"symbol"==typeof t||void 0===t},e.isBuffer=t.isBuffer;}).call(this,n(6).Buffer);},function(t,e){function n(){throw new Error("setTimeout has not been defined")}function r(){throw new Error("clearTimeout has not been defined")}function i(t){if(f===setTimeout)return setTimeout(t,0);if((f===n||!f)&&setTimeout)return f=setTimeout,setTimeout(t,0);try{return f(t,0)}catch(e){try{return f.call(null,t,0)}catch(e){return f.call(this,t,0)}}}function o(){p&&h&&(p=!1,h.length?d=h.concat(d):b=-1,d.length&&a());}function a(){if(!p){var t=i(o);p=!0;for(var e=d.length;e;){for(h=d,d=[];++b<e;)h&&h[b].run();b=-1,e=d.length;}h=null,p=!1,function(t){if(c===clearTimeout)return clearTimeout(t);if((c===r||!c)&&clearTimeout)return c=clearTimeout,clearTimeout(t);try{c(t);}catch(e){try{return c.call(null,t)}catch(e){return c.call(this,t)}}}(t);}}function s(t,e){this.fun=t,this.array=e;}function u(){}var f,c,l=t.exports={};!function(){try{f="function"==typeof setTimeout?setTimeout:n;}catch(t){f=n;}try{c="function"==typeof clearTimeout?clearTimeout:r;}catch(t){c=r;}}();var h,d=[],p=!1,b=-1;l.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)e[n-1]=arguments[n];d.push(new s(t,e)),1!==d.length||p||i(a);},s.prototype.run=function(){this.fun.apply(null,this.array);},l.title="browser",l.browser=!0,l.env={},l.argv=[],l.version="",l.versions={},l.on=u,l.addListener=u,l.once=u,l.off=u,l.removeListener=u,l.removeAllListeners=u,l.emit=u,l.prependListener=u,l.prependOnceListener=u,l.listeners=function(t){return []},l.binding=function(t){throw new Error("process.binding is not supported")},l.cwd=function(){return "/"},l.chdir=function(t){throw new Error("process.chdir is not supported")},l.umask=function(){return 0};},function(t,e,n){function r(){return o.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function i(t,e){if(r()<e)throw new RangeError("Invalid typed array length");return o.TYPED_ARRAY_SUPPORT?(t=new Uint8Array(e)).__proto__=o.prototype:(null===t&&(t=new o(e)),t.length=e),t}function o(t,e,n){if(!(o.TYPED_ARRAY_SUPPORT||this instanceof o))return new o(t,e,n);if("number"==typeof t){if("string"==typeof e)throw new Error("If encoding is specified then the first argument must be a string");return u(this,t)}return a(this,t,e,n)}function a(t,e,n,r){if("number"==typeof e)throw new TypeError('"value" argument must not be a number');return "undefined"!=typeof ArrayBuffer&&e instanceof ArrayBuffer?function(t,e,n,r){if(e.byteLength,n<0||e.byteLength<n)throw new RangeError("'offset' is out of bounds");if(e.byteLength<n+(r||0))throw new RangeError("'length' is out of bounds");return e=void 0===n&&void 0===r?new Uint8Array(e):void 0===r?new Uint8Array(e,n):new Uint8Array(e,n,r),o.TYPED_ARRAY_SUPPORT?(t=e).__proto__=o.prototype:t=f(t,e),t}(t,e,n,r):"string"==typeof e?function(t,e,n){if("string"==typeof n&&""!==n||(n="utf8"),!o.isEncoding(n))throw new TypeError('"encoding" must be a valid string encoding');var r=0|l(e,n),a=(t=i(t,r)).write(e,n);return a!==r&&(t=t.slice(0,a)),t}(t,e,n):function(t,e){if(o.isBuffer(e)){var n=0|c(e.length);return 0===(t=i(t,n)).length||e.copy(t,0,0,n),t}if(e){if("undefined"!=typeof ArrayBuffer&&e.buffer instanceof ArrayBuffer||"length"in e)return "number"!=typeof e.length||function(t){return t!=t}(e.length)?i(t,0):f(t,e);if("Buffer"===e.type&&F(e.data))return f(t,e.data)}throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}(t,e)}function s(t){if("number"!=typeof t)throw new TypeError('"size" argument must be a number');if(t<0)throw new RangeError('"size" argument must not be negative')}function u(t,e){if(s(e),t=i(t,e<0?0:0|c(e)),!o.TYPED_ARRAY_SUPPORT)for(var n=0;n<e;++n)t[n]=0;return t}function f(t,e){var n=e.length<0?0:0|c(e.length);t=i(t,n);for(var r=0;r<n;r+=1)t[r]=255&e[r];return t}function c(t){if(t>=r())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+r().toString(16)+" bytes");return 0|t}function l(t,e){if(o.isBuffer(t))return t.length;if("undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(t)||t instanceof ArrayBuffer))return t.byteLength;"string"!=typeof t&&(t=""+t);var n=t.length;if(0===n)return 0;for(var r=!1;;)switch(e){case"ascii":case"latin1":case"binary":return n;case"utf8":case"utf-8":case void 0:return I(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*n;case"hex":return n>>>1;case"base64":return P(t).length;default:if(r)return I(t).length;e=(""+e).toLowerCase(),r=!0;}}function h(t,e,n){var r=!1;if((void 0===e||e<0)&&(e=0),e>this.length)return "";if((void 0===n||n>this.length)&&(n=this.length),n<=0)return "";if((n>>>=0)<=(e>>>=0))return "";for(t||(t="utf8");;)switch(t){case"hex":return T(this,e,n);case"utf8":case"utf-8":return x(this,e,n);case"ascii":return S(this,e,n);case"latin1":case"binary":return k(this,e,n);case"base64":return E(this,e,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return M(this,e,n);default:if(r)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),r=!0;}}function d(t,e,n){var r=t[e];t[e]=t[n],t[n]=r;}function p(t,e,n,r,i){if(0===t.length)return -1;if("string"==typeof n?(r=n,n=0):n>2147483647?n=2147483647:n<-2147483648&&(n=-2147483648),n=+n,isNaN(n)&&(n=i?0:t.length-1),n<0&&(n=t.length+n),n>=t.length){if(i)return -1;n=t.length-1;}else if(n<0){if(!i)return -1;n=0;}if("string"==typeof e&&(e=o.from(e,r)),o.isBuffer(e))return 0===e.length?-1:b(t,e,n,r,i);if("number"==typeof e)return e&=255,o.TYPED_ARRAY_SUPPORT&&"function"==typeof Uint8Array.prototype.indexOf?i?Uint8Array.prototype.indexOf.call(t,e,n):Uint8Array.prototype.lastIndexOf.call(t,e,n):b(t,[e],n,r,i);throw new TypeError("val must be string, number or Buffer")}function b(t,e,n,r,i){function o(t,e){return 1===s?t[e]:t.readUInt16BE(e*s)}var a,s=1,u=t.length,f=e.length;if(void 0!==r&&("ucs2"===(r=String(r).toLowerCase())||"ucs-2"===r||"utf16le"===r||"utf-16le"===r)){if(t.length<2||e.length<2)return -1;s=2,u/=2,f/=2,n/=2;}if(i){var c=-1;for(a=n;a<u;a++)if(o(t,a)===o(e,-1===c?0:a-c)){if(-1===c&&(c=a),a-c+1===f)return c*s}else -1!==c&&(a-=a-c),c=-1;}else for(n+f>u&&(n=u-f),a=n;a>=0;a--){for(var l=!0,h=0;h<f;h++)if(o(t,a+h)!==o(e,h)){l=!1;break}if(l)return a}return -1}function g(t,e,n,r){n=Number(n)||0;var i=t.length-n;r?(r=Number(r))>i&&(r=i):r=i;var o=e.length;if(o%2!=0)throw new TypeError("Invalid hex string");r>o/2&&(r=o/2);for(var a=0;a<r;++a){var s=parseInt(e.substr(2*a,2),16);if(isNaN(s))return a;t[n+a]=s;}return a}function y(t,e,n,r){return D(I(e,t.length-n),t,n,r)}function v(t,e,n,r){return D(function(t){for(var e=[],n=0;n<t.length;++n)e.push(255&t.charCodeAt(n));return e}(e),t,n,r)}function w(t,e,n,r){return v(t,e,n,r)}function m(t,e,n,r){return D(P(e),t,n,r)}function _(t,e,n,r){return D(function(t,e){for(var n,r,i,o=[],a=0;a<t.length&&!((e-=2)<0);++a)n=t.charCodeAt(a),r=n>>8,i=n%256,o.push(i),o.push(r);return o}(e,t.length-n),t,n,r)}function E(t,e,n){return 0===e&&n===t.length?N.fromByteArray(t):N.fromByteArray(t.slice(e,n))}function x(t,e,n){n=Math.min(t.length,n);for(var r=[],i=e;i<n;){var o,a,s,u,f=t[i],c=null,l=f>239?4:f>223?3:f>191?2:1;if(i+l<=n)switch(l){case 1:f<128&&(c=f);break;case 2:128==(192&(o=t[i+1]))&&(u=(31&f)<<6|63&o)>127&&(c=u);break;case 3:o=t[i+1],a=t[i+2],128==(192&o)&&128==(192&a)&&(u=(15&f)<<12|(63&o)<<6|63&a)>2047&&(u<55296||u>57343)&&(c=u);break;case 4:o=t[i+1],a=t[i+2],s=t[i+3],128==(192&o)&&128==(192&a)&&128==(192&s)&&(u=(15&f)<<18|(63&o)<<12|(63&a)<<6|63&s)>65535&&u<1114112&&(c=u);}null===c?(c=65533,l=1):c>65535&&(c-=65536,r.push(c>>>10&1023|55296),c=56320|1023&c),r.push(c),i+=l;}return function(t){var e=t.length;if(e<=z)return String.fromCharCode.apply(String,t);for(var n="",r=0;r<e;)n+=String.fromCharCode.apply(String,t.slice(r,r+=z));return n}(r)}function S(t,e,n){var r="";n=Math.min(t.length,n);for(var i=e;i<n;++i)r+=String.fromCharCode(127&t[i]);return r}function k(t,e,n){var r="";n=Math.min(t.length,n);for(var i=e;i<n;++i)r+=String.fromCharCode(t[i]);return r}function T(t,e,n){var r=t.length;(!e||e<0)&&(e=0),(!n||n<0||n>r)&&(n=r);for(var i="",o=e;o<n;++o)i+=C(t[o]);return i}function M(t,e,n){for(var r=t.slice(e,n),i="",o=0;o<r.length;o+=2)i+=String.fromCharCode(r[o]+256*r[o+1]);return i}function j(t,e,n){if(t%1!=0||t<0)throw new RangeError("offset is not uint");if(t+e>n)throw new RangeError("Trying to access beyond buffer length")}function O(t,e,n,r,i,a){if(!o.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(e>i||e<a)throw new RangeError('"value" argument is out of bounds');if(n+r>t.length)throw new RangeError("Index out of range")}function R(t,e,n,r){e<0&&(e=65535+e+1);for(var i=0,o=Math.min(t.length-n,2);i<o;++i)t[n+i]=(e&255<<8*(r?i:1-i))>>>8*(r?i:1-i);}function A(t,e,n,r){e<0&&(e=4294967295+e+1);for(var i=0,o=Math.min(t.length-n,4);i<o;++i)t[n+i]=e>>>8*(r?i:3-i)&255;}function B(t,e,n,r,i,o){if(n+r>t.length)throw new RangeError("Index out of range");if(n<0)throw new RangeError("Index out of range")}function U(t,e,n,r,i){return i||B(t,0,n,4),q.write(t,e,n,r,23,4),n+4}function L(t,e,n,r,i){return i||B(t,0,n,8),q.write(t,e,n,r,52,8),n+8}function C(t){return t<16?"0"+t.toString(16):t.toString(16)}function I(t,e){e=e||1/0;for(var n,r=t.length,i=null,o=[],a=0;a<r;++a){if((n=t.charCodeAt(a))>55295&&n<57344){if(!i){if(n>56319){(e-=3)>-1&&o.push(239,191,189);continue}if(a+1===r){(e-=3)>-1&&o.push(239,191,189);continue}i=n;continue}if(n<56320){(e-=3)>-1&&o.push(239,191,189),i=n;continue}n=65536+(i-55296<<10|n-56320);}else i&&(e-=3)>-1&&o.push(239,191,189);if(i=null,n<128){if((e-=1)<0)break;o.push(n);}else if(n<2048){if((e-=2)<0)break;o.push(n>>6|192,63&n|128);}else if(n<65536){if((e-=3)<0)break;o.push(n>>12|224,n>>6&63|128,63&n|128);}else {if(!(n<1114112))throw new Error("Invalid code point");if((e-=4)<0)break;o.push(n>>18|240,n>>12&63|128,n>>6&63|128,63&n|128);}}return o}function P(t){return N.toByteArray(function(t){if((t=function(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}(t).replace(W,"")).length<2)return "";for(;t.length%4!=0;)t+="=";return t}(t))}function D(t,e,n,r){for(var i=0;i<r&&!(i+n>=e.length||i>=t.length);++i)e[i+n]=t[i];return i}var N=n(34),q=n(35),F=n(16);e.Buffer=o,e.SlowBuffer=function(t){return +t!=t&&(t=0),o.alloc(+t)},e.INSPECT_MAX_BYTES=50,o.TYPED_ARRAY_SUPPORT=void 0!==window.TYPED_ARRAY_SUPPORT?window.TYPED_ARRAY_SUPPORT:function(){try{var t=new Uint8Array(1);return t.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===t.foo()&&"function"==typeof t.subarray&&0===t.subarray(1,1).byteLength}catch(t){return !1}}(),e.kMaxLength=r(),o.poolSize=8192,o._augment=function(t){return t.__proto__=o.prototype,t},o.from=function(t,e,n){return a(null,t,e,n)},o.TYPED_ARRAY_SUPPORT&&(o.prototype.__proto__=Uint8Array.prototype,o.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&o[Symbol.species]===o&&Object.defineProperty(o,Symbol.species,{value:null,configurable:!0})),o.alloc=function(t,e,n){return function(t,e,n,r){return s(e),e<=0?i(t,e):void 0!==n?"string"==typeof r?i(t,e).fill(n,r):i(t,e).fill(n):i(t,e)}(null,t,e,n)},o.allocUnsafe=function(t){return u(null,t)},o.allocUnsafeSlow=function(t){return u(null,t)},o.isBuffer=function(t){return !(null==t||!t._isBuffer)},o.compare=function(t,e){if(!o.isBuffer(t)||!o.isBuffer(e))throw new TypeError("Arguments must be Buffers");if(t===e)return 0;for(var n=t.length,r=e.length,i=0,a=Math.min(n,r);i<a;++i)if(t[i]!==e[i]){n=t[i],r=e[i];break}return n<r?-1:r<n?1:0},o.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return !0;default:return !1}},o.concat=function(t,e){if(!F(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return o.alloc(0);var n;if(void 0===e)for(e=0,n=0;n<t.length;++n)e+=t[n].length;var r=o.allocUnsafe(e),i=0;for(n=0;n<t.length;++n){var a=t[n];if(!o.isBuffer(a))throw new TypeError('"list" argument must be an Array of Buffers');a.copy(r,i),i+=a.length;}return r},o.byteLength=l,o.prototype._isBuffer=!0,o.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var e=0;e<t;e+=2)d(this,e,e+1);return this},o.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var e=0;e<t;e+=4)d(this,e,e+3),d(this,e+1,e+2);return this},o.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var e=0;e<t;e+=8)d(this,e,e+7),d(this,e+1,e+6),d(this,e+2,e+5),d(this,e+3,e+4);return this},o.prototype.toString=function(){var t=0|this.length;return 0===t?"":0===arguments.length?x(this,0,t):h.apply(this,arguments)},o.prototype.equals=function(t){if(!o.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t||0===o.compare(this,t)},o.prototype.inspect=function(){var t="",n=e.INSPECT_MAX_BYTES;return this.length>0&&(t=this.toString("hex",0,n).match(/.{2}/g).join(" "),this.length>n&&(t+=" ... ")),"<Buffer "+t+">"},o.prototype.compare=function(t,e,n,r,i){if(!o.isBuffer(t))throw new TypeError("Argument must be a Buffer");if(void 0===e&&(e=0),void 0===n&&(n=t?t.length:0),void 0===r&&(r=0),void 0===i&&(i=this.length),e<0||n>t.length||r<0||i>this.length)throw new RangeError("out of range index");if(r>=i&&e>=n)return 0;if(r>=i)return -1;if(e>=n)return 1;if(this===t)return 0;for(var a=(i>>>=0)-(r>>>=0),s=(n>>>=0)-(e>>>=0),u=Math.min(a,s),f=this.slice(r,i),c=t.slice(e,n),l=0;l<u;++l)if(f[l]!==c[l]){a=f[l],s=c[l];break}return a<s?-1:s<a?1:0},o.prototype.includes=function(t,e,n){return -1!==this.indexOf(t,e,n)},o.prototype.indexOf=function(t,e,n){return p(this,t,e,n,!0)},o.prototype.lastIndexOf=function(t,e,n){return p(this,t,e,n,!1)},o.prototype.write=function(t,e,n,r){if(void 0===e)r="utf8",n=this.length,e=0;else if(void 0===n&&"string"==typeof e)r=e,n=this.length,e=0;else {if(!isFinite(e))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");e|=0,isFinite(n)?(n|=0,void 0===r&&(r="utf8")):(r=n,n=void 0);}var i=this.length-e;if((void 0===n||n>i)&&(n=i),t.length>0&&(n<0||e<0)||e>this.length)throw new RangeError("Attempt to write outside buffer bounds");r||(r="utf8");for(var o=!1;;)switch(r){case"hex":return g(this,t,e,n);case"utf8":case"utf-8":return y(this,t,e,n);case"ascii":return v(this,t,e,n);case"latin1":case"binary":return w(this,t,e,n);case"base64":return m(this,t,e,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return _(this,t,e,n);default:if(o)throw new TypeError("Unknown encoding: "+r);r=(""+r).toLowerCase(),o=!0;}},o.prototype.toJSON=function(){return {type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var z=4096;o.prototype.slice=function(t,e){var n,r=this.length;if((t=~~t)<0?(t+=r)<0&&(t=0):t>r&&(t=r),(e=void 0===e?r:~~e)<0?(e+=r)<0&&(e=0):e>r&&(e=r),e<t&&(e=t),o.TYPED_ARRAY_SUPPORT)(n=this.subarray(t,e)).__proto__=o.prototype;else {var i=e-t;n=new o(i,void 0);for(var a=0;a<i;++a)n[a]=this[a+t];}return n},o.prototype.readUIntLE=function(t,e,n){t|=0,e|=0,n||j(t,e,this.length);for(var r=this[t],i=1,o=0;++o<e&&(i*=256);)r+=this[t+o]*i;return r},o.prototype.readUIntBE=function(t,e,n){t|=0,e|=0,n||j(t,e,this.length);for(var r=this[t+--e],i=1;e>0&&(i*=256);)r+=this[t+--e]*i;return r},o.prototype.readUInt8=function(t,e){return e||j(t,1,this.length),this[t]},o.prototype.readUInt16LE=function(t,e){return e||j(t,2,this.length),this[t]|this[t+1]<<8},o.prototype.readUInt16BE=function(t,e){return e||j(t,2,this.length),this[t]<<8|this[t+1]},o.prototype.readUInt32LE=function(t,e){return e||j(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},o.prototype.readUInt32BE=function(t,e){return e||j(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},o.prototype.readIntLE=function(t,e,n){t|=0,e|=0,n||j(t,e,this.length);for(var r=this[t],i=1,o=0;++o<e&&(i*=256);)r+=this[t+o]*i;return r>=(i*=128)&&(r-=Math.pow(2,8*e)),r},o.prototype.readIntBE=function(t,e,n){t|=0,e|=0,n||j(t,e,this.length);for(var r=e,i=1,o=this[t+--r];r>0&&(i*=256);)o+=this[t+--r]*i;return o>=(i*=128)&&(o-=Math.pow(2,8*e)),o},o.prototype.readInt8=function(t,e){return e||j(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},o.prototype.readInt16LE=function(t,e){e||j(t,2,this.length);var n=this[t]|this[t+1]<<8;return 32768&n?4294901760|n:n},o.prototype.readInt16BE=function(t,e){e||j(t,2,this.length);var n=this[t+1]|this[t]<<8;return 32768&n?4294901760|n:n},o.prototype.readInt32LE=function(t,e){return e||j(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},o.prototype.readInt32BE=function(t,e){return e||j(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},o.prototype.readFloatLE=function(t,e){return e||j(t,4,this.length),q.read(this,t,!0,23,4)},o.prototype.readFloatBE=function(t,e){return e||j(t,4,this.length),q.read(this,t,!1,23,4)},o.prototype.readDoubleLE=function(t,e){return e||j(t,8,this.length),q.read(this,t,!0,52,8)},o.prototype.readDoubleBE=function(t,e){return e||j(t,8,this.length),q.read(this,t,!1,52,8)},o.prototype.writeUIntLE=function(t,e,n,r){t=+t,e|=0,n|=0,r||O(this,t,e,n,Math.pow(2,8*n)-1,0);var i=1,o=0;for(this[e]=255&t;++o<n&&(i*=256);)this[e+o]=t/i&255;return e+n},o.prototype.writeUIntBE=function(t,e,n,r){t=+t,e|=0,n|=0,r||O(this,t,e,n,Math.pow(2,8*n)-1,0);var i=n-1,o=1;for(this[e+i]=255&t;--i>=0&&(o*=256);)this[e+i]=t/o&255;return e+n},o.prototype.writeUInt8=function(t,e,n){return t=+t,e|=0,n||O(this,t,e,1,255,0),o.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),this[e]=255&t,e+1},o.prototype.writeUInt16LE=function(t,e,n){return t=+t,e|=0,n||O(this,t,e,2,65535,0),o.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):R(this,t,e,!0),e+2},o.prototype.writeUInt16BE=function(t,e,n){return t=+t,e|=0,n||O(this,t,e,2,65535,0),o.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):R(this,t,e,!1),e+2},o.prototype.writeUInt32LE=function(t,e,n){return t=+t,e|=0,n||O(this,t,e,4,4294967295,0),o.TYPED_ARRAY_SUPPORT?(this[e+3]=t>>>24,this[e+2]=t>>>16,this[e+1]=t>>>8,this[e]=255&t):A(this,t,e,!0),e+4},o.prototype.writeUInt32BE=function(t,e,n){return t=+t,e|=0,n||O(this,t,e,4,4294967295,0),o.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):A(this,t,e,!1),e+4},o.prototype.writeIntLE=function(t,e,n,r){if(t=+t,e|=0,!r){var i=Math.pow(2,8*n-1);O(this,t,e,n,i-1,-i);}var o=0,a=1,s=0;for(this[e]=255&t;++o<n&&(a*=256);)t<0&&0===s&&0!==this[e+o-1]&&(s=1),this[e+o]=(t/a>>0)-s&255;return e+n},o.prototype.writeIntBE=function(t,e,n,r){if(t=+t,e|=0,!r){var i=Math.pow(2,8*n-1);O(this,t,e,n,i-1,-i);}var o=n-1,a=1,s=0;for(this[e+o]=255&t;--o>=0&&(a*=256);)t<0&&0===s&&0!==this[e+o+1]&&(s=1),this[e+o]=(t/a>>0)-s&255;return e+n},o.prototype.writeInt8=function(t,e,n){return t=+t,e|=0,n||O(this,t,e,1,127,-128),o.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),t<0&&(t=255+t+1),this[e]=255&t,e+1},o.prototype.writeInt16LE=function(t,e,n){return t=+t,e|=0,n||O(this,t,e,2,32767,-32768),o.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):R(this,t,e,!0),e+2},o.prototype.writeInt16BE=function(t,e,n){return t=+t,e|=0,n||O(this,t,e,2,32767,-32768),o.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):R(this,t,e,!1),e+2},o.prototype.writeInt32LE=function(t,e,n){return t=+t,e|=0,n||O(this,t,e,4,2147483647,-2147483648),o.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8,this[e+2]=t>>>16,this[e+3]=t>>>24):A(this,t,e,!0),e+4},o.prototype.writeInt32BE=function(t,e,n){return t=+t,e|=0,n||O(this,t,e,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),o.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):A(this,t,e,!1),e+4},o.prototype.writeFloatLE=function(t,e,n){return U(this,t,e,!0,n)},o.prototype.writeFloatBE=function(t,e,n){return U(this,t,e,!1,n)},o.prototype.writeDoubleLE=function(t,e,n){return L(this,t,e,!0,n)},o.prototype.writeDoubleBE=function(t,e,n){return L(this,t,e,!1,n)},o.prototype.copy=function(t,e,n,r){if(n||(n=0),r||0===r||(r=this.length),e>=t.length&&(e=t.length),e||(e=0),r>0&&r<n&&(r=n),r===n)return 0;if(0===t.length||0===this.length)return 0;if(e<0)throw new RangeError("targetStart out of bounds");if(n<0||n>=this.length)throw new RangeError("sourceStart out of bounds");if(r<0)throw new RangeError("sourceEnd out of bounds");r>this.length&&(r=this.length),t.length-e<r-n&&(r=t.length-e+n);var i,a=r-n;if(this===t&&n<e&&e<r)for(i=a-1;i>=0;--i)t[i+e]=this[i+n];else if(a<1e3||!o.TYPED_ARRAY_SUPPORT)for(i=0;i<a;++i)t[i+e]=this[i+n];else Uint8Array.prototype.set.call(t,this.subarray(n,n+a),e);return a},o.prototype.fill=function(t,e,n,r){if("string"==typeof t){if("string"==typeof e?(r=e,e=0,n=this.length):"string"==typeof n&&(r=n,n=this.length),1===t.length){var i=t.charCodeAt(0);i<256&&(t=i);}if(void 0!==r&&"string"!=typeof r)throw new TypeError("encoding must be a string");if("string"==typeof r&&!o.isEncoding(r))throw new TypeError("Unknown encoding: "+r)}else "number"==typeof t&&(t&=255);if(e<0||this.length<e||this.length<n)throw new RangeError("Out of range index");if(n<=e)return this;var a;if(e>>>=0,n=void 0===n?this.length:n>>>0,t||(t=0),"number"==typeof t)for(a=e;a<n;++a)this[a]=t;else {var s=o.isBuffer(t)?t:I(new o(t,r).toString()),u=s.length;for(a=0;a<n-e;++a)this[a+e]=s[a%u];}return this};var W=/[^+\/0-9A-Za-z-_]/g;},function(t,e,n){function r(t){if(!(this instanceof r))return new r(t);f.call(this,t),c.call(this,t),t&&!1===t.readable&&(this.readable=!1),t&&!1===t.writable&&(this.writable=!1),this.allowHalfOpen=!0,t&&!1===t.allowHalfOpen&&(this.allowHalfOpen=!1),this.once("end",i);}function i(){this.allowHalfOpen||this._writableState.ended||a.nextTick(o,this);}function o(t){t.end();}var a=n(12),s=Object.keys||function(t){var e=[];for(var n in t)e.push(n);return e};t.exports=r;var u=n(4);u.inherits=n(3);var f=n(19),c=n(22);u.inherits(r,f);for(var l=s(c.prototype),h=0;h<l.length;h++){var d=l[h];r.prototype[d]||(r.prototype[d]=c.prototype[d]);}Object.defineProperty(r.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),Object.defineProperty(r.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&void 0!==this._writableState&&this._readableState.destroyed&&this._writableState.destroyed},set:function(t){void 0!==this._readableState&&void 0!==this._writableState&&(this._readableState.destroyed=t,this._writableState.destroyed=t);}}),r.prototype._destroy=function(t,e){this.push(null),this.end(),a.nextTick(e,t);};},function(t,e,n){function r(t){if(!(this instanceof r))return new r(t);f.call(this,t),c.call(this,t),t&&!1===t.readable&&(this.readable=!1),t&&!1===t.writable&&(this.writable=!1),this.allowHalfOpen=!0,t&&!1===t.allowHalfOpen&&(this.allowHalfOpen=!1),this.once("end",i);}function i(){this.allowHalfOpen||this._writableState.ended||a.nextTick(o,this);}function o(t){t.end();}var a=n(15),s=Object.keys||function(t){var e=[];for(var n in t)e.push(n);return e};t.exports=r;var u=n(4);u.inherits=n(3);var f=n(25),c=n(28);u.inherits(r,f);for(var l=s(c.prototype),h=0;h<l.length;h++){var d=l[h];r.prototype[d]||(r.prototype[d]=c.prototype[d]);}Object.defineProperty(r.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),Object.defineProperty(r.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&void 0!==this._writableState&&this._readableState.destroyed&&this._writableState.destroyed},set:function(t){void 0!==this._readableState&&void 0!==this._writableState&&(this._readableState.destroyed=t,this._writableState.destroyed=t);}}),r.prototype._destroy=function(t,e){this.push(null),this.end(),a.nextTick(e,t);};},function(t,e,n){function r(t,e){for(var n in t)e[n]=t[n];}function i(t,e,n){return a(t,e,n)}var o=n(6),a=o.Buffer;a.from&&a.alloc&&a.allocUnsafe&&a.allocUnsafeSlow?t.exports=o:(r(o,e),e.Buffer=i),r(a,i),i.from=function(t,e,n){if("number"==typeof t)throw new TypeError("Argument must not be a number");return a(t,e,n)},i.alloc=function(t,e,n){if("number"!=typeof t)throw new TypeError("Argument must be a number");var r=a(t);return void 0!==e?"string"==typeof n?r.fill(e,n):r.fill(e):r.fill(0),r},i.allocUnsafe=function(t){if("number"!=typeof t)throw new TypeError("Argument must be a number");return a(t)},i.allocUnsafeSlow=function(t){if("number"!=typeof t)throw new TypeError("Argument must be a number");return o.SlowBuffer(t)};},function(t,e,n){function r(t,e){for(var n in t)e[n]=t[n];}function i(t,e,n){return a(t,e,n)}var o=n(6),a=o.Buffer;a.from&&a.alloc&&a.allocUnsafe&&a.allocUnsafeSlow?t.exports=o:(r(o,e),e.Buffer=i),r(a,i),i.from=function(t,e,n){if("number"==typeof t)throw new TypeError("Argument must not be a number");return a(t,e,n)},i.alloc=function(t,e,n){if("number"!=typeof t)throw new TypeError("Argument must be a number");var r=a(t);return void 0!==e?"string"==typeof n?r.fill(e,n):r.fill(e):r.fill(0),r},i.allocUnsafe=function(t){if("number"!=typeof t)throw new TypeError("Argument must be a number");return a(t)},i.allocUnsafeSlow=function(t){if("number"!=typeof t)throw new TypeError("Argument must be a number");return o.SlowBuffer(t)};},function(t,e,n){function r(t){if(!(this instanceof r))return new r(t);if(this._bufs=[],this.length=0,"function"==typeof t){this._callback=t;var e=function(t){this._callback&&(this._callback(t),this._callback=null);}.bind(this);this.on("pipe",(function(t){t.on("error",e);})),this.on("unpipe",(function(t){t.removeListener("error",e);}));}else this.append(t);i.call(this);}var i=n(40).Duplex,o=n(17),a=n(10).Buffer;o.inherits(r,i),r.prototype._offset=function(t){var e,n=0,r=0;if(0===t)return [0,0];for(;r<this._bufs.length;r++){if(t<(e=n+this._bufs[r].length)||r==this._bufs.length-1)return [r,t-n];n=e;}},r.prototype._reverseOffset=function(t){for(var e=t[0],n=t[1],r=0;r<e;r++)n+=this._bufs[r].length;return n},r.prototype.append=function(t){var e=0;if(a.isBuffer(t))this._appendBuffer(t);else if(Array.isArray(t))for(;e<t.length;e++)this.append(t[e]);else if(t instanceof r)for(;e<t._bufs.length;e++)this.append(t._bufs[e]);else null!=t&&("number"==typeof t&&(t=t.toString()),this._appendBuffer(a.from(t)));return this},r.prototype._appendBuffer=function(t){this._bufs.push(t),this.length+=t.length;},r.prototype._write=function(t,e,n){this._appendBuffer(t),"function"==typeof n&&n();},r.prototype._read=function(t){if(!this.length)return this.push(null);t=Math.min(t,this.length),this.push(this.slice(0,t)),this.consume(t);},r.prototype.end=function(t){i.prototype.end.call(this,t),this._callback&&(this._callback(null,this.slice()),this._callback=null);},r.prototype.get=function(t){if(!(t>this.length||t<0)){var e=this._offset(t);return this._bufs[e[0]][e[1]]}},r.prototype.slice=function(t,e){return "number"==typeof t&&t<0&&(t+=this.length),"number"==typeof e&&e<0&&(e+=this.length),this.copy(null,0,t,e)},r.prototype.copy=function(t,e,n,r){if(("number"!=typeof n||n<0)&&(n=0),("number"!=typeof r||r>this.length)&&(r=this.length),n>=this.length)return t||a.alloc(0);if(r<=0)return t||a.alloc(0);var i,o,s=!!t,u=this._offset(n),f=r-n,c=f,l=s&&e||0,h=u[1];if(0===n&&r==this.length){if(!s)return 1===this._bufs.length?this._bufs[0]:a.concat(this._bufs,this.length);for(o=0;o<this._bufs.length;o++)this._bufs[o].copy(t,l),l+=this._bufs[o].length;return t}if(c<=this._bufs[u[0]].length-h)return s?this._bufs[u[0]].copy(t,e,h,h+c):this._bufs[u[0]].slice(h,h+c);for(s||(t=a.allocUnsafe(f)),o=u[0];o<this._bufs.length;o++){if(!(c>(i=this._bufs[o].length-h))){this._bufs[o].copy(t,l,h,h+c);break}this._bufs[o].copy(t,l,h),l+=i,c-=i,h&&(h=0);}return t},r.prototype.shallowSlice=function(t,e){if(t=t||0,e="number"!=typeof e?this.length:e,t<0&&(t+=this.length),e<0&&(e+=this.length),t===e)return new r;var n=this._offset(t),i=this._offset(e),o=this._bufs.slice(n[0],i[0]+1);return 0==i[1]?o.pop():o[o.length-1]=o[o.length-1].slice(0,i[1]),0!=n[1]&&(o[0]=o[0].slice(n[1])),new r(o)},r.prototype.toString=function(t,e,n){return this.slice(e,n).toString(t)},r.prototype.consume=function(t){for(;this._bufs.length;){if(!(t>=this._bufs[0].length)){this._bufs[0]=this._bufs[0].slice(t),this.length-=t;break}t-=this._bufs[0].length,this.length-=this._bufs[0].length,this._bufs.shift();}return this},r.prototype.duplicate=function(){for(var t=0,e=new r;t<this._bufs.length;t++)e.append(this._bufs[t]);return e},r.prototype.destroy=function(){this._bufs.length=0,this.length=0,this.push(null);},r.prototype.indexOf=function(t,e,n){if(void 0===n&&"string"==typeof e&&(n=e,e=void 0),"function"==typeof t||Array.isArray(t))throw new TypeError('The "value" argument must be one of type string, Buffer, BufferList, or Uint8Array.');if("number"==typeof t?t=a.from([t]):"string"==typeof t?t=a.from(t,n):t instanceof r?t=t.slice():a.isBuffer(t)||(t=a.from(t)),e=Number(e||0),isNaN(e)&&(e=0),e<0&&(e=this.length+e),e<0&&(e=0),0===t.length)return e>this.length?this.length:e;for(var i=this._offset(e),o=i[0],s=i[1];o<this._bufs.length;o++){for(var u=this._bufs[o];s<u.length;)if(u.length-s>=t.length){var f=u.indexOf(t,s);if(-1!==f)return this._reverseOffset([o,f]);s=u.length-t.length+1;}else {var c=this._reverseOffset([o,s]);if(this._match(c,t))return c;s++;}s=0;}return -1},r.prototype._match=function(t,e){if(this.length-t<e.length)return !1;for(var n=0;n<e.length;n++)if(this.get(t+n)!==e[n])return !1;return !0},function(){var t={readDoubleBE:8,readDoubleLE:8,readFloatBE:4,readFloatLE:4,readInt32BE:4,readInt32LE:4,readUInt32BE:4,readUInt32LE:4,readInt16BE:2,readInt16LE:2,readUInt16BE:2,readUInt16LE:2,readInt8:1,readUInt8:1,readIntBE:null,readIntLE:null,readUIntBE:null,readUIntLE:null};for(var e in t)!function(e){r.prototype[e]=null===t[e]?function(t,n){return this.slice(t,t+n)[e](0,n)}:function(n){return this.slice(n,n+t[e])[e](0)};}(e);}(),t.exports=r;},function(t,e,n){(function(e){!e.version||0===e.version.indexOf("v0.")||0===e.version.indexOf("v1.")&&0!==e.version.indexOf("v1.8.")?t.exports={nextTick:function(t,n,r,i){if("function"!=typeof t)throw new TypeError('"callback" argument must be a function');var o,a,s=arguments.length;switch(s){case 0:case 1:return e.nextTick(t);case 2:return e.nextTick((function(){t.call(null,n);}));case 3:return e.nextTick((function(){t.call(null,n,r);}));case 4:return e.nextTick((function(){t.call(null,n,r,i);}));default:for(o=new Array(s-1),a=0;a<o.length;)o[a++]=arguments[a];return e.nextTick((function(){t.apply(null,o);}))}}}:t.exports=e;}).call(this,n(5));},function(t,e,n){function r(){r.init.call(this);}function i(t){if("function"!=typeof t)throw new TypeError('The "listener" argument must be of type Function. Received type '+typeof t)}function o(t){return void 0===t._maxListeners?r.defaultMaxListeners:t._maxListeners}function a(t,e,n,r){var a,s,u;if(i(n),void 0===(s=t._events)?(s=t._events=Object.create(null),t._eventsCount=0):(void 0!==s.newListener&&(t.emit("newListener",e,n.listener?n.listener:n),s=t._events),u=s[e]),void 0===u)u=s[e]=n,++t._eventsCount;else if("function"==typeof u?u=s[e]=r?[n,u]:[u,n]:r?u.unshift(n):u.push(n),(a=o(t))>0&&u.length>a&&!u.warned){u.warned=!0;var f=new Error("Possible EventEmitter memory leak detected. "+u.length+" "+String(e)+" listeners added. Use emitter.setMaxListeners() to increase limit");f.name="MaxListenersExceededWarning",f.emitter=t,f.type=e,f.count=u.length,function(t){console&&console.warn&&console.warn(t);}(f);}return t}function s(){if(!this.fired)return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,0===arguments.length?this.listener.call(this.target):this.listener.apply(this.target,arguments)}function u(t,e,n){var r={fired:!1,wrapFn:void 0,target:t,type:e,listener:n},i=s.bind(r);return i.listener=n,r.wrapFn=i,i}function f(t,e,n){var r=t._events;if(void 0===r)return [];var i=r[e];return void 0===i?[]:"function"==typeof i?n?[i.listener||i]:[i]:n?function(t){for(var e=new Array(t.length),n=0;n<e.length;++n)e[n]=t[n].listener||t[n];return e}(i):l(i,i.length)}function c(t){var e=this._events;if(void 0!==e){var n=e[t];if("function"==typeof n)return 1;if(void 0!==n)return n.length}return 0}function l(t,e){for(var n=new Array(e),r=0;r<e;++r)n[r]=t[r];return n}var h,d="object"==typeof Reflect?Reflect:null,p=d&&"function"==typeof d.apply?d.apply:function(t,e,n){return Function.prototype.apply.call(t,e,n)};h=d&&"function"==typeof d.ownKeys?d.ownKeys:Object.getOwnPropertySymbols?function(t){return Object.getOwnPropertyNames(t).concat(Object.getOwnPropertySymbols(t))}:function(t){return Object.getOwnPropertyNames(t)};var b=Number.isNaN||function(t){return t!=t};t.exports=r,r.EventEmitter=r,r.prototype._events=void 0,r.prototype._eventsCount=0,r.prototype._maxListeners=void 0;var g=10;Object.defineProperty(r,"defaultMaxListeners",{enumerable:!0,get:function(){return g},set:function(t){if("number"!=typeof t||t<0||b(t))throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+t+".");g=t;}}),r.init=function(){void 0!==this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events=Object.create(null),this._eventsCount=0),this._maxListeners=this._maxListeners||void 0;},r.prototype.setMaxListeners=function(t){if("number"!=typeof t||t<0||b(t))throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+t+".");return this._maxListeners=t,this},r.prototype.getMaxListeners=function(){return o(this)},r.prototype.emit=function(t){for(var e=[],n=1;n<arguments.length;n++)e.push(arguments[n]);var r="error"===t,i=this._events;if(void 0!==i)r=r&&void 0===i.error;else if(!r)return !1;if(r){var o;if(e.length>0&&(o=e[0]),o instanceof Error)throw o;var a=new Error("Unhandled error."+(o?" ("+o.message+")":""));throw a.context=o,a}var s=i[t];if(void 0===s)return !1;if("function"==typeof s)p(s,this,e);else {var u=s.length,f=l(s,u);for(n=0;n<u;++n)p(f[n],this,e);}return !0},r.prototype.addListener=function(t,e){return a(this,t,e,!1)},r.prototype.on=r.prototype.addListener,r.prototype.prependListener=function(t,e){return a(this,t,e,!0)},r.prototype.once=function(t,e){return i(e),this.on(t,u(this,t,e)),this},r.prototype.prependOnceListener=function(t,e){return i(e),this.prependListener(t,u(this,t,e)),this},r.prototype.removeListener=function(t,e){var n,r,o,a,s;if(i(e),void 0===(r=this._events))return this;if(void 0===(n=r[t]))return this;if(n===e||n.listener===e)0==--this._eventsCount?this._events=Object.create(null):(delete r[t],r.removeListener&&this.emit("removeListener",t,n.listener||e));else if("function"!=typeof n){for(o=-1,a=n.length-1;a>=0;a--)if(n[a]===e||n[a].listener===e){s=n[a].listener,o=a;break}if(o<0)return this;0===o?n.shift():function(t,e){for(;e+1<t.length;e++)t[e]=t[e+1];t.pop();}(n,o),1===n.length&&(r[t]=n[0]),void 0!==r.removeListener&&this.emit("removeListener",t,s||e);}return this},r.prototype.off=r.prototype.removeListener,r.prototype.removeAllListeners=function(t){var e,n,r;if(void 0===(n=this._events))return this;if(void 0===n.removeListener)return 0===arguments.length?(this._events=Object.create(null),this._eventsCount=0):void 0!==n[t]&&(0==--this._eventsCount?this._events=Object.create(null):delete n[t]),this;if(0===arguments.length){var i,o=Object.keys(n);for(r=0;r<o.length;++r)"removeListener"!==(i=o[r])&&this.removeAllListeners(i);return this.removeAllListeners("removeListener"),this._events=Object.create(null),this._eventsCount=0,this}if("function"==typeof(e=n[t]))this.removeListener(t,e);else if(void 0!==e)for(r=e.length-1;r>=0;r--)this.removeListener(t,e[r]);return this},r.prototype.listeners=function(t){return f(this,t,!0)},r.prototype.rawListeners=function(t){return f(this,t,!1)},r.listenerCount=function(t,e){return "function"==typeof t.listenerCount?t.listenerCount(e):c.call(t,e)},r.prototype.listenerCount=c,r.prototype.eventNames=function(){return this._eventsCount>0?h(this._events):[]};},function(t,e,n){function r(t){var e;switch(this.encoding=function(t){var e=function(t){if(!t)return "utf8";for(var e;;)switch(t){case"utf8":case"utf-8":return "utf8";case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return "utf16le";case"latin1":case"binary":return "latin1";case"base64":case"ascii":case"hex":return t;default:if(e)return;t=(""+t).toLowerCase(),e=!0;}}(t);if("string"!=typeof e&&(h.isEncoding===d||!d(t)))throw new Error("Unknown encoding: "+t);return e||t}(t),this.encoding){case"utf16le":this.text=a,this.end=s,e=4;break;case"utf8":this.fillLast=o,e=4;break;case"base64":this.text=u,this.end=f,e=3;break;default:return this.write=c,void(this.end=l)}this.lastNeed=0,this.lastTotal=0,this.lastChar=h.allocUnsafe(e);}function i(t){return t<=127?0:t>>5==6?2:t>>4==14?3:t>>3==30?4:-1}function o(t){var e=this.lastTotal-this.lastNeed,n=function(t,e,n){if(128!=(192&e[0]))return t.lastNeed=0,"�".repeat(n);if(t.lastNeed>1&&e.length>1){if(128!=(192&e[1]))return t.lastNeed=1,"�".repeat(n+1);if(t.lastNeed>2&&e.length>2&&128!=(192&e[2]))return t.lastNeed=2,"�".repeat(n+2)}}(this,t,e);return void 0!==n?n:this.lastNeed<=t.length?(t.copy(this.lastChar,e,0,this.lastNeed),this.lastChar.toString(this.encoding,0,this.lastTotal)):(t.copy(this.lastChar,e,0,t.length),void(this.lastNeed-=t.length))}function a(t,e){if((t.length-e)%2==0){var n=t.toString("utf16le",e);if(n){var r=n.charCodeAt(n.length-1);if(r>=55296&&r<=56319)return this.lastNeed=2,this.lastTotal=4,this.lastChar[0]=t[t.length-2],this.lastChar[1]=t[t.length-1],n.slice(0,-1)}return n}return this.lastNeed=1,this.lastTotal=2,this.lastChar[0]=t[t.length-1],t.toString("utf16le",e,t.length-1)}function s(t){var e=t&&t.length?this.write(t):"";if(this.lastNeed){var n=this.lastTotal-this.lastNeed;return e+this.lastChar.toString("utf16le",0,n)}return e}function u(t,e){var n=(t.length-e)%3;return 0===n?t.toString("base64",e):(this.lastNeed=3-n,this.lastTotal=3,1===n?this.lastChar[0]=t[t.length-1]:(this.lastChar[0]=t[t.length-2],this.lastChar[1]=t[t.length-1]),t.toString("base64",e,t.length-n))}function f(t){var e=t&&t.length?this.write(t):"";return this.lastNeed?e+this.lastChar.toString("base64",0,3-this.lastNeed):e}function c(t){return t.toString(this.encoding)}function l(t){return t&&t.length?this.write(t):""}var h=n(10).Buffer,d=h.isEncoding||function(t){switch((t=""+t)&&t.toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":case"raw":return !0;default:return !1}};e.StringDecoder=r,r.prototype.write=function(t){if(0===t.length)return "";var e,n;if(this.lastNeed){if(void 0===(e=this.fillLast(t)))return "";n=this.lastNeed,this.lastNeed=0;}else n=0;return n<t.length?e?e+this.text(t,n):this.text(t,n):e||""},r.prototype.end=function(t){var e=t&&t.length?this.write(t):"";return this.lastNeed?e+"�".repeat(this.lastTotal-this.lastNeed):e},r.prototype.text=function(t,e){var n=function(t,e,n){var r=e.length-1;if(r<n)return 0;var o=i(e[r]);return o>=0?(o>0&&(t.lastNeed=o-1),o):--r<n?0:(o=i(e[r]))>=0?(o>0&&(t.lastNeed=o-2),o):--r<n?0:(o=i(e[r]))>=0?(o>0&&(2===o?o=0:t.lastNeed=o-3),o):0}(this,t,e);if(!this.lastNeed)return t.toString("utf8",e);this.lastTotal=n;var r=t.length-(n-this.lastNeed);return t.copy(this.lastChar,0,r),t.toString("utf8",e,r)},r.prototype.fillLast=function(t){if(this.lastNeed<=t.length)return t.copy(this.lastChar,this.lastTotal-this.lastNeed,0,this.lastNeed),this.lastChar.toString(this.encoding,0,this.lastTotal);t.copy(this.lastChar,this.lastTotal-this.lastNeed,0,t.length),this.lastNeed-=t.length;};},function(t,e,n){(function(e){!e.version||0===e.version.indexOf("v0.")||0===e.version.indexOf("v1.")&&0!==e.version.indexOf("v1.8.")?t.exports={nextTick:function(t,n,r,i){if("function"!=typeof t)throw new TypeError('"callback" argument must be a function');var o,a,s=arguments.length;switch(s){case 0:case 1:return e.nextTick(t);case 2:return e.nextTick((function(){t.call(null,n);}));case 3:return e.nextTick((function(){t.call(null,n,r);}));case 4:return e.nextTick((function(){t.call(null,n,r,i);}));default:for(o=new Array(s-1),a=0;a<o.length;)o[a++]=arguments[a];return e.nextTick((function(){t.apply(null,o);}))}}}:t.exports=e;}).call(this,n(5));},function(t,e){var n={}.toString;t.exports=Array.isArray||function(t){return "[object Array]"==n.call(t)};},function(t,e,n){(function(t){function r(t,n){var r={seen:[],stylize:o};return arguments.length>=3&&(r.depth=arguments[2]),arguments.length>=4&&(r.colors=arguments[3]),l(n)?r.showHidden=n:n&&e._extend(r,n),b(r.showHidden)&&(r.showHidden=!1),b(r.depth)&&(r.depth=2),b(r.colors)&&(r.colors=!1),b(r.customInspect)&&(r.customInspect=!0),r.colors&&(r.stylize=i),a(r,t,r.depth)}function i(t,e){var n=r.styles[e];return n?"["+r.colors[n][0]+"m"+t+"["+r.colors[n][1]+"m":t}function o(t,e){return t}function a(t,n,r){if(t.customInspect&&n&&m(n.inspect)&&n.inspect!==e.inspect&&(!n.constructor||n.constructor.prototype!==n)){var i=n.inspect(r,t);return p(i)||(i=a(t,i,r)),i}var o=s(t,n);if(o)return o;var l=Object.keys(n),h=function(t){var e={};return t.forEach((function(t,n){e[t]=!0;})),e}(l);if(t.showHidden&&(l=Object.getOwnPropertyNames(n)),w(n)&&(l.indexOf("message")>=0||l.indexOf("description")>=0))return u(n);if(0===l.length){if(m(n)){var d=n.name?": "+n.name:"";return t.stylize("[Function"+d+"]","special")}if(g(n))return t.stylize(RegExp.prototype.toString.call(n),"regexp");if(v(n))return t.stylize(Date.prototype.toString.call(n),"date");if(w(n))return u(n)}var b,y="",_=!1,E=["{","}"];return c(n)&&(_=!0,E=["[","]"]),m(n)&&(y=" [Function"+(n.name?": "+n.name:"")+"]"),g(n)&&(y=" "+RegExp.prototype.toString.call(n)),v(n)&&(y=" "+Date.prototype.toUTCString.call(n)),w(n)&&(y=" "+u(n)),0!==l.length||_&&0!=n.length?r<0?g(n)?t.stylize(RegExp.prototype.toString.call(n),"regexp"):t.stylize("[Object]","special"):(t.seen.push(n),b=_?function(t,e,n,r,i){for(var o=[],a=0,s=e.length;a<s;++a)S(e,String(a))?o.push(f(t,e,n,r,String(a),!0)):o.push("");return i.forEach((function(i){i.match(/^\d+$/)||o.push(f(t,e,n,r,i,!0));})),o}(t,n,r,h,l):l.map((function(e){return f(t,n,r,h,e,_)})),t.seen.pop(),function(t,e,n){return t.reduce((function(t,e){return e.indexOf("\n")>=0&&0,t+e.replace(/\u001b\[\d\d?m/g,"").length+1}),0)>60?n[0]+(""===e?"":e+"\n ")+" "+t.join(",\n  ")+" "+n[1]:n[0]+e+" "+t.join(", ")+" "+n[1]}(b,y,E)):E[0]+y+E[1]}function s(t,e){if(b(e))return t.stylize("undefined","undefined");if(p(e)){var n="'"+JSON.stringify(e).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return t.stylize(n,"string")}return d(e)?t.stylize(""+e,"number"):l(e)?t.stylize(""+e,"boolean"):h(e)?t.stylize("null","null"):void 0}function u(t){return "["+Error.prototype.toString.call(t)+"]"}function f(t,e,n,r,i,o){var s,u,f;if((f=Object.getOwnPropertyDescriptor(e,i)||{value:e[i]}).get?u=f.set?t.stylize("[Getter/Setter]","special"):t.stylize("[Getter]","special"):f.set&&(u=t.stylize("[Setter]","special")),S(r,i)||(s="["+i+"]"),u||(t.seen.indexOf(f.value)<0?(u=h(n)?a(t,f.value,null):a(t,f.value,n-1)).indexOf("\n")>-1&&(u=o?u.split("\n").map((function(t){return "  "+t})).join("\n").substr(2):"\n"+u.split("\n").map((function(t){return "   "+t})).join("\n")):u=t.stylize("[Circular]","special")),b(s)){if(o&&i.match(/^\d+$/))return u;(s=JSON.stringify(""+i)).match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)?(s=s.substr(1,s.length-2),s=t.stylize(s,"name")):(s=s.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'"),s=t.stylize(s,"string"));}return s+": "+u}function c(t){return Array.isArray(t)}function l(t){return "boolean"==typeof t}function h(t){return null===t}function d(t){return "number"==typeof t}function p(t){return "string"==typeof t}function b(t){return void 0===t}function g(t){return y(t)&&"[object RegExp]"===_(t)}function y(t){return "object"==typeof t&&null!==t}function v(t){return y(t)&&"[object Date]"===_(t)}function w(t){return y(t)&&("[object Error]"===_(t)||t instanceof Error)}function m(t){return "function"==typeof t}function _(t){return Object.prototype.toString.call(t)}function E(t){return t<10?"0"+t.toString(10):t.toString(10)}function x(){var t=new Date,e=[E(t.getHours()),E(t.getMinutes()),E(t.getSeconds())].join(":");return [t.getDate(),R[t.getMonth()],e].join(" ")}function S(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function k(t,e){if(!t){var n=new Error("Promise was rejected with a falsy value");n.reason=t,t=n;}return e(t)}var T=Object.getOwnPropertyDescriptors||function(t){for(var e=Object.keys(t),n={},r=0;r<e.length;r++)n[e[r]]=Object.getOwnPropertyDescriptor(t,e[r]);return n},M=/%[sdj%]/g;e.format=function(t){if(!p(t)){for(var e=[],n=0;n<arguments.length;n++)e.push(r(arguments[n]));return e.join(" ")}n=1;for(var i=arguments,o=i.length,a=String(t).replace(M,(function(t){if("%%"===t)return "%";if(n>=o)return t;switch(t){case"%s":return String(i[n++]);case"%d":return Number(i[n++]);case"%j":try{return JSON.stringify(i[n++])}catch(t){return "[Circular]"}default:return t}})),s=i[n];n<o;s=i[++n])h(s)||!y(s)?a+=" "+s:a+=" "+r(s);return a},e.deprecate=function(n,r){if(void 0!==t&&!0===t.noDeprecation)return n;if(void 0===t)return function(){return e.deprecate(n,r).apply(this,arguments)};var i=!1;return function(){if(!i){if(t.throwDeprecation)throw new Error(r);t.traceDeprecation?console.trace(r):console.error(r),i=!0;}return n.apply(this,arguments)}};var j,O={};e.debuglog=function(n){if(b(j)&&(j=t.env.NODE_DEBUG||""),n=n.toUpperCase(),!O[n])if(new RegExp("\\b"+n+"\\b","i").test(j)){var r=t.pid;O[n]=function(){var t=e.format.apply(e,arguments);console.error("%s %d: %s",n,r,t);};}else O[n]=function(){};return O[n]},e.inspect=r,r.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]},r.styles={special:"cyan",number:"yellow",boolean:"yellow",undefined:"grey",null:"bold",string:"green",date:"magenta",regexp:"red"},e.isArray=c,e.isBoolean=l,e.isNull=h,e.isNullOrUndefined=function(t){return null==t},e.isNumber=d,e.isString=p,e.isSymbol=function(t){return "symbol"==typeof t},e.isUndefined=b,e.isRegExp=g,e.isObject=y,e.isDate=v,e.isError=w,e.isFunction=m,e.isPrimitive=function(t){return null===t||"boolean"==typeof t||"number"==typeof t||"string"==typeof t||"symbol"==typeof t||void 0===t},e.isBuffer=n(39);var R=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];e.log=function(){console.log("%s - %s",x(),e.format.apply(e,arguments));},e.inherits=n(3),e._extend=function(t,e){if(!e||!y(e))return t;for(var n=Object.keys(e),r=n.length;r--;)t[n[r]]=e[n[r]];return t};var A="undefined"!=typeof Symbol?Symbol("util.promisify.custom"):void 0;e.promisify=function(t){function e(){for(var e,n,r=new Promise((function(t,r){e=t,n=r;})),i=[],o=0;o<arguments.length;o++)i.push(arguments[o]);i.push((function(t,r){t?n(t):e(r);}));try{t.apply(this,i);}catch(t){n(t);}return r}if("function"!=typeof t)throw new TypeError('The "original" argument must be of type Function');if(A&&t[A]){var e;if("function"!=typeof(e=t[A]))throw new TypeError('The "util.promisify.custom" argument must be of type Function');return Object.defineProperty(e,A,{value:e,enumerable:!1,writable:!1,configurable:!0}),e}return Object.setPrototypeOf(e,Object.getPrototypeOf(t)),A&&Object.defineProperty(e,A,{value:e,enumerable:!1,writable:!1,configurable:!0}),Object.defineProperties(e,T(t))},e.promisify.custom=A,e.callbackify=function(e){function n(){for(var n=[],r=0;r<arguments.length;r++)n.push(arguments[r]);var i=n.pop();if("function"!=typeof i)throw new TypeError("The last argument must be of type Function");var o=this,a=function(){return i.apply(o,arguments)};e.apply(this,n).then((function(e){t.nextTick(a,null,e);}),(function(e){t.nextTick(k,e,a);}));}if("function"!=typeof e)throw new TypeError('The "original" argument must be of type Function');return Object.setPrototypeOf(n,Object.getPrototypeOf(e)),Object.defineProperties(n,T(e)),n};}).call(this,n(5));},function(t,e,n){function r(t,e){this._id=t,this._clearFn=e;}var i="undefined"!=typeof window&&window||"undefined"!=typeof self&&self||window,o=Function.prototype.apply;e.setTimeout=function(){return new r(o.call(setTimeout,i,arguments),clearTimeout)},e.setInterval=function(){return new r(o.call(setInterval,i,arguments),clearInterval)},e.clearTimeout=e.clearInterval=function(t){t&&t.close();},r.prototype.unref=r.prototype.ref=function(){},r.prototype.close=function(){this._clearFn.call(i,this._id);},e.enroll=function(t,e){clearTimeout(t._idleTimeoutId),t._idleTimeout=e;},e.unenroll=function(t){clearTimeout(t._idleTimeoutId),t._idleTimeout=-1;},e._unrefActive=e.active=function(t){clearTimeout(t._idleTimeoutId);var e=t._idleTimeout;e>=0&&(t._idleTimeoutId=setTimeout((function(){t._onTimeout&&t._onTimeout();}),e));},n(44),e.setImmediate="undefined"!=typeof self&&self.setImmediate||"undefined"!=typeof window&&window.setImmediate||this&&this.setImmediate,e.clearImmediate="undefined"!=typeof self&&self.clearImmediate||"undefined"!=typeof window&&window.clearImmediate||this&&this.clearImmediate;},function(t,e,n){(function(e){function r(t,e){t=t||{};var r=e instanceof(_=_||n(7));this.objectMode=!!t.objectMode,r&&(this.objectMode=this.objectMode||!!t.readableObjectMode);var i=t.highWaterMark,o=t.readableHighWaterMark,a=this.objectMode?16:16384;this.highWaterMark=i||0===i?i:r&&(o||0===o)?o:a,this.highWaterMark=Math.floor(this.highWaterMark),this.buffer=new A,this.length=0,this.pipes=null,this.pipesCount=0,this.flowing=null,this.ended=!1,this.endEmitted=!1,this.reading=!1,this.sync=!0,this.needReadable=!1,this.emittedReadable=!1,this.readableListening=!1,this.resumeScheduled=!1,this.destroyed=!1,this.defaultEncoding=t.defaultEncoding||"utf8",this.awaitDrain=0,this.readingMore=!1,this.decoder=null,this.encoding=null,t.encoding&&(R||(R=n(14).StringDecoder),this.decoder=new R(t.encoding),this.encoding=t.encoding);}function i(t){if(_=_||n(7),!(this instanceof i))return new i(t);this._readableState=new r(t,this),this.readable=!0,t&&("function"==typeof t.read&&(this._read=t.read),"function"==typeof t.destroy&&(this._destroy=t.destroy)),S.call(this);}function o(t,e,n,r,i){var o,u=t._readableState;null===e?(u.reading=!1,function(t,e){if(!e.ended){if(e.decoder){var n=e.decoder.end();n&&n.length&&(e.buffer.push(n),e.length+=e.objectMode?1:n.length);}e.ended=!0,f(t);}}(t,u)):(i||(o=s(u,e)),o?t.emit("error",o):u.objectMode||e&&e.length>0?("string"==typeof e||u.objectMode||Object.getPrototypeOf(e)===k.prototype||(e=function(t){return k.from(t)}(e)),r?u.endEmitted?t.emit("error",new Error("stream.unshift() after end event")):a(t,u,e,!0):u.ended?t.emit("error",new Error("stream.push() after EOF")):(u.reading=!1,u.decoder&&!n?(e=u.decoder.write(e),u.objectMode||0!==e.length?a(t,u,e,!1):l(t,u)):a(t,u,e,!1))):r||(u.reading=!1));return function(t){return !t.ended&&(t.needReadable||t.length<t.highWaterMark||0===t.length)}(u)}function a(t,e,n,r){e.flowing&&0===e.length&&!e.sync?(t.emit("data",n),t.read(0)):(e.length+=e.objectMode?1:n.length,r?e.buffer.unshift(n):e.buffer.push(n),e.needReadable&&f(t)),l(t,e);}function s(t,e){var n;return function(t){return k.isBuffer(t)||t instanceof T}(e)||"string"==typeof e||void 0===e||t.objectMode||(n=new TypeError("Invalid non-string/buffer chunk")),n}function u(t,e){return t<=0||0===e.length&&e.ended?0:e.objectMode?1:t!=t?e.flowing&&e.length?e.buffer.head.data.length:e.length:(t>e.highWaterMark&&(e.highWaterMark=function(t){return t>=L?t=L:(t--,t|=t>>>1,t|=t>>>2,t|=t>>>4,t|=t>>>8,t|=t>>>16,t++),t}(t)),t<=e.length?t:e.ended?e.length:(e.needReadable=!0,0))}function f(t){var e=t._readableState;e.needReadable=!1,e.emittedReadable||(O("emitReadable",e.flowing),e.emittedReadable=!0,e.sync?m.nextTick(c,t):c(t));}function c(t){O("emit readable"),t.emit("readable"),b(t);}function l(t,e){e.readingMore||(e.readingMore=!0,m.nextTick(h,t,e));}function h(t,e){for(var n=e.length;!e.reading&&!e.flowing&&!e.ended&&e.length<e.highWaterMark&&(O("maybeReadMore read 0"),t.read(0),n!==e.length);)n=e.length;e.readingMore=!1;}function d(t){O("readable nexttick read 0"),t.read(0);}function p(t,e){e.reading||(O("resume read 0"),t.read(0)),e.resumeScheduled=!1,e.awaitDrain=0,t.emit("resume"),b(t),e.flowing&&!e.reading&&t.read(0);}function b(t){var e=t._readableState;for(O("flow",e.flowing);e.flowing&&null!==t.read(););}function g(t,e){return 0===e.length?null:(e.objectMode?n=e.buffer.shift():!t||t>=e.length?(n=e.decoder?e.buffer.join(""):1===e.buffer.length?e.buffer.head.data:e.buffer.concat(e.length),e.buffer.clear()):n=function(t,e,n){var r;return t<e.head.data.length?(r=e.head.data.slice(0,t),e.head.data=e.head.data.slice(t)):r=t===e.head.data.length?e.shift():n?function(t,e){var n=e.head,r=1,i=n.data;for(t-=i.length;n=n.next;){var o=n.data,a=t>o.length?o.length:t;if(a===o.length?i+=o:i+=o.slice(0,t),0==(t-=a)){a===o.length?(++r,n.next?e.head=n.next:e.head=e.tail=null):(e.head=n,n.data=o.slice(a));break}++r;}return e.length-=r,i}(t,e):function(t,e){var n=k.allocUnsafe(t),r=e.head,i=1;for(r.data.copy(n),t-=r.data.length;r=r.next;){var o=r.data,a=t>o.length?o.length:t;if(o.copy(n,n.length-t,0,a),0==(t-=a)){a===o.length?(++i,r.next?e.head=r.next:e.head=e.tail=null):(e.head=r,r.data=o.slice(a));break}++i;}return e.length-=i,n}(t,e),r}(t,e.buffer,e.decoder),n);var n;}function y(t){var e=t._readableState;if(e.length>0)throw new Error('"endReadable()" called on non-empty stream');e.endEmitted||(e.ended=!0,m.nextTick(v,e,t));}function v(t,e){t.endEmitted||0!==t.length||(t.endEmitted=!0,e.readable=!1,e.emit("end"));}function w(t,e){for(var n=0,r=t.length;n<r;n++)if(t[n]===e)return n;return -1}var m=n(12);t.exports=i;var _,E=n(16);i.ReadableState=r;var x=(n(13).EventEmitter,function(t,e){return t.listeners(e).length}),S=n(20),k=n(10).Buffer,T=window.Uint8Array||function(){},M=n(4);M.inherits=n(3);var j=n(41),O=void 0;O=j&&j.debuglog?j.debuglog("stream"):function(){};var R,A=n(42),B=n(21);M.inherits(i,S);var U=["error","close","destroy","pause","resume"];Object.defineProperty(i.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&this._readableState.destroyed},set:function(t){this._readableState&&(this._readableState.destroyed=t);}}),i.prototype.destroy=B.destroy,i.prototype._undestroy=B.undestroy,i.prototype._destroy=function(t,e){this.push(null),e(t);},i.prototype.push=function(t,e){var n,r=this._readableState;return r.objectMode?n=!0:"string"==typeof t&&((e=e||r.defaultEncoding)!==r.encoding&&(t=k.from(t,e),e=""),n=!0),o(this,t,e,!1,n)},i.prototype.unshift=function(t){return o(this,t,null,!0,!1)},i.prototype.isPaused=function(){return !1===this._readableState.flowing},i.prototype.setEncoding=function(t){return R||(R=n(14).StringDecoder),this._readableState.decoder=new R(t),this._readableState.encoding=t,this};var L=8388608;i.prototype.read=function(t){O("read",t),t=parseInt(t,10);var e=this._readableState,n=t;if(0!==t&&(e.emittedReadable=!1),0===t&&e.needReadable&&(e.length>=e.highWaterMark||e.ended))return O("read: emitReadable",e.length,e.ended),0===e.length&&e.ended?y(this):f(this),null;if(0===(t=u(t,e))&&e.ended)return 0===e.length&&y(this),null;var r,i=e.needReadable;return O("need readable",i),(0===e.length||e.length-t<e.highWaterMark)&&O("length less than watermark",i=!0),e.ended||e.reading?O("reading or ended",i=!1):i&&(O("do read"),e.reading=!0,e.sync=!0,0===e.length&&(e.needReadable=!0),this._read(e.highWaterMark),e.sync=!1,e.reading||(t=u(n,e))),null===(r=t>0?g(t,e):null)?(e.needReadable=!0,t=0):e.length-=t,0===e.length&&(e.ended||(e.needReadable=!0),n!==t&&e.ended&&y(this)),null!==r&&this.emit("data",r),r},i.prototype._read=function(t){this.emit("error",new Error("_read() is not implemented"));},i.prototype.pipe=function(t,n){function r(t,e){O("onunpipe"),t===l&&e&&!1===e.hasUnpiped&&(e.hasUnpiped=!0,o());}function i(){O("onend"),t.end();}function o(){O("cleanup"),t.removeListener("close",u),t.removeListener("finish",f),t.removeListener("drain",p),t.removeListener("error",s),t.removeListener("unpipe",r),l.removeListener("end",i),l.removeListener("end",c),l.removeListener("data",a),g=!0,!h.awaitDrain||t._writableState&&!t._writableState.needDrain||p();}function a(e){O("ondata"),y=!1,!1!==t.write(e)||y||((1===h.pipesCount&&h.pipes===t||h.pipesCount>1&&-1!==w(h.pipes,t))&&!g&&(O("false write response, pause",l._readableState.awaitDrain),l._readableState.awaitDrain++,y=!0),l.pause());}function s(e){O("onerror",e),c(),t.removeListener("error",s),0===x(t,"error")&&t.emit("error",e);}function u(){t.removeListener("finish",f),c();}function f(){O("onfinish"),t.removeListener("close",u),c();}function c(){O("unpipe"),l.unpipe(t);}var l=this,h=this._readableState;switch(h.pipesCount){case 0:h.pipes=t;break;case 1:h.pipes=[h.pipes,t];break;default:h.pipes.push(t);}h.pipesCount+=1,O("pipe count=%d opts=%j",h.pipesCount,n);var d=(!n||!1!==n.end)&&t!==e.stdout&&t!==e.stderr?i:c;h.endEmitted?m.nextTick(d):l.once("end",d),t.on("unpipe",r);var p=function(t){return function(){var e=t._readableState;O("pipeOnDrain",e.awaitDrain),e.awaitDrain&&e.awaitDrain--,0===e.awaitDrain&&x(t,"data")&&(e.flowing=!0,b(t));}}(l);t.on("drain",p);var g=!1,y=!1;return l.on("data",a),function(t,e,n){if("function"==typeof t.prependListener)return t.prependListener(e,n);t._events&&t._events[e]?E(t._events[e])?t._events[e].unshift(n):t._events[e]=[n,t._events[e]]:t.on(e,n);}(t,"error",s),t.once("close",u),t.once("finish",f),t.emit("pipe",l),h.flowing||(O("pipe resume"),l.resume()),t},i.prototype.unpipe=function(t){var e=this._readableState,n={hasUnpiped:!1};if(0===e.pipesCount)return this;if(1===e.pipesCount)return t&&t!==e.pipes||(t||(t=e.pipes),e.pipes=null,e.pipesCount=0,e.flowing=!1,t&&t.emit("unpipe",this,n)),this;if(!t){var r=e.pipes,i=e.pipesCount;e.pipes=null,e.pipesCount=0,e.flowing=!1;for(var o=0;o<i;o++)r[o].emit("unpipe",this,n);return this}var a=w(e.pipes,t);return -1===a||(e.pipes.splice(a,1),e.pipesCount-=1,1===e.pipesCount&&(e.pipes=e.pipes[0]),t.emit("unpipe",this,n)),this},i.prototype.on=function(t,e){var n=S.prototype.on.call(this,t,e);if("data"===t)!1!==this._readableState.flowing&&this.resume();else if("readable"===t){var r=this._readableState;r.endEmitted||r.readableListening||(r.readableListening=r.needReadable=!0,r.emittedReadable=!1,r.reading?r.length&&f(this):m.nextTick(d,this));}return n},i.prototype.addListener=i.prototype.on,i.prototype.resume=function(){var t=this._readableState;return t.flowing||(O("resume"),t.flowing=!0,function(t,e){e.resumeScheduled||(e.resumeScheduled=!0,m.nextTick(p,t,e));}(this,t)),this},i.prototype.pause=function(){return O("call pause flowing=%j",this._readableState.flowing),!1!==this._readableState.flowing&&(O("pause"),this._readableState.flowing=!1,this.emit("pause")),this},i.prototype.wrap=function(t){var e=this,n=this._readableState,r=!1;for(var i in t.on("end",(function(){if(O("wrapped end"),n.decoder&&!n.ended){var t=n.decoder.end();t&&t.length&&e.push(t);}e.push(null);})),t.on("data",(function(i){O("wrapped data"),n.decoder&&(i=n.decoder.write(i)),n.objectMode&&null==i||!(n.objectMode||i&&i.length)||e.push(i)||(r=!0,t.pause());})),t)void 0===this[i]&&"function"==typeof t[i]&&(this[i]=function(e){return function(){return t[e].apply(t,arguments)}}(i));for(var o=0;o<U.length;o++)t.on(U[o],this.emit.bind(this,U[o]));return this._read=function(e){O("wrapped _read",e),r&&(r=!1,t.resume());},this},Object.defineProperty(i.prototype,"readableHighWaterMark",{enumerable:!1,get:function(){return this._readableState.highWaterMark}}),i._fromList=g;}).call(this,n(5));},function(t,e,n){t.exports=n(13).EventEmitter;},function(t,e,n){function r(t,e){t.emit("error",e);}var i=n(12);t.exports={destroy:function(t,e){var n=this,o=this._readableState&&this._readableState.destroyed,a=this._writableState&&this._writableState.destroyed;return o||a?(e?e(t):!t||this._writableState&&this._writableState.errorEmitted||i.nextTick(r,this,t),this):(this._readableState&&(this._readableState.destroyed=!0),this._writableState&&(this._writableState.destroyed=!0),this._destroy(t||null,(function(t){!e&&t?(i.nextTick(r,n,t),n._writableState&&(n._writableState.errorEmitted=!0)):e&&e(t);})),this)},undestroy:function(){this._readableState&&(this._readableState.destroyed=!1,this._readableState.reading=!1,this._readableState.ended=!1,this._readableState.endEmitted=!1),this._writableState&&(this._writableState.destroyed=!1,this._writableState.ended=!1,this._writableState.ending=!1,this._writableState.finished=!1,this._writableState.errorEmitted=!1);}};},function(t,e,n){(function(e,r){function i(t){var e=this;this.next=null,this.entry=null,this.finish=function(){!function(t,e,n){var r=t.entry;for(t.entry=null;r;){var i=r.callback;e.pendingcb--,i(n),r=r.next;}e.corkedRequestsFree?e.corkedRequestsFree.next=t:e.corkedRequestsFree=t;}(e,t);};}function o(){}function a(t,e){g=g||n(7),t=t||{};var r=e instanceof g;this.objectMode=!!t.objectMode,r&&(this.objectMode=this.objectMode||!!t.writableObjectMode);var o=t.highWaterMark,a=t.writableHighWaterMark,s=this.objectMode?16:16384;this.highWaterMark=o||0===o?o:r&&(a||0===a)?a:s,this.highWaterMark=Math.floor(this.highWaterMark),this.finalCalled=!1,this.needDrain=!1,this.ending=!1,this.ended=!1,this.finished=!1,this.destroyed=!1;var u=!1===t.decodeStrings;this.decodeStrings=!u,this.defaultEncoding=t.defaultEncoding||"utf8",this.length=0,this.writing=!1,this.corked=0,this.sync=!0,this.bufferProcessing=!1,this.onwrite=function(t){!function(t,e){var n=t._writableState,r=n.sync,i=n.writecb;if(function(t){t.writing=!1,t.writecb=null,t.length-=t.writelen,t.writelen=0;}(n),e)!function(t,e,n,r,i){--e.pendingcb,n?(b.nextTick(i,r),b.nextTick(p,t,e),t._writableState.errorEmitted=!0,t.emit("error",r)):(i(r),t._writableState.errorEmitted=!0,t.emit("error",r),p(t,e));}(t,n,r,e,i);else {var o=h(n);o||n.corked||n.bufferProcessing||!n.bufferedRequest||l(t,n),r?y(c,t,n,o,i):c(t,n,o,i);}}(e,t);},this.writecb=null,this.writelen=0,this.bufferedRequest=null,this.lastBufferedRequest=null,this.pendingcb=0,this.prefinished=!1,this.errorEmitted=!1,this.bufferedRequestCount=0,this.corkedRequestsFree=new i(this);}function s(t){if(g=g||n(7),!(w.call(s,this)||this instanceof g))return new s(t);this._writableState=new a(t,this),this.writable=!0,t&&("function"==typeof t.write&&(this._write=t.write),"function"==typeof t.writev&&(this._writev=t.writev),"function"==typeof t.destroy&&(this._destroy=t.destroy),"function"==typeof t.final&&(this._final=t.final)),_.call(this);}function u(t,e,n,r,i,o){if(!n){var a=function(t,e,n){return t.objectMode||!1===t.decodeStrings||"string"!=typeof e||(e=E.from(e,n)),e}(e,r,i);r!==a&&(n=!0,i="buffer",r=a);}var s=e.objectMode?1:r.length;e.length+=s;var u=e.length<e.highWaterMark;if(u||(e.needDrain=!0),e.writing||e.corked){var c=e.lastBufferedRequest;e.lastBufferedRequest={chunk:r,encoding:i,isBuf:n,callback:o,next:null},c?c.next=e.lastBufferedRequest:e.bufferedRequest=e.lastBufferedRequest,e.bufferedRequestCount+=1;}else f(t,e,!1,s,r,i,o);return u}function f(t,e,n,r,i,o,a){e.writelen=r,e.writecb=a,e.writing=!0,e.sync=!0,n?t._writev(i,e.onwrite):t._write(i,o,e.onwrite),e.sync=!1;}function c(t,e,n,r){n||function(t,e){0===e.length&&e.needDrain&&(e.needDrain=!1,t.emit("drain"));}(t,e),e.pendingcb--,r(),p(t,e);}function l(t,e){e.bufferProcessing=!0;var n=e.bufferedRequest;if(t._writev&&n&&n.next){var r=e.bufferedRequestCount,o=new Array(r),a=e.corkedRequestsFree;a.entry=n;for(var s=0,u=!0;n;)o[s]=n,n.isBuf||(u=!1),n=n.next,s+=1;o.allBuffers=u,f(t,e,!0,e.length,o,"",a.finish),e.pendingcb++,e.lastBufferedRequest=null,a.next?(e.corkedRequestsFree=a.next,a.next=null):e.corkedRequestsFree=new i(e),e.bufferedRequestCount=0;}else {for(;n;){var c=n.chunk,l=n.encoding,h=n.callback;if(f(t,e,!1,e.objectMode?1:c.length,c,l,h),n=n.next,e.bufferedRequestCount--,e.writing)break}null===n&&(e.lastBufferedRequest=null);}e.bufferedRequest=n,e.bufferProcessing=!1;}function h(t){return t.ending&&0===t.length&&null===t.bufferedRequest&&!t.finished&&!t.writing}function d(t,e){t._final((function(n){e.pendingcb--,n&&t.emit("error",n),e.prefinished=!0,t.emit("prefinish"),p(t,e);}));}function p(t,e){var n=h(e);return n&&(function(t,e){e.prefinished||e.finalCalled||("function"==typeof t._final?(e.pendingcb++,e.finalCalled=!0,b.nextTick(d,t,e)):(e.prefinished=!0,t.emit("prefinish")));}(t,e),0===e.pendingcb&&(e.finished=!0,t.emit("finish"))),n}var b=n(12);t.exports=s;var g,y=!e.browser&&["v0.10","v0.9."].indexOf(e.version.slice(0,5))>-1?r:b.nextTick;s.WritableState=a;var v=n(4);v.inherits=n(3);var w,m={deprecate:n(23)},_=n(20),E=n(10).Buffer,x=window.Uint8Array||function(){},S=n(21);v.inherits(s,_),a.prototype.getBuffer=function(){for(var t=this.bufferedRequest,e=[];t;)e.push(t),t=t.next;return e},function(){try{Object.defineProperty(a.prototype,"buffer",{get:m.deprecate((function(){return this.getBuffer()}),"_writableState.buffer is deprecated. Use _writableState.getBuffer instead.","DEP0003")});}catch(t){}}(),"function"==typeof Symbol&&Symbol.hasInstance&&"function"==typeof Function.prototype[Symbol.hasInstance]?(w=Function.prototype[Symbol.hasInstance],Object.defineProperty(s,Symbol.hasInstance,{value:function(t){return !!w.call(this,t)||this===s&&t&&t._writableState instanceof a}})):w=function(t){return t instanceof this},s.prototype.pipe=function(){this.emit("error",new Error("Cannot pipe, not readable"));},s.prototype.write=function(t,e,n){var r=this._writableState,i=!1,a=!r.objectMode&&function(t){return E.isBuffer(t)||t instanceof x}(t);return a&&!E.isBuffer(t)&&(t=function(t){return E.from(t)}(t)),"function"==typeof e&&(n=e,e=null),a?e="buffer":e||(e=r.defaultEncoding),"function"!=typeof n&&(n=o),r.ended?function(t,e){var n=new Error("write after end");t.emit("error",n),b.nextTick(e,n);}(this,n):(a||function(t,e,n,r){var i=!0,o=!1;return null===n?o=new TypeError("May not write null values to stream"):"string"==typeof n||void 0===n||e.objectMode||(o=new TypeError("Invalid non-string/buffer chunk")),o&&(t.emit("error",o),b.nextTick(r,o),i=!1),i}(this,r,t,n))&&(r.pendingcb++,i=u(this,r,a,t,e,n)),i},s.prototype.cork=function(){this._writableState.corked++;},s.prototype.uncork=function(){var t=this._writableState;t.corked&&(t.corked--,t.writing||t.corked||t.finished||t.bufferProcessing||!t.bufferedRequest||l(this,t));},s.prototype.setDefaultEncoding=function(t){if("string"==typeof t&&(t=t.toLowerCase()),!(["hex","utf8","utf-8","ascii","binary","base64","ucs2","ucs-2","utf16le","utf-16le","raw"].indexOf((t+"").toLowerCase())>-1))throw new TypeError("Unknown encoding: "+t);return this._writableState.defaultEncoding=t,this},Object.defineProperty(s.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),s.prototype._write=function(t,e,n){n(new Error("_write() is not implemented"));},s.prototype._writev=null,s.prototype.end=function(t,e,n){var r=this._writableState;"function"==typeof t?(n=t,t=null,e=null):"function"==typeof e&&(n=e,e=null),null!=t&&this.write(t,e),r.corked&&(r.corked=1,this.uncork()),r.ending||r.finished||function(t,e,n){e.ending=!0,p(t,e),n&&(e.finished?b.nextTick(n):t.once("finish",n)),e.ended=!0,t.writable=!1;}(this,r,n);},Object.defineProperty(s.prototype,"destroyed",{get:function(){return void 0!==this._writableState&&this._writableState.destroyed},set:function(t){this._writableState&&(this._writableState.destroyed=t);}}),s.prototype.destroy=S.destroy,s.prototype._undestroy=S.undestroy,s.prototype._destroy=function(t,e){this.end(),e(t);};}).call(this,n(5),n(18).setImmediate);},function(t,e){function n(t){try{if(!window.localStorage)return !1}catch(t){return !1}var e=window.localStorage[t];return null!=e&&"true"===String(e).toLowerCase()}t.exports=function(t,e){if(n("noDeprecation"))return t;var r=!1;return function(){if(!r){if(n("throwDeprecation"))throw new Error(e);n("traceDeprecation")?console.trace(e):console.warn(e),r=!0;}return t.apply(this,arguments)}};},function(t,e,n){function r(t,e){var n=this._transformState;n.transforming=!1;var r=n.writecb;if(!r)return this.emit("error",new Error("write callback called multiple times"));n.writechunk=null,n.writecb=null,null!=e&&this.push(e),r(t);var i=this._readableState;i.reading=!1,(i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark);}function i(t){if(!(this instanceof i))return new i(t);s.call(this,t),this._transformState={afterTransform:r.bind(this),needTransform:!1,transforming:!1,writecb:null,writechunk:null,writeencoding:null},this._readableState.needReadable=!0,this._readableState.sync=!1,t&&("function"==typeof t.transform&&(this._transform=t.transform),"function"==typeof t.flush&&(this._flush=t.flush)),this.on("prefinish",o);}function o(){var t=this;"function"==typeof this._flush?this._flush((function(e,n){a(t,e,n);})):a(this,null,null);}function a(t,e,n){if(e)return t.emit("error",e);if(null!=n&&t.push(n),t._writableState.length)throw new Error("Calling transform done when ws.length != 0");if(t._transformState.transforming)throw new Error("Calling transform done when still transforming");return t.push(null)}t.exports=i;var s=n(7),u=n(4);u.inherits=n(3),u.inherits(i,s),i.prototype.push=function(t,e){return this._transformState.needTransform=!1,s.prototype.push.call(this,t,e)},i.prototype._transform=function(t,e,n){throw new Error("_transform() is not implemented")},i.prototype._write=function(t,e,n){var r=this._transformState;if(r.writecb=n,r.writechunk=t,r.writeencoding=e,!r.transforming){var i=this._readableState;(r.needTransform||i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark);}},i.prototype._read=function(t){var e=this._transformState;null!==e.writechunk&&e.writecb&&!e.transforming?(e.transforming=!0,this._transform(e.writechunk,e.writeencoding,e.afterTransform)):e.needTransform=!0;},i.prototype._destroy=function(t,e){var n=this;s.prototype._destroy.call(this,t,(function(t){e(t),n.emit("close");}));};},function(t,e,n){(function(e){function r(t,e){t=t||{};var r=e instanceof(_=_||n(8));this.objectMode=!!t.objectMode,r&&(this.objectMode=this.objectMode||!!t.readableObjectMode);var i=t.highWaterMark,o=t.readableHighWaterMark,a=this.objectMode?16:16384;this.highWaterMark=i||0===i?i:r&&(o||0===o)?o:a,this.highWaterMark=Math.floor(this.highWaterMark),this.buffer=new A,this.length=0,this.pipes=null,this.pipesCount=0,this.flowing=null,this.ended=!1,this.endEmitted=!1,this.reading=!1,this.sync=!0,this.needReadable=!1,this.emittedReadable=!1,this.readableListening=!1,this.resumeScheduled=!1,this.destroyed=!1,this.defaultEncoding=t.defaultEncoding||"utf8",this.awaitDrain=0,this.readingMore=!1,this.decoder=null,this.encoding=null,t.encoding&&(R||(R=n(14).StringDecoder),this.decoder=new R(t.encoding),this.encoding=t.encoding);}function i(t){if(_=_||n(8),!(this instanceof i))return new i(t);this._readableState=new r(t,this),this.readable=!0,t&&("function"==typeof t.read&&(this._read=t.read),"function"==typeof t.destroy&&(this._destroy=t.destroy)),S.call(this);}function o(t,e,n,r,i){var o,u=t._readableState;null===e?(u.reading=!1,function(t,e){if(!e.ended){if(e.decoder){var n=e.decoder.end();n&&n.length&&(e.buffer.push(n),e.length+=e.objectMode?1:n.length);}e.ended=!0,f(t);}}(t,u)):(i||(o=s(u,e)),o?t.emit("error",o):u.objectMode||e&&e.length>0?("string"==typeof e||u.objectMode||Object.getPrototypeOf(e)===k.prototype||(e=function(t){return k.from(t)}(e)),r?u.endEmitted?t.emit("error",new Error("stream.unshift() after end event")):a(t,u,e,!0):u.ended?t.emit("error",new Error("stream.push() after EOF")):(u.reading=!1,u.decoder&&!n?(e=u.decoder.write(e),u.objectMode||0!==e.length?a(t,u,e,!1):l(t,u)):a(t,u,e,!1))):r||(u.reading=!1));return function(t){return !t.ended&&(t.needReadable||t.length<t.highWaterMark||0===t.length)}(u)}function a(t,e,n,r){e.flowing&&0===e.length&&!e.sync?(t.emit("data",n),t.read(0)):(e.length+=e.objectMode?1:n.length,r?e.buffer.unshift(n):e.buffer.push(n),e.needReadable&&f(t)),l(t,e);}function s(t,e){var n;return function(t){return k.isBuffer(t)||t instanceof T}(e)||"string"==typeof e||void 0===e||t.objectMode||(n=new TypeError("Invalid non-string/buffer chunk")),n}function u(t,e){return t<=0||0===e.length&&e.ended?0:e.objectMode?1:t!=t?e.flowing&&e.length?e.buffer.head.data.length:e.length:(t>e.highWaterMark&&(e.highWaterMark=function(t){return t>=L?t=L:(t--,t|=t>>>1,t|=t>>>2,t|=t>>>4,t|=t>>>8,t|=t>>>16,t++),t}(t)),t<=e.length?t:e.ended?e.length:(e.needReadable=!0,0))}function f(t){var e=t._readableState;e.needReadable=!1,e.emittedReadable||(O("emitReadable",e.flowing),e.emittedReadable=!0,e.sync?m.nextTick(c,t):c(t));}function c(t){O("emit readable"),t.emit("readable"),b(t);}function l(t,e){e.readingMore||(e.readingMore=!0,m.nextTick(h,t,e));}function h(t,e){for(var n=e.length;!e.reading&&!e.flowing&&!e.ended&&e.length<e.highWaterMark&&(O("maybeReadMore read 0"),t.read(0),n!==e.length);)n=e.length;e.readingMore=!1;}function d(t){O("readable nexttick read 0"),t.read(0);}function p(t,e){e.reading||(O("resume read 0"),t.read(0)),e.resumeScheduled=!1,e.awaitDrain=0,t.emit("resume"),b(t),e.flowing&&!e.reading&&t.read(0);}function b(t){var e=t._readableState;for(O("flow",e.flowing);e.flowing&&null!==t.read(););}function g(t,e){return 0===e.length?null:(e.objectMode?n=e.buffer.shift():!t||t>=e.length?(n=e.decoder?e.buffer.join(""):1===e.buffer.length?e.buffer.head.data:e.buffer.concat(e.length),e.buffer.clear()):n=function(t,e,n){var r;return t<e.head.data.length?(r=e.head.data.slice(0,t),e.head.data=e.head.data.slice(t)):r=t===e.head.data.length?e.shift():n?function(t,e){var n=e.head,r=1,i=n.data;for(t-=i.length;n=n.next;){var o=n.data,a=t>o.length?o.length:t;if(a===o.length?i+=o:i+=o.slice(0,t),0==(t-=a)){a===o.length?(++r,n.next?e.head=n.next:e.head=e.tail=null):(e.head=n,n.data=o.slice(a));break}++r;}return e.length-=r,i}(t,e):function(t,e){var n=k.allocUnsafe(t),r=e.head,i=1;for(r.data.copy(n),t-=r.data.length;r=r.next;){var o=r.data,a=t>o.length?o.length:t;if(o.copy(n,n.length-t,0,a),0==(t-=a)){a===o.length?(++i,r.next?e.head=r.next:e.head=e.tail=null):(e.head=r,r.data=o.slice(a));break}++i;}return e.length-=i,n}(t,e),r}(t,e.buffer,e.decoder),n);var n;}function y(t){var e=t._readableState;if(e.length>0)throw new Error('"endReadable()" called on non-empty stream');e.endEmitted||(e.ended=!0,m.nextTick(v,e,t));}function v(t,e){t.endEmitted||0!==t.length||(t.endEmitted=!0,e.readable=!1,e.emit("end"));}function w(t,e){for(var n=0,r=t.length;n<r;n++)if(t[n]===e)return n;return -1}var m=n(15);t.exports=i;var _,E=n(16);i.ReadableState=r;var x=(n(13).EventEmitter,function(t,e){return t.listeners(e).length}),S=n(26),k=n(9).Buffer,T=window.Uint8Array||function(){},M=n(4);M.inherits=n(3);var j=n(48),O=void 0;O=j&&j.debuglog?j.debuglog("stream"):function(){};var R,A=n(49),B=n(27);M.inherits(i,S);var U=["error","close","destroy","pause","resume"];Object.defineProperty(i.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&this._readableState.destroyed},set:function(t){this._readableState&&(this._readableState.destroyed=t);}}),i.prototype.destroy=B.destroy,i.prototype._undestroy=B.undestroy,i.prototype._destroy=function(t,e){this.push(null),e(t);},i.prototype.push=function(t,e){var n,r=this._readableState;return r.objectMode?n=!0:"string"==typeof t&&((e=e||r.defaultEncoding)!==r.encoding&&(t=k.from(t,e),e=""),n=!0),o(this,t,e,!1,n)},i.prototype.unshift=function(t){return o(this,t,null,!0,!1)},i.prototype.isPaused=function(){return !1===this._readableState.flowing},i.prototype.setEncoding=function(t){return R||(R=n(14).StringDecoder),this._readableState.decoder=new R(t),this._readableState.encoding=t,this};var L=8388608;i.prototype.read=function(t){O("read",t),t=parseInt(t,10);var e=this._readableState,n=t;if(0!==t&&(e.emittedReadable=!1),0===t&&e.needReadable&&(e.length>=e.highWaterMark||e.ended))return O("read: emitReadable",e.length,e.ended),0===e.length&&e.ended?y(this):f(this),null;if(0===(t=u(t,e))&&e.ended)return 0===e.length&&y(this),null;var r,i=e.needReadable;return O("need readable",i),(0===e.length||e.length-t<e.highWaterMark)&&O("length less than watermark",i=!0),e.ended||e.reading?O("reading or ended",i=!1):i&&(O("do read"),e.reading=!0,e.sync=!0,0===e.length&&(e.needReadable=!0),this._read(e.highWaterMark),e.sync=!1,e.reading||(t=u(n,e))),null===(r=t>0?g(t,e):null)?(e.needReadable=!0,t=0):e.length-=t,0===e.length&&(e.ended||(e.needReadable=!0),n!==t&&e.ended&&y(this)),null!==r&&this.emit("data",r),r},i.prototype._read=function(t){this.emit("error",new Error("_read() is not implemented"));},i.prototype.pipe=function(t,n){function r(t,e){O("onunpipe"),t===l&&e&&!1===e.hasUnpiped&&(e.hasUnpiped=!0,o());}function i(){O("onend"),t.end();}function o(){O("cleanup"),t.removeListener("close",u),t.removeListener("finish",f),t.removeListener("drain",p),t.removeListener("error",s),t.removeListener("unpipe",r),l.removeListener("end",i),l.removeListener("end",c),l.removeListener("data",a),g=!0,!h.awaitDrain||t._writableState&&!t._writableState.needDrain||p();}function a(e){O("ondata"),y=!1,!1!==t.write(e)||y||((1===h.pipesCount&&h.pipes===t||h.pipesCount>1&&-1!==w(h.pipes,t))&&!g&&(O("false write response, pause",l._readableState.awaitDrain),l._readableState.awaitDrain++,y=!0),l.pause());}function s(e){O("onerror",e),c(),t.removeListener("error",s),0===x(t,"error")&&t.emit("error",e);}function u(){t.removeListener("finish",f),c();}function f(){O("onfinish"),t.removeListener("close",u),c();}function c(){O("unpipe"),l.unpipe(t);}var l=this,h=this._readableState;switch(h.pipesCount){case 0:h.pipes=t;break;case 1:h.pipes=[h.pipes,t];break;default:h.pipes.push(t);}h.pipesCount+=1,O("pipe count=%d opts=%j",h.pipesCount,n);var d=(!n||!1!==n.end)&&t!==e.stdout&&t!==e.stderr?i:c;h.endEmitted?m.nextTick(d):l.once("end",d),t.on("unpipe",r);var p=function(t){return function(){var e=t._readableState;O("pipeOnDrain",e.awaitDrain),e.awaitDrain&&e.awaitDrain--,0===e.awaitDrain&&x(t,"data")&&(e.flowing=!0,b(t));}}(l);t.on("drain",p);var g=!1,y=!1;return l.on("data",a),function(t,e,n){if("function"==typeof t.prependListener)return t.prependListener(e,n);t._events&&t._events[e]?E(t._events[e])?t._events[e].unshift(n):t._events[e]=[n,t._events[e]]:t.on(e,n);}(t,"error",s),t.once("close",u),t.once("finish",f),t.emit("pipe",l),h.flowing||(O("pipe resume"),l.resume()),t},i.prototype.unpipe=function(t){var e=this._readableState,n={hasUnpiped:!1};if(0===e.pipesCount)return this;if(1===e.pipesCount)return t&&t!==e.pipes||(t||(t=e.pipes),e.pipes=null,e.pipesCount=0,e.flowing=!1,t&&t.emit("unpipe",this,n)),this;if(!t){var r=e.pipes,i=e.pipesCount;e.pipes=null,e.pipesCount=0,e.flowing=!1;for(var o=0;o<i;o++)r[o].emit("unpipe",this,n);return this}var a=w(e.pipes,t);return -1===a||(e.pipes.splice(a,1),e.pipesCount-=1,1===e.pipesCount&&(e.pipes=e.pipes[0]),t.emit("unpipe",this,n)),this},i.prototype.on=function(t,e){var n=S.prototype.on.call(this,t,e);if("data"===t)!1!==this._readableState.flowing&&this.resume();else if("readable"===t){var r=this._readableState;r.endEmitted||r.readableListening||(r.readableListening=r.needReadable=!0,r.emittedReadable=!1,r.reading?r.length&&f(this):m.nextTick(d,this));}return n},i.prototype.addListener=i.prototype.on,i.prototype.resume=function(){var t=this._readableState;return t.flowing||(O("resume"),t.flowing=!0,function(t,e){e.resumeScheduled||(e.resumeScheduled=!0,m.nextTick(p,t,e));}(this,t)),this},i.prototype.pause=function(){return O("call pause flowing=%j",this._readableState.flowing),!1!==this._readableState.flowing&&(O("pause"),this._readableState.flowing=!1,this.emit("pause")),this},i.prototype.wrap=function(t){var e=this,n=this._readableState,r=!1;for(var i in t.on("end",(function(){if(O("wrapped end"),n.decoder&&!n.ended){var t=n.decoder.end();t&&t.length&&e.push(t);}e.push(null);})),t.on("data",(function(i){O("wrapped data"),n.decoder&&(i=n.decoder.write(i)),n.objectMode&&null==i||!(n.objectMode||i&&i.length)||e.push(i)||(r=!0,t.pause());})),t)void 0===this[i]&&"function"==typeof t[i]&&(this[i]=function(e){return function(){return t[e].apply(t,arguments)}}(i));for(var o=0;o<U.length;o++)t.on(U[o],this.emit.bind(this,U[o]));return this._read=function(e){O("wrapped _read",e),r&&(r=!1,t.resume());},this},Object.defineProperty(i.prototype,"readableHighWaterMark",{enumerable:!1,get:function(){return this._readableState.highWaterMark}}),i._fromList=g;}).call(this,n(5));},function(t,e,n){t.exports=n(13).EventEmitter;},function(t,e,n){function r(t,e){t.emit("error",e);}var i=n(15);t.exports={destroy:function(t,e){var n=this,o=this._readableState&&this._readableState.destroyed,a=this._writableState&&this._writableState.destroyed;return o||a?(e?e(t):!t||this._writableState&&this._writableState.errorEmitted||i.nextTick(r,this,t),this):(this._readableState&&(this._readableState.destroyed=!0),this._writableState&&(this._writableState.destroyed=!0),this._destroy(t||null,(function(t){!e&&t?(i.nextTick(r,n,t),n._writableState&&(n._writableState.errorEmitted=!0)):e&&e(t);})),this)},undestroy:function(){this._readableState&&(this._readableState.destroyed=!1,this._readableState.reading=!1,this._readableState.ended=!1,this._readableState.endEmitted=!1),this._writableState&&(this._writableState.destroyed=!1,this._writableState.ended=!1,this._writableState.ending=!1,this._writableState.finished=!1,this._writableState.errorEmitted=!1);}};},function(t,e,n){(function(e,r){function i(t){var e=this;this.next=null,this.entry=null,this.finish=function(){!function(t,e,n){var r=t.entry;for(t.entry=null;r;){var i=r.callback;e.pendingcb--,i(n),r=r.next;}e.corkedRequestsFree?e.corkedRequestsFree.next=t:e.corkedRequestsFree=t;}(e,t);};}function o(){}function a(t,e){g=g||n(8),t=t||{};var r=e instanceof g;this.objectMode=!!t.objectMode,r&&(this.objectMode=this.objectMode||!!t.writableObjectMode);var o=t.highWaterMark,a=t.writableHighWaterMark,s=this.objectMode?16:16384;this.highWaterMark=o||0===o?o:r&&(a||0===a)?a:s,this.highWaterMark=Math.floor(this.highWaterMark),this.finalCalled=!1,this.needDrain=!1,this.ending=!1,this.ended=!1,this.finished=!1,this.destroyed=!1;var u=!1===t.decodeStrings;this.decodeStrings=!u,this.defaultEncoding=t.defaultEncoding||"utf8",this.length=0,this.writing=!1,this.corked=0,this.sync=!0,this.bufferProcessing=!1,this.onwrite=function(t){!function(t,e){var n=t._writableState,r=n.sync,i=n.writecb;if(function(t){t.writing=!1,t.writecb=null,t.length-=t.writelen,t.writelen=0;}(n),e)!function(t,e,n,r,i){--e.pendingcb,n?(b.nextTick(i,r),b.nextTick(p,t,e),t._writableState.errorEmitted=!0,t.emit("error",r)):(i(r),t._writableState.errorEmitted=!0,t.emit("error",r),p(t,e));}(t,n,r,e,i);else {var o=h(n);o||n.corked||n.bufferProcessing||!n.bufferedRequest||l(t,n),r?y(c,t,n,o,i):c(t,n,o,i);}}(e,t);},this.writecb=null,this.writelen=0,this.bufferedRequest=null,this.lastBufferedRequest=null,this.pendingcb=0,this.prefinished=!1,this.errorEmitted=!1,this.bufferedRequestCount=0,this.corkedRequestsFree=new i(this);}function s(t){if(g=g||n(8),!(w.call(s,this)||this instanceof g))return new s(t);this._writableState=new a(t,this),this.writable=!0,t&&("function"==typeof t.write&&(this._write=t.write),"function"==typeof t.writev&&(this._writev=t.writev),"function"==typeof t.destroy&&(this._destroy=t.destroy),"function"==typeof t.final&&(this._final=t.final)),_.call(this);}function u(t,e,n,r,i,o){if(!n){var a=function(t,e,n){return t.objectMode||!1===t.decodeStrings||"string"!=typeof e||(e=E.from(e,n)),e}(e,r,i);r!==a&&(n=!0,i="buffer",r=a);}var s=e.objectMode?1:r.length;e.length+=s;var u=e.length<e.highWaterMark;if(u||(e.needDrain=!0),e.writing||e.corked){var c=e.lastBufferedRequest;e.lastBufferedRequest={chunk:r,encoding:i,isBuf:n,callback:o,next:null},c?c.next=e.lastBufferedRequest:e.bufferedRequest=e.lastBufferedRequest,e.bufferedRequestCount+=1;}else f(t,e,!1,s,r,i,o);return u}function f(t,e,n,r,i,o,a){e.writelen=r,e.writecb=a,e.writing=!0,e.sync=!0,n?t._writev(i,e.onwrite):t._write(i,o,e.onwrite),e.sync=!1;}function c(t,e,n,r){n||function(t,e){0===e.length&&e.needDrain&&(e.needDrain=!1,t.emit("drain"));}(t,e),e.pendingcb--,r(),p(t,e);}function l(t,e){e.bufferProcessing=!0;var n=e.bufferedRequest;if(t._writev&&n&&n.next){var r=e.bufferedRequestCount,o=new Array(r),a=e.corkedRequestsFree;a.entry=n;for(var s=0,u=!0;n;)o[s]=n,n.isBuf||(u=!1),n=n.next,s+=1;o.allBuffers=u,f(t,e,!0,e.length,o,"",a.finish),e.pendingcb++,e.lastBufferedRequest=null,a.next?(e.corkedRequestsFree=a.next,a.next=null):e.corkedRequestsFree=new i(e),e.bufferedRequestCount=0;}else {for(;n;){var c=n.chunk,l=n.encoding,h=n.callback;if(f(t,e,!1,e.objectMode?1:c.length,c,l,h),n=n.next,e.bufferedRequestCount--,e.writing)break}null===n&&(e.lastBufferedRequest=null);}e.bufferedRequest=n,e.bufferProcessing=!1;}function h(t){return t.ending&&0===t.length&&null===t.bufferedRequest&&!t.finished&&!t.writing}function d(t,e){t._final((function(n){e.pendingcb--,n&&t.emit("error",n),e.prefinished=!0,t.emit("prefinish"),p(t,e);}));}function p(t,e){var n=h(e);return n&&(function(t,e){e.prefinished||e.finalCalled||("function"==typeof t._final?(e.pendingcb++,e.finalCalled=!0,b.nextTick(d,t,e)):(e.prefinished=!0,t.emit("prefinish")));}(t,e),0===e.pendingcb&&(e.finished=!0,t.emit("finish"))),n}var b=n(15);t.exports=s;var g,y=!e.browser&&["v0.10","v0.9."].indexOf(e.version.slice(0,5))>-1?r:b.nextTick;s.WritableState=a;var v=n(4);v.inherits=n(3);var w,m={deprecate:n(23)},_=n(26),E=n(9).Buffer,x=window.Uint8Array||function(){},S=n(27);v.inherits(s,_),a.prototype.getBuffer=function(){for(var t=this.bufferedRequest,e=[];t;)e.push(t),t=t.next;return e},function(){try{Object.defineProperty(a.prototype,"buffer",{get:m.deprecate((function(){return this.getBuffer()}),"_writableState.buffer is deprecated. Use _writableState.getBuffer instead.","DEP0003")});}catch(t){}}(),"function"==typeof Symbol&&Symbol.hasInstance&&"function"==typeof Function.prototype[Symbol.hasInstance]?(w=Function.prototype[Symbol.hasInstance],Object.defineProperty(s,Symbol.hasInstance,{value:function(t){return !!w.call(this,t)||this===s&&t&&t._writableState instanceof a}})):w=function(t){return t instanceof this},s.prototype.pipe=function(){this.emit("error",new Error("Cannot pipe, not readable"));},s.prototype.write=function(t,e,n){var r=this._writableState,i=!1,a=!r.objectMode&&function(t){return E.isBuffer(t)||t instanceof x}(t);return a&&!E.isBuffer(t)&&(t=function(t){return E.from(t)}(t)),"function"==typeof e&&(n=e,e=null),a?e="buffer":e||(e=r.defaultEncoding),"function"!=typeof n&&(n=o),r.ended?function(t,e){var n=new Error("write after end");t.emit("error",n),b.nextTick(e,n);}(this,n):(a||function(t,e,n,r){var i=!0,o=!1;return null===n?o=new TypeError("May not write null values to stream"):"string"==typeof n||void 0===n||e.objectMode||(o=new TypeError("Invalid non-string/buffer chunk")),o&&(t.emit("error",o),b.nextTick(r,o),i=!1),i}(this,r,t,n))&&(r.pendingcb++,i=u(this,r,a,t,e,n)),i},s.prototype.cork=function(){this._writableState.corked++;},s.prototype.uncork=function(){var t=this._writableState;t.corked&&(t.corked--,t.writing||t.corked||t.finished||t.bufferProcessing||!t.bufferedRequest||l(this,t));},s.prototype.setDefaultEncoding=function(t){if("string"==typeof t&&(t=t.toLowerCase()),!(["hex","utf8","utf-8","ascii","binary","base64","ucs2","ucs-2","utf16le","utf-16le","raw"].indexOf((t+"").toLowerCase())>-1))throw new TypeError("Unknown encoding: "+t);return this._writableState.defaultEncoding=t,this},Object.defineProperty(s.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),s.prototype._write=function(t,e,n){n(new Error("_write() is not implemented"));},s.prototype._writev=null,s.prototype.end=function(t,e,n){var r=this._writableState;"function"==typeof t?(n=t,t=null,e=null):"function"==typeof e&&(n=e,e=null),null!=t&&this.write(t,e),r.corked&&(r.corked=1,this.uncork()),r.ending||r.finished||function(t,e,n){e.ending=!0,p(t,e),n&&(e.finished?b.nextTick(n):t.once("finish",n)),e.ended=!0,t.writable=!1;}(this,r,n);},Object.defineProperty(s.prototype,"destroyed",{get:function(){return void 0!==this._writableState&&this._writableState.destroyed},set:function(t){this._writableState&&(this._writableState.destroyed=t);}}),s.prototype.destroy=S.destroy,s.prototype._undestroy=S.undestroy,s.prototype._destroy=function(t,e){this.end(),e(t);};}).call(this,n(5),n(18).setImmediate);},function(t,e,n){function r(t,e){var n=this._transformState;n.transforming=!1;var r=n.writecb;if(!r)return this.emit("error",new Error("write callback called multiple times"));n.writechunk=null,n.writecb=null,null!=e&&this.push(e),r(t);var i=this._readableState;i.reading=!1,(i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark);}function i(t){if(!(this instanceof i))return new i(t);s.call(this,t),this._transformState={afterTransform:r.bind(this),needTransform:!1,transforming:!1,writecb:null,writechunk:null,writeencoding:null},this._readableState.needReadable=!0,this._readableState.sync=!1,t&&("function"==typeof t.transform&&(this._transform=t.transform),"function"==typeof t.flush&&(this._flush=t.flush)),this.on("prefinish",o);}function o(){var t=this;"function"==typeof this._flush?this._flush((function(e,n){a(t,e,n);})):a(this,null,null);}function a(t,e,n){if(e)return t.emit("error",e);if(null!=n&&t.push(n),t._writableState.length)throw new Error("Calling transform done when ws.length != 0");if(t._transformState.transforming)throw new Error("Calling transform done when still transforming");return t.push(null)}t.exports=i;var s=n(8),u=n(4);u.inherits=n(3),u.inherits(i,s),i.prototype.push=function(t,e){return this._transformState.needTransform=!1,s.prototype.push.call(this,t,e)},i.prototype._transform=function(t,e,n){throw new Error("_transform() is not implemented")},i.prototype._write=function(t,e,n){var r=this._transformState;if(r.writecb=n,r.writechunk=t,r.writeencoding=e,!r.transforming){var i=this._readableState;(r.needTransform||i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark);}},i.prototype._read=function(t){var e=this._transformState;null!==e.writechunk&&e.writecb&&!e.transforming?(e.transforming=!0,this._transform(e.writechunk,e.writeencoding,e.afterTransform)):e.needTransform=!0;},i.prototype._destroy=function(t,e){var n=this;s.prototype._destroy.call(this,t,(function(t){e(t),n.emit("close");}));};},function(t,e,n){(function(t){var r=n(0),i=n.n(r),o=n(1),a=n.n(o),s=n(2);e.a={pack:!0,encode:!0,compress:function(){var e=a()(i.a.mark((function e(n){var r;return i.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,s.a.lzma();case 2:return r=e.sent,e.abrupt("return",new Promise((function(e,i){return r.compress(n,9,(function(n,r){return r?i(r):e(t.from(n))}))})));case 4:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}(),decompress:function(){var e=a()(i.a.mark((function e(n){var r;return i.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,s.a.lzma();case 2:return r=e.sent,e.abrupt("return",new Promise((function(e,i){return r.decompress(n,(function(n,r){return r?i(r):e(t.from(n))}))})));case 4:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}()};}).call(this,n(6).Buffer);},function(t,e,n){(function(t){var r=n(0),i=n.n(r),o=n(1),a=n.n(o),s=n(2);e.a={pack:!1,encode:!0,compress:function(){var e=a()(i.a.mark((function e(n){return i.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.t0=t,e.next=3,s.a.lzstring();case 3:return e.t1=e.sent.compressToUint8Array(n),e.abrupt("return",e.t0.from.call(e.t0,e.t1));case 5:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}(),decompress:function(){var t=a()(i.a.mark((function t(e){return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,s.a.lzstring();case 2:return t.abrupt("return",t.sent.decompressFromUint8Array(e));case 3:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}()};}).call(this,n(6).Buffer);},function(t,e,n){(function(t){var r=n(0),i=n.n(r),o=n(1),a=n.n(o),s=n(2);e.a={pack:!0,encode:!0,compress:function(){var e=a()(i.a.mark((function e(n){return i.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.t0=t,e.next=3,s.a.lzw();case 3:return e.t1=e.sent.encode(n.toString("binary")),e.abrupt("return",e.t0.from.call(e.t0,e.t1));case 5:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}(),decompress:function(){var e=a()(i.a.mark((function e(n){return i.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.t0=t,e.next=3,s.a.lzw();case 3:return e.t1=e.sent.decode(n),e.abrupt("return",e.t0.from.call(e.t0,e.t1,"binary"));case 5:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}()};}).call(this,n(6).Buffer);},function(t,e,n){var r=function(t){function e(t,e,n,i){var o=e&&e.prototype instanceof r?e:r,a=Object.create(o.prototype),s=new h(i||[]);return a._invoke=u(t,n,s),a}function n(t,e,n){try{return {type:"normal",arg:t.call(e,n)}}catch(t){return {type:"throw",arg:t}}}function r(){}function i(){}function o(){}function a(t){["next","throw","return"].forEach((function(e){t[e]=function(t){return this._invoke(e,t)};}));}function s(t){function e(r,i,o,a){var s=n(t[r],t,i);if("throw"!==s.type){var u=s.arg,f=u.value;return f&&"object"==typeof f&&y.call(f,"__await")?Promise.resolve(f.__await).then((function(t){e("next",t,o,a);}),(function(t){e("throw",t,o,a);})):Promise.resolve(f).then((function(t){u.value=t,o(u);}),(function(t){return e("throw",t,o,a)}))}a(s.arg);}var r;this._invoke=function(t,n){function i(){return new Promise((function(r,i){e(t,n,r,i);}))}return r=r?r.then(i,i):i()};}function u(t,e,r){var i=E;return function(o,a){if(i===S)throw new Error("Generator is already running");if(i===k){if("throw"===o)throw a;return p()}for(r.method=o,r.arg=a;;){var s=r.delegate;if(s){var u=f(s,r);if(u){if(u===T)continue;return u}}if("next"===r.method)r.sent=r._sent=r.arg;else if("throw"===r.method){if(i===E)throw i=k,r.arg;r.dispatchException(r.arg);}else "return"===r.method&&r.abrupt("return",r.arg);i=S;var c=n(t,e,r);if("normal"===c.type){if(i=r.done?k:x,c.arg===T)continue;return {value:c.arg,done:r.done}}"throw"===c.type&&(i=k,r.method="throw",r.arg=c.arg);}}}function f(t,e){var r=t.iterator[e.method];if(r===b){if(e.delegate=null,"throw"===e.method){if(t.iterator.return&&(e.method="return",e.arg=b,f(t,e),"throw"===e.method))return T;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method");}return T}var i=n(r,t.iterator,e.arg);if("throw"===i.type)return e.method="throw",e.arg=i.arg,e.delegate=null,T;var o=i.arg;return o?o.done?(e[t.resultName]=o.value,e.next=t.nextLoc,"return"!==e.method&&(e.method="next",e.arg=b),e.delegate=null,T):o:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,T)}function c(t){var e={tryLoc:t[0]};1 in t&&(e.catchLoc=t[1]),2 in t&&(e.finallyLoc=t[2],e.afterLoc=t[3]),this.tryEntries.push(e);}function l(t){var e=t.completion||{};e.type="normal",delete e.arg,t.completion=e;}function h(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(c,this),this.reset(!0);}function d(t){if(t){var e=t[w];if(e)return e.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var n=-1,r=function e(){for(;++n<t.length;)if(y.call(t,n))return e.value=t[n],e.done=!1,e;return e.value=b,e.done=!0,e};return r.next=r}}return {next:p}}function p(){return {value:b,done:!0}}var b,g=Object.prototype,y=g.hasOwnProperty,v="function"==typeof Symbol?Symbol:{},w=v.iterator||"@@iterator",m=v.asyncIterator||"@@asyncIterator",_=v.toStringTag||"@@toStringTag";t.wrap=e;var E="suspendedStart",x="suspendedYield",S="executing",k="completed",T={},M={};M[w]=function(){return this};var j=Object.getPrototypeOf,O=j&&j(j(d([])));O&&O!==g&&y.call(O,w)&&(M=O);var R=o.prototype=r.prototype=Object.create(M);return i.prototype=R.constructor=o,o.constructor=i,o[_]=i.displayName="GeneratorFunction",t.isGeneratorFunction=function(t){var e="function"==typeof t&&t.constructor;return !!e&&(e===i||"GeneratorFunction"===(e.displayName||e.name))},t.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,o):(t.__proto__=o,_ in t||(t[_]="GeneratorFunction")),t.prototype=Object.create(R),t},t.awrap=function(t){return {__await:t}},a(s.prototype),s.prototype[m]=function(){return this},t.AsyncIterator=s,t.async=function(n,r,i,o){var a=new s(e(n,r,i,o));return t.isGeneratorFunction(r)?a:a.next().then((function(t){return t.done?t.value:a.next()}))},a(R),R[_]="Generator",R[w]=function(){return this},R.toString=function(){return "[object Generator]"},t.keys=function(t){var e=[];for(var n in t)e.push(n);return e.reverse(),function n(){for(;e.length;){var r=e.pop();if(r in t)return n.value=r,n.done=!1,n}return n.done=!0,n}},t.values=d,h.prototype={constructor:h,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=b,this.done=!1,this.delegate=null,this.method="next",this.arg=b,this.tryEntries.forEach(l),!t)for(var e in this)"t"===e.charAt(0)&&y.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=b);},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(t){function e(e,r){return o.type="throw",o.arg=t,n.next=e,r&&(n.method="next",n.arg=b),!!r}if(this.done)throw t;for(var n=this,r=this.tryEntries.length-1;r>=0;--r){var i=this.tryEntries[r],o=i.completion;if("root"===i.tryLoc)return e("end");if(i.tryLoc<=this.prev){var a=y.call(i,"catchLoc"),s=y.call(i,"finallyLoc");if(a&&s){if(this.prev<i.catchLoc)return e(i.catchLoc,!0);if(this.prev<i.finallyLoc)return e(i.finallyLoc)}else if(a){if(this.prev<i.catchLoc)return e(i.catchLoc,!0)}else {if(!s)throw new Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return e(i.finallyLoc)}}}},abrupt:function(t,e){for(var n=this.tryEntries.length-1;n>=0;--n){var r=this.tryEntries[n];if(r.tryLoc<=this.prev&&y.call(r,"finallyLoc")&&this.prev<r.finallyLoc){var i=r;break}}i&&("break"===t||"continue"===t)&&i.tryLoc<=e&&e<=i.finallyLoc&&(i=null);var o=i?i.completion:{};return o.type=t,o.arg=e,i?(this.method="next",this.next=i.finallyLoc,T):this.complete(o)},complete:function(t,e){if("throw"===t.type)throw t.arg;return "break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&e&&(this.next=e),T},finish:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.finallyLoc===t)return this.complete(n.completion,n.afterLoc),l(n),T}},catch:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.tryLoc===t){var r=n.completion;if("throw"===r.type){var i=r.arg;l(n);}return i}}throw new Error("illegal catch attempt")},delegateYield:function(t,e,n){return this.delegate={iterator:d(t),resultName:e,nextLoc:n},"next"===this.method&&(this.arg=b),T}},t}(t.exports);try{regeneratorRuntime=r;}catch(t){Function("r","regeneratorRuntime = r")(r);}},function(t,e,n){function r(t){var e=t.length;if(e%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var n=t.indexOf("=");return -1===n&&(n=e),[n,n===e?0:4-n%4]}function i(t){return a[t>>18&63]+a[t>>12&63]+a[t>>6&63]+a[63&t]}function o(t,e,n){for(var r,o=[],a=e;a<n;a+=3)r=(t[a]<<16&16711680)+(t[a+1]<<8&65280)+(255&t[a+2]),o.push(i(r));return o.join("")}e.byteLength=function(t){var e=r(t),n=e[0],i=e[1];return 3*(n+i)/4-i},e.toByteArray=function(t){var e,n,i=r(t),o=i[0],a=i[1],f=new u(function(t,e,n){return 3*(e+n)/4-n}(0,o,a)),c=0,l=a>0?o-4:o;for(n=0;n<l;n+=4)e=s[t.charCodeAt(n)]<<18|s[t.charCodeAt(n+1)]<<12|s[t.charCodeAt(n+2)]<<6|s[t.charCodeAt(n+3)],f[c++]=e>>16&255,f[c++]=e>>8&255,f[c++]=255&e;return 2===a&&(e=s[t.charCodeAt(n)]<<2|s[t.charCodeAt(n+1)]>>4,f[c++]=255&e),1===a&&(e=s[t.charCodeAt(n)]<<10|s[t.charCodeAt(n+1)]<<4|s[t.charCodeAt(n+2)]>>2,f[c++]=e>>8&255,f[c++]=255&e),f},e.fromByteArray=function(t){for(var e,n=t.length,r=n%3,i=[],s=0,u=n-r;s<u;s+=16383)i.push(o(t,s,s+16383>u?u:s+16383));return 1===r?(e=t[n-1],i.push(a[e>>2]+a[e<<4&63]+"==")):2===r&&(e=(t[n-2]<<8)+t[n-1],i.push(a[e>>10]+a[e>>4&63]+a[e<<2&63]+"=")),i.join("")};for(var a=[],s=[],u="undefined"!=typeof Uint8Array?Uint8Array:Array,f="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",c=0,l=f.length;c<l;++c)a[c]=f[c],s[f.charCodeAt(c)]=c;s["-".charCodeAt(0)]=62,s["_".charCodeAt(0)]=63;},function(t,e){e.read=function(t,e,n,r,i){var o,a,s=8*i-r-1,u=(1<<s)-1,f=u>>1,c=-7,l=n?i-1:0,h=n?-1:1,d=t[e+l];for(l+=h,o=d&(1<<-c)-1,d>>=-c,c+=s;c>0;o=256*o+t[e+l],l+=h,c-=8);for(a=o&(1<<-c)-1,o>>=-c,c+=r;c>0;a=256*a+t[e+l],l+=h,c-=8);if(0===o)o=1-f;else {if(o===u)return a?NaN:1/0*(d?-1:1);a+=Math.pow(2,r),o-=f;}return (d?-1:1)*a*Math.pow(2,o-r)},e.write=function(t,e,n,r,i,o){var a,s,u,f=8*o-i-1,c=(1<<f)-1,l=c>>1,h=23===i?Math.pow(2,-24)-Math.pow(2,-77):0,d=r?0:o-1,p=r?1:-1,b=e<0||0===e&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(s=isNaN(e)?1:0,a=c):(a=Math.floor(Math.log(e)/Math.LN2),e*(u=Math.pow(2,-a))<1&&(a--,u*=2),(e+=a+l>=1?h/u:h*Math.pow(2,1-l))*u>=2&&(a++,u/=2),a+l>=c?(s=0,a=c):a+l>=1?(s=(e*u-1)*Math.pow(2,i),a+=l):(s=e*Math.pow(2,l-1)*Math.pow(2,i),a=0));i>=8;t[n+d]=255&s,d+=p,s/=256,i-=8);for(a=a<<i|s,f+=i;f>0;t[n+d]=255&a,d+=p,a/=256,f-=8);t[n+d-p]|=128*b;};},function(t,e,n){var r=n(9).Buffer,i=n(37),o=n(11),a=n(46),s=n(52),u=n(53);t.exports=function(t){var e=[],n=[];return {encode:u(e,(t=t||{forceFloat64:!1,compatibilityMode:!1,disableTimestampEncoding:!1}).forceFloat64,t.compatibilityMode,t.disableTimestampEncoding),decode:s(n),register:function(t,e,n,a){return i(e,"must have a constructor"),i(n,"must have an encode function"),i(t>=0,"must have a non-negative type"),i(a,"must have a decode function"),this.registerEncoder((function(t){return t instanceof e}),(function(e){var i=o(),a=r.allocUnsafe(1);return a.writeInt8(t,0),i.append(a),i.append(n(e)),i})),this.registerDecoder(t,a),this},registerEncoder:function(t,n){return i(t,"must have an encode function"),i(n,"must have an encode function"),e.push({check:t,encode:n}),this},registerDecoder:function(t,e){return i(t>=0,"must have a non-negative type"),i(e,"must have a decode function"),n.push({type:t,decode:e}),this},encoder:a.encoder,decoder:a.decoder,buffer:!0,type:"msgpack5",IncompleteBufferError:s.IncompleteBufferError}};},function(t,e,n){function r(t,e){if(t===e)return 0;for(var n=t.length,r=e.length,i=0,o=Math.min(n,r);i<o;++i)if(t[i]!==e[i]){n=t[i],r=e[i];break}return n<r?-1:r<n?1:0}function i(t){return window.Buffer&&"function"==typeof window.Buffer.isBuffer?window.Buffer.isBuffer(t):!(null==t||!t._isBuffer)}function o(t){return Object.prototype.toString.call(t)}function a(t){return !i(t)&&"function"==typeof window.ArrayBuffer&&("function"==typeof ArrayBuffer.isView?ArrayBuffer.isView(t):!!t&&(t instanceof DataView||!!(t.buffer&&t.buffer instanceof ArrayBuffer)))}function s(t){if(y.isFunction(t)){if(m)return t.name;var e=t.toString().match(E);return e&&e[1]}}function u(t,e){return "string"==typeof t?t.length<e?t:t.slice(0,e):t}function f(t){if(m||!y.isFunction(t))return y.inspect(t);var e=s(t);return "[Function"+(e?": "+e:"")+"]"}function c(t,e,n,r,i){throw new _.AssertionError({message:n,actual:t,expected:e,operator:r,stackStartFunction:i})}function l(t,e){t||c(t,!0,e,"==",_.ok);}function h(t,e,n,s){if(t===e)return !0;if(i(t)&&i(e))return 0===r(t,e);if(y.isDate(t)&&y.isDate(e))return t.getTime()===e.getTime();if(y.isRegExp(t)&&y.isRegExp(e))return t.source===e.source&&t.global===e.global&&t.multiline===e.multiline&&t.lastIndex===e.lastIndex&&t.ignoreCase===e.ignoreCase;if(null!==t&&"object"==typeof t||null!==e&&"object"==typeof e){if(a(t)&&a(e)&&o(t)===o(e)&&!(t instanceof Float32Array||t instanceof Float64Array))return 0===r(new Uint8Array(t.buffer),new Uint8Array(e.buffer));if(i(t)!==i(e))return !1;var u=(s=s||{actual:[],expected:[]}).actual.indexOf(t);return -1!==u&&u===s.expected.indexOf(e)||(s.actual.push(t),s.expected.push(e),function(t,e,n,r){if(null==t||null==e)return !1;if(y.isPrimitive(t)||y.isPrimitive(e))return t===e;if(n&&Object.getPrototypeOf(t)!==Object.getPrototypeOf(e))return !1;var i=d(t),o=d(e);if(i&&!o||!i&&o)return !1;if(i)return t=w.call(t),e=w.call(e),h(t,e,n);var a,s,u=x(t),f=x(e);if(u.length!==f.length)return !1;for(u.sort(),f.sort(),s=u.length-1;s>=0;s--)if(u[s]!==f[s])return !1;for(s=u.length-1;s>=0;s--)if(a=u[s],!h(t[a],e[a],n,r))return !1;return !0}(t,e,n,s))}return n?t===e:t==e}function d(t){return "[object Arguments]"==Object.prototype.toString.call(t)}function p(t,e){if(!t||!e)return !1;if("[object RegExp]"==Object.prototype.toString.call(e))return e.test(t);try{if(t instanceof e)return !0}catch(t){}return !Error.isPrototypeOf(e)&&!0===e.call({},t)}function b(t,e,n,r){var i;if("function"!=typeof e)throw new TypeError('"block" argument must be a function');"string"==typeof n&&(r=n,n=null),i=function(t){var e;try{t();}catch(t){e=t;}return e}(e),r=(n&&n.name?" ("+n.name+").":".")+(r?" "+r:"."),t&&!i&&c(i,n,"Missing expected exception"+r);var o="string"==typeof r,a=!t&&i&&!n;if((!t&&y.isError(i)&&o&&p(i,n)||a)&&c(i,n,"Got unwanted exception"+r),t&&i&&n&&!p(i,n)||!t&&i)throw i}var g=n(38),y=n(17),v=Object.prototype.hasOwnProperty,w=Array.prototype.slice,m="foo"===function(){}.name,_=t.exports=l,E=/\s*function\s+([^\(\s]*)\s*/;_.AssertionError=function(t){this.name="AssertionError",this.actual=t.actual,this.expected=t.expected,this.operator=t.operator,t.message?(this.message=t.message,this.generatedMessage=!1):(this.message=function(t){return u(f(t.actual),128)+" "+t.operator+" "+u(f(t.expected),128)}(this),this.generatedMessage=!0);var e=t.stackStartFunction||c;if(Error.captureStackTrace)Error.captureStackTrace(this,e);else {var n=new Error;if(n.stack){var r=n.stack,i=s(e),o=r.indexOf("\n"+i);if(o>=0){var a=r.indexOf("\n",o+1);r=r.substring(a+1);}this.stack=r;}}},y.inherits(_.AssertionError,Error),_.fail=c,_.ok=l,_.equal=function(t,e,n){t!=e&&c(t,e,n,"==",_.equal);},_.notEqual=function(t,e,n){t==e&&c(t,e,n,"!=",_.notEqual);},_.deepEqual=function(t,e,n){h(t,e,!1)||c(t,e,n,"deepEqual",_.deepEqual);},_.deepStrictEqual=function(t,e,n){h(t,e,!0)||c(t,e,n,"deepStrictEqual",_.deepStrictEqual);},_.notDeepEqual=function(t,e,n){h(t,e,!1)&&c(t,e,n,"notDeepEqual",_.notDeepEqual);},_.notDeepStrictEqual=function t(e,n,r){h(e,n,!0)&&c(e,n,r,"notDeepStrictEqual",t);},_.strictEqual=function(t,e,n){t!==e&&c(t,e,n,"===",_.strictEqual);},_.notStrictEqual=function(t,e,n){t===e&&c(t,e,n,"!==",_.notStrictEqual);},_.throws=function(t,e,n){b(!0,t,e,n);},_.doesNotThrow=function(t,e,n){b(!1,t,e,n);},_.ifError=function(t){if(t)throw t},_.strict=g((function t(e,n){e||c(e,!0,n,"==",t);}),_,{equal:_.strictEqual,deepEqual:_.deepStrictEqual,notEqual:_.notStrictEqual,notDeepEqual:_.notDeepStrictEqual}),_.strict.strict=_.strict;var x=Object.keys||function(t){var e=[];for(var n in t)v.call(t,n)&&e.push(n);return e};},function(t,e,n){function r(t){if(null==t)throw new TypeError("Object.assign cannot be called with null or undefined");return Object(t)}var i=Object.getOwnPropertySymbols,o=Object.prototype.hasOwnProperty,a=Object.prototype.propertyIsEnumerable;t.exports=function(){try{if(!Object.assign)return !1;var t=new String("abc");if(t[5]="de","5"===Object.getOwnPropertyNames(t)[0])return !1;for(var e={},n=0;n<10;n++)e["_"+String.fromCharCode(n)]=n;if("0123456789"!==Object.getOwnPropertyNames(e).map((function(t){return e[t]})).join(""))return !1;var r={};return "abcdefghijklmnopqrst".split("").forEach((function(t){r[t]=t;})),"abcdefghijklmnopqrst"===Object.keys(Object.assign({},r)).join("")}catch(t){return !1}}()?Object.assign:function(t,e){for(var n,s,u=r(t),f=1;f<arguments.length;f++){for(var c in n=Object(arguments[f]))o.call(n,c)&&(u[c]=n[c]);if(i){s=i(n);for(var l=0;l<s.length;l++)a.call(n,s[l])&&(u[s[l]]=n[s[l]]);}}return u};},function(t,e){t.exports=function(t){return t&&"object"==typeof t&&"function"==typeof t.copy&&"function"==typeof t.fill&&"function"==typeof t.readUInt8};},function(t,e,n){(e=t.exports=n(19)).Stream=e,e.Readable=e,e.Writable=n(22),e.Duplex=n(7),e.Transform=n(24),e.PassThrough=n(45);},function(t,e){},function(t,e,n){function r(t,e,n){t.copy(e,n);}var i=n(10).Buffer,o=n(43);t.exports=function(){function t(){(function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")})(this,t),this.head=null,this.tail=null,this.length=0;}return t.prototype.push=function(t){var e={data:t,next:null};this.length>0?this.tail.next=e:this.head=e,this.tail=e,++this.length;},t.prototype.unshift=function(t){var e={data:t,next:this.head};0===this.length&&(this.tail=e),this.head=e,++this.length;},t.prototype.shift=function(){if(0!==this.length){var t=this.head.data;return 1===this.length?this.head=this.tail=null:this.head=this.head.next,--this.length,t}},t.prototype.clear=function(){this.head=this.tail=null,this.length=0;},t.prototype.join=function(t){if(0===this.length)return "";for(var e=this.head,n=""+e.data;e=e.next;)n+=t+e.data;return n},t.prototype.concat=function(t){if(0===this.length)return i.alloc(0);if(1===this.length)return this.head.data;for(var e=i.allocUnsafe(t>>>0),n=this.head,o=0;n;)r(n.data,e,o),o+=n.data.length,n=n.next;return e},t}(),o&&o.inspect&&o.inspect.custom&&(t.exports.prototype[o.inspect.custom]=function(){var t=o.inspect({length:this.length});return this.constructor.name+" "+t});},function(t,e){},function(t,e,n){(function(t){!function(e,n){function r(t){delete s[t];}function i(t){if(u)setTimeout(i,0,t);else {var e=s[t];if(e){u=!0;try{!function(t){var e=t.callback,n=t.args;switch(n.length){case 0:e();break;case 1:e(n[0]);break;case 2:e(n[0],n[1]);break;case 3:e(n[0],n[1],n[2]);break;default:e.apply(void 0,n);}}(e);}finally{r(t),u=!1;}}}}if(!e.setImmediate){var o,a=1,s={},u=!1,f=e.document,c=Object.getPrototypeOf&&Object.getPrototypeOf(e);c=c&&c.setTimeout?c:e,"[object process]"==={}.toString.call(e.process)?o=function(e){t.nextTick((function(){i(e);}));}:function(){if(e.postMessage&&!e.importScripts){var t=!0,n=e.onmessage;return e.onmessage=function(){t=!1;},e.postMessage("","*"),e.onmessage=n,t}}()?function(){var t="setImmediate$"+Math.random()+"$",n=function(n){n.source===e&&"string"==typeof n.data&&0===n.data.indexOf(t)&&i(+n.data.slice(t.length));};e.addEventListener?e.addEventListener("message",n,!1):e.attachEvent("onmessage",n),o=function(n){e.postMessage(t+n,"*");};}():e.MessageChannel?function(){var t=new MessageChannel;t.port1.onmessage=function(t){i(t.data);},o=function(e){t.port2.postMessage(e);};}():f&&"onreadystatechange"in f.createElement("script")?function(){var t=f.documentElement;o=function(e){var n=f.createElement("script");n.onreadystatechange=function(){i(e),n.onreadystatechange=null,t.removeChild(n),n=null;},t.appendChild(n);};}():o=function(t){setTimeout(i,0,t);},c.setImmediate=function(t){"function"!=typeof t&&(t=new Function(""+t));for(var e=new Array(arguments.length-1),n=0;n<e.length;n++)e[n]=arguments[n+1];var r={callback:t,args:e};return s[a]=r,o(a),a++},c.clearImmediate=r;}}("undefined"==typeof self?"undefined"==typeof window?this:window:self);}).call(this,n(5));},function(t,e,n){function r(t){if(!(this instanceof r))return new r(t);i.call(this,t);}t.exports=r;var i=n(24),o=n(4);o.inherits=n(3),o.inherits(r,i),r.prototype._transform=function(t,e,n){n(null,t);};},function(t,e,n){function r(t){(t=t||{}).objectMode=!0,t.highWaterMark=16,a.call(this,t),this._msgpack=t.msgpack;}function i(t){if(!(this instanceof i))return (t=t||{}).msgpack=this,new i(t);r.call(this,t),this._wrap="wrap"in t&&t.wrap;}function o(t){if(!(this instanceof o))return (t=t||{}).msgpack=this,new o(t);r.call(this,t),this._chunks=u(),this._wrap="wrap"in t&&t.wrap;}var a=n(47).Transform,s=n(3),u=n(11);s(r,a),s(i,r),i.prototype._transform=function(t,e,n){var r=null;try{r=this._msgpack.encode(this._wrap?t.value:t).slice(0);}catch(t){return this.emit("error",t),n()}this.push(r),n();},s(o,r),o.prototype._transform=function(t,e,n){t&&this._chunks.append(t);try{var r=this._msgpack.decode(this._chunks);this._wrap&&(r={value:r}),this.push(r);}catch(t){return void(t instanceof this._msgpack.IncompleteBufferError?n():this.emit("error",t))}this._chunks.length>0?this._transform(null,e,n):n();},t.exports.decoder=o,t.exports.encoder=i;},function(t,e,n){(e=t.exports=n(25)).Stream=e,e.Readable=e,e.Writable=n(28),e.Duplex=n(8),e.Transform=n(29),e.PassThrough=n(51);},function(t,e){},function(t,e,n){function r(t,e,n){t.copy(e,n);}var i=n(9).Buffer,o=n(50);t.exports=function(){function t(){(function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")})(this,t),this.head=null,this.tail=null,this.length=0;}return t.prototype.push=function(t){var e={data:t,next:null};this.length>0?this.tail.next=e:this.head=e,this.tail=e,++this.length;},t.prototype.unshift=function(t){var e={data:t,next:this.head};0===this.length&&(this.tail=e),this.head=e,++this.length;},t.prototype.shift=function(){if(0!==this.length){var t=this.head.data;return 1===this.length?this.head=this.tail=null:this.head=this.head.next,--this.length,t}},t.prototype.clear=function(){this.head=this.tail=null,this.length=0;},t.prototype.join=function(t){if(0===this.length)return "";for(var e=this.head,n=""+e.data;e=e.next;)n+=t+e.data;return n},t.prototype.concat=function(t){if(0===this.length)return i.alloc(0);if(1===this.length)return this.head.data;for(var e=i.allocUnsafe(t>>>0),n=this.head,o=0;n;)r(n.data,e,o),o+=n.data.length,n=n.next;return e},t}(),o&&o.inspect&&o.inspect.custom&&(t.exports.prototype[o.inspect.custom]=function(){var t=o.inspect({length:this.length});return this.constructor.name+" "+t});},function(t,e){},function(t,e,n){function r(t){if(!(this instanceof r))return new r(t);i.call(this,t);}t.exports=r;var i=n(29),o=n(4);o.inherits=n(3),o.inherits(r,i),r.prototype._transform=function(t,e,n){n(null,t);};},function(t,e,n){function r(t){Error.call(this),Error.captureStackTrace&&Error.captureStackTrace(this,this.constructor),this.name=this.constructor.name,this.message=t||"unable to decode";}var i=n(11);n(17).inherits(r,Error),t.exports=function(t){function e(t,e){var n=function(t){switch(t){case 196:return 2;case 197:return 3;case 198:return 5;case 199:return 3;case 200:return 4;case 201:return 6;case 202:return 5;case 203:return 9;case 204:return 2;case 205:return 3;case 206:return 5;case 207:return 9;case 208:return 2;case 209:return 3;case 210:return 5;case 211:return 9;case 212:return 3;case 213:return 4;case 214:return 6;case 215:return 10;case 216:return 18;case 217:return 2;case 218:return 3;case 219:return 5;case 222:return 3;default:return -1}}(t);return !(-1!==n&&e<n)}function n(t,e,n){return e>=n+t}function o(t,e){return {value:t,bytesConsumed:e}}function a(t,r){r=void 0===r?0:r;var i=t.length-r;if(i<=0)return null;var a,l,h,d=t.readUInt8(r),p=0;if(!e(d,i))return null;switch(d){case 192:return o(null,1);case 194:return o(!1,1);case 195:return o(!0,1);case 204:return o(p=t.readUInt8(r+1),2);case 205:return o(p=t.readUInt16BE(r+1),3);case 206:return o(p=t.readUInt32BE(r+1),5);case 207:for(h=7;h>=0;h--)p+=t.readUInt8(r+h+1)*Math.pow(2,8*(7-h));return o(p,9);case 208:return o(p=t.readInt8(r+1),2);case 209:return o(p=t.readInt16BE(r+1),3);case 210:return o(p=t.readInt32BE(r+1),5);case 211:return o(p=function(t,e){var n=128==(128&t[e]);if(n)for(var r=1,i=e+7;i>=e;i--){var o=(255^t[i])+r;t[i]=255&o,r=o>>8;}return (4294967296*t.readUInt32BE(e+0)+t.readUInt32BE(e+4))*(n?-1:1)}(t.slice(r+1,r+9),0),9);case 202:return o(p=t.readFloatBE(r+1),5);case 203:return o(p=t.readDoubleBE(r+1),9);case 217:return n(a=t.readUInt8(r+1),i,2)?o(p=t.toString("utf8",r+2,r+2+a),2+a):null;case 218:return n(a=t.readUInt16BE(r+1),i,3)?o(p=t.toString("utf8",r+3,r+3+a),3+a):null;case 219:return n(a=t.readUInt32BE(r+1),i,5)?o(p=t.toString("utf8",r+5,r+5+a),5+a):null;case 196:return n(a=t.readUInt8(r+1),i,2)?o(p=t.slice(r+2,r+2+a),2+a):null;case 197:return n(a=t.readUInt16BE(r+1),i,3)?o(p=t.slice(r+3,r+3+a),3+a):null;case 198:return n(a=t.readUInt32BE(r+1),i,5)?o(p=t.slice(r+5,r+5+a),5+a):null;case 220:return i<3?null:(a=t.readUInt16BE(r+1),s(t,r,a,3));case 221:return i<5?null:(a=t.readUInt32BE(r+1),s(t,r,a,5));case 222:return a=t.readUInt16BE(r+1),u(t,r,a,3);case 223:return a=t.readUInt32BE(r+1),u(t,r,a,5);case 212:return f(t,r,1);case 213:return f(t,r,2);case 214:return f(t,r,4);case 215:return f(t,r,8);case 216:return f(t,r,16);case 199:return a=t.readUInt8(r+1),l=t.readUInt8(r+2),n(a,i,3)?c(t,r,l,a,3):null;case 200:return a=t.readUInt16BE(r+1),l=t.readUInt8(r+3),n(a,i,4)?c(t,r,l,a,4):null;case 201:return a=t.readUInt32BE(r+1),l=t.readUInt8(r+5),n(a,i,6)?c(t,r,l,a,6):null}if(144==(240&d))return s(t,r,a=15&d,1);if(128==(240&d))return u(t,r,a=15&d,1);if(160==(224&d))return n(a=31&d,i,1)?o(p=t.toString("utf8",r+1,r+a+1),a+1):null;if(d>=224)return o(p=d-256,1);if(d<128)return o(d,1);throw new Error("not implemented yet")}function s(t,e,n,r){var i,s=[],u=0;for(e+=r,i=0;i<n;i++){var f=a(t,e);if(!f)return null;s.push(f.value),e+=f.bytesConsumed,u+=f.bytesConsumed;}return o(s,r+u)}function u(t,e,n,r){var i,s={},u=0;for(e+=r,i=0;i<n;i++){var f=a(t,e);if(!f)return null;var c=a(t,e+=f.bytesConsumed);if(!c)return null;s[f.value]=c.value,e+=c.bytesConsumed,u+=f.bytesConsumed+c.bytesConsumed;}return o(s,r+u)}function f(t,e,n){return c(t,e,t.readInt8(e+1),n,2)}function c(e,n,r,i,a){var s,u;if(n+=a,r<0)switch(r){case-1:return function(t,e,n){var r,i=0;switch(e){case 4:r=t.readUInt32BE(0);break;case 8:var a=t.readUInt32BE(0),s=t.readUInt32BE(4);i=a/4,r=(3&a)*Math.pow(2,32)+s;break;case 12:throw new Error("timestamp 96 is not yet implemented")}var u=1e3*r+Math.round(i/1e6);return o(new Date(u),e+n)}(u=e.slice(n,n+i),i,a)}for(s=0;s<t.length;s++)if(r===t[s].type){return u=e.slice(n,n+i),o(t[s].decode(u),a+i)}throw new Error("unable to find ext type "+r)}return function(t){t instanceof i||(t=i().append(t));var e=a(t);if(e)return t.consume(e.bytesConsumed),e.value;throw new r}},t.exports.IncompleteBufferError=r;},function(t,e,n){function r(t,e){var n,r=!0;return Math.fround&&(r=Math.fround(t)!==t),e&&(r=!0),r?((n=i.allocUnsafe(9))[0]=203,n.writeDoubleBE(t,1)):((n=i.allocUnsafe(5))[0]=202,n.writeFloatBE(t,1)),n}var i=n(9).Buffer,o=n(11);t.exports=function(t,e,n,a){function s(t,f){var c,l;if(void 0===t)throw new Error("undefined is not encodable in msgpack!");if(function(t){return t!=t&&"number"==typeof t}(t))throw new Error("NaN is not encodable in msgpack!");if(null===t)(c=i.allocUnsafe(1))[0]=192;else if(!0===t)(c=i.allocUnsafe(1))[0]=195;else if(!1===t)(c=i.allocUnsafe(1))[0]=194;else if("string"==typeof t)(l=i.byteLength(t))<32?((c=i.allocUnsafe(1+l))[0]=160|l,l>0&&c.write(t,1)):l<=255&&!n?((c=i.allocUnsafe(2+l))[0]=217,c[1]=l,c.write(t,2)):l<=65535?((c=i.allocUnsafe(3+l))[0]=218,c.writeUInt16BE(l,1),c.write(t,3)):((c=i.allocUnsafe(5+l))[0]=219,c.writeUInt32BE(l,1),c.write(t,5));else if(t&&(t.readUInt32LE||t instanceof Uint8Array))t instanceof Uint8Array&&(t=i.from(t)),t.length<=255?((c=i.allocUnsafe(2))[0]=196,c[1]=t.length):t.length<=65535?((c=i.allocUnsafe(3))[0]=197,c.writeUInt16BE(t.length,1)):((c=i.allocUnsafe(5))[0]=198,c.writeUInt32BE(t.length,1)),c=o([c,t]);else if(Array.isArray(t))t.length<16?(c=i.allocUnsafe(1))[0]=144|t.length:t.length<65536?((c=i.allocUnsafe(3))[0]=220,c.writeUInt16BE(t.length,1)):((c=i.allocUnsafe(5))[0]=221,c.writeUInt32BE(t.length,1)),c=t.reduce((function(t,e){return t.append(s(e,!0)),t}),o().append(c));else {if(!a&&"function"==typeof t.getDate)return function(t){var e,n=1*t,r=Math.floor(n/1e3),a=1e6*(n-1e3*r);if(a||r>4294967295){(e=i.allocUnsafe(10))[0]=215,e[1]=-1;var s=4*a,u=r/Math.pow(2,32),f=s+u&4294967295,c=4294967295&r;e.writeInt32BE(f,2),e.writeInt32BE(c,6);}else (e=i.allocUnsafe(6))[0]=214,e[1]=-1,e.writeUInt32BE(Math.floor(n/1e3),2);return o().append(e)}(t);if("object"==typeof t)c=u(t)||function(t){var e,n,r=[],a=0;for(e in t)t.hasOwnProperty(e)&&void 0!==t[e]&&"function"!=typeof t[e]&&(++a,r.push(s(e,!0)),r.push(s(t[e],!0)));return a<16?(n=i.allocUnsafe(1))[0]=128|a:a<65535?((n=i.allocUnsafe(3))[0]=222,n.writeUInt16BE(a,1)):((n=i.allocUnsafe(5))[0]=223,n.writeUInt32BE(a,1)),r.unshift(n),r.reduce((function(t,e){return t.append(e)}),o())}(t);else if("number"==typeof t){if(function(t){return t%1!=0}(t))return r(t,e);if(t>=0)if(t<128)(c=i.allocUnsafe(1))[0]=t;else if(t<256)(c=i.allocUnsafe(2))[0]=204,c[1]=t;else if(t<65536)(c=i.allocUnsafe(3))[0]=205,c.writeUInt16BE(t,1);else if(t<=4294967295)(c=i.allocUnsafe(5))[0]=206,c.writeUInt32BE(t,1);else {if(!(t<=9007199254740991))return r(t,!0);(c=i.allocUnsafe(9))[0]=207,function(t,e){for(var n=7;n>=0;n--)t[n+1]=255&e,e/=256;}(c,t);}else if(t>=-32)(c=i.allocUnsafe(1))[0]=256+t;else if(t>=-128)(c=i.allocUnsafe(2))[0]=208,c.writeInt8(t,1);else if(t>=-32768)(c=i.allocUnsafe(3))[0]=209,c.writeInt16BE(t,1);else if(t>-214748365)(c=i.allocUnsafe(5))[0]=210,c.writeInt32BE(t,1);else {if(!(t>=-9007199254740991))return r(t,!0);(c=i.allocUnsafe(9))[0]=211,function(t,e,n){var r=n<0;r&&(n=Math.abs(n));var i=n%4294967296,o=n/4294967296;if(t.writeUInt32BE(Math.floor(o),e+0),t.writeUInt32BE(i,e+4),r)for(var a=1,s=e+7;s>=e;s--){var u=(255^t[s])+a;t[s]=255&u,a=u>>8;}}(c,1,t);}}}if(!c)throw new Error("not implemented yet");return f?c:c.slice()}function u(e){var n,r,a=-1,s=[];for(n=0;n<t.length;n++)if(t[n].check(e)){r=t[n].encode(e);break}return r?(1===(a=r.length-1)?s.push(212):2===a?s.push(213):4===a?s.push(214):8===a?s.push(215):16===a?s.push(216):a<256?(s.push(199),s.push(a)):a<65536?(s.push(200),s.push(a>>8),s.push(255&a)):(s.push(201),s.push(a>>24),s.push(a>>16&255),s.push(a>>8&255),s.push(255&a)),o().append(i.from(s)).append(r)):null}return s};},function(t,e,n){t.exports=n(55);},function(t,e,n){(function(t){e.version="1.0.0",e.encode=function(t){return t.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")},e.decode=function(e){return e=(e+=Array(5-e.length%4).join("=")).replace(/\-/g,"+").replace(/\_/g,"/"),new t(e,"base64")},e.validate=function(t){return /^[A-Za-z0-9\-_]+$/.test(t)};}).call(this,n(6).Buffer);},function(t,e,n){(function(t){var e=function(){function n(t,e){postMessage({action:Ft,cbn:e,result:t});}function r(t){var e=[];return e[t-1]=void 0,e}function i(t,e){return s(t[0]+e[0],t[1]+e[1])}function o(t,e){return function(t,e){var n;return n=e,0>e&&(n+=Wt),[n,t*Wt]}(~~Math.max(Math.min(t[1]/Wt,2147483647),-2147483648)&~~Math.max(Math.min(e[1]/Wt,2147483647),-2147483648),c(t)&c(e))}function a(t,e){var n,r;return t[0]==e[0]&&t[1]==e[1]?0:(n=0>t[1],r=0>e[1],n&&!r?-1:!n&&r?1:p(t,e)[1]<0?-1:1)}function s(t,e){var n,r;for(t%=0x10000000000000000,e=(e%=0x10000000000000000)-(n=e%Wt)+(r=Math.floor(t/Wt)*Wt),t=t-r+n;0>t;)t+=Wt,e-=Wt;for(;t>4294967295;)t-=Wt,e+=Wt;for(e%=0x10000000000000000;e>0x7fffffff00000000;)e-=0x10000000000000000;for(;-0x8000000000000000>e;)e+=0x10000000000000000;return [t,e]}function u(t,e){return t[0]==e[0]&&t[1]==e[1]}function f(t){return t>=0?[t,0]:[t+Wt,-Wt]}function c(t){return t[0]>=2147483648?~~Math.max(Math.min(t[0]-Wt,2147483647),-2147483648):~~Math.max(Math.min(t[0],2147483647),-2147483648)}function l(t){return 30>=t?1<<t:l(30)*l(t-30)}function h(t,e){var n,r,i,o;if(e&=63,u(t,Gt))return e?Ht:t;if(0>t[1])throw Error("Neg");return o=l(e),r=t[1]*o%0x10000000000000000,(r+=n=(i=t[0]*o)-i%Wt)>=0x8000000000000000&&(r-=0x10000000000000000),[i-=n,r]}function d(t,e){var n;return n=l(e&=63),s(Math.floor(t[0]/n),t[1]/n)}function p(t,e){return s(t[0]-e[0],t[1]-e[1])}function b(t,e){return t.Mc=e,t.Lc=0,t.Yb=e.length,t}function g(t){return t.Lc>=t.Yb?-1:255&t.Mc[t.Lc++]}function y(t,e,n,r){return t.Lc>=t.Yb?-1:(r=Math.min(r,t.Yb-t.Lc),E(t.Mc,t.Lc,e,n,r),t.Lc+=r,r)}function v(t){return t.Mc=r(32),t.Yb=0,t}function w(t){var e=t.Mc;return e.length=t.Yb,e}function m(t,e){t.Mc[t.Yb++]=e<<24>>24;}function _(t,e,n,r){E(e,n,t.Mc,t.Yb,r),t.Yb+=r;}function E(t,e,n,r,i){for(var o=0;i>o;++o)n[r+o]=t[e+o];}function x(t,n,r,i,o){var s,u;if(a(i,Yt)<0)throw Error("invalid length "+i);for(t.Tb=i,function(t,e){(function(t,e){t.ab=e;for(var n=0;e>1<<n;++n);t.$b=2*n;})(e,1<<t.s),e.n=t.f,function(t,e){var n=t.X;t.X=e,t.b&&n!=t.X&&(t.wb=-1,t.b=null);}(e,t.m),e.eb=0,e.fb=3,e.Y=2,e.y=3;}(o,s=$({})),s.Gc=void 0===e.disableEndMark,function(t,e){t.fc[0]=9*(5*t.Y+t.eb)+t.fb<<24>>24;for(var n=0;4>n;++n)t.fc[1+n]=t.ab>>8*n<<24>>24;_(e,t.fc,0,5);}(s,r),u=0;64>u;u+=8)m(r,255&c(d(i,u)));t.yb=(s.W=0,s.oc=n,s.pc=0,function(t){var e,n;t.b||(e={},n=4,t.X||(n=2),function(t,e){t.qb=e>2,t.qb?(t.w=0,t.xb=4,t.R=66560):(t.w=2,t.xb=3,t.R=0);}(e,n),t.b=e),dt(t.A,t.eb,t.fb),(t.ab!=t.wb||t.Hb!=t.n)&&(B(t.b,t.ab,4096,t.n,274),t.wb=t.ab,t.Hb=t.n);}(s),s.d.Ab=r,function(t){(function(t){t.l=0,t.J=0;for(var e=0;4>e;++e)t.v[e]=0;})(t),function(t){t.mc=Ht,t.xc=Ht,t.E=-1,t.Jb=1,t.Oc=0;}(t.d),Rt(t.C),Rt(t._),Rt(t.bb),Rt(t.hb),Rt(t.Ub),Rt(t.vc),Rt(t.Sb),function(t){var e,n=1<<t.u+t.I;for(e=0;n>e;++e)Rt(t.V[e].tb);}(t.A);for(var e=0;4>e;++e)Rt(t.K[e].G);st(t.$,1<<t.Y),st(t.i,1<<t.Y),Rt(t.S.G),t.N=0,t.jb=0,t.q=0,t.s=0;}(s),K(s),Q(s),s.$.rb=s.n+1-2,ht(s.$,1<<s.Y),s.i.rb=s.n+1-2,ht(s.i,1<<s.Y),s.g=Ht,function(t,e){return t.cb=e,t.Z=null,t.zc=1,t}({},s));}function S(t,e,n){return t.Nb=v({}),x(t,b({},e),t.Nb,f(e.length),n),t}function k(t,e,n){var r,i,o,a,s="",u=[];for(i=0;5>i;++i){if(-1==(o=g(e)))throw Error("truncated input");u[i]=o<<24>>24;}if(!function(t,e){var n,r,i,o,a,s,u;if(5>e.length)return 0;for(u=255&e[0],i=u%9,o=(s=~~(u/9))%5,a=~~(s/5),n=0,r=0;4>r;++r)n+=(255&e[1+r])<<8*r;return n>99999999||!function(t,e,n,r){if(e>8||n>4||r>4)return 0;J(t.gb,n,e);var i=1<<r;return W(t.Rb,i),W(t.sb,i),t.Dc=i-1,1}(t,i,o,a)?0:function(t,e){return 0>e?0:(t.Ob!=e&&(t.Ob=e,t.nb=Math.max(t.Ob,1),C(t.B,Math.max(t.nb,4096))),1)}(t,n)}(r=z({}),u))throw Error("corrupted input");for(i=0;64>i;i+=8){if(-1==(o=g(e)))throw Error("truncated input");1==(o=o.toString(16)).length&&(o="0"+o),s=o+""+s;}/^0+$|^f+$/i.test(s)?t.Tb=Yt:(a=parseInt(s,16),t.Tb=a>4294967295?Yt:f(a)),t.yb=function(t,e,n,r){return t.e.Ab=e,D(t.B),t.B.cc=n,function(t){t.B.h=0,t.B.o=0,Rt(t.Gb),Rt(t.pb),Rt(t.Zb),Rt(t.Cb),Rt(t.Db),Rt(t.Eb),Rt(t.kc),function(t){var e,n;for(n=1<<t.u+t.I,e=0;n>e;++e)Rt(t.V[e].Ib);}(t.gb);for(var e=0;4>e;++e)Rt(t.kb[e].G);H(t.Rb),H(t.sb),Rt(t.Fb.G),function(t){t.Bb=0,t.E=-1;for(var e=0;5>e;++e)t.Bb=t.Bb<<8|g(t.Ab);}(t.e);}(t),t.U=0,t.ib=0,t.Jc=0,t.Ic=0,t.Qc=0,t.Nc=r,t.g=Ht,t.jc=0,function(t,e){return t.Z=e,t.cb=null,t.zc=1,t}({},t)}(r,e,n,t.Tb);}function T(t,e){return t.Nb=v({}),k(t,b({},e),t.Nb),t}function M(t,e){return t.c[t.f+t.o+e]}function j(t,e,n,r){var i,o;for(t.T&&t.o+e+r>t.h&&(r=t.h-(t.o+e)),++n,o=t.f+t.o+e,i=0;r>i&&t.c[o+i]==t.c[o+i-n];++i);return i}function O(t){return t.h-t.o}function R(t){var e,n;if(!t.T)for(;;){if(!(n=-t.f+t.Kb-t.h))return;if(-1==(e=y(t.cc,t.c,t.f+t.h,n)))return t.zb=t.h,t.f+t.zb>t.H&&(t.zb=t.H-t.f),void(t.T=1);t.h+=e,t.h>=t.o+t._b&&(t.zb=t.h-t._b);}}function A(t,e){t.f+=e,t.zb-=e,t.o-=e,t.h-=e;}function B(t,e,n,i,o){var a,s;1073741567>e&&(t.Fc=16+(i>>1),function(t,e,n,i){var o;t.Bc=e,t._b=n,o=e+n+i,(null==t.c||t.Kb!=o)&&(t.c=null,t.Kb=o,t.c=r(t.Kb)),t.H=t.Kb-n;}(t,e+n,i+o,256+~~((e+n+i+o)/2)),t.ob=i,a=e+1,t.p!=a&&(t.L=r(2*(t.p=a))),s=65536,t.qb&&(s=e-1,s|=s>>1,s|=s>>2,s|=s>>4,s|=s>>8,s>>=1,(s|=65535)>16777216&&(s>>=1),t.Ec=s,++s,s+=t.R),s!=t.rc&&(t.ub=r(t.rc=s)));}function U(t){var e;++t.k>=t.p&&(t.k=0),function(t){++t.o>t.zb&&(t.f+t.o>t.H&&function(t){var e,n,r;for((r=t.f+t.o-t.Bc)>0&&--r,n=t.f+t.h-r,e=0;n>e;++e)t.c[e]=t.c[r+e];t.f-=r;}(t),R(t));}(t),1073741823==t.o&&(e=t.o-t.p,L(t.L,2*t.p,e),L(t.ub,t.rc,e),A(t,e));}function L(t,e,n){var r,i;for(r=0;e>r;++r)n>=(i=t[r]||0)?i=0:i-=n,t[r]=i;}function C(t,e){(null==t.Lb||t.M!=e)&&(t.Lb=r(e)),t.M=e,t.o=0,t.h=0;}function I(t){var e=t.o-t.h;e&&(_(t.cc,t.Lb,t.h,e),t.o>=t.M&&(t.o=0),t.h=t.o);}function P(t,e){var n=t.o-e-1;return 0>n&&(n+=t.M),t.Lb[n]}function D(t){I(t),t.cc=null;}function N(t){return 4>(t-=2)?t:3}function q(t){return 4>t?0:10>t?t-3:t-6}function F(t){if(!t.zc)throw Error("bad state");return t.cb?function(t){(function(t,e,n,r){var o,s,l,h,d,b,g,y,v,w,m,_,E,x,S;if(e[0]=Ht,n[0]=Ht,r[0]=1,t.oc&&(t.b.cc=t.oc,function(t){t.f=0,t.o=0,t.h=0,t.T=0,R(t),t.k=0,A(t,-1);}(t.b),t.W=1,t.oc=null),!t.pc){if(t.pc=1,x=t.g,u(t.g,Ht)){if(!O(t.b))return void X(t,c(t.g));it(t),E=c(t.g)&t.y,At(t.d,t.C,(t.l<<4)+E,0),t.l=q(t.l),l=M(t.b,-t.s),bt(pt(t.A,c(t.g),t.J),t.d,l),t.J=l,--t.s,t.g=i(t.g,Jt);}if(!O(t.b))return void X(t,c(t.g));for(;;){if(g=tt(t,c(t.g)),w=t.mb,E=c(t.g)&t.y,s=(t.l<<4)+E,1==g&&-1==w)At(t.d,t.C,s,0),l=M(t.b,-t.s),S=pt(t.A,c(t.g),t.J),7>t.l?bt(S,t.d,l):(v=M(t.b,-t.v[0]-1-t.s),gt(S,t.d,v,l)),t.J=l,t.l=q(t.l);else {if(At(t.d,t.C,s,1),4>w){if(At(t.d,t.bb,t.l,1),w?(At(t.d,t.hb,t.l,1),1==w?At(t.d,t.Ub,t.l,0):(At(t.d,t.Ub,t.l,1),At(t.d,t.vc,t.l,w-2))):(At(t.d,t.hb,t.l,0),At(t.d,t._,s,1==g?0:1)),1==g?t.l=7>t.l?9:11:(ft(t.i,t.d,g-2,E),t.l=7>t.l?8:11),h=t.v[w],0!=w){for(b=w;b>=1;--b)t.v[b]=t.v[b-1];t.v[0]=h;}}else {for(At(t.d,t.bb,t.l,0),t.l=7>t.l?7:10,ft(t.$,t.d,g-2,E),_=at(w-=4),y=N(g),xt(t.K[y],t.d,_),_>=4&&(m=w-(o=(2|1&_)<<(d=(_>>1)-1)),14>_?Mt(t.Sb,o-_-1,t.d,d,m):(Bt(t.d,m>>4,d-4),kt(t.S,t.d,15&m),++t.Qb)),h=w,b=3;b>=1;--b)t.v[b]=t.v[b-1];t.v[0]=h,++t.Mb;}t.J=M(t.b,g-1-t.s);}if(t.s-=g,t.g=i(t.g,f(g)),!t.s){if(t.Mb>=128&&K(t),t.Qb>=16&&Q(t),e[0]=t.g,n[0]=Ut(t.d),!O(t.b))return void X(t,c(t.g));if(a(p(t.g,x),[4096,0])>=0)return t.pc=0,void(r[0]=0)}}}})(t.cb,t.cb.Xb,t.cb.uc,t.cb.Kc),t.Pb=t.cb.Xb[0],t.cb.Kc[0]&&(function(t){ot(t),t.d.Ab=null;}(t.cb),t.zc=0);}(t):function(t){var e=function(t){var e,n,r,o,s,u;if(u=c(t.g)&t.Dc,Ot(t.e,t.Gb,(t.U<<4)+u)){if(Ot(t.e,t.Zb,t.U))r=0,Ot(t.e,t.Cb,t.U)?(Ot(t.e,t.Db,t.U)?(Ot(t.e,t.Eb,t.U)?(n=t.Qc,t.Qc=t.Ic):n=t.Ic,t.Ic=t.Jc):n=t.Jc,t.Jc=t.ib,t.ib=n):Ot(t.e,t.pb,(t.U<<4)+u)||(t.U=7>t.U?9:11,r=1),r||(r=Y(t.sb,t.e,u)+2,t.U=7>t.U?8:11);else if(t.Qc=t.Ic,t.Ic=t.Jc,t.Jc=t.ib,r=2+Y(t.Rb,t.e,u),t.U=7>t.U?7:10,(s=_t(t.kb[N(r)],t.e))>=4){if(o=(s>>1)-1,t.ib=(2|1&s)<<o,14>s)t.ib+=function(t,e,n,r){var i,o,a=1,s=0;for(o=0;r>o;++o)i=Ot(n,t,e+a),a<<=1,a+=i,s|=i<<o;return s}(t.kc,t.ib-s-1,t.e,o);else if(t.ib+=function(t,e){var n,r,i=0;for(n=e;0!=n;--n)t.E>>>=1,r=t.Bb-t.E>>>31,t.Bb-=t.E&r-1,i=i<<1|1-r,-16777216&t.E||(t.Bb=t.Bb<<8|g(t.Ab),t.E<<=8);return i}(t.e,o-4)<<4,t.ib+=function(t,e){var n,r,i=1,o=0;for(r=0;t.F>r;++r)n=Ot(e,t.G,i),i<<=1,i+=n,o|=n<<r;return o}(t.Fb,t.e),0>t.ib)return -1==t.ib?1:-1}else t.ib=s;if(a(f(t.ib),t.g)>=0||t.ib>=t.nb)return -1;(function(t,e,n){var r=t.o-e-1;for(0>r&&(r+=t.M);0!=n;--n)r>=t.M&&(r=0),t.Lb[t.o++]=t.Lb[r++],t.o>=t.M&&I(t);})(t.B,t.ib,r),t.g=i(t.g,f(r)),t.jc=P(t.B,0);}else e=function(t,e,n){return t.V[((e&t.qc)<<t.u)+((255&n)>>>8-t.u)]}(t.gb,c(t.g),t.jc),t.jc=7>t.U?function(t,e){var n=1;do{n=n<<1|Ot(e,t.Ib,n);}while(256>n);return n<<24>>24}(e,t.e):function(t,e,n){var r,i,o=1;do{if(i=n>>7&1,n<<=1,r=Ot(e,t.Ib,(1+i<<8)+o),o=o<<1|r,i!=r){for(;256>o;)o=o<<1|Ot(e,t.Ib,o);break}}while(256>o);return o<<24>>24}(e,t.e,P(t.B,t.ib)),function(t,e){t.Lb[t.o++]=e,t.o>=t.M&&I(t);}(t.B,t.jc),t.U=q(t.U),t.g=i(t.g,Jt);return 0}(t.Z);if(-1==e)throw Error("corrupted input");t.Pb=Yt,t.Pc=t.Z.g,(e||a(t.Z.Nc,Ht)>=0&&a(t.Z.g,t.Z.Nc)>=0)&&(I(t.Z.B),D(t.Z.B),t.Z.e.Ab=null,t.zc=0);}(t),t.zc}function z(t){t.B={},t.e={},t.Gb=r(192),t.Zb=r(12),t.Cb=r(12),t.Db=r(12),t.Eb=r(12),t.pb=r(192),t.kb=r(4),t.kc=r(114),t.Fb=mt({},4),t.Rb=G({}),t.sb=G({}),t.gb={};for(var e=0;4>e;++e)t.kb[e]=mt({},6);return t}function W(t,e){for(;e>t.O;++t.O)t.ec[t.O]=mt({},3),t.hc[t.O]=mt({},3);}function Y(t,e,n){return Ot(e,t.wc,0)?8+(Ot(e,t.wc,1)?8+_t(t.tc,e):_t(t.hc[n],e)):_t(t.ec[n],e)}function G(t){return t.wc=r(2),t.ec=r(16),t.hc=r(16),t.tc=mt({},8),t.O=0,t}function H(t){Rt(t.wc);for(var e=0;t.O>e;++e)Rt(t.ec[e].G),Rt(t.hc[e].G);Rt(t.tc.G);}function J(t,e,n){var i,o;if(null==t.V||t.u!=n||t.I!=e)for(t.I=e,t.qc=(1<<e)-1,t.u=n,o=1<<t.u+t.I,t.V=r(o),i=0;o>i;++i)t.V[i]=Z({});}function Z(t){return t.Ib=r(768),t}function V(t,e){var n,r,i,o;t.jb=e,i=t.a[e].r,r=t.a[e].j;do{t.a[e].t&&(wt(t.a[i]),t.a[i].r=i-1,t.a[e].Ac&&(t.a[i-1].t=0,t.a[i-1].r=t.a[e].r2,t.a[i-1].j=t.a[e].j2)),o=i,n=r,r=t.a[o].j,i=t.a[o].r,t.a[o].j=n,t.a[o].r=e,e=o;}while(e>0);return t.mb=t.a[0].j,t.q=t.a[0].r}function $(t){var e;for(t.v=r(4),t.a=[],t.d={},t.C=r(192),t.bb=r(12),t.hb=r(12),t.Ub=r(12),t.vc=r(12),t._=r(192),t.K=[],t.Sb=r(114),t.S=Et({},4),t.$=ct({}),t.i=ct({}),t.A={},t.m=[],t.P=[],t.lb=[],t.nc=r(16),t.x=r(4),t.Q=r(4),t.Xb=[Ht],t.uc=[Ht],t.Kc=[0],t.fc=r(5),t.yc=r(128),t.vb=0,t.X=1,t.D=0,t.Hb=-1,t.mb=0,e=0;4096>e;++e)t.a[e]={};for(e=0;4>e;++e)t.K[e]=Et({},6);return t}function Q(t){for(var e=0;16>e;++e)t.nc[e]=Tt(t.S,e);t.Qb=0;}function K(t){var e,n,r,i,o,a,s,u;for(i=4;128>i;++i)e=(2|1&(a=at(i)))<<(r=(a>>1)-1),t.yc[i]=jt(t.Sb,e-a-1,r,i-e);for(o=0;4>o;++o){for(n=t.K[o],s=o<<6,a=0;t.$b>a;++a)t.P[s+a]=St(n,a);for(a=14;t.$b>a;++a)t.P[s+a]+=(a>>1)-1-4<<6;for(u=128*o,i=0;4>i;++i)t.lb[u+i]=t.P[s+i];for(;128>i;++i)t.lb[u+i]=t.P[s+at(i)]+t.yc[i];}t.Mb=0;}function X(t,e){ot(t),function(t,e){if(t.Gc){At(t.d,t.C,(t.l<<4)+e,1),At(t.d,t.bb,t.l,0),t.l=7>t.l?7:10,ft(t.$,t.d,0,e);var n=N(2);xt(t.K[n],t.d,63),Bt(t.d,67108863,26),kt(t.S,t.d,15);}}(t,e&t.y);for(var n=0;5>n;++n)Lt(t.d);}function tt(t,e){var n,r,i,o,a,s,u,f,c,l,h,d,p,b,g,y,v,w,m,_,E,x,S,k,T,R,A,B,U,L,C,I,P,D,N,F,z,W,Y,G,H,J,Z,$;if(t.jb!=t.q)return p=t.a[t.q].r-t.q,t.mb=t.a[t.q].j,t.q=t.a[t.q].r,p;if(t.q=t.jb=0,t.N?(d=t.vb,t.N=0):d=it(t),R=t.D,2>(k=O(t.b)+1))return t.mb=-1,1;for(k>273&&(k=273),Y=0,c=0;4>c;++c)t.x[c]=t.v[c],t.Q[c]=j(t.b,-1,t.x[c],273),t.Q[c]>t.Q[Y]&&(Y=c);if(t.Q[Y]>=t.n)return t.mb=Y,rt(t,(p=t.Q[Y])-1),p;if(d>=t.n)return t.mb=t.m[R-1]+4,rt(t,d-1),d;if(u=M(t.b,-1),v=M(t.b,-t.v[0]-1-1),2>d&&u!=v&&2>t.Q[Y])return t.mb=-1,1;if(t.a[0].Hc=t.l,P=e&t.y,t.a[1].z=$t[t.C[(t.l<<4)+P]>>>2]+vt(pt(t.A,e,t.J),t.l>=7,v,u),wt(t.a[1]),W=(w=$t[2048-t.C[(t.l<<4)+P]>>>2])+$t[2048-t.bb[t.l]>>>2],v==u&&(G=W+function(t,e,n){return $t[t.hb[e]>>>2]+$t[t._[(e<<4)+n]>>>2]}(t,t.l,P),t.a[1].z>G&&(t.a[1].z=G,function(t){t.j=0,t.t=0;}(t.a[1]))),2>(h=d>=t.Q[Y]?d:t.Q[Y]))return t.mb=t.a[1].j,1;t.a[1].r=0,t.a[0].bc=t.x[0],t.a[0].ac=t.x[1],t.a[0].dc=t.x[2],t.a[0].lc=t.x[3],l=h;do{t.a[l--].z=268435455;}while(l>=2);for(c=0;4>c;++c)if(!(2>(z=t.Q[c]))){N=W+nt(t,c,t.l,P);do{o=N+lt(t.i,z-2,P),(L=t.a[z]).z>o&&(L.z=o,L.r=0,L.j=c,L.t=0);}while(--z>=2)}if(S=w+$t[t.bb[t.l]>>>2],d>=(l=t.Q[0]>=2?t.Q[0]+1:2)){for(A=0;l>t.m[A];)A+=2;for(;o=S+et(t,f=t.m[A+1],l,P),(L=t.a[l]).z>o&&(L.z=o,L.r=0,L.j=f+4,L.t=0),l!=t.m[A]||(A+=2)!=R;++l);}for(n=0;;){if(++n==h)return V(t,n);if(m=it(t),R=t.D,m>=t.n)return t.vb=m,t.N=1,V(t,n);if(++e,I=t.a[n].r,t.a[n].t?(--I,t.a[n].Ac?(J=t.a[t.a[n].r2].Hc,J=4>t.a[n].j2?7>J?8:11:7>J?7:10):J=t.a[I].Hc,J=q(J)):J=t.a[I].Hc,I==n-1?J=t.a[n].j?q(J):7>J?9:11:(t.a[n].t&&t.a[n].Ac?(I=t.a[n].r2,C=t.a[n].j2,J=7>J?8:11):J=4>(C=t.a[n].j)?7>J?8:11:7>J?7:10,U=t.a[I],4>C?C?1==C?(t.x[0]=U.ac,t.x[1]=U.bc,t.x[2]=U.dc,t.x[3]=U.lc):2==C?(t.x[0]=U.dc,t.x[1]=U.bc,t.x[2]=U.ac,t.x[3]=U.lc):(t.x[0]=U.lc,t.x[1]=U.bc,t.x[2]=U.ac,t.x[3]=U.dc):(t.x[0]=U.bc,t.x[1]=U.ac,t.x[2]=U.dc,t.x[3]=U.lc):(t.x[0]=C-4,t.x[1]=U.bc,t.x[2]=U.ac,t.x[3]=U.dc)),t.a[n].Hc=J,t.a[n].bc=t.x[0],t.a[n].ac=t.x[1],t.a[n].dc=t.x[2],t.a[n].lc=t.x[3],s=t.a[n].z,u=M(t.b,-1),v=M(t.b,-t.x[0]-1-1),P=e&t.y,r=s+$t[t.C[(J<<4)+P]>>>2]+vt(pt(t.A,e,M(t.b,-2)),J>=7,v,u),_=0,(E=t.a[n+1]).z>r&&(E.z=r,E.r=n,E.j=-1,E.t=0,_=1),W=(w=s+$t[2048-t.C[(J<<4)+P]>>>2])+$t[2048-t.bb[J]>>>2],v!=u||n>E.r&&!E.j||(G=W+($t[t.hb[J]>>>2]+$t[t._[(J<<4)+P]>>>2]),E.z>=G&&(E.z=G,E.r=n,E.j=0,E.t=0,_=1)),!(2>(k=T=(T=O(t.b)+1)>4095-n?4095-n:T))){if(k>t.n&&(k=t.n),!_&&v!=u&&($=Math.min(T-1,t.n),(g=j(t.b,0,t.x[0],$))>=2)){for(Z=q(J),D=e+1&t.y,x=r+$t[2048-t.C[(Z<<4)+D]>>>2]+$t[2048-t.bb[Z]>>>2],B=n+1+g;B>h;)t.a[++h].z=268435455;o=x+(lt(t.i,g-2,D)+nt(t,0,Z,D)),(L=t.a[B]).z>o&&(L.z=o,L.r=n+1,L.j=0,L.t=1,L.Ac=0);}for(H=2,F=0;4>F;++F)if(!(2>(b=j(t.b,-1,t.x[F],k)))){y=b;do{for(;n+b>h;)t.a[++h].z=268435455;o=W+(lt(t.i,b-2,P)+nt(t,F,J,P)),(L=t.a[n+b]).z>o&&(L.z=o,L.r=n,L.j=F,L.t=0);}while(--b>=2);if(b=y,F||(H=b+1),T>b&&($=Math.min(T-1-b,t.n),(g=j(t.b,b,t.x[F],$))>=2)){for(Z=7>J?8:11,D=e+b&t.y,i=W+(lt(t.i,b-2,P)+nt(t,F,J,P))+$t[t.C[(Z<<4)+D]>>>2]+vt(pt(t.A,e+b,M(t.b,b-1-1)),1,M(t.b,b-1-(t.x[F]+1)),M(t.b,b-1)),Z=q(Z),D=e+b+1&t.y,x=i+$t[2048-t.C[(Z<<4)+D]>>>2]+$t[2048-t.bb[Z]>>>2],B=b+1+g;n+B>h;)t.a[++h].z=268435455;o=x+(lt(t.i,g-2,D)+nt(t,0,Z,D)),(L=t.a[n+B]).z>o&&(L.z=o,L.r=n+b+1,L.j=0,L.t=1,L.Ac=1,L.r2=n,L.j2=F);}}if(m>k){for(m=k,R=0;m>t.m[R];R+=2);t.m[R]=m,R+=2;}if(m>=H){for(S=w+$t[t.bb[J]>>>2];n+m>h;)t.a[++h].z=268435455;for(A=0;H>t.m[A];)A+=2;for(b=H;;++b)if(o=S+et(t,a=t.m[A+1],b,P),(L=t.a[n+b]).z>o&&(L.z=o,L.r=n,L.j=a+4,L.t=0),b==t.m[A]){if(T>b&&($=Math.min(T-1-b,t.n),(g=j(t.b,b,a,$))>=2)){for(Z=7>J?7:10,D=e+b&t.y,i=o+$t[t.C[(Z<<4)+D]>>>2]+vt(pt(t.A,e+b,M(t.b,b-1-1)),1,M(t.b,b-(a+1)-1),M(t.b,b-1)),Z=q(Z),D=e+b+1&t.y,x=i+$t[2048-t.C[(Z<<4)+D]>>>2]+$t[2048-t.bb[Z]>>>2],B=b+1+g;n+B>h;)t.a[++h].z=268435455;o=x+(lt(t.i,g-2,D)+nt(t,0,Z,D)),(L=t.a[n+B]).z>o&&(L.z=o,L.r=n+b+1,L.j=0,L.t=1,L.Ac=1,L.r2=n,L.j2=a+4);}if((A+=2)==R)break}}}}}function et(t,e,n,r){var i=N(n);return (128>e?t.lb[128*i+e]:t.P[(i<<6)+function(t){return 131072>t?Vt[t>>6]+12:134217728>t?Vt[t>>16]+32:Vt[t>>26]+52}(e)]+t.nc[15&e])+lt(t.$,n-2,r)}function nt(t,e,n,r){var i;return e?(i=$t[2048-t.hb[n]>>>2],1==e?i+=$t[t.Ub[n]>>>2]:(i+=$t[2048-t.Ub[n]>>>2],i+=Ct(t.vc[n],e-2))):(i=$t[t.hb[n]>>>2],i+=$t[2048-t._[(n<<4)+r]>>>2]),i}function rt(t,e){e>0&&(function(t,e){var n,r,i,o,a,s,u,f,c,l,h,d,p,b,g,y,v;do{if(t.h>=t.o+t.ob)d=t.ob;else if(d=t.h-t.o,t.xb>d){U(t);continue}for(p=t.o>t.p?t.o-t.p:0,r=t.f+t.o,t.qb?(s=1023&(v=Zt[255&t.c[r]]^255&t.c[r+1]),t.ub[s]=t.o,u=65535&(v^=(255&t.c[r+2])<<8),t.ub[1024+u]=t.o,f=(v^Zt[255&t.c[r+3]]<<5)&t.Ec):f=255&t.c[r]^(255&t.c[r+1])<<8,i=t.ub[t.R+f],t.ub[t.R+f]=t.o,g=1+(t.k<<1),y=t.k<<1,l=h=t.w,n=t.Fc;;){if(p>=i||0==n--){t.L[g]=t.L[y]=0;break}if(a=t.o-i,o=(t.k>=a?t.k-a:t.k-a+t.p)<<1,b=t.f+i,c=h>l?l:h,t.c[b+c]==t.c[r+c]){for(;++c!=d&&t.c[b+c]==t.c[r+c];);if(c==d){t.L[y]=t.L[o],t.L[g]=t.L[o+1];break}}(255&t.c[r+c])>(255&t.c[b+c])?(t.L[y]=i,y=o+1,i=t.L[y],h=c):(t.L[g]=i,g=o,i=t.L[g],l=c);}U(t);}while(0!=--e)}(t.b,e),t.s+=e);}function it(t){var e=0;return t.D=function(t,e){var n,r,i,o,a,s,u,f,c,l,h,d,p,b,g,y,v,w,m,_,E;if(t.h>=t.o+t.ob)b=t.ob;else if(b=t.h-t.o,t.xb>b)return U(t),0;for(v=0,g=t.o>t.p?t.o-t.p:0,r=t.f+t.o,y=1,f=0,c=0,t.qb?(f=1023&(E=Zt[255&t.c[r]]^255&t.c[r+1]),c=65535&(E^=(255&t.c[r+2])<<8),l=(E^Zt[255&t.c[r+3]]<<5)&t.Ec):l=255&t.c[r]^(255&t.c[r+1])<<8,i=t.ub[t.R+l]||0,t.qb&&(o=t.ub[f]||0,a=t.ub[1024+c]||0,t.ub[f]=t.o,t.ub[1024+c]=t.o,o>g&&t.c[t.f+o]==t.c[r]&&(e[v++]=y=2,e[v++]=t.o-o-1),a>g&&t.c[t.f+a]==t.c[r]&&(a==o&&(v-=2),e[v++]=y=3,e[v++]=t.o-a-1,o=a),0!=v&&o==i&&(v-=2,y=1)),t.ub[t.R+l]=t.o,m=1+(t.k<<1),_=t.k<<1,d=p=t.w,0!=t.w&&i>g&&t.c[t.f+i+t.w]!=t.c[r+t.w]&&(e[v++]=y=t.w,e[v++]=t.o-i-1),n=t.Fc;;){if(g>=i||0==n--){t.L[m]=t.L[_]=0;break}if(u=t.o-i,s=(t.k>=u?t.k-u:t.k-u+t.p)<<1,w=t.f+i,h=p>d?d:p,t.c[w+h]==t.c[r+h]){for(;++h!=b&&t.c[w+h]==t.c[r+h];);if(h>y&&(e[v++]=y=h,e[v++]=u-1,h==b)){t.L[_]=t.L[s],t.L[m]=t.L[s+1];break}}(255&t.c[r+h])>(255&t.c[w+h])?(t.L[_]=i,_=s+1,i=t.L[_],p=h):(t.L[m]=i,m=s,i=t.L[m],d=h);}return U(t),v}(t.b,t.m),t.D>0&&(e=t.m[t.D-2])==t.n&&(e+=j(t.b,e-1,t.m[t.D-1],273-e)),++t.s,e}function ot(t){t.b&&t.W&&(t.b.cc=null,t.W=0);}function at(t){return 2048>t?Vt[t]:2097152>t?Vt[t>>10]+20:Vt[t>>20]+40}function st(t,e){Rt(t.db);for(var n=0;e>n;++n)Rt(t.Vb[n].G),Rt(t.Wb[n].G);Rt(t.ic.G);}function ut(t,e,n,r,i){var o,a,s,u,f;for(o=$t[t.db[0]>>>2],s=(a=$t[2048-t.db[0]>>>2])+$t[t.db[1]>>>2],u=a+$t[2048-t.db[1]>>>2],f=0,f=0;8>f;++f){if(f>=n)return;r[i+f]=o+St(t.Vb[e],f);}for(;16>f;++f){if(f>=n)return;r[i+f]=s+St(t.Wb[e],f-8);}for(;n>f;++f)r[i+f]=u+St(t.ic,f-8-8);}function ft(t,e,n,r){(function(t,e,n,r){8>n?(At(e,t.db,0,0),xt(t.Vb[r],e,n)):(n-=8,At(e,t.db,0,1),8>n?(At(e,t.db,1,0),xt(t.Wb[r],e,n)):(At(e,t.db,1,1),xt(t.ic,e,n-8)));})(t,e,n,r),0==--t.sc[r]&&(ut(t,r,t.rb,t.Cc,272*r),t.sc[r]=t.rb);}function ct(t){return function(t){t.db=r(2),t.Vb=r(16),t.Wb=r(16),t.ic=Et({},8);for(var e=0;16>e;++e)t.Vb[e]=Et({},3),t.Wb[e]=Et({},3);}(t),t.Cc=[],t.sc=[],t}function lt(t,e,n){return t.Cc[272*n+e]}function ht(t,e){for(var n=0;e>n;++n)ut(t,n,t.rb,t.Cc,272*n),t.sc[n]=t.rb;}function dt(t,e,n){var i,o;if(null==t.V||t.u!=n||t.I!=e)for(t.I=e,t.qc=(1<<e)-1,t.u=n,o=1<<t.u+t.I,t.V=r(o),i=0;o>i;++i)t.V[i]=yt({});}function pt(t,e,n){return t.V[((e&t.qc)<<t.u)+((255&n)>>>8-t.u)]}function bt(t,e,n){var r,i,o=1;for(i=7;i>=0;--i)r=n>>i&1,At(e,t.tb,o,r),o=o<<1|r;}function gt(t,e,n,r){var i,o,a,s,u=1,f=1;for(o=7;o>=0;--o)i=r>>o&1,s=f,u&&(s+=1+(a=n>>o&1)<<8,u=a==i),At(e,t.tb,s,i),f=f<<1|i;}function yt(t){return t.tb=r(768),t}function vt(t,e,n,r){var i,o,a=1,s=7,u=0;if(e)for(;s>=0;--s)if(o=n>>s&1,i=r>>s&1,u+=Ct(t.tb[(1+o<<8)+a],i),a=a<<1|i,o!=i){--s;break}for(;s>=0;--s)i=r>>s&1,u+=Ct(t.tb[a],i),a=a<<1|i;return u}function wt(t){t.j=-1,t.t=0;}function mt(t,e){return t.F=e,t.G=r(1<<e),t}function _t(t,e){var n,r=1;for(n=t.F;0!=n;--n)r=(r<<1)+Ot(e,t.G,r);return r-(1<<t.F)}function Et(t,e){return t.F=e,t.G=r(1<<e),t}function xt(t,e,n){var r,i,o=1;for(i=t.F;0!=i;)r=n>>>--i&1,At(e,t.G,o,r),o=o<<1|r;}function St(t,e){var n,r,i=1,o=0;for(r=t.F;0!=r;)n=e>>>--r&1,o+=Ct(t.G[i],n),i=(i<<1)+n;return o}function kt(t,e,n){var r,i,o=1;for(i=0;t.F>i;++i)r=1&n,At(e,t.G,o,r),o=o<<1|r,n>>=1;}function Tt(t,e){var n,r,i=1,o=0;for(r=t.F;0!=r;--r)n=1&e,e>>>=1,o+=Ct(t.G[i],n),i=i<<1|n;return o}function Mt(t,e,n,r,i){var o,a,s=1;for(a=0;r>a;++a)At(n,t,e+s,o=1&i),s=s<<1|o,i>>=1;}function jt(t,e,n,r){var i,o,a=1,s=0;for(o=n;0!=o;--o)i=1&r,r>>>=1,s+=$t[(2047&(t[e+a]-i^-i))>>>2],a=a<<1|i;return s}function Ot(t,e,n){var r,i=e[n];return (-2147483648^(r=(t.E>>>11)*i))>(-2147483648^t.Bb)?(t.E=r,e[n]=i+(2048-i>>>5)<<16>>16,-16777216&t.E||(t.Bb=t.Bb<<8|g(t.Ab),t.E<<=8),0):(t.E-=r,t.Bb-=r,e[n]=i-(i>>>5)<<16>>16,-16777216&t.E||(t.Bb=t.Bb<<8|g(t.Ab),t.E<<=8),1)}function Rt(t){for(var e=t.length-1;e>=0;--e)t[e]=1024;}function At(t,e,n,r){var a,s=e[n];a=(t.E>>>11)*s,r?(t.xc=i(t.xc,o(f(a),[4294967295,0])),t.E-=a,e[n]=s-(s>>>5)<<16>>16):(t.E=a,e[n]=s+(2048-s>>>5)<<16>>16),-16777216&t.E||(t.E<<=8,Lt(t));}function Bt(t,e,n){for(var r=n-1;r>=0;--r)t.E>>>=1,1==(e>>>r&1)&&(t.xc=i(t.xc,f(t.E))),-16777216&t.E||(t.E<<=8,Lt(t));}function Ut(t){return i(i(f(t.Jb),t.mc),[4,0])}function Lt(t){var e,n=c(function(t,e){var n;return n=d(t,e&=63),0>t[1]&&(n=i(n,h([2,0],63-e))),n}(t.xc,32));if(0!=n||a(t.xc,[4278190080,0])<0){t.mc=i(t.mc,f(t.Jb)),e=t.Oc;do{m(t.Ab,e+n),e=255;}while(0!=--t.Jb);t.Oc=c(t.xc)>>>24;}++t.Jb,t.xc=h(o(t.xc,[16777215,0]),8);}function Ct(t,e){return $t[(2047&(t-e^-e))>>>2]}function It(t){for(var e,n,r,i=0,o=0,a=t.length,s=[],u=[];a>i;++i,++o){if(128&(e=255&t[i]))if(192==(224&e)){if(i+1>=a)return t;if(128!=(192&(n=255&t[++i])))return t;u[o]=(31&e)<<6|63&n;}else {if(224!=(240&e))return t;if(i+2>=a)return t;if(128!=(192&(n=255&t[++i])))return t;if(128!=(192&(r=255&t[++i])))return t;u[o]=(15&e)<<12|(63&n)<<6|63&r;}else {if(!e)return t;u[o]=e;}16383==o&&(s.push(String.fromCharCode.apply(String,u)),o=-1);}return o>0&&(u.length=o,s.push(String.fromCharCode.apply(String,u))),s.join("")}function Pt(t){var e,n,r,i=[],o=0,a=t.length;if("object"==typeof t)return t;for(function(t,e,n,r,i){var o;for(o=e;n>o;++o)r[i++]=t.charCodeAt(o);}(t,0,a,i,0),r=0;a>r;++r)(e=i[r])>=1&&127>=e?++o:o+=!e||e>=128&&2047>=e?2:3;for(n=[],o=0,r=0;a>r;++r)(e=i[r])>=1&&127>=e?n[o++]=e<<24>>24:!e||e>=128&&2047>=e?(n[o++]=(192|e>>6&31)<<24>>24,n[o++]=(128|63&e)<<24>>24):(n[o++]=(224|e>>12&15)<<24>>24,n[o++]=(128|e>>6&63)<<24>>24,n[o++]=(128|63&e)<<24>>24);return n}function Dt(t){return t[1]+t[0]}var Nt=1,qt=2,Ft=3,zt="function"==typeof t?t:setTimeout,Wt=4294967296,Yt=[4294967295,-Wt],Gt=[0,-0x8000000000000000],Ht=[0,0],Jt=[1,0],Zt=function(){var t,e,n,r=[];for(t=0;256>t;++t){for(n=t,e=0;8>e;++e)0!=(1&n)?n=n>>>1^-306674912:n>>>=1;r[t]=n;}return r}(),Vt=function(){var t,e,n,r=2,i=[0,1];for(n=2;22>n;++n)for(e=1<<(n>>1)-1,t=0;e>t;++t,++r)i[r]=n<<24>>24;return i}(),$t=function(){var t,e,n,r=[];for(e=8;e>=0;--e)for(t=1<<9-e,n=1<<9-e-1;t>n;++n)r[n]=(e<<6)+(t-n<<6>>>9-e-1);return r}(),Qt=function(){var t=[{s:16,f:64,m:0},{s:20,f:64,m:0},{s:19,f:64,m:1},{s:20,f:64,m:1},{s:21,f:128,m:1},{s:22,f:128,m:1},{s:23,f:128,m:1},{s:24,f:255,m:1},{s:25,f:255,m:1}];return function(e){return t[e-1]||t[6]}}();return "undefined"==typeof onmessage||"undefined"!=typeof window&&void 0!==window.document||(onmessage=function(t){t&&t.gc&&(t.gc.action==qt?e.decompress(t.gc.gc,t.gc.cbn):t.gc.action==Nt&&e.compress(t.gc.gc,t.gc.Rc,t.gc.cbn));}),{compress:function(t,e,r,i){var o,a,s={},u=void 0===r&&void 0===i;if("function"!=typeof r&&(a=r,r=i=0),i=i||function(t){return void 0!==a?n(t,a):void 0},r=r||function(t,e){return void 0!==a?postMessage({action:Nt,cbn:a,result:t,error:e}):void 0},u){for(s.c=S({},Pt(t),Qt(e));F(s.c.yb););return w(s.c.Nb)}try{s.c=S({},Pt(t),Qt(e)),i(0);}catch(t){return r(null,t)}zt((function t(){try{for(var e,n=(new Date).getTime();F(s.c.yb);)if(o=Dt(s.c.yb.Pb)/Dt(s.c.Tb),(new Date).getTime()-n>200)return i(o),zt(t,0),0;i(1),e=w(s.c.Nb),zt(r.bind(null,e),0);}catch(e){r(null,e);}}),0);},decompress:function(t,e,r){var i,o,a,s,u={},f=void 0===e&&void 0===r;if("function"!=typeof e&&(o=e,e=r=0),r=r||function(t){return void 0!==o?n(a?t:-1,o):void 0},e=e||function(t,e){return void 0!==o?postMessage({action:qt,cbn:o,result:t,error:e}):void 0},f){for(u.d=T({},t);F(u.d.yb););return It(w(u.d.Nb))}try{u.d=T({},t),s=Dt(u.d.Tb),a=s>-1,r(0);}catch(t){return e(null,t)}zt((function t(){try{for(var n,o=0,f=(new Date).getTime();F(u.d.yb);)if(++o%1e3==0&&(new Date).getTime()-f>200)return a&&(i=Dt(u.d.yb.Z.g)/s,r(i)),zt(t,0),0;r(1),n=It(w(u.d.Nb)),zt(e.bind(null,n),0);}catch(n){e(null,n);}}),0);}}}();this.LZMA=this.LZMA_WORKER=e;}).call(this,n(18).setImmediate);},function(t,e,n){var r,i=function(){function t(t,e){if(!i[t]){i[t]={};for(var n=0;n<t.length;n++)i[t][t.charAt(n)]=n;}return i[t][e]}var e=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",r="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",i={},o={compressToBase64:function(t){if(null==t)return "";var e=o._compress(t,6,(function(t){return n.charAt(t)}));switch(e.length%4){default:case 0:return e;case 1:return e+"===";case 2:return e+"==";case 3:return e+"="}},decompressFromBase64:function(e){return null==e?"":""==e?null:o._decompress(e.length,32,(function(r){return t(n,e.charAt(r))}))},compressToUTF16:function(t){return null==t?"":o._compress(t,15,(function(t){return e(t+32)}))+" "},decompressFromUTF16:function(t){return null==t?"":""==t?null:o._decompress(t.length,16384,(function(e){return t.charCodeAt(e)-32}))},compressToUint8Array:function(t){for(var e=o.compress(t),n=new Uint8Array(2*e.length),r=0,i=e.length;r<i;r++){var a=e.charCodeAt(r);n[2*r]=a>>>8,n[2*r+1]=a%256;}return n},decompressFromUint8Array:function(t){if(null==t)return o.decompress(t);for(var n=new Array(t.length/2),r=0,i=n.length;r<i;r++)n[r]=256*t[2*r]+t[2*r+1];var a=[];return n.forEach((function(t){a.push(e(t));})),o.decompress(a.join(""))},compressToEncodedURIComponent:function(t){return null==t?"":o._compress(t,6,(function(t){return r.charAt(t)}))},decompressFromEncodedURIComponent:function(e){return null==e?"":""==e?null:(e=e.replace(/ /g,"+"),o._decompress(e.length,32,(function(n){return t(r,e.charAt(n))})))},compress:function(t){return o._compress(t,16,(function(t){return e(t)}))},_compress:function(t,e,n){if(null==t)return "";var r,i,o,a={},s={},u="",f="",c="",l=2,h=3,d=2,p=[],b=0,g=0;for(o=0;o<t.length;o+=1)if(u=t.charAt(o),Object.prototype.hasOwnProperty.call(a,u)||(a[u]=h++,s[u]=!0),f=c+u,Object.prototype.hasOwnProperty.call(a,f))c=f;else {if(Object.prototype.hasOwnProperty.call(s,c)){if(c.charCodeAt(0)<256){for(r=0;r<d;r++)b<<=1,g==e-1?(g=0,p.push(n(b)),b=0):g++;for(i=c.charCodeAt(0),r=0;r<8;r++)b=b<<1|1&i,g==e-1?(g=0,p.push(n(b)),b=0):g++,i>>=1;}else {for(i=1,r=0;r<d;r++)b=b<<1|i,g==e-1?(g=0,p.push(n(b)),b=0):g++,i=0;for(i=c.charCodeAt(0),r=0;r<16;r++)b=b<<1|1&i,g==e-1?(g=0,p.push(n(b)),b=0):g++,i>>=1;}0==--l&&(l=Math.pow(2,d),d++),delete s[c];}else for(i=a[c],r=0;r<d;r++)b=b<<1|1&i,g==e-1?(g=0,p.push(n(b)),b=0):g++,i>>=1;0==--l&&(l=Math.pow(2,d),d++),a[f]=h++,c=String(u);}if(""!==c){if(Object.prototype.hasOwnProperty.call(s,c)){if(c.charCodeAt(0)<256){for(r=0;r<d;r++)b<<=1,g==e-1?(g=0,p.push(n(b)),b=0):g++;for(i=c.charCodeAt(0),r=0;r<8;r++)b=b<<1|1&i,g==e-1?(g=0,p.push(n(b)),b=0):g++,i>>=1;}else {for(i=1,r=0;r<d;r++)b=b<<1|i,g==e-1?(g=0,p.push(n(b)),b=0):g++,i=0;for(i=c.charCodeAt(0),r=0;r<16;r++)b=b<<1|1&i,g==e-1?(g=0,p.push(n(b)),b=0):g++,i>>=1;}0==--l&&(l=Math.pow(2,d),d++),delete s[c];}else for(i=a[c],r=0;r<d;r++)b=b<<1|1&i,g==e-1?(g=0,p.push(n(b)),b=0):g++,i>>=1;0==--l&&(l=Math.pow(2,d),d++);}for(i=2,r=0;r<d;r++)b=b<<1|1&i,g==e-1?(g=0,p.push(n(b)),b=0):g++,i>>=1;for(;;){if(b<<=1,g==e-1){p.push(n(b));break}g++;}return p.join("")},decompress:function(t){return null==t?"":""==t?null:o._decompress(t.length,32768,(function(e){return t.charCodeAt(e)}))},_decompress:function(t,n,r){var i,o,a,s,u,f,c,l=[],h=4,d=4,p=3,b="",g=[],y={val:r(0),position:n,index:1};for(i=0;i<3;i+=1)l[i]=i;for(a=0,u=Math.pow(2,2),f=1;f!=u;)s=y.val&y.position,y.position>>=1,0==y.position&&(y.position=n,y.val=r(y.index++)),a|=(s>0?1:0)*f,f<<=1;switch(a){case 0:for(a=0,u=Math.pow(2,8),f=1;f!=u;)s=y.val&y.position,y.position>>=1,0==y.position&&(y.position=n,y.val=r(y.index++)),a|=(s>0?1:0)*f,f<<=1;c=e(a);break;case 1:for(a=0,u=Math.pow(2,16),f=1;f!=u;)s=y.val&y.position,y.position>>=1,0==y.position&&(y.position=n,y.val=r(y.index++)),a|=(s>0?1:0)*f,f<<=1;c=e(a);break;case 2:return ""}for(l[3]=c,o=c,g.push(c);;){if(y.index>t)return "";for(a=0,u=Math.pow(2,p),f=1;f!=u;)s=y.val&y.position,y.position>>=1,0==y.position&&(y.position=n,y.val=r(y.index++)),a|=(s>0?1:0)*f,f<<=1;switch(c=a){case 0:for(a=0,u=Math.pow(2,8),f=1;f!=u;)s=y.val&y.position,y.position>>=1,0==y.position&&(y.position=n,y.val=r(y.index++)),a|=(s>0?1:0)*f,f<<=1;l[d++]=e(a),c=d-1,h--;break;case 1:for(a=0,u=Math.pow(2,16),f=1;f!=u;)s=y.val&y.position,y.position>>=1,0==y.position&&(y.position=n,y.val=r(y.index++)),a|=(s>0?1:0)*f,f<<=1;l[d++]=e(a),c=d-1,h--;break;case 2:return g.join("")}if(0==h&&(h=Math.pow(2,p),p++),l[c])b=l[c];else {if(c!==d)return null;b=o+o.charAt(0);}g.push(b),l[d++]=o+b.charAt(0),o=b,0==--h&&(h=Math.pow(2,p),p++);}}};return o}();void 0!==(r=function(){return i}.call(e,n,e,t))&&(t.exports=r);},function(t,e,n){var r=function(){};r.prototype.encode=function(t){for(var e,n={},r=(t+"").split(""),i=[],o=r[0],a=256,s=1;s<r.length;s++)null!=n[o+(e=r[s])]?o+=e:(i.push(o.length>1?n[o]:o.charCodeAt(0)),n[o+e]=a,a++,o=e);i.push(o.length>1?n[o]:o.charCodeAt(0));for(s=0;s<i.length;s++)i[s]=String.fromCharCode(i[s]);return i.join("")},r.prototype.decode=function(t){for(var e,n={},r=(t+"").split(""),i=r[0],o=i,a=[i],s=256,u=1;u<r.length;u++){var f=r[u].charCodeAt(0);e=f<256?r[u]:n[f]?n[f]:o+i,a.push(e),i=e.charAt(0),n[s]=o+i,s++,o=e;}return a.join("")},t.exports=new r;},function(t,e,n){n.r(e);var r=n(0),i=n.n(r),o=n(1),a=n.n(o),s=n(30),u=n(31),f=n(32),c={pack:!0,encode:!0,compress:function(){var t=a()(i.a.mark((function t(e){return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.abrupt("return",e);case 1:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}(),decompress:function(){var t=a()(i.a.mark((function t(e){return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.abrupt("return",e);case 1:case"end":return t.stop()}}),t)})));return function(e){return t.apply(this,arguments)}}()},l={lzma:s.a,lzstring:u.a,lzw:f.a,pack:c},h=n(2),d=function(t){return Math.floor(1e4*t)/1e4};n.p=function(t){return t.substring(0,t.lastIndexOf("/"))}(function(){if(document.currentScript)return document.currentScript.src;var t=document.getElementsByTagName("script");return t[t.length-1].src}())+"/",e.default=function(t){function e(t){return n.apply(this,arguments)}function n(){return (n=a()(i.a.mark((function e(n){var r,o,a;return i.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:if(!u){e.next=6;break}return e.next=3,h.a.msgpack();case 3:e.t0=e.sent.encode(n),e.next=7;break;case 6:e.t0=JSON.stringify(n);case 7:return r=e.t0,e.next=10,l[t].compress(r);case 10:if(o=e.sent,!f){e.next=17;break}return e.next=14,h.a.safe64();case 14:e.t1=e.sent.encode(o),e.next=18;break;case 17:e.t1=o;case 18:return a=e.t1,e.abrupt("return",a);case 20:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function r(){return (r=a()(i.a.mark((function e(n){var r,o,a;return i.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:if(!f){e.next=6;break}return e.next=3,h.a.safe64();case 3:e.t0=e.sent.decode(n),e.next=7;break;case 6:e.t0=n;case 7:return r=e.t0,e.next=10,l[t].decompress(r);case 10:if(o=e.sent,!u){e.next=17;break}return e.next=14,h.a.msgpack();case 14:e.t1=e.sent.decode(o),e.next=18;break;case 17:e.t1=JSON.parse(o);case 18:return a=e.t1,e.abrupt("return",a);case 20:case"end":return e.stop()}}),e)})))).apply(this,arguments)}function o(){return (o=a()(i.a.mark((function t(n){var r,o,a;return i.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return r=JSON.stringify(n),o=encodeURIComponent(r),t.next=4,e(n);case 4:return a=t.sent,t.abrupt("return",{raw:r.length,rawencoded:o.length,compressedencoded:a.length,compression:d(o.length/a.length)});case 6:case"end":return t.stop()}}),t)})))).apply(this,arguments)}if(!Object.prototype.hasOwnProperty.call(l,t))throw new Error("No such algorithm ".concat(t));var s=l[t],u=s.pack,f=s.encode;return {compress:e,decompress:function(t){return r.apply(this,arguments)},stats:function(t){return o.apply(this,arguments)}}};}]).default}));
    });

    var createEncoder = /*@__PURE__*/getDefaultExportFromCjs(jsonUrlSingle);

    var toggleSelection = function () {
      var selection = document.getSelection();
      if (!selection.rangeCount) {
        return function () {};
      }
      var active = document.activeElement;

      var ranges = [];
      for (var i = 0; i < selection.rangeCount; i++) {
        ranges.push(selection.getRangeAt(i));
      }

      switch (active.tagName.toUpperCase()) { // .toUpperCase handles XHTML
        case 'INPUT':
        case 'TEXTAREA':
          active.blur();
          break;

        default:
          active = null;
          break;
      }

      selection.removeAllRanges();
      return function () {
        selection.type === 'Caret' &&
        selection.removeAllRanges();

        if (!selection.rangeCount) {
          ranges.forEach(function(range) {
            selection.addRange(range);
          });
        }

        active &&
        active.focus();
      };
    };

    var clipboardToIE11Formatting = {
      "text/plain": "Text",
      "text/html": "Url",
      "default": "Text"
    };

    var defaultMessage = "Copy to clipboard: #{key}, Enter";

    function format(message) {
      var copyKey = (/mac os x/i.test(navigator.userAgent) ? "⌘" : "Ctrl") + "+C";
      return message.replace(/#{\s*key\s*}/g, copyKey);
    }

    function copy(text, options) {
      var debug,
        message,
        reselectPrevious,
        range,
        selection,
        mark,
        success = false;
      if (!options) {
        options = {};
      }
      debug = options.debug || false;
      try {
        reselectPrevious = toggleSelection();

        range = document.createRange();
        selection = document.getSelection();

        mark = document.createElement("span");
        mark.textContent = text;
        // reset user styles for span element
        mark.style.all = "unset";
        // prevents scrolling to the end of the page
        mark.style.position = "fixed";
        mark.style.top = 0;
        mark.style.clip = "rect(0, 0, 0, 0)";
        // used to preserve spaces and line breaks
        mark.style.whiteSpace = "pre";
        // do not inherit user-select (it may be `none`)
        mark.style.webkitUserSelect = "text";
        mark.style.MozUserSelect = "text";
        mark.style.msUserSelect = "text";
        mark.style.userSelect = "text";
        mark.addEventListener("copy", function(e) {
          e.stopPropagation();
          if (options.format) {
            e.preventDefault();
            if (typeof e.clipboardData === "undefined") { // IE 11
              debug && console.warn("unable to use e.clipboardData");
              debug && console.warn("trying IE specific stuff");
              window.clipboardData.clearData();
              var format = clipboardToIE11Formatting[options.format] || clipboardToIE11Formatting["default"];
              window.clipboardData.setData(format, text);
            } else { // all other browsers
              e.clipboardData.clearData();
              e.clipboardData.setData(options.format, text);
            }
          }
          if (options.onCopy) {
            e.preventDefault();
            options.onCopy(e.clipboardData);
          }
        });

        document.body.appendChild(mark);

        range.selectNodeContents(mark);
        selection.addRange(range);

        var successful = document.execCommand("copy");
        if (!successful) {
          throw new Error("copy command was unsuccessful");
        }
        success = true;
      } catch (err) {
        debug && console.error("unable to copy using execCommand: ", err);
        debug && console.warn("trying IE specific stuff");
        try {
          window.clipboardData.setData(options.format || "text", text);
          options.onCopy && options.onCopy(window.clipboardData);
          success = true;
        } catch (err) {
          debug && console.error("unable to copy using clipboardData: ", err);
          debug && console.error("falling back to prompt");
          message = format("message" in options ? options.message : defaultMessage);
          window.prompt(message, text);
        }
      } finally {
        if (selection) {
          if (typeof selection.removeRange == "function") {
            selection.removeRange(range);
          } else {
            selection.removeAllRanges();
          }
        }

        if (mark) {
          document.body.removeChild(mark);
        }
        reselectPrevious();
      }

      return success;
    }

    var copyToClipboard = copy;

    /* src/Result.svelte generated by Svelte v3.32.3 */

    const { Error: Error_1, Object: Object_1$1, console: console_1 } = globals;
    const file$2 = "src/Result.svelte";

    // (75:4) {:catch error}
    function create_catch_block(ctx) {
    	let p;
    	let t_value = /*error*/ ctx[13].message + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			set_style(p, "color", "red");
    			attr_dev(p, "class", "svelte-1r3370x");
    			add_location(p, file$2, 75, 8, 2975);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*awaitingEncoding*/ 2 && t_value !== (t_value = /*error*/ ctx[13].message + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(75:4) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (62:4) {:then encodingResult}
    function create_then_block(ctx) {
    	let div0;
    	let span0;
    	let t1;
    	let button0;
    	let t2;
    	let button0_disabled_value;
    	let t3;
    	let textarea;
    	let textarea_value_value;
    	let t4;
    	let div1;
    	let span1;
    	let t6;
    	let button1;
    	let t7;
    	let t8;
    	let pre;
    	let t9;
    	let t10_value = /*encodingResult*/ ctx[12] + "";
    	let t10;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Encoded:";
    			t1 = space();
    			button0 = element("button");
    			t2 = text("Decode");
    			t3 = space();
    			textarea = element("textarea");
    			t4 = space();
    			div1 = element("div");
    			span1 = element("span");
    			span1.textContent = "Params:";
    			t6 = space();
    			button1 = element("button");
    			t7 = text(/*copyText*/ ctx[2]);
    			t8 = space();
    			pre = element("pre");
    			t9 = text("&auth=");
    			t10 = text(t10_value);
    			add_location(span0, file$2, 63, 12, 2411);
    			button0.disabled = button0_disabled_value = /*customEncoded*/ ctx[0] === null;
    			add_location(button0, file$2, 64, 12, 2445);
    			attr_dev(div0, "class", "svelte-1r3370x");
    			add_location(div0, file$2, 62, 8, 2393);
    			textarea.value = textarea_value_value = /*encodingResult*/ ctx[12];
    			attr_dev(textarea, "class", "svelte-1r3370x");
    			add_location(textarea, file$2, 66, 8, 2547);
    			add_location(span1, file$2, 68, 12, 2638);
    			add_location(button1, file$2, 69, 12, 2671);
    			attr_dev(div1, "class", "svelte-1r3370x");
    			add_location(div1, file$2, 67, 8, 2620);
    			attr_dev(pre, "class", "svelte-1r3370x");
    			add_location(pre, file$2, 71, 8, 2776);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, span0);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, textarea, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, span1);
    			append_dev(div1, t6);
    			append_dev(div1, button1);
    			append_dev(button1, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, pre, anchor);
    			append_dev(pre, t9);
    			append_dev(pre, t10);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*tryDecode*/ ctx[5], false, false, false),
    					listen_dev(textarea, "input", /*onEncodedChange*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*copy*/ ctx[3], false, false, false),
    					listen_dev(button1, "mouseleave", /*mouseleave_handler*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*customEncoded*/ 1 && button0_disabled_value !== (button0_disabled_value = /*customEncoded*/ ctx[0] === null)) {
    				prop_dev(button0, "disabled", button0_disabled_value);
    			}

    			if (dirty & /*awaitingEncoding*/ 2 && textarea_value_value !== (textarea_value_value = /*encodingResult*/ ctx[12])) {
    				prop_dev(textarea, "value", textarea_value_value);
    			}

    			if (dirty & /*copyText*/ 4) set_data_dev(t7, /*copyText*/ ctx[2]);
    			if (dirty & /*awaitingEncoding*/ 2 && t10_value !== (t10_value = /*encodingResult*/ ctx[12] + "")) set_data_dev(t10, t10_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(textarea);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(pre);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(62:4) {:then encodingResult}",
    		ctx
    	});

    	return block;
    }

    // (60:28)   <p>...waiting</p>     {:then encodingResult}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "...waiting";
    			attr_dev(p, "class", "svelte-1r3370x");
    			add_location(p, file$2, 60, 1, 2340);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(60:28)   <p>...waiting</p>     {:then encodingResult}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let section;
    	let promise;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 12,
    		error: 13
    	};

    	handle_promise(promise = /*awaitingEncoding*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			section = element("section");
    			info.block.c();
    			attr_dev(section, "id", "result");
    			attr_dev(section, "class", "svelte-1r3370x");
    			add_location(section, file$2, 58, 0, 2288);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			info.block.m(section, info.anchor = null);
    			info.mount = () => section;
    			info.anchor = null;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*awaitingEncoding*/ 2 && promise !== (promise = /*awaitingEncoding*/ ctx[1]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[12] = child_ctx[13] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Result", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	let { data } = $$props;
    	let { encoding } = $$props;
    	let customEncoded = null;
    	const dispatch = createEventDispatcher();
    	const encoders = Object.fromEntries(encodings.map(encoding => [encoding, createEncoder(encoding)]));

    	function copy() {
    		encoders["lzw"].compress(data).then(compressed => {
    			copyToClipboard(compressed);
    			$$invalidate(2, copyText = "Copied!");
    		});
    	}

    	function onEncodedChange(e) {
    		$$invalidate(0, customEncoded = e.target.value);
    	}

    	function tryDecode() {
    		return __awaiter(this, void 0, void 0, function* () {
    			try {
    				const promises = Object.entries(encoders).map(([name, encoder]) => encoder.decompress(customEncoded).then(v => {
    					if (typeof v !== "object" || !v) throw Error("");
    					return [v, name];
    				}));

    				const a = yield Promise.any(promises);
    				console.log(a);
    				const [decoded, encodingName] = a;
    				console.log(decoded, encodingName);
    				dispatch("change", decoded);

    				if (encodingName !== encoding) {
    					dispatch("encodingChange", encodingName);
    				}
    			} catch(e) {
    				console.warn(e);
    				alert("Decoding failed!");
    			}
    		});
    	}

    	let awaitingEncoding;
    	let copyText = "Copy";
    	const writable_props = ["data", "encoding"];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Result> was created with unknown prop '${key}'`);
    	});

    	const mouseleave_handler = () => $$invalidate(2, copyText = "Copy");

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(6, data = $$props.data);
    		if ("encoding" in $$props) $$invalidate(7, encoding = $$props.encoding);
    	};

    	$$self.$capture_state = () => ({
    		__awaiter,
    		createEventDispatcher,
    		createEncoder,
    		copyToClipboard,
    		encodings,
    		data,
    		encoding,
    		customEncoded,
    		dispatch,
    		encoders,
    		copy,
    		onEncodedChange,
    		tryDecode,
    		awaitingEncoding,
    		copyText
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("data" in $$props) $$invalidate(6, data = $$props.data);
    		if ("encoding" in $$props) $$invalidate(7, encoding = $$props.encoding);
    		if ("customEncoded" in $$props) $$invalidate(0, customEncoded = $$props.customEncoded);
    		if ("awaitingEncoding" in $$props) $$invalidate(1, awaitingEncoding = $$props.awaitingEncoding);
    		if ("copyText" in $$props) $$invalidate(2, copyText = $$props.copyText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*encoding, data*/ 192) {
    			($$invalidate(1, awaitingEncoding = encoders[encoding].compress(data)), $$invalidate(0, customEncoded = null));
    		}
    	};

    	return [
    		customEncoded,
    		awaitingEncoding,
    		copyText,
    		copy,
    		onEncodedChange,
    		tryDecode,
    		data,
    		encoding,
    		mouseleave_handler
    	];
    }

    class Result extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { data: 6, encoding: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Result",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[6] === undefined && !("data" in props)) {
    			console_1.warn("<Result> was created without expected prop 'data'");
    		}

    		if (/*encoding*/ ctx[7] === undefined && !("encoding" in props)) {
    			console_1.warn("<Result> was created without expected prop 'encoding'");
    		}
    	}

    	get data() {
    		throw new Error_1("<Result>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error_1("<Result>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get encoding() {
    		throw new Error_1("<Result>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set encoding(value) {
    		throw new Error_1("<Result>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.32.3 */
    const file$3 = "src/App.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let form;
    	let t0;
    	let json;
    	let t1;
    	let result;
    	let current;

    	form = new Form({
    			props: {
    				data: /*data*/ ctx[0],
    				encoding: /*encoding*/ ctx[1]
    			},
    			$$inline: true
    		});

    	form.$on("change", /*onChange*/ ctx[2]);
    	form.$on("encodingChange", /*onEncodingChange*/ ctx[3]);

    	json = new JSON_1({
    			props: { data: /*data*/ ctx[0] },
    			$$inline: true
    		});

    	json.$on("change", /*onChange*/ ctx[2]);

    	result = new Result({
    			props: {
    				data: /*data*/ ctx[0],
    				encoding: /*encoding*/ ctx[1]
    			},
    			$$inline: true
    		});

    	result.$on("change", /*onChange*/ ctx[2]);
    	result.$on("encodingChange", /*onEncodingChange*/ ctx[3]);

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(form.$$.fragment);
    			t0 = space();
    			create_component(json.$$.fragment);
    			t1 = space();
    			create_component(result.$$.fragment);
    			attr_dev(main, "class", "svelte-1vgk8vl");
    			add_location(main, file$3, 18, 0, 836);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(form, main, null);
    			append_dev(main, t0);
    			mount_component(json, main, null);
    			append_dev(main, t1);
    			mount_component(result, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const form_changes = {};
    			if (dirty & /*data*/ 1) form_changes.data = /*data*/ ctx[0];
    			if (dirty & /*encoding*/ 2) form_changes.encoding = /*encoding*/ ctx[1];
    			form.$set(form_changes);
    			const json_changes = {};
    			if (dirty & /*data*/ 1) json_changes.data = /*data*/ ctx[0];
    			json.$set(json_changes);
    			const result_changes = {};
    			if (dirty & /*data*/ 1) result_changes.data = /*data*/ ctx[0];
    			if (dirty & /*encoding*/ 2) result_changes.encoding = /*encoding*/ ctx[1];
    			result.$set(result_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(form.$$.fragment, local);
    			transition_in(json.$$.fragment, local);
    			transition_in(result.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(form.$$.fragment, local);
    			transition_out(json.$$.fragment, local);
    			transition_out(result.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(form);
    			destroy_component(json);
    			destroy_component(result);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	let data = {
    		issuerUrl: "https://kyma.eu.auth0.com/",
    		clientId: "5W89vBHwn2mu7nT0uzvoN4xCof0h4jtN",
    		k8sApiUrl: "api.nope.hasselhoff.shoot.canary.k8s-hana.ondemand.com",
    		disabledNavigationNodes: "",
    		systemNamespaces: "istio-system knative-eventing knative-serving kube-public kube-system kyma-backup kyma-installer kyma-integration kyma-system natss kube-node-lease kubernetes-dashboard serverless-system",
    		scope: "audience:server:client_id:kyma-client audience:server:client_id:console openid email profile groups",
    		usePKCE: true,
    		bebEnabled: false
    	};

    	let encoding = "lzstring";
    	const onChange = e => $$invalidate(0, data = e.detail);
    	const onEncodingChange = e => $$invalidate(1, encoding = e.detail);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Form,
    		JSON: JSON_1,
    		Result,
    		data,
    		encoding,
    		onChange,
    		onEncodingChange
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("encoding" in $$props) $$invalidate(1, encoding = $$props.encoding);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [data, encoding, onChange, onEncodingChange];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
