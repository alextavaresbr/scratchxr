(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["ScratchStorage"] = factory();
	else
		root["ScratchStorage"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
let __webpack_exports__ = {};

;// ../task-herder/dist/task-herder.js
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
const CancelReason = {
  QueueCostLimitExceeded: "Queue cost limit exceeded",
  Aborted: "Task aborted",
  Cancel: "Task cancelled",
  TaskTooExpensive: "Task cost exceeds maximum bucket size"
};
function PromiseWithResolvers() {
  let e, t;
  return {
    promise: new Promise((n, r) => {
      e = n, t = r;
    }),
    resolve: e,
    reject: t
  };
}
var TaskRecord = class TaskRecord {
    constructor(e) {
      var _n$cost;
      let n = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      _defineProperty(this, "cost", void 0);
      _defineProperty(this, "promise", void 0);
      _defineProperty(this, "run", void 0);
      _defineProperty(this, "cancel", void 0);
      this.cost = (_n$cost = n.cost) !== null && _n$cost !== void 0 ? _n$cost : 1;
      let _PromiseWithResolvers = PromiseWithResolvers(),
        r = _PromiseWithResolvers.promise,
        i = _PromiseWithResolvers.resolve,
        a = _PromiseWithResolvers.reject;
      this.promise = r, this.cancel = e => {
        a(e);
      }, this.run = async () => {
        try {
          i(await e());
        } catch (e) {
          a(e);
        }
      };
    }
  },
  TaskQueue = class TaskQueue {
    constructor(e) {
      var _e$startingTokens, _e$queueCostLimit, _e$concurrency;
      _defineProperty(this, "burstLimit", void 0);
      _defineProperty(this, "sustainRate", void 0);
      _defineProperty(this, "queueCostLimit", void 0);
      _defineProperty(this, "concurrencyLimit", void 0);
      _defineProperty(this, "tokenCount", void 0);
      _defineProperty(this, "runningTasks", 0);
      _defineProperty(this, "pendingTaskRecords", []);
      _defineProperty(this, "lastRefillTime", Date.now());
      _defineProperty(this, "onTaskAdded", PromiseWithResolvers().resolve);
      _defineProperty(this, "onTaskFinished", PromiseWithResolvers().resolve);
      this.burstLimit = e.burstLimit, this.sustainRate = e.sustainRate, this.tokenCount = (_e$startingTokens = e.startingTokens) !== null && _e$startingTokens !== void 0 ? _e$startingTokens : e.burstLimit, this.queueCostLimit = (_e$queueCostLimit = e.queueCostLimit) !== null && _e$queueCostLimit !== void 0 ? _e$queueCostLimit : Infinity, this.concurrencyLimit = (_e$concurrency = e.concurrency) !== null && _e$concurrency !== void 0 ? _e$concurrency : 1, this.runTasks();
    }
    get length() {
      return this.pendingTaskRecords.length;
    }
    get options() {
      return {
        burstLimit: this.burstLimit,
        sustainRate: this.sustainRate,
        startingTokens: this.tokenCount,
        queueCostLimit: this.queueCostLimit,
        concurrency: this.concurrencyLimit
      };
    }
    do(t) {
      var _r$signal;
      let r = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      let i = new TaskRecord(t, r);
      return i.cost > this.burstLimit ? Promise.reject(Error(CancelReason.TaskTooExpensive)) : this.queueCostLimit < Infinity && this.pendingTaskRecords.reduce((e, t) => e + t.cost, i.cost) > this.queueCostLimit ? Promise.reject(Error(CancelReason.QueueCostLimitExceeded)) : (this.pendingTaskRecords.push(i), (_r$signal = r.signal) !== null && _r$signal !== void 0 && _r$signal.addEventListener("abort", () => {
        this.cancel(i.promise, Error(CancelReason.Aborted));
      }), this.onTaskAdded(), i.promise);
    }
    cancel(t, n) {
      let r = this.pendingTaskRecords.findIndex(e => e.promise === t);
      if (r !== -1) {
        let _this$pendingTaskReco = this.pendingTaskRecords.splice(r, 1),
          _this$pendingTaskReco2 = _slicedToArray(_this$pendingTaskReco, 1),
          t = _this$pendingTaskReco2[0];
        return t.cancel(n !== null && n !== void 0 ? n : Error(CancelReason.Cancel)), !0;
      }
      return !1;
    }
    cancelAll(t) {
      let n = this.pendingTaskRecords;
      return this.pendingTaskRecords = [], t !== null && t !== void 0 ? t : t = Error(CancelReason.Cancel), n.forEach(e => {
        e.cancel(t);
      }), n.length;
    }
    refillAndSpend(e) {
      return this.refill(), this.spend(e);
    }
    refill() {
      let e = Date.now(),
        t = e - this.lastRefillTime;
      if (t <= 0) return;
      this.lastRefillTime = e;
      let n = t / 1e3 * this.sustainRate;
      this.tokenCount = Math.min(this.burstLimit, this.tokenCount + n);
    }
    spend(e) {
      return this.tokenCount >= e ? (this.tokenCount -= e, !0) : !1;
    }
    async runTasks() {
      for (;;) {
        let n = this.pendingTaskRecords.shift();
        if (!n) {
          let _PromiseWithResolvers2 = PromiseWithResolvers(),
            e = _PromiseWithResolvers2.promise,
            n = _PromiseWithResolvers2.resolve;
          this.onTaskAdded = n, await e;
          continue;
        }
        if (n.cost > this.burstLimit) {
          n.cancel(Error(CancelReason.TaskTooExpensive));
          continue;
        }
        if (this.refillAndSpend(n.cost)) {
          if (this.runningTasks >= this.concurrencyLimit) {
            let _PromiseWithResolvers3 = PromiseWithResolvers(),
              e = _PromiseWithResolvers3.promise,
              n = _PromiseWithResolvers3.resolve;
            this.onTaskFinished = n, await e;
          }
          this.runTask(n);
        } else {
          this.pendingTaskRecords.unshift(n);
          let e = Math.max(n.cost - this.tokenCount, 0),
            t = Math.ceil(1e3 * e / this.sustainRate);
          await new Promise(e => setTimeout(e, t));
        }
      }
    }
    async runTask(e) {
      this.runningTasks++;
      try {
        await e.run();
      } finally {
        this.runningTasks--, this.onTaskFinished();
      }
    }
  },
  QueueManager = class QueueManager {
    constructor(e, t) {
      _defineProperty(this, "queues", void 0);
      _defineProperty(this, "defaultOptions", void 0);
      this.queues = new Map(t), this.defaultOptions = e;
    }
    create(e) {
      let t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      let n = new TaskQueue(_objectSpread(_objectSpread({}, this.defaultOptions), t));
      return this.queues.set(e, n), n;
    }
    get(e) {
      return this.queues.get(e);
    }
    getOrCreate(e) {
      var _this$get;
      let t = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return (_this$get = this.get(e)) !== null && _this$get !== void 0 ? _this$get : this.create(e, t);
    }
    options() {
      return _objectSpread({}, this.defaultOptions);
    }
  };

;// ./src/HostQueues.ts

/**
 * @summary A set of generous limits, for things like downloading assets from CDN.
 * @description
 * In practice, these limits seem to lead to slightly better performance than no limits at all, mostly due to the
 * concurrency limit. For example, on my development computer & my relatively fast residential connection, a
 * concurrency limit of 4 loads a particular test project in 21 seconds, as opposed to 25 seconds when I bypass the
 * queue and call `fetch` directly. In that test, my setup downloads about 50 assets per second, so this set of options
 * only affects concurrency and doesn't actually throttle the downloads. Limiting concurrency also fixes the issue
 * where very large projects (thousands of assets) can lead to browser failures like `net::ERR_INSUFFICIENT_RESOURCES`.
 * The exact concurrency limit doesn't seem to matter much since the browser limits parallel connections itself. It
 * just needs to be high enough to avoid bubbles in the download pipeline and low enough to avoid resource exhaustion.
 * @see {@link https://github.com/scratchfoundation/scratch-gui/issues/7111}
 */
const AssetQueueOptions = {
  burstLimit: 64,
  sustainRate: 64,
  // WARNING: asset download concurrency >=5 can lead to corrupted buffers on Chrome (December 2025, Chrome 142.0)
  // when using Scratch's bitmap load pipeline. Marking the canvas context as `{willReadFrequently: true}` seems to
  // eliminate that issue, so maybe the problem is related to hardware acceleration.
  concurrency: 64
};
/**
 * Central registry of per-host queues.
 * Uses strict limits by default. Override these strict limits as needed for specific hosts.
 */
const hostQueueManager = new QueueManager({
  burstLimit: 5,
  sustainRate: 1,
  concurrency: 1
});
;// ./src/scratchFetch.ts
/* unused harmony import specifier */ var scratchFetch_hostQueueManager;
function scratchFetch_slicedToArray(r, e) { return scratchFetch_arrayWithHoles(r) || scratchFetch_iterableToArrayLimit(r, e) || scratchFetch_unsupportedIterableToArray(r, e) || scratchFetch_nonIterableRest(); }
function scratchFetch_nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function scratchFetch_unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return scratchFetch_arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? scratchFetch_arrayLikeToArray(r, a) : void 0; } }
function scratchFetch_arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function scratchFetch_iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function scratchFetch_arrayWithHoles(r) { if (Array.isArray(r)) return r; }
;
const Headers = globalThis.Headers;
/**
 * Metadata header names.
 * The enum value is the name of the associated header.
 */
