globalThis.__nitro_main__ = import.meta.url;
import { i as HTTPError, n as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
import { r as FastResponse } from "./_libs/h3-v2+rou3+srvx.mjs";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/favicon.png": {
		"type": "image/png",
		"etag": "\"1d208-CWlKo2AUROLcdUTVrss51bA3rpI\"",
		"mtime": "2026-10-06T19:04:02.137Z",
		"size": 119304,
		"path": "../public/favicon.png"
	},
	"/apple-touch-icon.png": {
		"type": "image/png",
		"etag": "\"1d208-CWlKo2AUROLcdUTVrss51bA3rpI\"",
		"mtime": "2026-10-06T19:04:02.137Z",
		"size": 119304,
		"path": "../public/apple-touch-icon.png"
	},
	"/assets/call-DWAN6wm8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2930-XU17Lr6lFb7Ew4nXqmXtJjFH/do\"",
		"mtime": "2026-10-19T06:43:40.929Z",
		"size": 10544,
		"path": "../public/assets/call-DWAN6wm8.js"
	},
	"/icon-512.png": {
		"type": "image/png",
		"etag": "\"3fdcd-rS/n2ZlLEh1J8Q7q13YRxAHLovc\"",
		"mtime": "2026-10-18T17:17:14.534Z",
		"size": 261581,
		"path": "../public/icon-512.png"
	},
	"/assets/chats-DYoHTgU5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"871-O6ZS6POQ9eSbHVg/RCeZUEgOoWo\"",
		"mtime": "2026-10-19T06:43:40.930Z",
		"size": 2161,
		"path": "../public/assets/chats-DYoHTgU5.js"
	},
	"/assets/chats._conversationId-BMUsVaKr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3b1b-uKGMCX6EqR0m58s7Bj3ar+v3Hww\"",
		"mtime": "2026-10-19T06:43:40.933Z",
		"size": 15131,
		"path": "../public/assets/chats._conversationId-BMUsVaKr.js"
	},
	"/manifest.webmanifest": {
		"type": "application/manifest+json",
		"etag": "\"12f-30cjpX9nl/FPZxW+QnrLRE76qsY\"",
		"mtime": "2026-10-16T08:23:47.000Z",
		"size": 303,
		"path": "../public/manifest.webmanifest"
	},
	"/assets/createLucideIcon-CNbcMdlt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"40cb-CbSb8d4W0f7ZAewMJo1TyxCNQ2Q\"",
		"mtime": "2026-10-19T06:43:40.948Z",
		"size": 16587,
		"path": "../public/assets/createLucideIcon-CNbcMdlt.js"
	},
	"/assets/Match-mLbPDa0w.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1173-h9Odkg30+1BYRRyAYUb9WC8dKdA\"",
		"mtime": "2026-10-19T06:43:40.928Z",
		"size": 4467,
		"path": "../public/assets/Match-mLbPDa0w.js"
	},
	"/assets/client-B2RPzCN2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"369af-bOoBwmVKZbDwt2jKxCgd2A7l96E\"",
		"mtime": "2026-10-19T06:43:40.948Z",
		"size": 223663,
		"path": "../public/assets/client-B2RPzCN2.js"
	},
	"/assets/rolldown-runtime-CbXtAM7H.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24d-+aXgvbJ1Wwcp2A8AXKIBByksYC8\"",
		"mtime": "2026-10-19T06:43:40.948Z",
		"size": 589,
		"path": "../public/assets/rolldown-runtime-CbXtAM7H.js"
	},
	"/assets/routes-Cf_kL2GN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24af-X76Qa1dNm3cqyXYYyB4II5spFLc\"",
		"mtime": "2026-10-19T06:43:40.949Z",
		"size": 9391,
		"path": "../public/assets/routes-Cf_kL2GN.js"
	},
	"/assets/styles-CM3WDN16.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"12944-JN3mBn1O7AxfO4vgpN6xq2f36ZM\"",
		"mtime": "2026-10-19T06:43:40.949Z",
		"size": 76100,
		"path": "../public/assets/styles-CM3WDN16.css"
	},
	"/assets/chats._conversationId-vXW8rJ55.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a59-AEDGkxWxhgMRRBppB0s2yolu2K8\"",
		"mtime": "2026-10-19T06:43:40.944Z",
		"size": 6745,
		"path": "../public/assets/chats._conversationId-vXW8rJ55.js"
	},
	"/assets/useSelector-C7hJpGc2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8b1-I6cMBp5JNJmyNbtWT/5gifp9gKs\"",
		"mtime": "2026-10-19T06:43:40.949Z",
		"size": 2225,
		"path": "../public/assets/useSelector-C7hJpGc2.js"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"a0-CKGXSIe7TSsqDTmGm/nY1t/o5d0\"",
		"mtime": "2026-10-16T08:23:47.000Z",
		"size": 160,
		"path": "../public/robots.txt"
	},
	"/assets/index-ClevBF1H.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"533ae-3NSNJeGyAsBEYNSKa2pXeen5Q6Y\"",
		"mtime": "2026-10-19T06:43:40.927Z",
		"size": 340910,
		"path": "../public/assets/index-ClevBF1H.js"
	},
	"/icon-192.png": {
		"type": "image/png",
		"etag": "\"de64-pvbpRtvbcrkg2xmic8YF+Pw8vjY\"",
		"mtime": "2026-10-18T17:16:36.163Z",
		"size": 56932,
		"path": "../public/icon-192.png"
	},
	"/assets/chats.index-CN4vbryR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8f26-NDi89+f/KfGulmhF51lbFh1wz6Y\"",
		"mtime": "2026-10-19T06:43:40.947Z",
		"size": 36646,
		"path": "../public/assets/chats.index-CN4vbryR.js"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_Nvg8dj = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_Nvg8dj
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };
