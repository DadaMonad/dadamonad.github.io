"use strict";

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw (f.code = "MODULE_NOT_FOUND", f);
      }var l = n[o] = { exports: {} };t[o][0].call(l.exports, function (e) {
        var n = t[o][1][e];return s(n ? n : e);
      }, l, l.exports, e, t, n, r);
    }return n[o].exports;
  }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) s(r[o]);return s;
})({ 1: [function (require, module, exports) {
    // shim for using process in browser

    var process = module.exports = {};
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;

    function cleanUpNextTick() {
      draining = false;
      if (currentQueue.length) {
        queue = currentQueue.concat(queue);
      } else {
        queueIndex = -1;
      }
      if (queue.length) {
        drainQueue();
      }
    }

    function drainQueue() {
      if (draining) {
        return;
      }
      var timeout = setTimeout(cleanUpNextTick);
      draining = true;

      var len = queue.length;
      while (len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
          if (currentQueue) {
            currentQueue[queueIndex].run();
          }
        }
        queueIndex = -1;
        len = queue.length;
      }
      currentQueue = null;
      draining = false;
      clearTimeout(timeout);
    }

    process.nextTick = function (fun) {
      var args = new Array(arguments.length - 1);
      if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
          args[i - 1] = arguments[i];
        }
      }
      queue.push(new Item(fun, args));
      if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
      }
    };

    // v8 likes predictible objects
    function Item(fun, array) {
      this.fun = fun;
      this.array = array;
    }
    Item.prototype.run = function () {
      this.fun.apply(null, this.array);
    };
    process.title = 'browser';
    process.browser = true;
    process.env = {};
    process.argv = [];
    process.version = ''; // empty string to avoid regexp issues
    process.versions = {};

    function noop() {}

    process.on = noop;
    process.addListener = noop;
    process.once = noop;
    process.off = noop;
    process.removeListener = noop;
    process.removeAllListeners = noop;
    process.emit = noop;

    process.binding = function (name) {
      throw new Error('process.binding is not supported');
    };

    process.cwd = function () {
      return '/';
    };
    process.chdir = function (dir) {
      throw new Error('process.chdir is not supported');
    };
    process.umask = function () {
      return 0;
    };
  }, {}], 2: [function (require, module, exports) {
    (function (process, global) {
      /**
       * Copyright (c) 2014, Facebook, Inc.
       * All rights reserved.
       *
       * This source code is licensed under the BSD-style license found in the
       * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
       * additional grant of patent rights can be found in the PATENTS file in
       * the same directory.
       */

      !(function (global) {
        "use strict";

        var hasOwn = Object.prototype.hasOwnProperty;
        var undefined; // More compressible than void 0.
        var iteratorSymbol = typeof Symbol === "function" && Symbol.iterator || "@@iterator";

        var inModule = typeof module === "object";
        var runtime = global.regeneratorRuntime;
        if (runtime) {
          if (inModule) {
            // If regeneratorRuntime is defined globally and we're in a module,
            // make the exports object identical to regeneratorRuntime.
            module.exports = runtime;
          }
          // Don't bother evaluating the rest of this file if the runtime was
          // already defined globally.
          return;
        }

        // Define the runtime globally (as expected by generated code) as either
        // module.exports (if we're in a module) or a new, empty object.
        runtime = global.regeneratorRuntime = inModule ? module.exports : {};

        function wrap(innerFn, outerFn, self, tryLocsList) {
          // If outerFn provided, then outerFn.prototype instanceof Generator.
          var generator = Object.create((outerFn || Generator).prototype);

          generator._invoke = makeInvokeMethod(innerFn, self || null, new Context(tryLocsList || []));

          return generator;
        }
        runtime.wrap = wrap;

        // Try/catch helper to minimize deoptimizations. Returns a completion
        // record like context.tryEntries[i].completion. This interface could
        // have been (and was previously) designed to take a closure to be
        // invoked without arguments, but in all the cases we care about we
        // already have an existing method we want to call, so there's no need
        // to create a new function object. We can even get away with assuming
        // the method takes exactly one argument, since that happens to be true
        // in every case, so we don't have to touch the arguments object. The
        // only additional allocation required is the completion record, which
        // has a stable shape and so hopefully should be cheap to allocate.
        function tryCatch(fn, obj, arg) {
          try {
            return { type: "normal", arg: fn.call(obj, arg) };
          } catch (err) {
            return { type: "throw", arg: err };
          }
        }

        var GenStateSuspendedStart = "suspendedStart";
        var GenStateSuspendedYield = "suspendedYield";
        var GenStateExecuting = "executing";
        var GenStateCompleted = "completed";

        // Returning this object from the innerFn has the same effect as
        // breaking out of the dispatch switch statement.
        var ContinueSentinel = {};

        // Dummy constructor functions that we use as the .constructor and
        // .constructor.prototype properties for functions that return Generator
        // objects. For full spec compliance, you may wish to configure your
        // minifier not to mangle the names of these two functions.
        function Generator() {}
        function GeneratorFunction() {}
        function GeneratorFunctionPrototype() {}

        var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype;
        GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
        GeneratorFunctionPrototype.constructor = GeneratorFunction;
        GeneratorFunction.displayName = "GeneratorFunction";

        // Helper for defining the .next, .throw, and .return methods of the
        // Iterator interface in terms of a single ._invoke method.
        function defineIteratorMethods(prototype) {
          ["next", "throw", "return"].forEach(function (method) {
            prototype[method] = function (arg) {
              return this._invoke(method, arg);
            };
          });
        }

        runtime.isGeneratorFunction = function (genFun) {
          var ctor = typeof genFun === "function" && genFun.constructor;
          return ctor ? ctor === GeneratorFunction ||
          // For the native GeneratorFunction constructor, the best we can
          // do is to check its .name property.
          (ctor.displayName || ctor.name) === "GeneratorFunction" : false;
        };

        runtime.mark = function (genFun) {
          genFun.__proto__ = GeneratorFunctionPrototype;
          genFun.prototype = Object.create(Gp);
          return genFun;
        };

        // Within the body of any async function, `await x` is transformed to
        // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
        // `value instanceof AwaitArgument` to determine if the yielded value is
        // meant to be awaited. Some may consider the name of this method too
        // cutesy, but they are curmudgeons.
        runtime.awrap = function (arg) {
          return new AwaitArgument(arg);
        };

        function AwaitArgument(arg) {
          this.arg = arg;
        }

        function AsyncIterator(generator) {
          // This invoke function is written in a style that assumes some
          // calling function (or Promise) will handle exceptions.
          function invoke(method, arg) {
            var result = generator[method](arg);
            var value = result.value;
            return value instanceof AwaitArgument ? Promise.resolve(value.arg).then(invokeNext, invokeThrow) : Promise.resolve(value).then(function (unwrapped) {
              // When a yielded Promise is resolved, its final value becomes
              // the .value of the Promise<{value,done}> result for the
              // current iteration. If the Promise is rejected, however, the
              // result for this iteration will be rejected with the same
              // reason. Note that rejections of yielded Promises are not
              // thrown back into the generator function, as is the case
              // when an awaited Promise is rejected. This difference in
              // behavior between yield and await is important, because it
              // allows the consumer to decide what to do with the yielded
              // rejection (swallow it and continue, manually .throw it back
              // into the generator, abandon iteration, whatever). With
              // await, by contrast, there is no opportunity to examine the
              // rejection reason outside the generator function, so the
              // only option is to throw it from the await expression, and
              // let the generator function handle the exception.
              result.value = unwrapped;
              return result;
            });
          }

          if (typeof process === "object" && process.domain) {
            invoke = process.domain.bind(invoke);
          }

          var invokeNext = invoke.bind(generator, "next");
          var invokeThrow = invoke.bind(generator, "throw");
          var invokeReturn = invoke.bind(generator, "return");
          var previousPromise;

          function enqueue(method, arg) {
            var enqueueResult =
            // If enqueue has been called before, then we want to wait until
            // all previous Promises have been resolved before calling invoke,
            // so that results are always delivered in the correct order. If
            // enqueue has not been called before, then it is important to
            // call invoke immediately, without waiting on a callback to fire,
            // so that the async generator function has the opportunity to do
            // any necessary setup in a predictable way. This predictability
            // is why the Promise constructor synchronously invokes its
            // executor callback, and why async functions synchronously
            // execute code before the first await. Since we implement simple
            // async functions in terms of async generators, it is especially
            // important to get this right, even though it requires care.
            previousPromise ? previousPromise.then(function () {
              return invoke(method, arg);
            }) : new Promise(function (resolve) {
              resolve(invoke(method, arg));
            });

            // Avoid propagating enqueueResult failures to Promises returned by
            // later invocations of the iterator.
            previousPromise = enqueueResult["catch"](function (ignored) {});

            return enqueueResult;
          }

          // Define the unified helper method that is used to implement .next,
          // .throw, and .return (see defineIteratorMethods).
          this._invoke = enqueue;
        }

        defineIteratorMethods(AsyncIterator.prototype);

        // Note that simple async functions are implemented on top of
        // AsyncIterator objects; they just return a Promise for the value of
        // the final result produced by the iterator.
        runtime.async = function (innerFn, outerFn, self, tryLocsList) {
          var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList));

          return runtime.isGeneratorFunction(outerFn) ? iter // If outerFn is a generator, return the full iterator.
          : iter.next().then(function (result) {
            return result.done ? result.value : iter.next();
          });
        };

        function makeInvokeMethod(innerFn, self, context) {
          var state = GenStateSuspendedStart;

          return function invoke(method, arg) {
            if (state === GenStateExecuting) {
              throw new Error("Generator is already running");
            }

            if (state === GenStateCompleted) {
              if (method === "throw") {
                throw arg;
              }

              // Be forgiving, per 25.3.3.3.3 of the spec:
              // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
              return doneResult();
            }

            while (true) {
              var delegate = context.delegate;
              if (delegate) {
                if (method === "return" || method === "throw" && delegate.iterator[method] === undefined) {
                  // A return or throw (when the delegate iterator has no throw
                  // method) always terminates the yield* loop.
                  context.delegate = null;

                  // If the delegate iterator has a return method, give it a
                  // chance to clean up.
                  var returnMethod = delegate.iterator["return"];
                  if (returnMethod) {
                    var record = tryCatch(returnMethod, delegate.iterator, arg);
                    if (record.type === "throw") {
                      // If the return method threw an exception, let that
                      // exception prevail over the original return or throw.
                      method = "throw";
                      arg = record.arg;
                      continue;
                    }
                  }

                  if (method === "return") {
                    // Continue with the outer return, now that the delegate
                    // iterator has been terminated.
                    continue;
                  }
                }

                var record = tryCatch(delegate.iterator[method], delegate.iterator, arg);

                if (record.type === "throw") {
                  context.delegate = null;

                  // Like returning generator.throw(uncaught), but without the
                  // overhead of an extra function call.
                  method = "throw";
                  arg = record.arg;
                  continue;
                }

                // Delegate generator ran and handled its own exceptions so
                // regardless of what the method was, we continue as if it is
                // "next" with an undefined arg.
                method = "next";
                arg = undefined;

                var info = record.arg;
                if (info.done) {
                  context[delegate.resultName] = info.value;
                  context.next = delegate.nextLoc;
                } else {
                  state = GenStateSuspendedYield;
                  return info;
                }

                context.delegate = null;
              }

              if (method === "next") {
                if (state === GenStateSuspendedYield) {
                  context.sent = arg;
                } else {
                  context.sent = undefined;
                }
              } else if (method === "throw") {
                if (state === GenStateSuspendedStart) {
                  state = GenStateCompleted;
                  throw arg;
                }

                if (context.dispatchException(arg)) {
                  // If the dispatched exception was caught by a catch block,
                  // then let that catch block handle the exception normally.
                  method = "next";
                  arg = undefined;
                }
              } else if (method === "return") {
                context.abrupt("return", arg);
              }

              state = GenStateExecuting;

              var record = tryCatch(innerFn, self, context);
              if (record.type === "normal") {
                // If an exception is thrown from innerFn, we leave state ===
                // GenStateExecuting and loop back for another invocation.
                state = context.done ? GenStateCompleted : GenStateSuspendedYield;

                var info = {
                  value: record.arg,
                  done: context.done
                };

                if (record.arg === ContinueSentinel) {
                  if (context.delegate && method === "next") {
                    // Deliberately forget the last sent value so that we don't
                    // accidentally pass it on to the delegate.
                    arg = undefined;
                  }
                } else {
                  return info;
                }
              } else if (record.type === "throw") {
                state = GenStateCompleted;
                // Dispatch the exception by looping back around to the
                // context.dispatchException(arg) call above.
                method = "throw";
                arg = record.arg;
              }
            }
          };
        }

        // Define Generator.prototype.{next,throw,return} in terms of the
        // unified ._invoke helper method.
        defineIteratorMethods(Gp);

        Gp[iteratorSymbol] = function () {
          return this;
        };

        Gp.toString = function () {
          return "[object Generator]";
        };

        function pushTryEntry(locs) {
          var entry = { tryLoc: locs[0] };

          if (1 in locs) {
            entry.catchLoc = locs[1];
          }

          if (2 in locs) {
            entry.finallyLoc = locs[2];
            entry.afterLoc = locs[3];
          }

          this.tryEntries.push(entry);
        }

        function resetTryEntry(entry) {
          var record = entry.completion || {};
          record.type = "normal";
          delete record.arg;
          entry.completion = record;
        }

        function Context(tryLocsList) {
          // The root entry object (effectively a try statement without a catch
          // or a finally block) gives us a place to store values thrown from
          // locations where there is no enclosing try statement.
          this.tryEntries = [{ tryLoc: "root" }];
          tryLocsList.forEach(pushTryEntry, this);
          this.reset(true);
        }

        runtime.keys = function (object) {
          var keys = [];
          for (var key in object) {
            keys.push(key);
          }
          keys.reverse();

          // Rather than returning an object with a next method, we keep
          // things simple and return the next function itself.
          return function next() {
            while (keys.length) {
              var key = keys.pop();
              if (key in object) {
                next.value = key;
                next.done = false;
                return next;
              }
            }

            // To avoid creating an additional object, we just hang the .value
            // and .done properties off the next function object itself. This
            // also ensures that the minifier will not anonymize the function.
            next.done = true;
            return next;
          };
        };

        function values(iterable) {
          if (iterable) {
            var iteratorMethod = iterable[iteratorSymbol];
            if (iteratorMethod) {
              return iteratorMethod.call(iterable);
            }

            if (typeof iterable.next === "function") {
              return iterable;
            }

            if (!isNaN(iterable.length)) {
              var i = -1,
                  next = function next() {
                while (++i < iterable.length) {
                  if (hasOwn.call(iterable, i)) {
                    next.value = iterable[i];
                    next.done = false;
                    return next;
                  }
                }

                next.value = undefined;
                next.done = true;

                return next;
              };

              return next.next = next;
            }
          }

          // Return an iterator with no values.
          return { next: doneResult };
        }
        runtime.values = values;

        function doneResult() {
          return { value: undefined, done: true };
        }

        Context.prototype = {
          constructor: Context,

          reset: function reset(skipTempReset) {
            this.prev = 0;
            this.next = 0;
            this.sent = undefined;
            this.done = false;
            this.delegate = null;

            this.tryEntries.forEach(resetTryEntry);

            if (!skipTempReset) {
              for (var name in this) {
                // Not sure about the optimal order of these conditions:
                if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
                  this[name] = undefined;
                }
              }
            }
          },

          stop: function stop() {
            this.done = true;

            var rootEntry = this.tryEntries[0];
            var rootRecord = rootEntry.completion;
            if (rootRecord.type === "throw") {
              throw rootRecord.arg;
            }

            return this.rval;
          },

          dispatchException: function dispatchException(exception) {
            if (this.done) {
              throw exception;
            }

            var context = this;
            function handle(loc, caught) {
              record.type = "throw";
              record.arg = exception;
              context.next = loc;
              return !!caught;
            }

            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              var record = entry.completion;

              if (entry.tryLoc === "root") {
                // Exception thrown outside of any try block that could handle
                // it, so set the completion value of the entire function to
                // throw the exception.
                return handle("end");
              }

              if (entry.tryLoc <= this.prev) {
                var hasCatch = hasOwn.call(entry, "catchLoc");
                var hasFinally = hasOwn.call(entry, "finallyLoc");

                if (hasCatch && hasFinally) {
                  if (this.prev < entry.catchLoc) {
                    return handle(entry.catchLoc, true);
                  } else if (this.prev < entry.finallyLoc) {
                    return handle(entry.finallyLoc);
                  }
                } else if (hasCatch) {
                  if (this.prev < entry.catchLoc) {
                    return handle(entry.catchLoc, true);
                  }
                } else if (hasFinally) {
                  if (this.prev < entry.finallyLoc) {
                    return handle(entry.finallyLoc);
                  }
                } else {
                  throw new Error("try statement without catch or finally");
                }
              }
            }
          },

          abrupt: function abrupt(type, arg) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
                var finallyEntry = entry;
                break;
              }
            }

            if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
              // Ignore the finally entry if control is not jumping to a
              // location outside the try/catch block.
              finallyEntry = null;
            }

            var record = finallyEntry ? finallyEntry.completion : {};
            record.type = type;
            record.arg = arg;

            if (finallyEntry) {
              this.next = finallyEntry.finallyLoc;
            } else {
              this.complete(record);
            }

            return ContinueSentinel;
          },

          complete: function complete(record, afterLoc) {
            if (record.type === "throw") {
              throw record.arg;
            }

            if (record.type === "break" || record.type === "continue") {
              this.next = record.arg;
            } else if (record.type === "return") {
              this.rval = record.arg;
              this.next = "end";
            } else if (record.type === "normal" && afterLoc) {
              this.next = afterLoc;
            }
          },

          finish: function finish(finallyLoc) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.finallyLoc === finallyLoc) {
                this.complete(entry.completion, entry.afterLoc);
                resetTryEntry(entry);
                return ContinueSentinel;
              }
            }
          },

          "catch": function _catch(tryLoc) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.tryLoc === tryLoc) {
                var record = entry.completion;
                if (record.type === "throw") {
                  var thrown = record.arg;
                  resetTryEntry(entry);
                }
                return thrown;
              }
            }

            // The context.catch method must only be called with a location
            // argument that corresponds to a known catch block.
            throw new Error("illegal catch attempt");
          },

          delegateYield: function delegateYield(iterable, resultName, nextLoc) {
            this.delegate = {
              iterator: values(iterable),
              resultName: resultName,
              nextLoc: nextLoc
            };

            return ContinueSentinel;
          }
        };
      })(
      // Among the various tricks for obtaining a reference to the global
      // object, this seems to be the most reliable technique that does not
      // use indirect eval (which violates Content Security Policy).
      typeof global === "object" ? global : typeof window === "object" ? window : typeof self === "object" ? self : this);
    }).call(this, require('_process'), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {});
  }, { "_process": 1 }], 3: [function (require, module, exports) {
    'use strict';

    module.exports = function (Y) {
      var AbstractConnector = (function () {
        /*
          opts contains the following information:
           role : String Role of this client ("master" or "slave")
           userId : String Uniquely defines the user.
           debug: Boolean Whether to print debug messages (optional)
        */

        function AbstractConnector(y, opts) {
          _classCallCheck(this, AbstractConnector);

          this.y = y;
          if (opts == null) {
            opts = {};
          }
          if (opts.role == null || opts.role === 'master') {
            this.role = 'master';
          } else if (opts.role === 'slave') {
            this.role = 'slave';
          } else {
            throw new Error("Role must be either 'master' or 'slave'!");
          }
          this.role = opts.role;
          this.connections = {};
          this.isSynced = false;
          this.userEventListeners = [];
          this.whenSyncedListeners = [];
          this.currentSyncTarget = null;
          this.syncingClients = [];
          this.forwardToSyncingClients = opts.forwardToSyncingClients !== false;
          this.debug = opts.debug === true;
          this.broadcastedHB = false;
          this.syncStep2 = Promise.resolve();
        }

        AbstractConnector.prototype.reconnect = function reconnect() {};

        AbstractConnector.prototype.disconnect = function disconnect() {
          this.connections = {};
          this.isSynced = false;
          this.currentSyncTarget = null;
          this.broadcastedHB = false;
          this.syncingClients = [];
          this.whenSyncedListeners = [];
          return this.y.db.stopGarbageCollector();
        };

        AbstractConnector.prototype.setUserId = function setUserId(userId) {
          this.userId = userId;
          return this.y.db.setUserId(userId);
        };

        AbstractConnector.prototype.onUserEvent = function onUserEvent(f) {
          this.userEventListeners.push(f);
        };

        AbstractConnector.prototype.userLeft = function userLeft(user) {
          delete this.connections[user];
          if (user === this.currentSyncTarget) {
            this.currentSyncTarget = null;
            this.findNextSyncTarget();
          }
          this.syncingClients = this.syncingClients.filter(function (cli) {
            return cli !== user;
          });
          for (var _iterator = this.userEventListeners, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
              if (_i >= _iterator.length) break;
              _ref = _iterator[_i++];
            } else {
              _i = _iterator.next();
              if (_i.done) break;
              _ref = _i.value;
            }

            var f = _ref;

            f({
              action: 'userLeft',
              user: user
            });
          }
        };

        AbstractConnector.prototype.userJoined = function userJoined(user, role) {
          if (role == null) {
            throw new Error('You must specify the role of the joined user!');
          }
          if (this.connections[user] != null) {
            throw new Error('This user already joined!');
          }
          this.connections[user] = {
            isSynced: false,
            role: role
          };
          for (var _iterator2 = this.userEventListeners, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
            var _ref2;

            if (_isArray2) {
              if (_i2 >= _iterator2.length) break;
              _ref2 = _iterator2[_i2++];
            } else {
              _i2 = _iterator2.next();
              if (_i2.done) break;
              _ref2 = _i2.value;
            }

            var f = _ref2;

            f({
              action: 'userJoined',
              user: user,
              role: role
            });
          }
          if (this.currentSyncTarget == null) {
            this.findNextSyncTarget();
          }
        };

        // Execute a function _when_ we are connected.
        // If not connected, wait until connected

        AbstractConnector.prototype.whenSynced = function whenSynced(f) {
          if (this.isSynced) {
            f();
          } else {
            this.whenSyncedListeners.push(f);
          }
        };

        /*
          returns false, if there is no sync target
         true otherwise
        */

        AbstractConnector.prototype.findNextSyncTarget = function findNextSyncTarget() {
          if (this.currentSyncTarget != null || this.isSynced) {
            return; // "The current sync has not finished!"
          }

          var syncUser = null;
          for (var uid in this.connections) {
            if (!this.connections[uid].isSynced) {
              syncUser = uid;
              break;
            }
          }
          if (syncUser != null) {
            var conn = this;
            this.currentSyncTarget = syncUser;
            this.y.db.requestTransaction(regeneratorRuntime.mark(function callee$4$0() {
              return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
                while (1) switch (context$5$0.prev = context$5$0.next) {
                  case 0:
                    context$5$0.t0 = conn;
                    context$5$0.t1 = syncUser;
                    return context$5$0.delegateYield(this.getStateSet(), "t2", 3);

                  case 3:
                    context$5$0.t3 = context$5$0.t2;
                    return context$5$0.delegateYield(this.getDeleteSet(), "t4", 5);

                  case 5:
                    context$5$0.t5 = context$5$0.t4;
                    context$5$0.t6 = {
                      type: 'sync step 1',
                      stateSet: context$5$0.t3,
                      deleteSet: context$5$0.t5
                    };
                    context$5$0.t0.send.call(context$5$0.t0, context$5$0.t1, context$5$0.t6);

                  case 8:
                  case "end":
                    return context$5$0.stop();
                }
              }, callee$4$0, this);
            }));
          } else {
            this.isSynced = true;
            // call when synced listeners
            for (var _iterator3 = this.whenSyncedListeners, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
              var _ref3;

              if (_isArray3) {
                if (_i3 >= _iterator3.length) break;
                _ref3 = _iterator3[_i3++];
              } else {
                _i3 = _iterator3.next();
                if (_i3.done) break;
                _ref3 = _i3.value;
              }

              var f = _ref3;

              f();
            }
            this.whenSyncedListeners = [];
            this.y.db.requestTransaction(regeneratorRuntime.mark(function callee$4$0() {
              return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
                while (1) switch (context$5$0.prev = context$5$0.next) {
                  case 0:
                    return context$5$0.delegateYield(this.garbageCollectAfterSync(), "t0", 1);

                  case 1:
                  case "end":
                    return context$5$0.stop();
                }
              }, callee$4$0, this);
            }));
          }
        };

        AbstractConnector.prototype.send = function send(uid, message) {
          if (this.debug) {
            console.log("send " + this.userId + " -> " + uid + ": " + message.type, m); // eslint-disable-line
          }
        };

        /*
          You received a raw message, and you know that it is intended for Yjs. Then call this function.
        */

        AbstractConnector.prototype.receiveMessage = function receiveMessage(sender, m) {
          var _this = this;

          if (sender === this.userId) {
            return;
          }
          if (this.debug) {
            console.log("receive " + sender + " -> " + this.userId + ": " + m.type, JSON.parse(JSON.stringify(m))); // eslint-disable-line
          }
          if (m.type === 'sync step 1') {
            (function () {
              // TODO: make transaction, stream the ops
              var conn = _this;
              _this.y.db.requestTransaction(regeneratorRuntime.mark(function callee$5$0() {
                var currentStateSet, ds, ops;
                return regeneratorRuntime.wrap(function callee$5$0$(context$6$0) {
                  while (1) switch (context$6$0.prev = context$6$0.next) {
                    case 0:
                      return context$6$0.delegateYield(this.getStateSet(), "t0", 1);

                    case 1:
                      currentStateSet = context$6$0.t0;
                      return context$6$0.delegateYield(this.applyDeleteSet(m.deleteSet), "t1", 3);

                    case 3:
                      return context$6$0.delegateYield(this.getDeleteSet(), "t2", 4);

                    case 4:
                      ds = context$6$0.t2;
                      return context$6$0.delegateYield(this.getOperations(m.stateSet), "t3", 6);

                    case 6:
                      ops = context$6$0.t3;

                      conn.send(sender, {
                        type: 'sync step 2',
                        os: ops,
                        stateSet: currentStateSet,
                        deleteSet: ds
                      });
                      if (this.forwardToSyncingClients) {
                        conn.syncingClients.push(sender);
                        setTimeout(function () {
                          conn.syncingClients = conn.syncingClients.filter(function (cli) {
                            return cli !== sender;
                          });
                          conn.send(sender, {
                            type: 'sync done'
                          });
                        }, conn.syncingClientDuration);
                      } else {
                        conn.send(sender, {
                          type: 'sync done'
                        });
                      }
                      conn._setSyncedWith(sender);

                    case 10:
                    case "end":
                      return context$6$0.stop();
                  }
                }, callee$5$0, this);
              }));
            })();
          } else if (m.type === 'sync step 2') {
            var broadcastHB;
            var db;

            (function () {
              var conn = _this;
              broadcastHB = !_this.broadcastedHB;

              _this.broadcastedHB = true;
              db = _this.y.db;

              _this.syncStep2 = new Promise(function (resolve) {
                db.requestTransaction(regeneratorRuntime.mark(function callee$6$0() {
                  return regeneratorRuntime.wrap(function callee$6$0$(context$7$0) {
                    while (1) switch (context$7$0.prev = context$7$0.next) {
                      case 0:
                        return context$7$0.delegateYield(this.applyDeleteSet(m.deleteSet), "t0", 1);

                      case 1:
                        this.store.apply(m.os);
                        db.requestTransaction(regeneratorRuntime.mark(function callee$7$0() {
                          var ops;
                          return regeneratorRuntime.wrap(function callee$7$0$(context$8$0) {
                            while (1) switch (context$8$0.prev = context$8$0.next) {
                              case 0:
                                return context$8$0.delegateYield(this.getOperations(m.stateSet), "t0", 1);

                              case 1:
                                ops = context$8$0.t0;

                                if (ops.length > 0) {
                                  m = {
                                    type: 'update',
                                    ops: ops
                                  };
                                  if (!broadcastHB) {
                                    // TODO: consider to broadcast here..
                                    conn.send(sender, m);
                                  } else {
                                    // broadcast only once!
                                    conn.broadcast(m);
                                  }
                                }
                                resolve();

                              case 4:
                              case "end":
                                return context$8$0.stop();
                            }
                          }, callee$7$0, this);
                        }));

                      case 3:
                      case "end":
                        return context$7$0.stop();
                    }
                  }, callee$6$0, this);
                }));
              });
            })();
          } else if (m.type === 'sync done') {
            var self = this;
            this.syncStep2.then(function () {
              self._setSyncedWith(sender);
            });
          } else if (m.type === 'update') {
            if (this.forwardToSyncingClients) {
              for (var _iterator4 = this.syncingClients, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
                var _ref4;

                if (_isArray4) {
                  if (_i4 >= _iterator4.length) break;
                  _ref4 = _iterator4[_i4++];
                } else {
                  _i4 = _iterator4.next();
                  if (_i4.done) break;
                  _ref4 = _i4.value;
                }

                var client = _ref4;

                this.send(client, m);
              }
            }
            this.y.db.apply(m.ops);
          }
        };

        AbstractConnector.prototype._setSyncedWith = function _setSyncedWith(user) {
          var conn = this.connections[user];
          if (conn != null) {
            conn.isSynced = true;
          }
          if (user === this.currentSyncTarget) {
            this.currentSyncTarget = null;
            this.findNextSyncTarget();
          }
        };

        /*
          Currently, the HB encodes operations as JSON. For the moment I want to keep it
          that way. Maybe we support encoding in the HB as XML in the future, but for now I don't want
          too much overhead. Y is very likely to get changed a lot in the future
           Because we don't want to encode JSON as string (with character escaping, wich makes it pretty much unreadable)
          we encode the JSON as XML.
           When the HB support encoding as XML, the format should look pretty much like this.
           does not support primitive values as array elements
          expects an ltx (less than xml) object
        */

        AbstractConnector.prototype.parseMessageFromXml = function parseMessageFromXml(m) {
          function parseArray(_x) {
            var _again = true;

            _function: while (_again) {
              var node = _x;
              _iterator5 = _isArray5 = _i5 = _iterator5 = _ref5 = n = undefined;
              _again = false;

              for (var _iterator5 = node.children, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
                var _ref5;

                if (_isArray5) {
                  if (_i5 >= _iterator5.length) break;
                  _ref5 = _iterator5[_i5++];
                } else {
                  _i5 = _iterator5.next();
                  if (_i5.done) break;
                  _ref5 = _i5.value;
                }

                var n = _ref5;

                if (n.getAttribute('isArray') === 'true') {
                  _x = n;
                  _again = true;
                  continue _function;
                } else {
                  return parseObject(n);
                }
              }
            }
          }
          function parseObject(node) {
            var json = {};
            for (var attrName in node.attrs) {
              var value = node.attrs[attrName];
              var int = parseInt(value, 10);
              if (isNaN(int) || '' + int !== value) {
                json[attrName] = value;
              } else {
                json[attrName] = int;
              }
            }
            for (var n in node.children) {
              var name = n.name;
              if (n.getAttribute('isArray') === 'true') {
                json[name] = parseArray(n);
              } else {
                json[name] = parseObject(n);
              }
            }
            return json;
          }
          parseObject(m);
        };

        /*
          encode message in xml
          we use string because Strophe only accepts an "xml-string"..
          So {a:4,b:{c:5}} will look like
          <y a="4">
            <b c="5"></b>
          </y>
          m - ltx element
          json - Object
        */

        AbstractConnector.prototype.encodeMessageToXml = function encodeMessageToXml(msg, obj) {
          // attributes is optional
          function encodeObject(m, json) {
            for (var name in json) {
              var value = json[name];
              if (name == null) {
                // nop
              } else if (value.constructor === Object) {
                  encodeObject(m.c(name), value);
                } else if (value.constructor === Array) {
                  encodeArray(m.c(name), value);
                } else {
                  m.setAttribute(name, value);
                }
            }
          }
          function encodeArray(m, array) {
            m.setAttribute('isArray', 'true');
            for (var _iterator6 = array, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
              var _ref6;

              if (_isArray6) {
                if (_i6 >= _iterator6.length) break;
                _ref6 = _iterator6[_i6++];
              } else {
                _i6 = _iterator6.next();
                if (_i6.done) break;
                _ref6 = _i6.value;
              }

              var e = _ref6;

              if (e.constructor === Object) {
                encodeObject(m.c('array-element'), e);
              } else {
                encodeArray(m.c('array-element'), e);
              }
            }
          }
          if (obj.constructor === Object) {
            encodeObject(msg.c('y', { xmlns: 'http://y.ninja/connector-stanza' }), obj);
          } else if (obj.constructor === Array) {
            encodeArray(msg.c('y', { xmlns: 'http://y.ninja/connector-stanza' }), obj);
          } else {
            throw new Error("I can't encode this json!");
          }
        };

        return AbstractConnector;
      })();

      Y.AbstractConnector = AbstractConnector;
    };
  }, {}], 4: [function (require, module, exports) {
    /* global getRandom, wait, async */
    'use strict';

    module.exports = function (Y) {
      var globalRoom = {
        users: {},
        buffers: {},
        removeUser: function removeUser(user) {
          for (var i in this.users) {
            this.users[i].userLeft(user);
          }
          delete this.users[user];
          delete this.buffers[user];
        },
        addUser: function addUser(connector) {
          this.users[connector.userId] = connector;
          this.buffers[connector.userId] = [];
          for (var uname in this.users) {
            if (uname !== connector.userId) {
              var u = this.users[uname];
              u.userJoined(connector.userId, 'master');
              connector.userJoined(u.userId, 'master');
            }
          }
        }
      };
      Y.utils.globalRoom = globalRoom;

      function _flushOne() {
        var bufs = [];
        for (var i in globalRoom.buffers) {
          if (globalRoom.buffers[i].length > 0) {
            bufs.push(i);
          }
        }
        if (bufs.length > 0) {
          var userId = getRandom(bufs);
          var m = globalRoom.buffers[userId].shift();
          var user = globalRoom.users[userId];
          user.receiveMessage(m[0], m[1]);
          return true;
        } else {
          return false;
        }
      }

      // setInterval(flushOne, 10)

      var userIdCounter = 0;

      var Test = (function (_Y$AbstractConnector) {
        _inherits(Test, _Y$AbstractConnector);

        function Test(y, options) {
          var _this2 = this;

          _classCallCheck(this, Test);

          if (options === undefined) {
            throw new Error('Options must not be undefined!');
          }
          options.role = 'master';
          options.forwardToSyncingClients = false;
          _Y$AbstractConnector.call(this, y, options);
          this.setUserId(userIdCounter++ + '').then(function () {
            globalRoom.addUser(_this2);
          });
          this.globalRoom = globalRoom;
          this.syncingClientDuration = 0;
        }

        Test.prototype.receiveMessage = function receiveMessage(sender, m) {
          _Y$AbstractConnector.prototype.receiveMessage.call(this, sender, JSON.parse(JSON.stringify(m)));
        };

        Test.prototype.send = function send(userId, message) {
          var buffer = globalRoom.buffers[userId];
          if (buffer != null) {
            buffer.push(JSON.parse(JSON.stringify([this.userId, message])));
          }
        };

        Test.prototype.broadcast = function broadcast(message) {
          for (var key in globalRoom.buffers) {
            globalRoom.buffers[key].push(JSON.parse(JSON.stringify([this.userId, message])));
          }
        };

        Test.prototype.isDisconnected = function isDisconnected() {
          return globalRoom.users[this.userId] == null;
        };

        Test.prototype.reconnect = function reconnect() {
          if (this.isDisconnected()) {
            globalRoom.addUser(this);
            _Y$AbstractConnector.prototype.reconnect.call(this);
          }
          return this.flushAll();
        };

        Test.prototype.disconnect = function disconnect() {
          if (!this.isDisconnected()) {
            globalRoom.removeUser(this.userId);
            _Y$AbstractConnector.prototype.disconnect.call(this);
          }
          return wait();
        };

        Test.prototype.flush = function flush() {
          var self = this;
          return async(regeneratorRuntime.mark(function callee$4$0() {
            var m;
            return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
              while (1) switch (context$5$0.prev = context$5$0.next) {
                case 0:
                  context$5$0.next = 2;
                  return wait();

                case 2:
                  if (!(globalRoom.buffers[self.userId].length > 0)) {
                    context$5$0.next = 9;
                    break;
                  }

                  m = globalRoom.buffers[self.userId].shift();

                  this.receiveMessage(m[0], m[1]);
                  context$5$0.next = 7;
                  return wait();

                case 7:
                  context$5$0.next = 2;
                  break;

                case 9:
                case "end":
                  return context$5$0.stop();
              }
            }, callee$4$0, this);
          }));
        };

        Test.prototype.flushAll = function flushAll() {
          return new Promise(function (resolve) {
            // flushes may result in more created operations,
            // flush until there is nothing more to flush
            function nextFlush() {
              var c = _flushOne();
              if (c) {
                while (_flushOne()) {
                  // nop
                }
                wait().then(nextFlush);
              } else {
                wait().then(function () {
                  resolve();
                });
              }
            }
            // in the case that there are
            // still actions that want to be performed
            wait().then(nextFlush);
          });
        };

        /*
          Flushes an operation for some user..
        */

        Test.prototype.flushOne = function flushOne() {
          _flushOne();
        };

        return Test;
      })(Y.AbstractConnector);

      Y.Test = Test;
    };
  }, {}], 5: [function (require, module, exports) {
    'use strict';

    module.exports = function (Y) {
      /*
        Partial definition of an OperationStore.
        TODO: name it Database, operation store only holds operations.
         A database definition must alse define the following methods:
        * logTable() (optional)
          - show relevant information information in a table
        * requestTransaction(makeGen)
          - request a transaction
        * destroy()
          - destroy the database
      */

      var AbstractDatabase = (function () {
        function AbstractDatabase(y, opts) {
          _classCallCheck(this, AbstractDatabase);

          this.y = y;
          // E.g. this.listenersById[id] : Array<Listener>
          this.listenersById = {};
          // Execute the next time a transaction is requested
          this.listenersByIdExecuteNow = [];
          // A transaction is requested
          this.listenersByIdRequestPending = false;
          /* To make things more clear, the following naming conventions:
             * ls : we put this.listenersById on ls
             * l : Array<Listener>
             * id : Id (can't use as property name)
             * sid : String (converted from id via JSON.stringify
                             so we can use it as a property name)
             Always remember to first overwrite
            a property before you iterate over it!
          */
          // TODO: Use ES7 Weak Maps. This way types that are no longer user,
          // wont be kept in memory.
          this.initializedTypes = {};
          this.whenUserIdSetListener = null;
          this.waitingTransactions = [];
          this.transactionInProgress = false;
          if (typeof YConcurrency_TestingMode !== 'undefined') {
            this.executeOrder = [];
          }
          this.gc1 = []; // first stage
          this.gc2 = []; // second stage -> after that, remove the op
          this.gcTimeout = opts.gcTimeout || 5000;
          var os = this;
          function garbageCollect() {
            return new Promise(function (resolve) {
              os.requestTransaction(regeneratorRuntime.mark(function callee$6$0() {
                var i, oid;
                return regeneratorRuntime.wrap(function callee$6$0$(context$7$0) {
                  while (1) switch (context$7$0.prev = context$7$0.next) {
                    case 0:
                      if (!(os.y.connector != null && os.y.connector.isSynced)) {
                        context$7$0.next = 10;
                        break;
                      }

                      context$7$0.t0 = regeneratorRuntime.keys(os.gc2);

                    case 2:
                      if ((context$7$0.t1 = context$7$0.t0()).done) {
                        context$7$0.next = 8;
                        break;
                      }

                      i = context$7$0.t1.value;
                      oid = os.gc2[i];
                      return context$7$0.delegateYield(this.garbageCollectOperation(oid), "t2", 6);

                    case 6:
                      context$7$0.next = 2;
                      break;

                    case 8:
                      os.gc2 = os.gc1;
                      os.gc1 = [];

                    case 10:
                      if (os.gcTimeout > 0) {
                        os.gcInterval = setTimeout(garbageCollect, os.gcTimeout);
                      }
                      resolve();

                    case 12:
                    case "end":
                      return context$7$0.stop();
                  }
                }, callee$6$0, this);
              }));
            });
          }
          this.garbageCollect = garbageCollect;
          if (this.gcTimeout > 0) {
            garbageCollect();
          }
        }

        AbstractDatabase.prototype.addToDebug = function addToDebug() {
          if (typeof YConcurrency_TestingMode !== 'undefined') {
            var command = Array.prototype.map.call(arguments, function (s) {
              if (typeof s === 'string') {
                return s;
              } else {
                return JSON.stringify(s);
              }
            }).join('').replace(/"/g, "'").replace(/,/g, ', ').replace(/:/g, ': ');
            this.executeOrder.push(command);
          }
        };

        AbstractDatabase.prototype.getDebugData = function getDebugData() {
          console.log(this.executeOrder.join('\n'));
        };

        AbstractDatabase.prototype.stopGarbageCollector = function stopGarbageCollector() {
          var self = this;
          return new Promise(function (resolve) {
            self.requestTransaction(regeneratorRuntime.mark(function callee$5$0() {
              var ungc, i, op;
              return regeneratorRuntime.wrap(function callee$5$0$(context$6$0) {
                while (1) switch (context$6$0.prev = context$6$0.next) {
                  case 0:
                    ungc = self.gc1.concat(self.gc2);

                    self.gc1 = [];
                    self.gc2 = [];
                    context$6$0.t0 = regeneratorRuntime.keys(ungc);

                  case 4:
                    if ((context$6$0.t1 = context$6$0.t0()).done) {
                      context$6$0.next = 12;
                      break;
                    }

                    i = context$6$0.t1.value;
                    return context$6$0.delegateYield(this.getOperation(ungc[i]), "t2", 7);

                  case 7:
                    op = context$6$0.t2;

                    delete op.gc;
                    return context$6$0.delegateYield(this.setOperation(op), "t3", 10);

                  case 10:
                    context$6$0.next = 4;
                    break;

                  case 12:
                    resolve();

                  case 13:
                  case "end":
                    return context$6$0.stop();
                }
              }, callee$5$0, this);
            }));
          });
        };

        /*
          Try to add to GC.
           TODO: rename this function
           Rulez:
          * Only gc if this user is online
          * The most left element in a list must not be gc'd.
            => There is at least one element in the list
           returns true iff op was added to GC
        */

        AbstractDatabase.prototype.addToGarbageCollector = function addToGarbageCollector(op, left) {
          if (op.gc == null && op.deleted === true && this.y.connector.isSynced && left != null && left.deleted === true) {
            op.gc = true;
            this.gc1.push(op.id);
            return true;
          } else {
            return false;
          }
        };

        AbstractDatabase.prototype.removeFromGarbageCollector = function removeFromGarbageCollector(op) {
          function filter(o) {
            return !Y.utils.compareIds(o, op.id);
          }
          this.gc1 = this.gc1.filter(filter);
          this.gc2 = this.gc2.filter(filter);
          delete op.gc;
        };

        AbstractDatabase.prototype.destroy = function destroy() {
          clearInterval(this.gcInterval);
          this.gcInterval = null;
        };

        AbstractDatabase.prototype.setUserId = function setUserId(userId) {
          var self = this;
          return new Promise(function (resolve) {
            self.requestTransaction(regeneratorRuntime.mark(function callee$5$0() {
              return regeneratorRuntime.wrap(function callee$5$0$(context$6$0) {
                while (1) switch (context$6$0.prev = context$6$0.next) {
                  case 0:
                    self.userId = userId;
                    return context$6$0.delegateYield(this.getState(userId), "t0", 2);

                  case 2:
                    self.opClock = context$6$0.t0.clock;

                    if (self.whenUserIdSetListener != null) {
                      self.whenUserIdSetListener();
                      self.whenUserIdSetListener = null;
                    }
                    resolve();

                  case 5:
                  case "end":
                    return context$6$0.stop();
                }
              }, callee$5$0, this);
            }));
          });
        };

        AbstractDatabase.prototype.whenUserIdSet = function whenUserIdSet(f) {
          if (this.userId != null) {
            f();
          } else {
            this.whenUserIdSetListener = f;
          }
        };

        AbstractDatabase.prototype.getNextOpId = function getNextOpId() {
          if (this.userId == null) {
            throw new Error('OperationStore not yet initialized!');
          }
          return [this.userId, this.opClock++];
        };

        /*
          Apply a list of operations.
           * get a transaction
          * check whether all Struct.*.requiredOps are in the OS
          * check if it is an expected op (otherwise wait for it)
          * check if was deleted, apply a delete operation after op was applied
        */

        AbstractDatabase.prototype.apply = function apply(ops) {
          for (var key in ops) {
            var o = ops[key];
            var required = Y.Struct[o.struct].requiredOps(o);
            this.whenOperationsExist(required, o);
          }
        };

        /*
          op is executed as soon as every operation requested is available.
          Note that Transaction can (and should) buffer requests.
        */

        AbstractDatabase.prototype.whenOperationsExist = function whenOperationsExist(ids, op) {
          if (ids.length > 0) {
            var listener = {
              op: op,
              missing: ids.length
            };

            for (var key in ids) {
              var id = ids[key];
              var sid = JSON.stringify(id);
              var l = this.listenersById[sid];
              if (l == null) {
                l = [];
                this.listenersById[sid] = l;
              }
              l.push(listener);
            }
          } else {
            this.listenersByIdExecuteNow.push({
              op: op
            });
          }

          if (this.listenersByIdRequestPending) {
            return;
          }

          this.listenersByIdRequestPending = true;
          var store = this;

          this.requestTransaction(regeneratorRuntime.mark(function callee$4$0() {
            var exeNow, ls, key, o, sid, l, id, listener;
            return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
              while (1) switch (context$5$0.prev = context$5$0.next) {
                case 0:
                  exeNow = store.listenersByIdExecuteNow;

                  store.listenersByIdExecuteNow = [];

                  ls = store.listenersById;

                  store.listenersById = {};

                  store.listenersByIdRequestPending = false;

                  context$5$0.t0 = regeneratorRuntime.keys(exeNow);

                case 6:
                  if ((context$5$0.t1 = context$5$0.t0()).done) {
                    context$5$0.next = 12;
                    break;
                  }

                  key = context$5$0.t1.value;
                  o = exeNow[key].op;
                  return context$5$0.delegateYield(store.tryExecute.call(this, o), "t2", 10);

                case 10:
                  context$5$0.next = 6;
                  break;

                case 12:
                  context$5$0.t3 = regeneratorRuntime.keys(ls);

                case 13:
                  if ((context$5$0.t4 = context$5$0.t3()).done) {
                    context$5$0.next = 34;
                    break;
                  }

                  sid = context$5$0.t4.value;
                  l = ls[sid];
                  id = JSON.parse(sid);
                  return context$5$0.delegateYield(this.getOperation(id), "t5", 18);

                case 18:
                  context$5$0.t6 = context$5$0.t5;

                  if (!(context$5$0.t6 == null)) {
                    context$5$0.next = 23;
                    break;
                  }

                  store.listenersById[sid] = l;
                  context$5$0.next = 32;
                  break;

                case 23:
                  context$5$0.t7 = regeneratorRuntime.keys(l);

                case 24:
                  if ((context$5$0.t8 = context$5$0.t7()).done) {
                    context$5$0.next = 32;
                    break;
                  }

                  key = context$5$0.t8.value;
                  listener = l[key];
                  o = listener.op;

                  if (!(--listener.missing === 0)) {
                    context$5$0.next = 30;
                    break;
                  }

                  return context$5$0.delegateYield(store.tryExecute.call(this, o), "t9", 30);

                case 30:
                  context$5$0.next = 24;
                  break;

                case 32:
                  context$5$0.next = 13;
                  break;

                case 34:
                case "end":
                  return context$5$0.stop();
              }
            }, callee$4$0, this);
          }));
        };

        /*
          Actually execute an operation, when all expected operations are available.
        */
        AbstractDatabase.prototype.tryExecute = regeneratorRuntime.mark(function tryExecute(op) {
          return regeneratorRuntime.wrap(function tryExecute$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                this.store.addToDebug('yield* this.store.tryExecute.call(this, ', JSON.stringify(op), ')');

                if (!(op.struct === 'Delete')) {
                  context$4$0.next = 6;
                  break;
                }

                return context$4$0.delegateYield(Y.Struct.Delete.execute.call(this, op), "t0", 3);

              case 3:
                return context$4$0.delegateYield(this.store.operationAdded(this, op), "t1", 4);

              case 4:
                context$4$0.next = 16;
                break;

              case 6:
                return context$4$0.delegateYield(this.getOperation(op.id), "t3", 7);

              case 7:
                context$4$0.t4 = context$4$0.t3;
                context$4$0.t2 = context$4$0.t4 == null;

                if (!context$4$0.t2) {
                  context$4$0.next = 12;
                  break;
                }

                return context$4$0.delegateYield(this.isGarbageCollected(op.id), "t5", 11);

              case 11:
                context$4$0.t2 = !context$4$0.t5;

              case 12:
                if (!context$4$0.t2) {
                  context$4$0.next = 16;
                  break;
                }

                return context$4$0.delegateYield(Y.Struct[op.struct].execute.call(this, op), "t6", 14);

              case 14:
                return context$4$0.delegateYield(this.addOperation(op), "t7", 15);

              case 15:
                return context$4$0.delegateYield(this.store.operationAdded(this, op), "t8", 16);

              case 16:
              case "end":
                return context$4$0.stop();
            }
          }, tryExecute, this);
        });

        // called by a transaction when an operation is added
        AbstractDatabase.prototype.operationAdded = regeneratorRuntime.mark(function operationAdded(transaction, op) {
          var target, type, o, state, sid, l, key, listener, t, delop;
          return regeneratorRuntime.wrap(function operationAdded$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                if (!(op.struct === 'Delete')) {
                  context$4$0.next = 9;
                  break;
                }

                return context$4$0.delegateYield(transaction.getOperation(op.target), "t0", 2);

              case 2:
                target = context$4$0.t0;

                if (!(target != null)) {
                  context$4$0.next = 7;
                  break;
                }

                type = transaction.store.initializedTypes[JSON.stringify(target.parent)];

                if (!(type != null)) {
                  context$4$0.next = 7;
                  break;
                }

                return context$4$0.delegateYield(type._changed(transaction, {
                  struct: 'Delete',
                  target: op.target
                }), "t1", 7);

              case 7:
                context$4$0.next = 36;
                break;

              case 9:
                o = op;
                return context$4$0.delegateYield(transaction.getState(op.id[0]), "t2", 11);

              case 11:
                state = context$4$0.t2;

              case 12:
                if (!(o != null && o.id[1] === state.clock && op.id[0] === o.id[0])) {
                  context$4$0.next = 19;
                  break;
                }

                // either its a new operation (1. case), or it is an operation that was deleted, but is not yet in the OS
                state.clock++;
                return context$4$0.delegateYield(transaction.checkDeleteStoreForState(state), "t3", 15);

              case 15:
                return context$4$0.delegateYield(transaction.os.findNext(o.id), "t4", 16);

              case 16:
                o = context$4$0.t4;
                context$4$0.next = 12;
                break;

              case 19:
                return context$4$0.delegateYield(transaction.setState(state), "t5", 20);

              case 20:
                sid = JSON.stringify(op.id);
                l = this.listenersById[sid];

                delete this.listenersById[sid];

                if (l != null) {
                  for (key in l) {
                    listener = l[key];

                    if (--listener.missing === 0) {
                      this.whenOperationsExist([], listener.op);
                    }
                  }
                }
                t = this.initializedTypes[JSON.stringify(op.parent)];

                if (!(t != null)) {
                  context$4$0.next = 27;
                  break;
                }

                return context$4$0.delegateYield(t._changed(transaction, Y.utils.copyObject(op)), "t6", 27);

              case 27:
                context$4$0.t7 = !op.deleted;

                if (!context$4$0.t7) {
                  context$4$0.next = 31;
                  break;
                }

                return context$4$0.delegateYield(transaction.isDeleted(op.id), "t8", 30);

              case 30:
                context$4$0.t7 = context$4$0.t8;

              case 31:
                if (!context$4$0.t7) {
                  context$4$0.next = 36;
                  break;
                }

                delop = {
                  struct: 'Delete',
                  target: op.id
                };
                return context$4$0.delegateYield(Y.Struct['Delete'].execute.call(transaction, delop), "t9", 34);

              case 34:
                if (!(t != null)) {
                  context$4$0.next = 36;
                  break;
                }

                return context$4$0.delegateYield(t._changed(transaction, delop), "t10", 36);

              case 36:
              case "end":
                return context$4$0.stop();
            }
          }, operationAdded, this);
        });

        AbstractDatabase.prototype.getNextRequest = function getNextRequest() {
          if (this.waitingTransactions.length === 0) {
            this.transactionInProgress = false;
            return null;
          } else {
            return this.waitingTransactions.shift();
          }
        };

        AbstractDatabase.prototype.requestTransaction = function requestTransaction(makeGen, callImmediately) {
          if (callImmediately) {
            this.transact(makeGen);
          } else if (!this.transactionInProgress) {
            this.transactionInProgress = true;
            var self = this;
            setTimeout(function () {
              self.transact(makeGen);
            }, 0);
          } else {
            this.waitingTransactions.push(makeGen);
          }
        };

        return AbstractDatabase;
      })();

      Y.AbstractDatabase = AbstractDatabase;
    };
  }, {}], 6: [function (require, module, exports) {
    'use strict';

    /*
     An operation also defines the structure of a type. This is why operation and
     structure are used interchangeably here.
    
     It must be of the type Object. I hope to achieve some performance
     improvements when working on databases that support the json format.
    
     An operation must have the following properties:
    
     * encode
         - Encode the structure in a readable format (preferably string- todo)
     * decode (todo)
         - decode structure to json
     * execute
         - Execute the semantics of an operation.
     * requiredOps
         - Operations that are required to execute this operation.
    */
    module.exports = function (Y) {
      var Struct = {
        /* This is the only operation that is actually not a structure, because
        it is not stored in the OS. This is why it _does not_ have an id
         op = {
          target: Id
        }
        */
        Delete: {
          encode: function encode(op) {
            return op;
          },
          requiredOps: function requiredOps(op) {
            return []; // [op.target]
          },
          execute: regeneratorRuntime.mark(function execute(op) {
            return regeneratorRuntime.wrap(function execute$(context$3$0) {
              while (1) switch (context$3$0.prev = context$3$0.next) {
                case 0:
                  return context$3$0.delegateYield(this.deleteOperation(op.target), "t0", 1);

                case 1:
                  return context$3$0.abrupt("return", context$3$0.t0);

                case 2:
                case "end":
                  return context$3$0.stop();
              }
            }, execute, this);
          })
        },
        Insert: {
          /* {
              content: any,
              id: Id,
              left: Id,
              origin: Id,
              right: Id,
              parent: Id,
              parentSub: string (optional), // child of Map type
            }
          */
          encode: function encode(op) {
            // TODO: you could not send the "left" property, then you also have to
            // "op.left = null" in $execute or $decode
            var e = {
              id: op.id,
              left: op.left,
              right: op.right,
              origin: op.origin,
              parent: op.parent,
              struct: op.struct
            };
            if (op.parentSub != null) {
              e.parentSub = op.parentSub;
            }
            if (op.opContent != null) {
              e.opContent = op.opContent;
            } else {
              e.content = op.content;
            }

            return e;
          },
          requiredOps: function requiredOps(op) {
            var ids = [];
            if (op.left != null) {
              ids.push(op.left);
            }
            if (op.right != null) {
              ids.push(op.right);
            }
            if (op.origin != null && !Y.utils.compareIds(op.left, op.origin)) {
              ids.push(op.origin);
            }
            // if (op.right == null && op.left == null) {
            ids.push(op.parent);

            if (op.opContent != null) {
              ids.push(op.opContent);
            }
            return ids;
          },
          getDistanceToOrigin: regeneratorRuntime.mark(function getDistanceToOrigin(op) {
            var d, o;
            return regeneratorRuntime.wrap(function getDistanceToOrigin$(context$3$0) {
              while (1) switch (context$3$0.prev = context$3$0.next) {
                case 0:
                  if (!(op.left == null)) {
                    context$3$0.next = 4;
                    break;
                  }

                  return context$3$0.abrupt("return", 0);

                case 4:
                  d = 0;
                  return context$3$0.delegateYield(this.getOperation(op.left), "t0", 6);

                case 6:
                  o = context$3$0.t0;

                case 7:
                  if (Y.utils.compareIds(op.origin, o ? o.id : null)) {
                    context$3$0.next = 17;
                    break;
                  }

                  d++;

                  if (!(o.left == null)) {
                    context$3$0.next = 13;
                    break;
                  }

                  return context$3$0.abrupt("break", 17);

                case 13:
                  return context$3$0.delegateYield(this.getOperation(o.left), "t1", 14);

                case 14:
                  o = context$3$0.t1;

                case 15:
                  context$3$0.next = 7;
                  break;

                case 17:
                  return context$3$0.abrupt("return", d);

                case 18:
                case "end":
                  return context$3$0.stop();
              }
            }, getDistanceToOrigin, this);
          }),
          /*
          # $this has to find a unique position between origin and the next known character
          # case 1: $origin equals $o.origin: the $creator parameter decides if left or right
          #         let $OL= [o1,o2,o3,o4], whereby $this is to be inserted between o1 and o4
          #         o2,o3 and o4 origin is 1 (the position of o2)
          #         there is the case that $this.creator < o2.creator, but o3.creator < $this.creator
          #         then o2 knows o3. Since on another client $OL could be [o1,o3,o4] the problem is complex
          #         therefore $this would be always to the right of o3
          # case 2: $origin < $o.origin
          #         if current $this insert_position > $o origin: $this ins
          #         else $insert_position will not change
          #         (maybe we encounter case 1 later, then this will be to the right of $o)
          # case 3: $origin > $o.origin
          #         $this insert_position is to the left of $o (forever!)
          */
          execute: regeneratorRuntime.mark(function execute(op) {
            var i, distanceToOrigin, o, parent, start, startId, oOriginDistance, left, right;
            return regeneratorRuntime.wrap(function execute$(context$3$0) {
              while (1) switch (context$3$0.prev = context$3$0.next) {
                case 0:
                  return context$3$0.delegateYield(Struct.Insert.getDistanceToOrigin.call(this, op), "t0", 1);

                case 1:
                  distanceToOrigin = i = context$3$0.t0;

                  if (!(op.left != null)) {
                    context$3$0.next = 14;
                    break;
                  }

                  return context$3$0.delegateYield(this.getOperation(op.left), "t1", 4);

                case 4:
                  o = context$3$0.t1;

                  if (!(o.right == null)) {
                    context$3$0.next = 9;
                    break;
                  }

                  context$3$0.t2 = null;
                  context$3$0.next = 11;
                  break;

                case 9:
                  return context$3$0.delegateYield(this.getOperation(o.right), "t3", 10);

                case 10:
                  context$3$0.t2 = context$3$0.t3;

                case 11:
                  o = context$3$0.t2;
                  context$3$0.next = 25;
                  break;

                case 14:
                  return context$3$0.delegateYield(this.getOperation(op.parent), "t4", 15);

                case 15:
                  parent = context$3$0.t4;
                  startId = op.parentSub ? parent.map[op.parentSub] : parent.start;

                  if (!(startId == null)) {
                    context$3$0.next = 21;
                    break;
                  }

                  context$3$0.t5 = null;
                  context$3$0.next = 23;
                  break;

                case 21:
                  return context$3$0.delegateYield(this.getOperation(startId), "t6", 22);

                case 22:
                  context$3$0.t5 = context$3$0.t6;

                case 23:
                  start = context$3$0.t5;

                  o = start;

                case 25:
                  if (!true) {
                    context$3$0.next = 51;
                    break;
                  }

                  if (!(o != null && !Y.utils.compareIds(o.id, op.right))) {
                    context$3$0.next = 48;
                    break;
                  }

                  return context$3$0.delegateYield(Struct.Insert.getDistanceToOrigin.call(this, o), "t7", 28);

                case 28:
                  oOriginDistance = context$3$0.t7;

                  if (!(oOriginDistance === i)) {
                    context$3$0.next = 33;
                    break;
                  }

                  // case 1
                  if (o.id[0] < op.id[0]) {
                    op.left = o.id;
                    distanceToOrigin = i + 1;
                  }
                  context$3$0.next = 38;
                  break;

                case 33:
                  if (!(oOriginDistance < i)) {
                    context$3$0.next = 37;
                    break;
                  }

                  // case 2
                  if (i - distanceToOrigin <= oOriginDistance) {
                    op.left = o.id;
                    distanceToOrigin = i + 1;
                  }
                  context$3$0.next = 38;
                  break;

                case 37:
                  return context$3$0.abrupt("break", 51);

                case 38:
                  i++;

                  if (!o.right) {
                    context$3$0.next = 44;
                    break;
                  }

                  return context$3$0.delegateYield(this.getOperation(o.right), "t9", 41);

                case 41:
                  context$3$0.t8 = context$3$0.t9;
                  context$3$0.next = 45;
                  break;

                case 44:
                  context$3$0.t8 = null;

                case 45:
                  o = context$3$0.t8;
                  context$3$0.next = 49;
                  break;

                case 48:
                  return context$3$0.abrupt("break", 51);

                case 49:
                  context$3$0.next = 25;
                  break;

                case 51:
                  left = null;
                  right = null;
                  context$3$0.t10 = parent;

                  if (context$3$0.t10) {
                    context$3$0.next = 57;
                    break;
                  }

                  return context$3$0.delegateYield(this.getOperation(op.parent), "t11", 56);

                case 56:
                  context$3$0.t10 = context$3$0.t11;

                case 57:
                  parent = context$3$0.t10;

                  if (!(op.left != null)) {
                    context$3$0.next = 66;
                    break;
                  }

                  return context$3$0.delegateYield(this.getOperation(op.left), "t12", 60);

                case 60:
                  left = context$3$0.t12;

                  op.right = left.right;
                  left.right = op.id;

                  return context$3$0.delegateYield(this.setOperation(left), "t13", 64);

                case 64:
                  context$3$0.next = 67;
                  break;

                case 66:
                  op.right = op.parentSub ? parent.map[op.parentSub] || null : parent.start;

                case 67:
                  if (!(op.right != null)) {
                    context$3$0.next = 73;
                    break;
                  }

                  return context$3$0.delegateYield(this.getOperation(op.right), "t14", 69);

                case 69:
                  right = context$3$0.t14;

                  right.left = op.id;

                  // if right exists, and it is supposed to be gc'd. Remove it from the gc
                  if (right.gc != null) {
                    this.store.removeFromGarbageCollector(right);
                  }
                  return context$3$0.delegateYield(this.setOperation(right), "t15", 73);

                case 73:
                  if (!(op.parentSub != null)) {
                    context$3$0.next = 83;
                    break;
                  }

                  if (!(left == null)) {
                    context$3$0.next = 77;
                    break;
                  }

                  parent.map[op.parentSub] = op.id;
                  return context$3$0.delegateYield(this.setOperation(parent), "t16", 77);

                case 77:
                  if (!(op.right != null)) {
                    context$3$0.next = 79;
                    break;
                  }

                  return context$3$0.delegateYield(this.deleteOperation(op.right, true), "t17", 79);

                case 79:
                  if (!(op.left != null)) {
                    context$3$0.next = 81;
                    break;
                  }

                  return context$3$0.delegateYield(this.deleteOperation(op.id, true), "t18", 81);

                case 81:
                  context$3$0.next = 87;
                  break;

                case 83:
                  if (!(right == null || left == null)) {
                    context$3$0.next = 87;
                    break;
                  }

                  if (right == null) {
                    parent.end = op.id;
                  }
                  if (left == null) {
                    parent.start = op.id;
                  }
                  return context$3$0.delegateYield(this.setOperation(parent), "t19", 87);

                case 87:
                case "end":
                  return context$3$0.stop();
              }
            }, execute, this);
          })
        },
        List: {
          /*
          {
            start: null,
            end: null,
            struct: "List",
            type: "",
            id: this.os.getNextOpId()
          }
          */
          encode: function encode(op) {
            return {
              struct: 'List',
              id: op.id,
              type: op.type
            };
          },
          requiredOps: function requiredOps() {
            /*
            var ids = []
            if (op.start != null) {
              ids.push(op.start)
            }
            if (op.end != null){
              ids.push(op.end)
            }
            return ids
            */
            return [];
          },
          execute: regeneratorRuntime.mark(function execute(op) {
            return regeneratorRuntime.wrap(function execute$(context$3$0) {
              while (1) switch (context$3$0.prev = context$3$0.next) {
                case 0:
                  op.start = null;
                  op.end = null;

                case 2:
                case "end":
                  return context$3$0.stop();
              }
            }, execute, this);
          }),
          ref: regeneratorRuntime.mark(function ref(op, pos) {
            var res, o;
            return regeneratorRuntime.wrap(function ref$(context$3$0) {
              while (1) switch (context$3$0.prev = context$3$0.next) {
                case 0:
                  if (!(op.start == null)) {
                    context$3$0.next = 2;
                    break;
                  }

                  return context$3$0.abrupt("return", null);

                case 2:
                  res = null;
                  return context$3$0.delegateYield(this.getOperation(op.start), "t0", 4);

                case 4:
                  o = context$3$0.t0;

                case 5:
                  if (!true) {
                    context$3$0.next = 15;
                    break;
                  }

                  if (!o.deleted) {
                    res = o;
                    pos--;
                  }

                  if (!(pos >= 0 && o.right != null)) {
                    context$3$0.next = 12;
                    break;
                  }

                  return context$3$0.delegateYield(this.getOperation(o.right), "t1", 9);

                case 9:
                  o = context$3$0.t1;
                  context$3$0.next = 13;
                  break;

                case 12:
                  return context$3$0.abrupt("break", 15);

                case 13:
                  context$3$0.next = 5;
                  break;

                case 15:
                  return context$3$0.abrupt("return", res);

                case 16:
                case "end":
                  return context$3$0.stop();
              }
            }, ref, this);
          }),
          map: regeneratorRuntime.mark(function map(o, f) {
            var res, operation;
            return regeneratorRuntime.wrap(function map$(context$3$0) {
              while (1) switch (context$3$0.prev = context$3$0.next) {
                case 0:
                  o = o.start;
                  res = [];

                case 2:
                  if (!(o != null)) {
                    context$3$0.next = 9;
                    break;
                  }

                  return context$3$0.delegateYield(this.getOperation(o), "t0", 4);

                case 4:
                  operation = context$3$0.t0;

                  if (!operation.deleted) {
                    res.push(f(operation));
                  }
                  o = operation.right;
                  context$3$0.next = 2;
                  break;

                case 9:
                  return context$3$0.abrupt("return", res);

                case 10:
                case "end":
                  return context$3$0.stop();
              }
            }, map, this);
          })
        },
        Map: {
          /*
            {
              map: {},
              struct: "Map",
              type: "",
              id: this.os.getNextOpId()
            }
          */
          encode: function encode(op) {
            return {
              struct: 'Map',
              type: op.type,
              id: op.id,
              map: {} // overwrite map!!
            };
          },
          requiredOps: function requiredOps() {
            return [];
          },
          execute: regeneratorRuntime.mark(function execute() {
            return regeneratorRuntime.wrap(function execute$(context$3$0) {
              while (1) switch (context$3$0.prev = context$3$0.next) {
                case 0:
                case "end":
                  return context$3$0.stop();
              }
            }, execute, this);
          }),
          /*
            Get a property by name
          */
          get: regeneratorRuntime.mark(function get(op, name) {
            var oid, res;
            return regeneratorRuntime.wrap(function get$(context$3$0) {
              while (1) switch (context$3$0.prev = context$3$0.next) {
                case 0:
                  oid = op.map[name];

                  if (!(oid != null)) {
                    context$3$0.next = 16;
                    break;
                  }

                  return context$3$0.delegateYield(this.getOperation(oid), "t0", 3);

                case 3:
                  res = context$3$0.t0;

                  if (!(res == null || res.deleted)) {
                    context$3$0.next = 8;
                    break;
                  }

                  context$3$0.t1 = void 0;
                  context$3$0.next = 15;
                  break;

                case 8:
                  if (!(res.opContent == null)) {
                    context$3$0.next = 12;
                    break;
                  }

                  context$3$0.t2 = res.content;
                  context$3$0.next = 14;
                  break;

                case 12:
                  return context$3$0.delegateYield(this.getType(res.opContent), "t3", 13);

                case 13:
                  context$3$0.t2 = context$3$0.t3;

                case 14:
                  context$3$0.t1 = context$3$0.t2;

                case 15:
                  return context$3$0.abrupt("return", context$3$0.t1);

                case 16:
                case "end":
                  return context$3$0.stop();
              }
            }, get, this);
          }),
          /*
            Delete a property by name
          */
          "delete": regeneratorRuntime.mark(function _delete(op, name) {
            var v;
            return regeneratorRuntime.wrap(function _delete$(context$3$0) {
              while (1) switch (context$3$0.prev = context$3$0.next) {
                case 0:
                  v = op.map[name] || null;

                  if (!(v != null)) {
                    context$3$0.next = 3;
                    break;
                  }

                  return context$3$0.delegateYield(Struct.Delete.create.call(this, {
                    target: v
                  }), "t0", 3);

                case 3:
                case "end":
                  return context$3$0.stop();
              }
            }, _delete, this);
          })
        }
      };
      Y.Struct = Struct;
    };
  }, {}], 7: [function (require, module, exports) {
    'use strict';

    /*
      Partial definition of a transaction
    
      A transaction provides all the the async functionality on a database.
    
      By convention, a transaction has the following properties:
      * ss for StateSet
      * os for OperationStore
      * ds for DeleteStore
    
      A transaction must also define the following methods:
      * checkDeleteStoreForState(state)
        - When increasing the state of a user, an operation with an higher id
          may already be garbage collected, and therefore it will never be received.
          update the state to reflect this knowledge. This won't call a method to save the state!
      * getDeleteSet(id)
        - Get the delete set in a readable format:
          {
            "userX": [
              [5,1], // starting from position 5, one operations is deleted
              [9,4]  // starting from position 9, four operations are deleted
            ],
            "userY": ...
          }
      * getOpsFromDeleteSet(ds) -- TODO: just call this.deleteOperation(id) here
        - get a set of deletions that need to be applied in order to get to
          achieve the state of the supplied ds
      * setOperation(op)
        - write `op` to the database.
          Note: this is allowed to return an in-memory object.
          E.g. the Memory adapter returns the object that it has in-memory.
          Changing values on this object will be stored directly in the database
          without calling this function. Therefore,
          setOperation may have no functionality in some adapters. This also has
          implications on the way we use operations that were served from the database.
          We try not to call copyObject, if not necessary.
      * addOperation(op)
        - add an operation to the database.
          This may only be called once for every op.id
          Must return a function that returns the next operation in the database (ordered by id)
      * getOperation(id)
      * removeOperation(id)
        - remove an operation from the database. This is called when an operation
          is garbage collected.
      * setState(state)
        - `state` is of the form
          {
            user: "1",
            clock: 4
          } <- meaning that we have four operations from user "1"
               (with these id's respectively: 0, 1, 2, and 3)
      * getState(user)
      * getStateVector()
        - Get the state of the OS in the form
        [{
          user: "userX",
          clock: 11
        },
         ..
        ]
      * getStateSet()
        - Get the state of the OS in the form
        {
          "userX": 11,
          "userY": 22
        }
       * getOperations(startSS)
         - Get the all the operations that are necessary in order to achive the
           stateSet of this user, starting from a stateSet supplied by another user
       * makeOperationReady(ss, op)
         - this is called only by `getOperations(startSS)`. It makes an operation
           applyable on a given SS.
    */
    module.exports = function (Y) {
      var Transaction = (function () {
        function Transaction() {
          _classCallCheck(this, Transaction);
        }

        /*
          Get a type based on the id of its model.
          If it does not exist yes, create it.
          TODO: delete type from store.initializedTypes[id] when corresponding id was deleted!
        */
        Transaction.prototype.getType = regeneratorRuntime.mark(function getType(id) {
          var sid, t, op;
          return regeneratorRuntime.wrap(function getType$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                sid = JSON.stringify(id);
                t = this.store.initializedTypes[sid];

                if (!(t == null)) {
                  context$4$0.next = 9;
                  break;
                }

                return context$4$0.delegateYield(this.getOperation(id), "t0", 4);

              case 4:
                op = context$4$0.t0;

                if (!(op != null)) {
                  context$4$0.next = 9;
                  break;
                }

                return context$4$0.delegateYield(Y[op.type].initType.call(this, this.store, op), "t1", 7);

              case 7:
                t = context$4$0.t1;

                this.store.initializedTypes[sid] = t;

              case 9:
                return context$4$0.abrupt("return", t);

              case 10:
              case "end":
                return context$4$0.stop();
            }
          }, getType, this);
        });

        /*
          Apply operations that this user created (no remote ones!)
            * does not check for Struct.*.requiredOps()
            * also broadcasts it through the connector
        */
        Transaction.prototype.applyCreatedOperations = regeneratorRuntime.mark(function applyCreatedOperations(ops) {
          var send, i, op;
          return regeneratorRuntime.wrap(function applyCreatedOperations$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                send = [];
                i = 0;

              case 2:
                if (!(i < ops.length)) {
                  context$4$0.next = 9;
                  break;
                }

                op = ops[i];
                return context$4$0.delegateYield(this.store.tryExecute.call(this, op), "t0", 5);

              case 5:
                send.push(Y.Struct[op.struct].encode(op));

              case 6:
                i++;
                context$4$0.next = 2;
                break;

              case 9:
                if (!this.store.y.connector.isDisconnected()) {
                  this.store.y.connector.broadcast({
                    type: 'update',
                    ops: send
                  });
                }

              case 10:
              case "end":
                return context$4$0.stop();
            }
          }, applyCreatedOperations, this);
        });
        Transaction.prototype.deleteList = regeneratorRuntime.mark(function deleteList(start) {
          return regeneratorRuntime.wrap(function deleteList$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                if (!this.store.y.connector.isSynced) {
                  context$4$0.next = 12;
                  break;
                }

              case 1:
                if (!(start != null && this.store.y.connector.isSynced)) {
                  context$4$0.next = 10;
                  break;
                }

                return context$4$0.delegateYield(this.getOperation(start), "t0", 3);

              case 3:
                start = context$4$0.t0;

                start.gc = true;
                return context$4$0.delegateYield(this.setOperation(start), "t1", 6);

              case 6:
                // TODO: will always reset the parent..
                this.store.gc1.push(start.id);
                start = start.right;
                context$4$0.next = 1;
                break;

              case 10:
                context$4$0.next = 12;
                break;

              case 12:
              case "end":
                return context$4$0.stop();
            }
          }, deleteList, this);
        });

        /*
          Mark an operation as deleted, and add it to the GC, if possible.
        */

        // TODO: when not possible??? do later in (gcWhenSynced)
        Transaction.prototype.deleteOperation = regeneratorRuntime.mark(function deleteOperation(targetId, preventCallType) {
          var target, callType, name, left, right;
          return regeneratorRuntime.wrap(function deleteOperation$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.getOperation(targetId), "t0", 1);

              case 1:
                target = context$4$0.t0;
                callType = false;

                if (!(target == null || !target.deleted)) {
                  context$4$0.next = 5;
                  break;
                }

                return context$4$0.delegateYield(this.markDeleted(targetId), "t1", 5);

              case 5:
                if (!(target != null && target.gc == null)) {
                  context$4$0.next = 42;
                  break;
                }

                if (target.deleted) {
                  context$4$0.next = 23;
                  break;
                }

                callType = true;
                // set deleted & notify type
                target.deleted = true;
                /*
                if (!preventCallType) {
                  var type = this.store.initializedTypes[JSON.stringify(target.parent)]
                  if (type != null) {
                    yield* type._changed(this, {
                      struct: 'Delete',
                      target: targetId
                    })
                  }
                }
                */
                // delete containing lists

                if (!(target.start != null)) {
                  context$4$0.next = 12;
                  break;
                }

                return context$4$0.delegateYield(this.deleteList(target.start), "t2", 11);

              case 11:
                return context$4$0.delegateYield(this.deleteList(target.id), "t3", 12);

              case 12:
                if (!(target.map != null)) {
                  context$4$0.next = 20;
                  break;
                }

                context$4$0.t4 = regeneratorRuntime.keys(target.map);

              case 14:
                if ((context$4$0.t5 = context$4$0.t4()).done) {
                  context$4$0.next = 19;
                  break;
                }

                name = context$4$0.t5.value;
                return context$4$0.delegateYield(this.deleteList(target.map[name]), "t6", 17);

              case 17:
                context$4$0.next = 14;
                break;

              case 19:
                return context$4$0.delegateYield(this.deleteList(target.id), "t7", 20);

              case 20:
                if (!(target.opContent != null)) {
                  context$4$0.next = 23;
                  break;
                }

                return context$4$0.delegateYield(this.deleteOperation(target.opContent), "t8", 22);

              case 22:
                target.opContent = null;

              case 23:
                if (!(target.left != null)) {
                  context$4$0.next = 28;
                  break;
                }

                return context$4$0.delegateYield(this.getOperation(target.left), "t10", 25);

              case 25:
                context$4$0.t9 = context$4$0.t10;
                context$4$0.next = 29;
                break;

              case 28:
                context$4$0.t9 = null;

              case 29:
                left = context$4$0.t9;

                this.store.addToGarbageCollector(target, left);

                // set here because it was deleted and/or gc'd
                return context$4$0.delegateYield(this.setOperation(target), "t11", 32);

              case 32:
                if (!(target.right != null)) {
                  context$4$0.next = 37;
                  break;
                }

                return context$4$0.delegateYield(this.getOperation(target.right), "t13", 34);

              case 34:
                context$4$0.t12 = context$4$0.t13;
                context$4$0.next = 38;
                break;

              case 37:
                context$4$0.t12 = null;

              case 38:
                right = context$4$0.t12;

                if (!(right != null && this.store.addToGarbageCollector(right, target))) {
                  context$4$0.next = 41;
                  break;
                }

                return context$4$0.delegateYield(this.setOperation(right), "t14", 41);

              case 41:
                return context$4$0.abrupt("return", callType);

              case 42:
              case "end":
                return context$4$0.stop();
            }
          }, deleteOperation, this);
        });

        /*
          Mark an operation as deleted&gc'd
        */
        Transaction.prototype.markGarbageCollected = regeneratorRuntime.mark(function markGarbageCollected(id) {
          var n, newlen, prev, next;
          return regeneratorRuntime.wrap(function markGarbageCollected$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.markDeleted(id), "t0", 1);

              case 1:
                n = context$4$0.t0;

                if (n.gc) {
                  context$4$0.next = 25;
                  break;
                }

                if (!(n.id[1] < id[1])) {
                  context$4$0.next = 9;
                  break;
                }

                newlen = n.len - (id[1] - n.id[1]);

                n.len -= newlen;
                return context$4$0.delegateYield(this.ds.put(n), "t1", 7);

              case 7:
                n = { id: id, len: newlen, gc: false };
                return context$4$0.delegateYield(this.ds.put(n), "t2", 9);

              case 9:
                return context$4$0.delegateYield(this.ds.findPrev(id), "t3", 10);

              case 10:
                prev = context$4$0.t3;
                return context$4$0.delegateYield(this.ds.findNext(id), "t4", 12);

              case 12:
                next = context$4$0.t4;

                if (!(id[1] < n.id[1] + n.len - 1)) {
                  context$4$0.next = 16;
                  break;
                }

                return context$4$0.delegateYield(this.ds.put({ id: [id[0], id[1] + 1], len: n.len - 1, gc: false }), "t5", 15);

              case 15:
                n.len = 1;

              case 16:
                // set gc'd
                n.gc = true;
                // can extend left?

                if (!(prev != null && prev.gc && Y.utils.compareIds([prev.id[0], prev.id[1] + prev.len], n.id))) {
                  context$4$0.next = 21;
                  break;
                }

                prev.len += n.len;
                return context$4$0.delegateYield(this.ds["delete"](n.id), "t6", 20);

              case 20:
                n = prev;
                // ds.put n here?

              case 21:
                if (!(next != null && next.gc && Y.utils.compareIds([n.id[0], n.id[1] + n.len], next.id))) {
                  context$4$0.next = 24;
                  break;
                }

                n.len += next.len;
                return context$4$0.delegateYield(this.ds["delete"](next.id), "t7", 24);

              case 24:
                return context$4$0.delegateYield(this.ds.put(n), "t8", 25);

              case 25:
              case "end":
                return context$4$0.stop();
            }
          }, markGarbageCollected, this);
        });

        /*
          Mark an operation as deleted.
           returns the delete node
        */
        Transaction.prototype.markDeleted = regeneratorRuntime.mark(function markDeleted(id) {
          var n, next;
          return regeneratorRuntime.wrap(function markDeleted$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.ds.findWithUpperBound(id), "t0", 1);

              case 1:
                n = context$4$0.t0;

                if (!(n != null && n.id[0] === id[0])) {
                  context$4$0.next = 15;
                  break;
                }

                if (!(n.id[1] <= id[1] && id[1] < n.id[1] + n.len)) {
                  context$4$0.next = 7;
                  break;
                }

                return context$4$0.abrupt("return", n);

              case 7:
                if (!(n.id[1] + n.len === id[1] && !n.gc)) {
                  context$4$0.next = 11;
                  break;
                }

                // can extend existing deletion
                n.len++;
                context$4$0.next = 13;
                break;

              case 11:
                // cannot extend left
                n = { id: id, len: 1, gc: false };
                return context$4$0.delegateYield(this.ds.put(n), "t1", 13);

              case 13:
                context$4$0.next = 17;
                break;

              case 15:
                // cannot extend left
                n = { id: id, len: 1, gc: false };
                return context$4$0.delegateYield(this.ds.put(n), "t2", 17);

              case 17:
                return context$4$0.delegateYield(this.ds.findNext(n.id), "t3", 18);

              case 18:
                next = context$4$0.t3;

                if (!(next != null && Y.utils.compareIds([n.id[0], n.id[1] + n.len], next.id) && !next.gc)) {
                  context$4$0.next = 22;
                  break;
                }

                n.len = n.len + next.len;
                return context$4$0.delegateYield(this.ds["delete"](next.id), "t4", 22);

              case 22:
                return context$4$0.delegateYield(this.ds.put(n), "t5", 23);

              case 23:
                return context$4$0.abrupt("return", n);

              case 24:
              case "end":
                return context$4$0.stop();
            }
          }, markDeleted, this);
        });

        /*
          Call this method when the client is connected&synced with the
          other clients (e.g. master). This will query the database for
          operations that can be gc'd and add them to the garbage collector.
        */
        Transaction.prototype.garbageCollectAfterSync = regeneratorRuntime.mark(function garbageCollectAfterSync() {
          return regeneratorRuntime.wrap(function garbageCollectAfterSync$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.os.iterate(this, null, null, regeneratorRuntime.mark(function callee$4$0(op) {
                  var left;
                  return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
                    while (1) switch (context$5$0.prev = context$5$0.next) {
                      case 0:
                        if (!(op.deleted && op.left != null)) {
                          context$5$0.next = 4;
                          break;
                        }

                        return context$5$0.delegateYield(this.getOperation(op.left), "t0", 2);

                      case 2:
                        left = context$5$0.t0;

                        this.store.addToGarbageCollector(op, left);

                      case 4:
                      case "end":
                        return context$5$0.stop();
                    }
                  }, callee$4$0, this);
                })), "t0", 1);

              case 1:
              case "end":
                return context$4$0.stop();
            }
          }, garbageCollectAfterSync, this);
        });

        /*
          Really remove an op and all its effects.
          The complicated case here is the Insert operation:
          * reset left
          * reset right
          * reset parent.start
          * reset parent.end
          * reset origins of all right ops
        */
        Transaction.prototype.garbageCollectOperation = regeneratorRuntime.mark(function garbageCollectOperation(id) {
          var state, o, left, right, neworigin, neworigin_, i, ids, parent, setParent;
          return regeneratorRuntime.wrap(function garbageCollectOperation$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                this.store.addToDebug('yield* this.garbageCollectOperation(', id, ')');
                // check to increase the state of the respective user
                return context$4$0.delegateYield(this.getState(id[0]), "t0", 2);

              case 2:
                state = context$4$0.t0;

                if (!(state.clock === id[1])) {
                  context$4$0.next = 7;
                  break;
                }

                state.clock++;
                // also check if more expected operations were gc'd
                return context$4$0.delegateYield(this.checkDeleteStoreForState(state), "t1", 6);

              case 6:
                return context$4$0.delegateYield(this.setState(state), "t2", 7);

              case 7:
                return context$4$0.delegateYield(this.markGarbageCollected(id), "t3", 8);

              case 8:
                return context$4$0.delegateYield(this.getOperation(id), "t4", 9);

              case 9:
                o = context$4$0.t4;

                if (!(o != null)) {
                  context$4$0.next = 61;
                  break;
                }

                if (!(o.left != null)) {
                  context$4$0.next = 16;
                  break;
                }

                return context$4$0.delegateYield(this.getOperation(o.left), "t5", 13);

              case 13:
                left = context$4$0.t5;

                left.right = o.right;
                return context$4$0.delegateYield(this.setOperation(left), "t6", 16);

              case 16:
                if (!(o.right != null)) {
                  context$4$0.next = 53;
                  break;
                }

                return context$4$0.delegateYield(this.getOperation(o.right), "t7", 18);

              case 18:
                right = context$4$0.t7;

                right.left = o.left;

                if (!Y.utils.compareIds(right.origin, o.id)) {
                  context$4$0.next = 52;
                  break;
                }

                neworigin = o.left;

              case 22:
                if (!(neworigin != null)) {
                  context$4$0.next = 30;
                  break;
                }

                return context$4$0.delegateYield(this.getOperation(neworigin), "t8", 24);

              case 24:
                neworigin_ = context$4$0.t8;

                if (!neworigin_.deleted) {
                  context$4$0.next = 27;
                  break;
                }

                return context$4$0.abrupt("break", 30);

              case 27:
                neworigin = neworigin_.left;
                context$4$0.next = 22;
                break;

              case 30:

                // reset origin of right
                right.origin = neworigin;

                // reset origin of all right ops (except first right - duh!),
                // until you find origin pointer to the left of o

                if (!(right.right == null)) {
                  context$4$0.next = 35;
                  break;
                }

                context$4$0.t9 = null;
                context$4$0.next = 37;
                break;

              case 35:
                return context$4$0.delegateYield(this.getOperation(right.right), "t10", 36);

              case 36:
                context$4$0.t9 = context$4$0.t10;

              case 37:
                i = context$4$0.t9;
                ids = [o.id, o.right];

              case 39:
                if (!(i != null && ids.some(function (id) {
                  return Y.utils.compareIds(id, i.origin);
                }))) {
                  context$4$0.next = 52;
                  break;
                }

                if (!Y.utils.compareIds(i.origin, o.id)) {
                  context$4$0.next = 43;
                  break;
                }

                // reset origin of i
                i.origin = neworigin;
                return context$4$0.delegateYield(this.setOperation(i), "t11", 43);

              case 43:
                if (!(i.right == null)) {
                  context$4$0.next = 47;
                  break;
                }

                context$4$0.t12 = null;
                context$4$0.next = 49;
                break;

              case 47:
                return context$4$0.delegateYield(this.getOperation(i.right), "t13", 48);

              case 48:
                context$4$0.t12 = context$4$0.t13;

              case 49:
                i = context$4$0.t12;
                context$4$0.next = 39;
                break;

              case 52:
                return context$4$0.delegateYield(this.setOperation(right), "t14", 53);

              case 53:
                if (!(o.parent != null)) {
                  context$4$0.next = 60;
                  break;
                }

                return context$4$0.delegateYield(this.getOperation(o.parent), "t15", 55);

              case 55:
                parent = context$4$0.t15;
                setParent = false;
                // whether to save parent to the os
                if (o.parentSub != null) {
                  if (Y.utils.compareIds(parent.map[o.parentSub], o.id)) {
                    setParent = true;
                    parent.map[o.parentSub] = o.right;
                  }
                } else {
                  if (Y.utils.compareIds(parent.start, o.id)) {
                    // gc'd op is the start
                    setParent = true;
                    parent.start = o.right;
                  }
                  if (Y.utils.compareIds(parent.end, o.id)) {
                    // gc'd op is the end
                    setParent = true;
                    parent.end = o.left;
                  }
                }

                if (!setParent) {
                  context$4$0.next = 60;
                  break;
                }

                return context$4$0.delegateYield(this.setOperation(parent), "t16", 60);

              case 60:
                return context$4$0.delegateYield(this.removeOperation(o.id), "t17", 61);

              case 61:
              case "end":
                return context$4$0.stop();
            }
          }, garbageCollectOperation, this);
        });
        Transaction.prototype.checkDeleteStoreForState = regeneratorRuntime.mark(function checkDeleteStoreForState(state) {
          var n;
          return regeneratorRuntime.wrap(function checkDeleteStoreForState$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.ds.findWithUpperBound([state.user, state.clock]), "t0", 1);

              case 1:
                n = context$4$0.t0;

                if (n != null && n.id[0] === state.user && n.gc) {
                  state.clock = Math.max(state.clock, n.id[1] + n.len);
                }

              case 3:
              case "end":
                return context$4$0.stop();
            }
          }, checkDeleteStoreForState, this);
        });

        /*
          apply a delete set in order to get
          the state of the supplied ds
        */
        Transaction.prototype.applyDeleteSet = regeneratorRuntime.mark(function applyDeleteSet(ds) {
          var deletions, createDeletions, user, dv, pos, d, i, del, id, addOperation;
          return regeneratorRuntime.wrap(function applyDeleteSet$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                createDeletions = function createDeletions(user, start, len, gc) {
                  for (var c = start; c < start + len; c++) {
                    deletions.push([user, c, gc]);
                  }
                };

                deletions = [];
                context$4$0.t0 = regeneratorRuntime.keys(ds);

              case 3:
                if ((context$4$0.t1 = context$4$0.t0()).done) {
                  context$4$0.next = 12;
                  break;
                }

                user = context$4$0.t1.value;
                dv = ds[user];
                pos = 0;
                d = dv[pos];
                return context$4$0.delegateYield(this.ds.iterate(this, [user, 0], [user, Number.MAX_VALUE], regeneratorRuntime.mark(function callee$4$0(n) {
                  var diff;
                  return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
                    while (1) switch (context$5$0.prev = context$5$0.next) {
                      case 0:
                        if (!(d != null)) {
                          context$5$0.next = 10;
                          break;
                        }

                        diff = 0;

                        if (!(n.id[1] + n.len <= d[0])) {
                          context$5$0.next = 6;
                          break;
                        }

                        return context$5$0.abrupt("break", 10);

                      case 6:
                        if (d[0] < n.id[1]) {
                          // 2)
                          // delete maximum the len of d
                          // else delete as much as possible
                          diff = Math.min(n.id[1] - d[0], d[1]);
                          createDeletions(user, d[0], diff, d[2]);
                        } else {
                          // 3)
                          diff = n.id[1] + n.len - d[0]; // never null (see 1)
                          if (d[2] && !n.gc) {
                            // d marks as gc'd but n does not
                            // then delete either way
                            createDeletions(user, d[0], Math.min(diff, d[1]), d[2]);
                          }
                        }

                      case 7:
                        if (d[1] <= diff) {
                          // d doesn't delete anything anymore
                          d = dv[++pos];
                        } else {
                          d[0] = d[0] + diff; // reset pos
                          d[1] = d[1] - diff; // reset length
                        }
                        context$5$0.next = 0;
                        break;

                      case 10:
                      case "end":
                        return context$5$0.stop();
                    }
                  }, callee$4$0, this);
                })), "t2", 9);

              case 9:
                // for the rest.. just apply it
                for (; pos < dv.length; pos++) {
                  d = dv[pos];
                  createDeletions(user, d[0], d[1], d[2]);
                }
                context$4$0.next = 3;
                break;

              case 12:
                context$4$0.t3 = regeneratorRuntime.keys(deletions);

              case 13:
                if ((context$4$0.t4 = context$4$0.t3()).done) {
                  context$4$0.next = 25;
                  break;
                }

                i = context$4$0.t4.value;
                del = deletions[i];
                id = [del[0], del[1]];
                return context$4$0.delegateYield(this.deleteOperation(id), "t5", 18);

              case 18:
                addOperation = context$4$0.t5;

                if (!addOperation) {
                  context$4$0.next = 21;
                  break;
                }

                return context$4$0.delegateYield(this.store.operationAdded(this, { struct: 'Delete', target: id }), "t6", 21);

              case 21:
                if (!del[2]) {
                  context$4$0.next = 23;
                  break;
                }

                return context$4$0.delegateYield(this.garbageCollectOperation(id), "t7", 23);

              case 23:
                context$4$0.next = 13;
                break;

              case 25:
              case "end":
                return context$4$0.stop();
            }
          }, applyDeleteSet, this);
        });
        Transaction.prototype.isGarbageCollected = regeneratorRuntime.mark(function isGarbageCollected(id) {
          var n;
          return regeneratorRuntime.wrap(function isGarbageCollected$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.ds.findWithUpperBound(id), "t0", 1);

              case 1:
                n = context$4$0.t0;
                return context$4$0.abrupt("return", n != null && n.id[0] === id[0] && id[1] < n.id[1] + n.len && n.gc);

              case 3:
              case "end":
                return context$4$0.stop();
            }
          }, isGarbageCollected, this);
        });

        /*
          A DeleteSet (ds) describes all the deleted ops in the OS
        */
        Transaction.prototype.getDeleteSet = regeneratorRuntime.mark(function getDeleteSet() {
          var ds;
          return regeneratorRuntime.wrap(function getDeleteSet$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                ds = {};
                return context$4$0.delegateYield(this.ds.iterate(this, null, null, regeneratorRuntime.mark(function callee$4$0(n) {
                  var user, counter, len, gc, dv;
                  return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
                    while (1) switch (context$5$0.prev = context$5$0.next) {
                      case 0:
                        user = n.id[0];
                        counter = n.id[1];
                        len = n.len;
                        gc = n.gc;
                        dv = ds[user];

                        if (dv === void 0) {
                          dv = [];
                          ds[user] = dv;
                        }
                        dv.push([counter, len, gc]);

                      case 7:
                      case "end":
                        return context$5$0.stop();
                    }
                  }, callee$4$0, this);
                })), "t0", 2);

              case 2:
                return context$4$0.abrupt("return", ds);

              case 3:
              case "end":
                return context$4$0.stop();
            }
          }, getDeleteSet, this);
        });
        Transaction.prototype.isDeleted = regeneratorRuntime.mark(function isDeleted(id) {
          var n;
          return regeneratorRuntime.wrap(function isDeleted$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.ds.findWithUpperBound(id), "t0", 1);

              case 1:
                n = context$4$0.t0;
                return context$4$0.abrupt("return", n != null && n.id[0] === id[0] && id[1] < n.id[1] + n.len);

              case 3:
              case "end":
                return context$4$0.stop();
            }
          }, isDeleted, this);
        });
        Transaction.prototype.setOperation = regeneratorRuntime.mark(function setOperation(op) {
          return regeneratorRuntime.wrap(function setOperation$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.os.put(op), "t0", 1);

              case 1:
                return context$4$0.abrupt("return", op);

              case 2:
              case "end":
                return context$4$0.stop();
            }
          }, setOperation, this);
        });
        Transaction.prototype.addOperation = regeneratorRuntime.mark(function addOperation(op) {
          return regeneratorRuntime.wrap(function addOperation$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.os.put(op), "t0", 1);

              case 1:
              case "end":
                return context$4$0.stop();
            }
          }, addOperation, this);
        });
        Transaction.prototype.getOperation = regeneratorRuntime.mark(function getOperation(id) {
          return regeneratorRuntime.wrap(function getOperation$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.os.find(id), "t0", 1);

              case 1:
                return context$4$0.abrupt("return", context$4$0.t0);

              case 2:
              case "end":
                return context$4$0.stop();
            }
          }, getOperation, this);
        });
        Transaction.prototype.removeOperation = regeneratorRuntime.mark(function removeOperation(id) {
          return regeneratorRuntime.wrap(function removeOperation$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.os["delete"](id), "t0", 1);

              case 1:
              case "end":
                return context$4$0.stop();
            }
          }, removeOperation, this);
        });
        Transaction.prototype.setState = regeneratorRuntime.mark(function setState(state) {
          var val;
          return regeneratorRuntime.wrap(function setState$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                val = {
                  id: [state.user],
                  clock: state.clock
                };
                return context$4$0.delegateYield(this.ss.find([state.user]), "t0", 2);

              case 2:
                if (!context$4$0.t0) {
                  context$4$0.next = 6;
                  break;
                }

                return context$4$0.delegateYield(this.ss.put(val), "t1", 4);

              case 4:
                context$4$0.next = 7;
                break;

              case 6:
                return context$4$0.delegateYield(this.ss.put(val), "t2", 7);

              case 7:
              case "end":
                return context$4$0.stop();
            }
          }, setState, this);
        });
        Transaction.prototype.getState = regeneratorRuntime.mark(function getState(user) {
          var n, clock;
          return regeneratorRuntime.wrap(function getState$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.ss.find([user]), "t0", 1);

              case 1:
                context$4$0.t1 = n = context$4$0.t0;

                if (!(context$4$0.t1 == null)) {
                  context$4$0.next = 6;
                  break;
                }

                context$4$0.t2 = null;
                context$4$0.next = 7;
                break;

              case 6:
                context$4$0.t2 = n.clock;

              case 7:
                clock = context$4$0.t2;

                if (clock == null) {
                  clock = 0;
                }
                return context$4$0.abrupt("return", {
                  user: user,
                  clock: clock
                });

              case 10:
              case "end":
                return context$4$0.stop();
            }
          }, getState, this);
        });
        Transaction.prototype.getStateVector = regeneratorRuntime.mark(function getStateVector() {
          var stateVector;
          return regeneratorRuntime.wrap(function getStateVector$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                stateVector = [];
                return context$4$0.delegateYield(this.ss.iterate(this, null, null, regeneratorRuntime.mark(function callee$4$0(n) {
                  return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
                    while (1) switch (context$5$0.prev = context$5$0.next) {
                      case 0:
                        stateVector.push({
                          user: n.id[0],
                          clock: n.clock
                        });

                      case 1:
                      case "end":
                        return context$5$0.stop();
                    }
                  }, callee$4$0, this);
                })), "t0", 2);

              case 2:
                return context$4$0.abrupt("return", stateVector);

              case 3:
              case "end":
                return context$4$0.stop();
            }
          }, getStateVector, this);
        });
        Transaction.prototype.getStateSet = regeneratorRuntime.mark(function getStateSet() {
          var ss;
          return regeneratorRuntime.wrap(function getStateSet$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                ss = {};
                return context$4$0.delegateYield(this.ss.iterate(this, null, null, regeneratorRuntime.mark(function callee$4$0(n) {
                  return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
                    while (1) switch (context$5$0.prev = context$5$0.next) {
                      case 0:
                        ss[n.id[0]] = n.clock;

                      case 1:
                      case "end":
                        return context$5$0.stop();
                    }
                  }, callee$4$0, this);
                })), "t0", 2);

              case 2:
                return context$4$0.abrupt("return", ss);

              case 3:
              case "end":
                return context$4$0.stop();
            }
          }, getStateSet, this);
        });
        Transaction.prototype.getOperations = regeneratorRuntime.mark(function getOperations(startSS) {
          var ops, endSV, _iterator7, _isArray7, _i7, _ref7, endState, user, startPos, res, _iterator8, _isArray8, _i8, _ref8, op;

          return regeneratorRuntime.wrap(function getOperations$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                // TODO: use bounds here!
                if (startSS == null) {
                  startSS = {};
                }
                ops = [];
                return context$4$0.delegateYield(this.getStateVector(), "t0", 3);

              case 3:
                endSV = context$4$0.t0;
                _iterator7 = endSV, _isArray7 = Array.isArray(_iterator7), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();

              case 5:
                if (!_isArray7) {
                  context$4$0.next = 11;
                  break;
                }

                if (!(_i7 >= _iterator7.length)) {
                  context$4$0.next = 8;
                  break;
                }

                return context$4$0.abrupt("break", 23);

              case 8:
                _ref7 = _iterator7[_i7++];
                context$4$0.next = 15;
                break;

              case 11:
                _i7 = _iterator7.next();

                if (!_i7.done) {
                  context$4$0.next = 14;
                  break;
                }

                return context$4$0.abrupt("break", 23);

              case 14:
                _ref7 = _i7.value;

              case 15:
                endState = _ref7;
                user = endState.user;

                if (!(user === '_')) {
                  context$4$0.next = 19;
                  break;
                }

                return context$4$0.abrupt("continue", 21);

              case 19:
                startPos = startSS[user] || 0;
                return context$4$0.delegateYield(this.os.iterate(this, [user, startPos], [user, Number.MAX_VALUE], regeneratorRuntime.mark(function callee$4$0(op) {
                  return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
                    while (1) switch (context$5$0.prev = context$5$0.next) {
                      case 0:
                        ops.push(op);

                      case 1:
                      case "end":
                        return context$5$0.stop();
                    }
                  }, callee$4$0, this);
                })), "t1", 21);

              case 21:
                context$4$0.next = 5;
                break;

              case 23:
                res = [];
                _iterator8 = ops, _isArray8 = Array.isArray(_iterator8), _i8 = 0, _iterator8 = _isArray8 ? _iterator8 : _iterator8[Symbol.iterator]();

              case 25:
                if (!_isArray8) {
                  context$4$0.next = 31;
                  break;
                }

                if (!(_i8 >= _iterator8.length)) {
                  context$4$0.next = 28;
                  break;
                }

                return context$4$0.abrupt("break", 42);

              case 28:
                _ref8 = _iterator8[_i8++];
                context$4$0.next = 35;
                break;

              case 31:
                _i8 = _iterator8.next();

                if (!_i8.done) {
                  context$4$0.next = 34;
                  break;
                }

                return context$4$0.abrupt("break", 42);

              case 34:
                _ref8 = _i8.value;

              case 35:
                op = _ref8;
                context$4$0.t2 = res;
                return context$4$0.delegateYield(this.makeOperationReady(startSS, op), "t3", 38);

              case 38:
                context$4$0.t4 = context$4$0.t3;
                context$4$0.t2.push.call(context$4$0.t2, context$4$0.t4);

              case 40:
                context$4$0.next = 25;
                break;

              case 42:
                return context$4$0.abrupt("return", res);

              case 43:
              case "end":
                return context$4$0.stop();
            }
          }, getOperations, this);
        });

        /*
          Here, we make op executable for the receiving user.
           Notes:
            startSS: denotes to the SV that the remote user sent
            currSS:  denotes to the state vector that the user should have if he
                     applies all already sent operations (increases is each step)
           We face several problems:
          * Execute op as is won't work because ops depend on each other
           -> find a way so that they do not anymore
          * When changing left, must not go more to the left than the origin
          * When changing right, you have to consider that other ops may have op
            as their origin, this means that you must not set one of these ops
            as the new right (interdependencies of ops)
          * can't just go to the right until you find the first known operation,
            With currSS
              -> interdependency of ops is a problem
            With startSS
              -> leads to inconsistencies when two users join at the same time.
                 Then the position depends on the order of execution -> error!
             Solution:
            -> re-create originial situation
              -> set op.left = op.origin (which never changes)
              -> set op.right
                   to the first operation that is known (according to startSS)
                   or to the first operation that has an origin that is not to the
                   right of op.
              -> Enforces unique execution order -> happy user
             Improvements: TODO
              * Could set left to origin, or the first known operation
                (startSS or currSS.. ?)
                -> Could be necessary when I turn GC again.
                -> Is a bad(ish) idea because it requires more computation
        */
        Transaction.prototype.makeOperationReady = regeneratorRuntime.mark(function makeOperationReady(startSS, op) {
          var o, ids, right;
          return regeneratorRuntime.wrap(function makeOperationReady$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                op = Y.Struct[op.struct].encode(op);
                op = Y.utils.copyObject(op);
                o = op;
                ids = [op.id];

              case 4:
                if (!(o.right != null)) {
                  context$4$0.next = 13;
                  break;
                }

                return context$4$0.delegateYield(this.getOperation(o.right), "t0", 6);

              case 6:
                right = context$4$0.t0;

                if (!(o.right[1] < (startSS[o.right[0]] || 0) || !ids.some(function (id) {
                  return Y.utils.compareIds(id, right.origin);
                }))) {
                  context$4$0.next = 9;
                  break;
                }

                return context$4$0.abrupt("break", 13);

              case 9:
                ids.push(o.right);
                o = right;
                context$4$0.next = 4;
                break;

              case 13:
                op.right = o.right;
                op.left = op.origin;
                return context$4$0.abrupt("return", op);

              case 16:
              case "end":
                return context$4$0.stop();
            }
          }, makeOperationReady, this);
        });
        return Transaction;
      })();

      Y.Transaction = Transaction;
    };
  }, {}], 8: [function (require, module, exports) {
    'use strict';

    module.exports = function (Y) {
      var YMap = (function () {
        function YMap(os, model, contents, opContents) {
          var _this3 = this;

          _classCallCheck(this, YMap);

          this._model = model.id;
          this.os = os;
          this.map = Y.utils.copyObject(model.map);
          this.contents = contents;
          this.opContents = opContents;
          this.eventHandler = new Y.utils.EventHandler(function (ops) {
            var userEvents = [];
            for (var i in ops) {
              var op = ops[i];
              var oldValue;
              // key is the name to use to access (op)content
              var key = op.struct === 'Delete' ? op.key : op.parentSub;

              // compute oldValue
              if (_this3.opContents[key] != null) {
                (function () {
                  var prevType = _this3.opContents[key];
                  oldValue = function () {
                    // eslint-disable-line
                    return new Promise(function (resolve) {
                      _this3.os.requestTransaction(regeneratorRuntime.mark(function callee$8$0() {
                        return regeneratorRuntime.wrap(function callee$8$0$(context$9$0) {
                          while (1) switch (context$9$0.prev = context$9$0.next) {
                            case 0:
                              return context$9$0.delegateYield(this.getType(prevType), "t0", 1);

                            case 1:
                              context$9$0.t1 = context$9$0.t0;
                              resolve(context$9$0.t1);

                            case 3:
                            case "end":
                              return context$9$0.stop();
                          }
                        }, callee$8$0, this);
                      }));
                    });
                  };
                })();
              } else {
                oldValue = _this3.contents[key];
              }
              // compute op event
              if (op.struct === 'Insert') {
                if (op.left === null) {
                  if (op.opContent != null) {
                    delete _this3.contents[key];
                    if (op.deleted) {
                      delete _this3.opContents[key];
                    } else {
                      _this3.opContents[key] = op.opContent;
                    }
                  } else {
                    delete _this3.opContents[key];
                    if (op.deleted) {
                      delete _this3.contents[key];
                    } else {
                      _this3.contents[key] = op.content;
                    }
                  }
                  _this3.map[key] = op.id;
                  var insertEvent = {
                    name: key,
                    object: _this3
                  };
                  if (oldValue === undefined) {
                    insertEvent.type = 'add';
                  } else {
                    insertEvent.type = 'update';
                    insertEvent.oldValue = oldValue;
                  }
                  userEvents.push(insertEvent);
                }
              } else if (op.struct === 'Delete') {
                if (Y.utils.compareIds(_this3.map[key], op.target)) {
                  delete _this3.opContents[key];
                  delete _this3.contents[key];
                  var deleteEvent = {
                    name: key,
                    object: _this3,
                    oldValue: oldValue,
                    type: 'delete'
                  };
                  userEvents.push(deleteEvent);
                }
              } else {
                throw new Error('Unexpected Operation!');
              }
            }
            _this3.eventHandler.callEventListeners(userEvents);
          });
        }

        YMap.prototype.get = function get(key) {
          var _this4 = this;

          // return property.
          // if property does not exist, return null
          // if property is a type, return a promise
          if (key == null) {
            throw new Error('You must specify key!');
          }
          if (this.opContents[key] == null) {
            return this.contents[key];
          } else {
            return new Promise(function (resolve) {
              var oid = _this4.opContents[key];
              _this4.os.requestTransaction(regeneratorRuntime.mark(function callee$5$0() {
                return regeneratorRuntime.wrap(function callee$5$0$(context$6$0) {
                  while (1) switch (context$6$0.prev = context$6$0.next) {
                    case 0:
                      return context$6$0.delegateYield(this.getType(oid), "t0", 1);

                    case 1:
                      context$6$0.t1 = context$6$0.t0;
                      resolve(context$6$0.t1);

                    case 3:
                    case "end":
                      return context$6$0.stop();
                  }
                }, callee$5$0, this);
              }));
            });
          }
        };

        /*
          If there is a primitive (not a custom type), then return it.
          Returns all primitive values, if propertyName is specified!
          Note: modifying the return value could result in inconsistencies!
            -- so make sure to copy it first!
        */

        YMap.prototype.getPrimitive = function getPrimitive(key) {
          if (key == null) {
            return Y.utils.copyObject(this.contents);
          } else {
            return this.contents[key];
          }
        };

        YMap.prototype["delete"] = function _delete(key) {
          var right = this.map[key];
          if (right != null) {
            var del = {
              target: right,
              struct: 'Delete'
            };
            var eventHandler = this.eventHandler;
            var modDel = Y.utils.copyObject(del);
            modDel.key = key;
            eventHandler.awaitAndPrematurelyCall([modDel]);
            this.os.requestTransaction(regeneratorRuntime.mark(function callee$4$0() {
              return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
                while (1) switch (context$5$0.prev = context$5$0.next) {
                  case 0:
                    return context$5$0.delegateYield(this.applyCreatedOperations([del]), "t0", 1);

                  case 1:
                    eventHandler.awaitedDeletes(1);

                  case 2:
                  case "end":
                    return context$5$0.stop();
                }
              }, callee$4$0, this);
            }));
          }
        };

        YMap.prototype.set = function set(key, value) {
          var _this5 = this;

          // set property.
          // if property is a type, return a promise
          // if not, apply immediately on this type an call event

          var right = this.map[key] || null;
          var insert = {
            left: null,
            right: right,
            origin: null,
            parent: this._model,
            parentSub: key,
            struct: 'Insert'
          };
          return new Promise(function (resolve) {
            if (value instanceof Y.utils.CustomType) {
              // construct a new type
              _this5.os.requestTransaction(regeneratorRuntime.mark(function callee$5$0() {
                var typeid, type;
                return regeneratorRuntime.wrap(function callee$5$0$(context$6$0) {
                  while (1) switch (context$6$0.prev = context$6$0.next) {
                    case 0:
                      return context$6$0.delegateYield(value.createType.call(this), "t0", 1);

                    case 1:
                      typeid = context$6$0.t0;
                      return context$6$0.delegateYield(this.getType(typeid), "t1", 3);

                    case 3:
                      type = context$6$0.t1;

                      insert.opContent = typeid;
                      insert.id = this.store.getNextOpId();
                      return context$6$0.delegateYield(this.applyCreatedOperations([insert]), "t2", 7);

                    case 7:
                      resolve(type);

                    case 8:
                    case "end":
                      return context$6$0.stop();
                  }
                }, callee$5$0, this);
              }));
            } else {
              insert.content = value;
              insert.id = _this5.os.getNextOpId();
              var eventHandler = _this5.eventHandler;
              eventHandler.awaitAndPrematurelyCall([insert]);

              _this5.os.requestTransaction(regeneratorRuntime.mark(function callee$5$0() {
                return regeneratorRuntime.wrap(function callee$5$0$(context$6$0) {
                  while (1) switch (context$6$0.prev = context$6$0.next) {
                    case 0:
                      return context$6$0.delegateYield(this.applyCreatedOperations([insert]), "t0", 1);

                    case 1:
                      eventHandler.awaitedInserts(1);

                    case 2:
                    case "end":
                      return context$6$0.stop();
                  }
                }, callee$5$0, this);
              }));
              resolve(value);
            }
          });
        };

        YMap.prototype.observe = function observe(f) {
          this.eventHandler.addEventListener(f);
        };

        YMap.prototype.unobserve = function unobserve(f) {
          this.eventHandler.removeEventListener(f);
        };

        /*
          Observe a path.
           E.g.
          ```
          o.set('textarea', Y.TextBind)
          o.observePath(['textarea'], function(t){
            // is called whenever textarea is replaced
            t.bind(textarea)
          })
           returns a Promise that contains a function that removes the observer from the path.
        */

        YMap.prototype.observePath = function observePath(path, f) {
          var self = this;
          function observeProperty(events) {
            // call f whenever path changes
            for (var i = 0; i < events.length; i++) {
              var event = events[i];
              if (event.name === propertyName) {
                // call this also for delete events!
                var property = self.get(propertyName);
                if (property instanceof Promise) {
                  property.then(f);
                } else {
                  f(property);
                }
              }
            }
          }

          if (path.length < 1) {
            throw new Error('Path must contain at least one element!');
          } else if (path.length === 1) {
            var propertyName = path[0];
            var property = self.get(propertyName);
            if (property instanceof Promise) {
              property.then(f);
            } else {
              f(property);
            }
            this.observe(observeProperty);
            return Promise.resolve(function () {
              self.unobserve(f);
            });
          } else {
            var deleteChildObservers;
            var resetObserverPath = function resetObserverPath() {
              var promise = self.get(path[0]);
              if (!promise instanceof Promise) {
                // its either not defined or a primitive value
                promise = self.set(path[0], Y.Map);
              }
              return promise.then(function (map) {
                return map.observePath(path.slice(1), f);
              }).then(function (_deleteChildObservers) {
                // update deleteChildObservers
                deleteChildObservers = _deleteChildObservers;
                return Promise.resolve(); // Promise does not return anything
              });
            };
            var observer = function observer(events) {
              for (var e in events) {
                var event = events[e];
                if (event.name === path[0]) {
                  deleteChildObservers();
                  if (event.type === 'add' || event.type === 'update') {
                    resetObserverPath();
                  }
                  // TODO: what about the delete events?
                }
              }
            };
            self.observe(observer);
            return resetObserverPath().then(
            // this promise contains a function that deletes all the child observers
            // and how to unobserve the observe from this object
            Promise.resolve(function () {
              deleteChildObservers();
              self.unobserve(observer);
            }));
          }
        };

        YMap.prototype._changed = regeneratorRuntime.mark(function _changed(transaction, op) {
          return regeneratorRuntime.wrap(function _changed$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                if (!(op.struct === 'Delete')) {
                  context$4$0.next = 3;
                  break;
                }

                return context$4$0.delegateYield(transaction.getOperation(op.target), "t0", 2);

              case 2:
                op.key = context$4$0.t0.parentSub;

              case 3:
                this.eventHandler.receivedOp(op);

              case 4:
              case "end":
                return context$4$0.stop();
            }
          }, _changed, this);
        });
        return YMap;
      })();

      Y.Map = new Y.utils.CustomType({
        "class": YMap,
        createType: regeneratorRuntime.mark(function YMapCreator() {
          var modelid, model;
          return regeneratorRuntime.wrap(function YMapCreator$(context$3$0) {
            while (1) switch (context$3$0.prev = context$3$0.next) {
              case 0:
                modelid = this.store.getNextOpId();
                model = {
                  map: {},
                  struct: 'Map',
                  type: 'Map',
                  id: modelid
                };
                return context$3$0.delegateYield(this.applyCreatedOperations([model]), "t0", 3);

              case 3:
                return context$3$0.abrupt("return", modelid);

              case 4:
              case "end":
                return context$3$0.stop();
            }
          }, YMapCreator, this);
        }),
        initType: regeneratorRuntime.mark(function YMapInitializer(os, model) {
          var contents, opContents, map, name, op;
          return regeneratorRuntime.wrap(function YMapInitializer$(context$3$0) {
            while (1) switch (context$3$0.prev = context$3$0.next) {
              case 0:
                contents = {};
                opContents = {};
                map = model.map;
                context$3$0.t0 = regeneratorRuntime.keys(map);

              case 4:
                if ((context$3$0.t1 = context$3$0.t0()).done) {
                  context$3$0.next = 11;
                  break;
                }

                name = context$3$0.t1.value;
                return context$3$0.delegateYield(this.getOperation(map[name]), "t2", 7);

              case 7:
                op = context$3$0.t2;

                if (op.opContent != null) {
                  opContents[name] = op.opContent;
                } else {
                  contents[name] = op.content;
                }
                context$3$0.next = 4;
                break;

              case 11:
                return context$3$0.abrupt("return", new YMap(os, model, contents, opContents));

              case 12:
              case "end":
                return context$3$0.stop();
            }
          }, YMapInitializer, this);
        })
      });
    };
  }, {}], 9: [function (require, module, exports) {
    'use strict';

    /*
      EventHandler is an helper class for constructing custom types.
    
      Why: When constructing custom types, you sometimes want your types to work
      synchronous: E.g.
      ``` Synchronous
      mytype.setSomething("yay")
      mytype.getSomething() === "yay"
      ```
      ``` Asynchronous
      mytype.setSomething("yay")
      mytype.getSomething() === undefined
      mytype.waitForSomething().then(function(){
        mytype.getSomething() === "yay"
      })
    
      The structures usually work asynchronously (you have to wait for the
      database request to finish). EventHandler will help you to make your type
      synchronously.
    */
    module.exports = function (Y) {
      Y.utils = {};

      var EventHandler = (function () {
        /*
          onevent: is called when the structure changes.
           Note: "awaiting opertations" is used to denote operations that were
          prematurely called. Events for received operations can not be executed until
          all prematurely called operations were executed ("waiting operations")
        */

        function EventHandler(onevent) {
          _classCallCheck(this, EventHandler);

          this.waiting = [];
          this.awaiting = 0;
          this.onevent = onevent;
          this.eventListeners = [];
        }

        /*
          Call this when a new operation arrives. It will be executed right away if
          there are no waiting operations, that you prematurely executed
        */

        EventHandler.prototype.receivedOp = function receivedOp(op) {
          if (this.awaiting <= 0) {
            this.onevent([op]);
          } else {
            this.waiting.push(Y.utils.copyObject(op));
          }
        };

        /*
          You created some operations, and you want the `onevent` function to be
          called right away. Received operations will not be executed untill all
          prematurely called operations are executed
        */

        EventHandler.prototype.awaitAndPrematurelyCall = function awaitAndPrematurelyCall(ops) {
          this.awaiting++;
          this.onevent(ops);
        };

        /*
          Basic event listener boilerplate...
          TODO: maybe put this in a different type..
        */

        EventHandler.prototype.addEventListener = function addEventListener(f) {
          this.eventListeners.push(f);
        };

        EventHandler.prototype.removeEventListener = function removeEventListener(f) {
          this.eventListeners = this.eventListeners.filter(function (g) {
            return f !== g;
          });
        };

        EventHandler.prototype.removeAllEventListeners = function removeAllEventListeners() {
          this.eventListeners = [];
        };

        EventHandler.prototype.callEventListeners = function callEventListeners(event) {
          for (var i in this.eventListeners) {
            try {
              this.eventListeners[i](event);
            } catch (e) {
              console.log('User events must not throw Errors!'); // eslint-disable-line
            }
          }
        };

        /*
          Call this when you successfully awaited the execution of n Insert operations
        */

        EventHandler.prototype.awaitedInserts = function awaitedInserts(n) {
          var ops = this.waiting.splice(this.waiting.length - n);
          for (var oid = 0; oid < ops.length; oid++) {
            var op = ops[oid];
            for (var i = this.waiting.length - 1; i >= 0; i--) {
              var w = this.waiting[i];
              if (Y.utils.compareIds(op.left, w.id)) {
                // include the effect of op in w
                w.right = op.id;
                // exclude the effect of w in op
                op.left = w.left;
              } else if (Y.utils.compareIds(op.right, w.id)) {
                // similar..
                w.left = op.id;
                op.right = w.right;
              }
            }
          }
          this._tryCallEvents();
        };

        /*
          Call this when you successfully awaited the execution of n Delete operations
        */

        EventHandler.prototype.awaitedDeletes = function awaitedDeletes(n, newLeft) {
          var ops = this.waiting.splice(this.waiting.length - n);
          for (var j in ops) {
            var del = ops[j];
            if (newLeft != null) {
              for (var i in this.waiting) {
                var w = this.waiting[i];
                // We will just care about w.left
                if (Y.utils.compareIds(del.target, w.left)) {
                  del.left = newLeft;
                }
              }
            }
          }
          this._tryCallEvents();
        };

        /* (private)
          Try to execute the events for the waiting operations
        */

        EventHandler.prototype._tryCallEvents = function _tryCallEvents() {
          this.awaiting--;
          if (this.awaiting <= 0 && this.waiting.length > 0) {
            var events = this.waiting;
            this.waiting = [];
            this.onevent(events);
          }
        };

        return EventHandler;
      })();

      Y.utils.EventHandler = EventHandler;

      /*
        A wrapper for the definition of a custom type.
        Every custom type must have three properties:
         * createType
          - Defines the model of a newly created custom type and returns the type
        * initType
          - Given a model, creates a custom type
        * class
          - the constructor of the custom type (e.g. in order to inherit from a type)
      */

      var CustomType = // eslint-disable-line
      function CustomType(def) {
        _classCallCheck(this, CustomType);

        if (def.createType == null || def.initType == null || def["class"] == null) {
          throw new Error('Custom type was not initialized correctly!');
        }
        this.createType = def.createType;
        this.initType = def.initType;
        this["class"] = def["class"];
      };

      Y.utils.CustomType = CustomType;

      /*
        Make a flat copy of an object
        (just copy properties)
      */
      function copyObject(o) {
        var c = {};
        for (var key in o) {
          c[key] = o[key];
        }
        return c;
      }
      Y.utils.copyObject = copyObject;

      /*
        Defines a smaller relation on Id's
      */
      function smaller(a, b) {
        return a[0] < b[0] || a[0] === b[0] && a[1] < b[1];
      }
      Y.utils.smaller = smaller;

      function compareIds(id1, id2) {
        if (id1 == null || id2 == null) {
          if (id1 == null && id2 == null) {
            return true;
          }
          return false;
        }
        if (id1[0] === id2[0] && id1[1] === id2[1]) {
          return true;
        } else {
          return false;
        }
      }
      Y.utils.compareIds = compareIds;
    };
  }, {}], 10: [function (require, module, exports) {
    'use strict';

    require('./Connector.js')(Y);
    require('./Database.js')(Y);
    require('./Transaction.js')(Y);
    require('./Struct.js')(Y);
    require('./Utils.js')(Y);
    require('./Connectors/Test.js')(Y);

    var requiringModules = {};

    module.exports = Y;

    Y.extend = function (name, value) {
      Y[name] = value;
      if (requiringModules[name] != null) {
        requiringModules[name].resolve();
        delete requiringModules[name];
      }
    };

    Y.requestModules = function (modules) {
      var promises = [];
      for (var i = 0; i < modules.length; i++) {
        var modulename = 'y-' + modules[i].toLowerCase();
        if (Y[modules[i]] == null) {
          if (requiringModules[modules[i]] == null) {
            try {
              require(modulename)(Y);
            } catch (e) {
              // module does not exist
              if (typeof window !== 'undefined') {
                var imported = document.createElement('script');
                imported.src = Y.sourceDir + '/' + modulename + '/' + modulename + '.js';
                document.head.appendChild(imported);(function () {
                  var modname = modules[i];
                  var promise = new Promise(function (resolve) {
                    requiringModules[modname] = {
                      resolve: resolve,
                      promise: promise
                    };
                  });
                  promises.push(promise);
                })();
              } else {
                throw e;
              }
            }
          } else {
            promises.push(requiringModules[modules[i]].promise);
          }
        }
      }
      return Promise.all(promises);
    };

    require('./Types/Map.js')(Y);

    function Y(opts) {
      opts.types = opts.types != null ? opts.types : [];
      var modules = [opts.db.name, opts.connector.name].concat(opts.types);
      Y.sourceDir = opts.sourceDir;
      return Y.requestModules(modules).then(function () {
        return new Promise(function (resolve) {
          var yconfig = new YConfig(opts, function () {
            yconfig.db.whenUserIdSet(function () {
              resolve(yconfig);
            });
          });
        });
      });
    }

    var YConfig = (function () {
      function YConfig(opts, callback) {
        _classCallCheck(this, YConfig);

        this.db = new Y[opts.db.name](this, opts.db);
        this.connector = new Y[opts.connector.name](this, opts.connector);
        this.db.requestTransaction(regeneratorRuntime.mark(function requestTransaction() {
          var model, root;
          return regeneratorRuntime.wrap(function requestTransaction$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                model = {
                  id: ['_', 0],
                  struct: 'Map',
                  type: 'Map',
                  map: {}
                };
                return context$4$0.delegateYield(this.store.tryExecute.call(this, model), "t0", 2);

              case 2:
                return context$4$0.delegateYield(this.getType(model.id), "t1", 3);

              case 3:
                root = context$4$0.t1;

                this.store.y.root = root;
                callback();

              case 6:
              case "end":
                return context$4$0.stop();
            }
          }, requestTransaction, this);
        }));
      }

      YConfig.prototype.isConnected = function isConnected() {
        return this.connector.isSynced;
      };

      YConfig.prototype.disconnect = function disconnect() {
        return this.connector.disconnect();
      };

      YConfig.prototype.reconnect = function reconnect() {
        return this.connector.reconnect();
      };

      YConfig.prototype.destroy = function destroy() {
        this.disconnect();
        this.db.destroy();
        this.connector = null;
        this.db = null;
      };

      return YConfig;
    })();

    if (typeof window !== 'undefined') {
      window.Y = Y;
    }
  }, { "./Connector.js": 3, "./Connectors/Test.js": 4, "./Database.js": 5, "./Struct.js": 6, "./Transaction.js": 7, "./Types/Map.js": 8, "./Utils.js": 9 }] }, {}, [2, 10]);

// increase SS

// notify whenOperation listeners (by id)

// notify parent, if it has been initialized as a custom type

// Delete if DS says this is actually deleted
// loop counter
// most cases: 0 (starts from 0)

// find o. o is the first conflicting operation
// left == null

// handle conflicts

// reconnect..

// reconnect left and set right of op

// reconnect right

// update parents .map/start/end properties

// is a child of a map struct.
// Then also make sure that only the most left element is not deleted
// TODO: change to != (at least some convention)

// TODO: don't do it like this .. -.-

// TODO: here to..  (see above)

/*
  Check if it is possible to add right to the gc.
  Because this delete can't be responsible for left being gc'd,
  we don't have to add left to the gc..
*/

// this.mem.push(["gc", id]);

// un-extend left

// get prev&next before adding a new operation

// un-extend right

// can extend right?

// this.mem.push(["del", id]);

// already deleted

// can extend right?

// then set the state

// if op exists, then clean that mess up..

/*
if (!o.deleted) {
  yield* this.deleteOperation(id)
  o = yield* this.getOperation(id)
}
*/

// remove gc'd op from the left op, if it exists

// remove gc'd op from the right op, if it exists
// also reset origins of right ops
// rights origin is o
// find new origin of right ops
// origin is the first left deleted operation

// get next i
/* otherwise, rights origin is to the left of o,
   then there is no right op (from o), that origins in o */

// remove gc'd op from parent, if it exists

// finally remove it from the os

// cases:
// 1. d deletes something to the right of n
//  => go to next n (break)
// 2. d deletes something to the left of n
//  => create deletions
//  => reset d accordingly
//  *)=> if d doesn't delete anything anymore, go to next d (continue)
// 3. not 2) and d deletes something that also n deletes
//  => reset d so that it doesn't contain n's deletion
//  *)=> if d does not delete anything anymore, go to next d (continue)
// describe the diff of length in 1) and 2)

// 1)

// always try to delete..

// TODO:.. really .. here? You could prevent calling all these functions in operationAdded

// gc

// TODO: find a way to skip this step.. (after implementing some dbs..)

// search for the new op.right
// it is either the first known op (according to startSS)
// or the o that has no origin to the right of op
// (this is why we use the ids array)
// eslint-disable-line

// create initial Map type