var RequestMetadata;
(function (RequestMetadata) {
  /** The ID of the project associated with this request */
  RequestMetadata["ProjectId"] = "X-Project-ID";
  /** The ID of the project run associated with this request */
  RequestMetadata["RunId"] = "X-Run-ID";
})(RequestMetadata || (RequestMetadata = {}));
/**
 * Metadata headers for requests.
 */
const metadata = new Headers();
/**
 * Check if there is any metadata to apply.
 * @returns {boolean} true if `metadata` has contents, or false if it is empty.
 */
const hasMetadata = () => {
  const searchParams = typeof self !== 'undefined' && self && self.location && self.location.search && self.location.search.split(/[?&]/) || [];
  if (!searchParams.includes('scratchMetadata=1')) {
    // for now, disable this feature unless scratchMetadata=1
    // TODO: remove this check once we're sure the feature works correctly in production
    return false;
  }
  for (const _ of metadata) {
    return true;
  }
  return false;
};
/**
 * Non-destructively merge any metadata state (if any) with the provided options object (if any).
 * If there is metadata state but no options object is provided, make a new object.
 * If there is no metadata state, return the provided options parameter without modification.
 * If there is metadata and an options object is provided, modify a copy and return it.
 * Headers in the provided options object may override headers generated from metadata state.
 * @param {RequestInit} [options] The initial request options. May be null or undefined.
 * @returns {RequestInit|undefined} the provided options parameter without modification, or a new options object.
 */
const applyMetadata = options => {
  if (hasMetadata()) {
    const augmentedOptions = Object.assign({}, options);
    augmentedOptions.headers = new Headers(metadata);
    if (options && options.headers) {
      // the Fetch spec says options.headers could be:
      // "A Headers object, an object literal, or an array of two-item arrays to set request's headers."
      // turn it into a Headers object to be sure of how to interact with it
      const overrideHeaders = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
      for (const _ref of overrideHeaders.entries()) {
        var _ref2 = scratchFetch_slicedToArray(_ref, 2);
        const name = _ref2[0];
        const value = _ref2[1];
        augmentedOptions.headers.set(name, value);
      }
    }
    return augmentedOptions;
  }
  return options;
};
/**
 * Make a network request.
 * This is a wrapper for the global fetch method, adding some Scratch-specific functionality.
 * @param {RequestInfo|URL} resource The resource to fetch.
 * @param {RequestInit} [requestOptions] Optional object containing custom settings for this request.
 * @param {ScratchFetchOptions} [scratchOptions] Optional Scratch-specific settings for this request.
 * @see {@link https://developer.mozilla.org/docs/Web/API/fetch} for more about the fetch API.
 * @returns {Promise<Response>} A promise for the response to the request.
 */
const scratchFetch = (resource, requestOptions, scratchOptions) => {
  requestOptions = applyMetadata(requestOptions);
  let queueName = scratchOptions === null || scratchOptions === void 0 ? void 0 : scratchOptions.queueName;
  if (!queueName) {
    // Normalize resource to a Request object. The `fetch` call will do this anyway, so it's not much extra work,
    // but it guarantees availability of the URL for queue naming.
    resource = new Request(resource, requestOptions);
    queueName = new URL(resource.url).hostname;
  }
  const queue = hostQueueManager.getOrCreate(queueName, scratchOptions === null || scratchOptions === void 0 ? void 0 : scratchOptions.queueOptions);
  return queue.do(() => fetch(resource, requestOptions));
};
/**
 * Create a new fetch queue with the given identifier and option overrides.
 * If a queue with that identifier already exists, it will be replaced.
 * Queues are automatically created as needed with default options, so
 * there's no need to call this unless you need to override the default queue options.
 * WARNING: If the old queue has is not empty, it may continue to run its tasks in the background.
 * If you need to cancel fetch tasks in that queue before replacing it, do so manually first.
 * @param queueName The name of the queue to create.
 * @param overrides Optional overrides for the default QueueOptions for this specific queue.
 */
const createQueue = (queueName, overrides) => {
  scratchFetch_hostQueueManager.create(queueName, overrides);
};
/**
 * Set the value of a named request metadata item.
 * Setting the value to `null` or `undefined` will NOT remove the item.
 * Use `unsetMetadata` for that.
 * @param {RequestMetadata} name The name of the metadata item to set.
 * @param {any} value The value to set (will be converted to a string).
 */
const setMetadata = (name, value) => {
  metadata.set(name, value);
};
/**
 * Remove a named request metadata item.
 * @param {RequestMetadata} name The name of the metadata item to remove.
 */
const unsetMetadata = name => {
  metadata.delete(name);
};
/**
 * Retrieve a named request metadata item.
 * Only for use in tests. At the time of writing, used in scratch-vm tests.
 * @param {RequestMetadata} name The name of the metadata item to retrieve.
 * @returns {string|null} The value of the metadata item, or `null` if it was not found.
 */
const getMetadata = name => metadata.get(name);
;// ./src/FetchWorkerTool.worker.ts
/* eslint-env worker */
/// <reference lib="webworker" />
// This worker won't share the same queue as the main thread, but throttling should be okay
// as long as we don't use FetchTool and FetchWorkerTool at the same time.
// TODO: Communicate metadata from the main thread to workers or move the worker boundary "into" `scratchFetch`.
// Make sure to benchmark any changes to avoid performance regressions, especially for large project loads.


let jobsActive = 0;
const complete = [];
let intervalId = void 0;
/**
 * Register a step function.
 *
 * Step checks if there are completed jobs and if there are sends them to the
 * parent. Then it checks the jobs count. If there are no further jobs, clear
 * the step.
 */
const registerStep = function registerStep() {
  intervalId = setInterval(() => {
    if (complete.length) {
      // Send our chunk of completed requests and instruct postMessage to
      // transfer the buffers instead of copying them.
      postMessage(complete.slice(),
      // Instruct postMessage that these buffers in the sent message
      // should use their Transferable trait. After the postMessage
      // call the "buffers" will still be in complete if you looked,
      // but they will all be length 0 as the data they reference has
      // been sent to the window. This lets us send a lot of data
      // without the normal postMessage behaviour of making a copy of
      // all of the data for the window.
      complete.map(response => response.buffer).filter(Boolean));
      complete.length = 0;
    }
    if (jobsActive === 0) {
      clearInterval(intervalId);
      intervalId = void 0;
    }
  }, 1);
};
/**
 * Receive a job from the parent and fetch the requested data.
 * @param message The message from the parent.
 * @param message.data A job id, url, and options descriptor to perform.
 */
const onMessage = async _ref => {
  let job = _ref.data;
  if (jobsActive === 0 && !intervalId) {
    registerStep();
  }
  jobsActive++;
  try {
    const response = await scratchFetch(job.url, job.options, {
      queueOptions: AssetQueueOptions
    });
    const result = {
      id: job.id
    };
    if (response.ok) {
      result.buffer = await response.arrayBuffer();
    } else if (response.status === 404) {
      result.buffer = null;
    } else {
      throw response.status;
    }
    complete.push(result);
  } catch (error) {
    complete.push({
      id: job.id,
      error: (error === null || error === void 0 ? void 0 : error.message) || "Failed request: ".concat(job.url)
    });
  } finally {
    jobsActive--;
  }
};
// "fetch" is supported in Node.js as of 16.15 and our target browsers as of ~2017
postMessage({
  support: {
    fetch: true
  }
});
self.addEventListener('message', onMessage);
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=fetch-worker.e3471d9c6e9a213ba1d0.js.map