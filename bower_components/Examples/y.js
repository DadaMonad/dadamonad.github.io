(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* globals Y */
'use strict'

class AbstractConnector {
  /*
    opts contains the following information:
     role : String Role of this client ("master" or "slave")
     userId : String Uniquely defines the user.
     debug: Boolean Whether to print debug messages (optional)
  */
  constructor (y, opts) {
    this.y = y
    if (opts == null) {
      opts = {}
    }
    if (opts.role == null || opts.role === 'master') {
      this.role = 'master'
    } else if (opts.role === 'slave') {
      this.role = 'slave'
    } else {
      throw new Error("Role must be either 'master' or 'slave'!")
    }
    this.role = opts.role
    this.connections = {}
    this.isSynced = false
    this.userEventListeners = []
    this.whenSyncedListeners = []
    this.currentSyncTarget = null
    this.syncingClients = []
    this.forwardToSyncingClients = opts.forwardToSyncingClients !== false
    this.debug = opts.debug === true
    this.broadcastedHB = false
    this.syncStep2 = Promise.resolve()
  }
  reconnect () {
  }
  disconnect () {
    this.connections = {}
    this.isSynced = false
    this.currentSyncTarget = null
    this.broadcastedHB = false
    this.syncingClients = []
    this.whenSyncedListeners = []
    return this.y.db.stopGarbageCollector()
  }
  setUserId (userId) {
    this.userId = userId
    return this.y.db.setUserId(userId)
  }
  onUserEvent (f) {
    this.userEventListeners.push(f)
  }
  userLeft (user) {
    delete this.connections[user]
    if (user === this.currentSyncTarget) {
      this.currentSyncTarget = null
      this.findNextSyncTarget()
    }
    this.syncingClients = this.syncingClients.filter(function (cli) {
      return cli !== user
    })
    for (var f of this.userEventListeners) {
      f({
        action: 'userLeft',
        user: user
      })
    }
  }
  userJoined (user, role) {
    if (role == null) {
      throw new Error('You must specify the role of the joined user!')
    }
    if (this.connections[user] != null) {
      throw new Error('This user already joined!')
    }
    this.connections[user] = {
      isSynced: false,
      role: role
    }
    for (var f of this.userEventListeners) {
      f({
        action: 'userJoined',
        user: user,
        role: role
      })
    }
    if (this.currentSyncTarget == null) {
      this.findNextSyncTarget()
    }
  }
  // Execute a function _when_ we are connected.
  // If not connected, wait until connected
  whenSynced (f) {
    if (this.isSynced) {
      f()
    } else {
      this.whenSyncedListeners.push(f)
    }
  }
  /*

   returns false, if there is no sync target
   true otherwise
  */
  findNextSyncTarget () {
    if (this.currentSyncTarget != null || this.isSynced) {
      return // "The current sync has not finished!"
    }

    var syncUser = null
    for (var uid in this.connections) {
      if (!this.connections[uid].isSynced) {
        syncUser = uid
        break
      }
    }
    if (syncUser != null) {
      var conn = this
      this.currentSyncTarget = syncUser
      this.y.db.requestTransaction(function *() {
        conn.send(syncUser, {
          type: 'sync step 1',
          stateSet: yield* this.getStateSet(),
          deleteSet: yield* this.getDeleteSet()
        })
      })
    } else {
      this.isSynced = true
      // call when synced listeners
      for (var f of this.whenSyncedListeners) {
        f()
      }
      this.whenSyncedListeners = []
      this.y.db.requestTransaction(function *() {
        yield* this.garbageCollectAfterSync()
      })
    }
  }
  send (uid, message) {
    if (this.debug) {
      console.log(`send ${this.userId} -> ${uid}: ${message.type}`, m) // eslint-disable-line
    }
  }
  /*
    You received a raw message, and you know that it is intended for Yjs. Then call this function.
  */
  receiveMessage (sender, m) {
    if (sender === this.userId) {
      return
    }
    if (this.debug) {
      console.log(`receive ${sender} -> ${this.userId}: ${m.type}`, JSON.parse(JSON.stringify(m))) // eslint-disable-line
    }
    if (m.type === 'sync step 1') {
      // TODO: make transaction, stream the ops
      let conn = this
      this.y.db.requestTransaction(function *() {
        var currentStateSet = yield* this.getStateSet()
        yield* this.applyDeleteSet(m.deleteSet)

        var ds = yield* this.getDeleteSet()
        var ops = yield* this.getOperations(m.stateSet)
        conn.send(sender, {
          type: 'sync step 2',
          os: ops,
          stateSet: currentStateSet,
          deleteSet: ds
        })
        if (this.forwardToSyncingClients) {
          conn.syncingClients.push(sender)
          setTimeout(function () {
            conn.syncingClients = conn.syncingClients.filter(function (cli) {
              return cli !== sender
            })
            conn.send(sender, {
              type: 'sync done'
            })
          }, conn.syncingClientDuration)
        } else {
          conn.send(sender, {
            type: 'sync done'
          })
        }
        conn._setSyncedWith(sender)
      })
    } else if (m.type === 'sync step 2') {
      let conn = this
      var broadcastHB = !this.broadcastedHB
      this.broadcastedHB = true
      var db = this.y.db
      this.syncStep2 = new Promise(function (resolve) {
        db.requestTransaction(function * () {
          yield* this.applyDeleteSet(m.deleteSet)
          this.store.apply(m.os)
          db.requestTransaction(function * () {
            var ops = yield* this.getOperations(m.stateSet)
            if (ops.length > 0) {
              m = {
                type: 'update',
                ops: ops
              }
              if (!broadcastHB) { // TODO: consider to broadcast here..
                conn.send(sender, m)
              } else {
                // broadcast only once!
                conn.broadcast(m)
              }
            }
            resolve()
          })
        })
      })
    } else if (m.type === 'sync done') {
      var self = this
      this.syncStep2.then(function () {
        self._setSyncedWith(sender)
      })
    } else if (m.type === 'update') {
      if (this.forwardToSyncingClients) {
        for (var client of this.syncingClients) {
          this.send(client, m)
        }
      }
      this.y.db.apply(m.ops)
    }
  }
  _setSyncedWith (user) {
    var conn = this.connections[user]
    if (conn != null) {
      conn.isSynced = true
    }
    if (user === this.currentSyncTarget) {
      this.currentSyncTarget = null
      this.findNextSyncTarget()
    }
  }
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
  parseMessageFromXml (m) {
    function parseArray (node) {
      for (var n of node.children) {
        if (n.getAttribute('isArray') === 'true') {
          return parseArray(n)
        } else {
          return parseObject(n)
        }
      }
    }
    function parseObject (node) {
      var json = {}
      for (var attrName in node.attrs) {
        var value = node.attrs[attrName]
        var int = parseInt(value, 10)
        if (isNaN(int) || ('' + int) !== value) {
          json[attrName] = value
        } else {
          json[attrName] = int
        }
      }
      for (var n in node.children) {
        var name = n.name
        if (n.getAttribute('isArray') === 'true') {
          json[name] = parseArray(n)
        } else {
          json[name] = parseObject(n)
        }
      }
      return json
    }
    parseObject(m)
  }
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
  encodeMessageToXml (msg, obj) {
    // attributes is optional
    function encodeObject (m, json) {
      for (var name in json) {
        var value = json[name]
        if (name == null) {
          // nop
        } else if (value.constructor === Object) {
          encodeObject(m.c(name), value)
        } else if (value.constructor === Array) {
          encodeArray(m.c(name), value)
        } else {
          m.setAttribute(name, value)
        }
      }
    }
    function encodeArray (m, array) {
      m.setAttribute('isArray', 'true')
      for (var e of array) {
        if (e.constructor === Object) {
          encodeObject(m.c('array-element'), e)
        } else {
          encodeArray(m.c('array-element'), e)
        }
      }
    }
    if (obj.constructor === Object) {
      encodeObject(msg.c('y', { xmlns: 'http://y.ninja/connector-stanza' }), obj)
    } else if (obj.constructor === Array) {
      encodeArray(msg.c('y', { xmlns: 'http://y.ninja/connector-stanza' }), obj)
    } else {
      throw new Error("I can't encode this json!")
    }
  }
}
Y.AbstractConnector = AbstractConnector

},{}],2:[function(require,module,exports){
/* global getRandom, Y, wait, async */
'use strict'

var globalRoom = {
  users: {},
  buffers: {},
  removeUser: function (user) {
    for (var i in this.users) {
      this.users[i].userLeft(user)
    }
    delete this.users[user]
    delete this.buffers[user]
  },
  addUser: function (connector) {
    this.users[connector.userId] = connector
    this.buffers[connector.userId] = []
    for (var uname in this.users) {
      if (uname !== connector.userId) {
        var u = this.users[uname]
        u.userJoined(connector.userId, 'master')
        connector.userJoined(u.userId, 'master')
      }
    }
  }
}
Y.utils.globalRoom = globalRoom

function flushOne () {
  var bufs = []
  for (var i in globalRoom.buffers) {
    if (globalRoom.buffers[i].length > 0) {
      bufs.push(i)
    }
  }
  if (bufs.length > 0) {
    var userId = getRandom(bufs)
    var m = globalRoom.buffers[userId].shift()
    var user = globalRoom.users[userId]
    user.receiveMessage(m[0], m[1])
    return true
  } else {
    return false
  }
}

// setInterval(flushOne, 10)

var userIdCounter = 0

class Test extends Y.AbstractConnector {
  constructor (y, options) {
    if (options === undefined) {
      throw new Error('Options must not be undefined!')
    }
    options.role = 'master'
    options.forwardToSyncingClients = false
    super(y, options)
    this.setUserId((userIdCounter++) + '').then(() => {
      globalRoom.addUser(this)
    })
    this.globalRoom = globalRoom
    this.syncingClientDuration = 0
  }
  receiveMessage (sender, m) {
    super.receiveMessage(sender, JSON.parse(JSON.stringify(m)))
  }
  send (userId, message) {
    var buffer = globalRoom.buffers[userId]
    if (buffer != null) {
      buffer.push(JSON.parse(JSON.stringify([this.userId, message])))
    }
  }
  broadcast (message) {
    for (var key in globalRoom.buffers) {
      globalRoom.buffers[key].push(JSON.parse(JSON.stringify([this.userId, message])))
    }
  }
  isDisconnected () {
    return globalRoom.users[this.userId] == null
  }
  reconnect () {
    if (this.isDisconnected()) {
      globalRoom.addUser(this)
      super.reconnect()
    }
    return this.flushAll()
  }
  disconnect () {
    if (!this.isDisconnected()) {
      globalRoom.removeUser(this.userId)
      super.disconnect()
    }
    return wait()
  }
  flush () {
    var self = this
    return async(function * () {
      yield wait()
      while (globalRoom.buffers[self.userId].length > 0) {
        var m = globalRoom.buffers[self.userId].shift()
        this.receiveMessage(m[0], m[1])
        yield wait()
      }
    })
  }
  flushAll () {
    return new Promise(function (resolve) {
      // flushes may result in more created operations,
      // flush until there is nothing more to flush
      function nextFlush () {
        var c = flushOne()
        if (c) {
          while (flushOne()) {
            // nop
          }
          wait().then(nextFlush)
        } else {
          wait().then(function () {
            resolve()
          })
        }
      }
      // in the case that there are
      // still actions that want to be performed
      wait().then(nextFlush)
    })
  }
  /*
    Flushes an operation for some user..
  */
  flushOne () {
    flushOne()
  }
}

Y.Test = Test

},{}],3:[function(require,module,exports){
/* global Y */
'use strict'

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
class AbstractDatabase {
  constructor (y, opts) {
    this.y = y
    // E.g. this.listenersById[id] : Array<Listener>
    this.listenersById = {}
    // Execute the next time a transaction is requested
    this.listenersByIdExecuteNow = []
    // A transaction is requested
    this.listenersByIdRequestPending = false
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
    this.initializedTypes = {}
    this.whenUserIdSetListener = null
    this.waitingTransactions = []
    this.transactionInProgress = false
    if (typeof YConcurrency_TestingMode !== 'undefined') {
      this.executeOrder = []
    }
    this.gc1 = [] // first stage
    this.gc2 = [] // second stage -> after that, remove the op
    this.gcTimeout = opts.gcTimeout || 5000
    var os = this
    function garbageCollect () {
      return new Promise((resolve) => {
        os.requestTransaction(function * () {
          if (os.y.connector != null && os.y.connector.isSynced) {
            for (var i in os.gc2) {
              var oid = os.gc2[i]
              yield* this.garbageCollectOperation(oid)
            }
            os.gc2 = os.gc1
            os.gc1 = []
          }
          if (os.gcTimeout > 0) {
            os.gcInterval = setTimeout(garbageCollect, os.gcTimeout)
          }
          resolve()
        })
      })
    }
    this.garbageCollect = garbageCollect
    if (this.gcTimeout > 0) {
      garbageCollect()
    }
  }
  addToDebug () {
    if (typeof YConcurrency_TestingMode !== 'undefined') {
      var command = Array.prototype.map.call(arguments, function (s) {
        if (typeof s === 'string') {
          return s
        } else {
          return JSON.stringify(s)
        }
      }).join('').replace(/"/g, "'").replace(/,/g, ', ').replace(/:/g, ': ')
      this.executeOrder.push(command)
    }
  }
  getDebugData () {
    console.log(this.executeOrder.join('\n'))
  }
  stopGarbageCollector () {
    var self = this
    return new Promise(function (resolve) {
      self.requestTransaction(function * () {
        var ungc = self.gc1.concat(self.gc2)
        self.gc1 = []
        self.gc2 = []
        for (var i in ungc) {
          var op = yield* this.getOperation(ungc[i])
          delete op.gc
          yield* this.setOperation(op)
        }
        resolve()
      })
    })
  }
  /*
    Try to add to GC.

    TODO: rename this function

    Rulez:
    * Only gc if this user is online
    * The most left element in a list must not be gc'd.
      => There is at least one element in the list

    returns true iff op was added to GC
  */
  addToGarbageCollector (op, left) {
    if (
      op.gc == null &&
      op.deleted === true &&
      this.y.connector.isSynced &&
      left != null &&
      left.deleted === true
    ) {
      op.gc = true
      this.gc1.push(op.id)
      return true
    } else {
      return false
    }
  }
  removeFromGarbageCollector (op) {
    function filter (o) {
      return !Y.utils.compareIds(o, op.id)
    }
    this.gc1 = this.gc1.filter(filter)
    this.gc2 = this.gc2.filter(filter)
    delete op.gc
  }
  destroy () {
    clearInterval(this.gcInterval)
    this.gcInterval = null
  }
  setUserId (userId) {
    var self = this
    return new Promise(function (resolve) {
      self.requestTransaction(function * () {
        self.userId = userId
        self.opClock = (yield* this.getState(userId)).clock
        if (self.whenUserIdSetListener != null) {
          self.whenUserIdSetListener()
          self.whenUserIdSetListener = null
        }
        resolve()
      })
    })
  }
  whenUserIdSet (f) {
    if (this.userId != null) {
      f()
    } else {
      this.whenUserIdSetListener = f
    }
  }
  getNextOpId () {
    if (this.userId == null) {
      throw new Error('OperationStore not yet initialized!')
    }
    return [this.userId, this.opClock++]
  }
  /*
    Apply a list of operations.

    * get a transaction
    * check whether all Struct.*.requiredOps are in the OS
    * check if it is an expected op (otherwise wait for it)
    * check if was deleted, apply a delete operation after op was applied
  */
  apply (ops) {
    for (var key in ops) {
      var o = ops[key]
      var required = Y.Struct[o.struct].requiredOps(o)
      this.whenOperationsExist(required, o)
    }
  }
  /*
    op is executed as soon as every operation requested is available.
    Note that Transaction can (and should) buffer requests.
  */
  whenOperationsExist (ids, op) {
    if (ids.length > 0) {
      let listener = {
        op: op,
        missing: ids.length
      }

      for (let key in ids) {
        let id = ids[key]
        let sid = JSON.stringify(id)
        let l = this.listenersById[sid]
        if (l == null) {
          l = []
          this.listenersById[sid] = l
        }
        l.push(listener)
      }
    } else {
      this.listenersByIdExecuteNow.push({
        op: op
      })
    }

    if (this.listenersByIdRequestPending) {
      return
    }

    this.listenersByIdRequestPending = true
    var store = this

    this.requestTransaction(function * () {
      var exeNow = store.listenersByIdExecuteNow
      store.listenersByIdExecuteNow = []

      var ls = store.listenersById
      store.listenersById = {}

      store.listenersByIdRequestPending = false

      for (let key in exeNow) {
        let o = exeNow[key].op
        yield* store.tryExecute.call(this, o)
      }

      for (var sid in ls) {
        var l = ls[sid]
        var id = JSON.parse(sid)
        if ((yield* this.getOperation(id)) == null) {
          store.listenersById[sid] = l
        } else {
          for (let key in l) {
            let listener = l[key]
            let o = listener.op
            if (--listener.missing === 0) {
              yield* store.tryExecute.call(this, o)
            }
          }
        }
      }
    })
  }
  /*
    Actually execute an operation, when all expected operations are available.
  */
  * tryExecute (op) {
    this.store.addToDebug('yield* this.store.tryExecute.call(this, ', JSON.stringify(op), ')')
    if (op.struct === 'Delete') {
      yield* Y.Struct.Delete.execute.call(this, op)
      yield* this.store.operationAdded(this, op)
    } else if ((yield* this.getOperation(op.id)) == null && !(yield* this.isGarbageCollected(op.id))) {
      yield* Y.Struct[op.struct].execute.call(this, op)
      yield* this.addOperation(op)
      yield* this.store.operationAdded(this, op)
    }
  }
  // called by a transaction when an operation is added
  * operationAdded (transaction, op) {
    if (op.struct === 'Delete') {
      var target = yield* transaction.getOperation(op.target)
      if (target != null) {
        var type = transaction.store.initializedTypes[JSON.stringify(target.parent)]
        if (type != null) {
          yield* type._changed(transaction, {
            struct: 'Delete',
            target: op.target
          })
        }
      }
    } else {
      // increase SS
      var o = op
      var state = yield* transaction.getState(op.id[0])
      while (o != null && o.id[1] === state.clock && op.id[0] === o.id[0]) {
        // either its a new operation (1. case), or it is an operation that was deleted, but is not yet in the OS
        state.clock++
        yield* transaction.checkDeleteStoreForState(state)
        o = yield* transaction.os.findNext(o.id)
      }
      yield* transaction.setState(state)

      // notify whenOperation listeners (by id)
      var sid = JSON.stringify(op.id)
      var l = this.listenersById[sid]
      delete this.listenersById[sid]

      if (l != null) {
        for (var key in l) {
          var listener = l[key]
          if (--listener.missing === 0) {
            this.whenOperationsExist([], listener.op)
          }
        }
      }
      var t = this.initializedTypes[JSON.stringify(op.parent)]
      // notify parent, if it has been initialized as a custom type
      if (t != null) {
        yield* t._changed(transaction, Y.utils.copyObject(op))
      }

      // Delete if DS says this is actually deleted
      if (!op.deleted && (yield* transaction.isDeleted(op.id))) {
        var delop = {
          struct: 'Delete',
          target: op.id
        }
        yield* Y.Struct['Delete'].execute.call(transaction, delop)
        if (t != null) {
          yield* t._changed(transaction, delop)
        }
      }
    }
  }
  getNextRequest () {
    if (this.waitingTransactions.length === 0) {
      this.transactionInProgress = false
      return null
    } else {
      return this.waitingTransactions.shift()
    }
  }
  requestTransaction (makeGen, callImmediately) {
    if (callImmediately) {
      this.transact(makeGen)
    } else if (!this.transactionInProgress) {
      this.transactionInProgress = true
      var self = this
      setTimeout(function () {
        self.transact(makeGen)
      }, 0)
    } else {
      this.waitingTransactions.push(makeGen)
    }
  }
}
Y.AbstractDatabase = AbstractDatabase

},{}],4:[function(require,module,exports){
/* global Y */

'use strict'

Y.IndexedDB = (function () {
  class Store {
    constructor (transaction, name) {
      this.store = transaction.objectStore(name)
    }
    * find (id) {
      return yield this.store.get(id)
    }
    * put (v) {
      yield this.store.put(v)
    }
    * delete (id) {
      yield this.store.delete(id)
    }
    * findWithLowerBound (start) {
      return yield this.store.openCursor(window.IDBKeyRange.lowerBound(start))
    }
    * findWithUpperBound (end) {
      return yield this.store.openCursor(window.IDBKeyRange.upperBound(end), 'prev')
    }
    * findNext (id) {
      return yield* this.findWithLowerBound([id[0], id[1] + 1])
    }
    * findPrev (id) {
      return yield* this.findWithUpperBound([id[0], id[1] - 1])
    }
    * iterate (t, start, end, gen) {
      var range = null
      if (start != null && end != null) {
        range = window.IDBKeyRange.bound(start, end)
      } else if (start != null) {
        range = window.IDBKeyRange.lowerBound(start)
      } else if (end != null) {
        range = window.IDBKeyRange.upperBound(end)
      }
      var cursorResult = this.store.openCursor(range)
      while ((yield cursorResult) != null) {
        yield* gen.call(t, cursorResult.result.value)
        cursorResult.result.continue()
      }
    }

  }
  class Transaction extends Y.Transaction {
    constructor (store) {
      super(store)
      var transaction = store.db.transaction(['OperationStore', 'StateStore', 'DeleteStore'], 'readwrite')
      this.store = store
      this.ss = new Store(transaction, 'StateStore')
      this.os = new Store(transaction, 'OperationStore')
      this.ds = new Store(transaction, 'DeleteStore')
    }
  }
  class OperationStore extends Y.AbstractDatabase {
    constructor (y, opts) {
      super(y, opts)
      if (opts == null) {
        opts = {}
      }
      if (opts.namespace == null || typeof opts.namespace !== 'string') {
        throw new Error('IndexedDB: expect a string (opts.namespace)!')
      } else {
        this.namespace = opts.namespace
      }
      if (opts.idbVersion != null) {
        this.idbVersion = opts.idbVersion
      } else {
        this.idbVersion = 5
      }
      var store = this
      // initialize database!
      this.requestTransaction(function * () {
        store.db = yield window.indexedDB.open(opts.namespace, store.idbVersion)
      })
      if (opts.cleanStart) {
        this.requestTransaction(function * () {
          yield this.os.store.clear()
          yield this.ds.store.clear()
          yield this.ss.store.clear()
        })
      }
      var operationsToAdd = []
      window.addEventListener('storage', function (event) {
        if (event.key === '__YJS__' + store.namespace) {
          operationsToAdd.push(event.newValue)
          if (operationsToAdd.length === 1) {
            store.requestTransaction(function * () {
              var add = operationsToAdd
              operationsToAdd = []
              for (var i in add) {
                // don't call the localStorage event twice..
                var op = JSON.parse(add[i])
                if (op.struct !== 'Delete') {
                  op = yield* this.getOperation(op.id)
                }
                yield* this.store.operationAdded(this, op, true)
              }
            })
          }
        }
      }, false)
    }
    * operationAdded (transaction, op, noAdd) {
      yield* super.operationAdded(transaction, op)
      if (!noAdd) {
        window.localStorage['__YJS__' + this.namespace] = JSON.stringify(op)
      }
    }
    transact (makeGen) {
      var transaction = this.db != null ? new Transaction(this) : null
      var store = this

      var gen = makeGen.call(transaction)
      handleTransactions(gen.next())

      function handleTransactions (result) {
        var request = result.value
        if (result.done) {
          makeGen = store.getNextRequest()
          if (makeGen != null) {
            if (transaction == null && store.db != null) {
              transaction = new Transaction(store)
            }
            gen = makeGen.call(transaction)
            handleTransactions(gen.next())
          } // else no transaction in progress!
          return
        }
        if (request.constructor === window.IDBRequest) {
          request.onsuccess = function () {
            var res = request.result
            if (res != null && res.constructor === window.IDBCursorWithValue) {
              res = res.value
            }
            handleTransactions(gen.next(res))
          }
          request.onerror = function (err) {
            gen.throw(err)
          }
        } else if (request.constructor === window.IDBCursor) {
          request.onsuccess = function () {
            handleTransactions(gen.next(request.result != null ? request.result.value : null))
          }
          request.onerror = function (err) {
            gen.throw(err)
          }
        } else if (request.constructor === window.IDBOpenDBRequest) {
          request.onsuccess = function (event) {
            var db = event.target.result
            handleTransactions(gen.next(db))
          }
          request.onerror = function () {
            gen.throw("Couldn't open IndexedDB database!")
          }
          request.onupgradeneeded = function (event) {
            var db = event.target.result
            try {
              db.createObjectStore('OperationStore', {keyPath: 'id'})
              db.createObjectStore('DeleteStore', {keyPath: 'id'})
              db.createObjectStore('StateStore', {keyPath: 'id'})
            } catch (e) {
              console.log('Store already exists!')
            }
          }
        } else {
          gen.throw('You must not yield this type!')
        }
      }
    }
    // TODO: implement "free"..
    * destroy () {
      this.db.close()
      yield window.indexedDB.deleteDatabase(this.namespace)
    }
  }
  return OperationStore
})()

},{}],5:[function(require,module,exports){
/* global Y */
'use strict'

Y.Memory = (function () {
  class Transaction extends Y.Transaction {
    constructor (store) {
      super(store)
      this.store = store
      this.ss = store.ss
      this.os = store.os
      this.ds = store.ds
    }
  }
  class Database extends Y.AbstractDatabase {
    constructor (y, opts) {
      super(y, opts)
      this.os = new Y.utils.RBTree()
      this.ds = new Y.utils.RBTree()
      this.ss = new Y.utils.RBTree()
    }
    logTable () {
      var self = this
      self.requestTransaction(function * () {
        console.log('User: ', this.store.y.connector.userId, "==============================") // eslint-disable-line
        console.log("State Set (SS):", yield* this.getStateSet()) // eslint-disable-line
        console.log("Operation Store (OS):") // eslint-disable-line
        yield* this.os.logTable() // eslint-disable-line
        console.log("Deletion Store (DS):") //eslint-disable-line
        yield* this.ds.logTable() // eslint-disable-line
        if (this.store.gc1.length > 0 || this.store.gc2.length > 0) {
          console.warn('GC1|2 not empty!', this.store.gc1, this.store.gc2)
        }
        if (JSON.stringify(this.store.listenersById) !== '{}') {
          console.warn('listenersById not empty!')
        }
        if (JSON.stringify(this.store.listenersByIdExecuteNow) !== '[]') {
          console.warn('listenersByIdExecuteNow not empty!')
        }
        if (this.store.transactionInProgress) {
          console.warn('Transaction still in progress!')
        }
      }, true)
    }
    transact (makeGen) {
      var t = new Transaction(this)
      while (makeGen !== null) {
        var gen = makeGen.call(t)
        var res = gen.next()
        while (!res.done) {
          res = gen.next(res.value)
        }
        makeGen = this.getNextRequest()
      }
    }
    * destroy () {
      super.destroy()
      delete this.os
      delete this.ss
      delete this.ds
    }
  }
  return Database
})()

},{}],6:[function(require,module,exports){
/* global Y */
'use strict'

/*
  This file contains a not so fancy implemantion of a Red Black Tree.
*/

class N {
  // A created node is always red!
  constructor (val) {
    this.val = val
    this.color = true
    this._left = null
    this._right = null
    this._parent = null
    if (val.id === null) {
      throw new Error('You must define id!')
    }
  }
  isRed () { return this.color }
  isBlack () { return !this.color }
  redden () { this.color = true; return this }
  blacken () { this.color = false; return this }
  get grandparent () {
    return this.parent.parent
  }
  get parent () {
    return this._parent
  }
  get sibling () {
    return (this === this.parent.left)
      ? this.parent.right : this.parent.left
  }
  get left () {
    return this._left
  }
  get right () {
    return this._right
  }
  set left (n) {
    if (n !== null) {
      n._parent = this
    }
    this._left = n
  }
  set right (n) {
    if (n !== null) {
      n._parent = this
    }
    this._right = n
  }
  rotateLeft (tree) {
    var parent = this.parent
    var newParent = this.right
    var newRight = this.right.left
    newParent.left = this
    this.right = newRight
    if (parent === null) {
      tree.root = newParent
      newParent._parent = null
    } else if (parent.left === this) {
      parent.left = newParent
    } else if (parent.right === this) {
      parent.right = newParent
    } else {
      throw new Error('The elements are wrongly connected!')
    }
  }
  next () {
    if (this.right !== null) {
      // search the most left node in the right tree
      var o = this.right
      while (o.left !== null) {
        o = o.left
      }
      return o
    } else {
      var p = this
      while (p.parent !== null && p !== p.parent.left) {
        p = p.parent
      }
      return p.parent
    }
  }
  prev () {
    if (this.left !== null) {
      // search the most right node in the left tree
      var o = this.left
      while (o.right !== null) {
        o = o.right
      }
      return o
    } else {
      var p = this
      while (p.parent !== null && p !== p.parent.right) {
        p = p.parent
      }
      return p.parent
    }
  }
  rotateRight (tree) {
    var parent = this.parent
    var newParent = this.left
    var newLeft = this.left.right
    newParent.right = this
    this.left = newLeft
    if (parent === null) {
      tree.root = newParent
      newParent._parent = null
    } else if (parent.left === this) {
      parent.left = newParent
    } else if (parent.right === this) {
      parent.right = newParent
    } else {
      throw new Error('The elements are wrongly connected!')
    }
  }
  getUncle () {
    // we can assume that grandparent exists when this is called!
    if (this.parent === this.parent.parent.left) {
      return this.parent.parent.right
    } else {
      return this.parent.parent.left
    }
  }
}

class RBTree {
  constructor () {
    this.root = null
    this.length = 0
  }
  * findNext (id) {
    return yield* this.findWithLowerBound([id[0], id[1] + 1])
  }
  * findPrev (id) {
    return yield* this.findWithUpperBound([id[0], id[1] - 1])
  }
  findNodeWithLowerBound (from) {
    if (from === void 0) {
      throw new Error('You must define from!')
    }
    var o = this.root
    if (o === null) {
      return null
    } else {
      while (true) {
        if ((from === null || Y.utils.smaller(from, o.val.id)) && o.left !== null) {
          // o is included in the bound
          // try to find an element that is closer to the bound
          o = o.left
        } else if (from !== null && Y.utils.smaller(o.val.id, from)) {
          // o is not within the bound, maybe one of the right elements is..
          if (o.right !== null) {
            o = o.right
          } else {
            // there is no right element. Search for the next bigger element,
            // this should be within the bounds
            return o.next()
          }
        } else {
          return o
        }
      }
    }
  }
  findNodeWithUpperBound (to) {
    if (to === void 0) {
      throw new Error('You must define from!')
    }
    var o = this.root
    if (o === null) {
      return null
    } else {
      while (true) {
        if ((to === null || Y.utils.smaller(o.val.id, to)) && o.right !== null) {
          // o is included in the bound
          // try to find an element that is closer to the bound
          o = o.right
        } else if (to !== null && Y.utils.smaller(to, o.val.id)) {
          // o is not within the bound, maybe one of the left elements is..
          if (o.left !== null) {
            o = o.left
          } else {
            // there is no left element. Search for the prev smaller element,
            // this should be within the bounds
            return o.prev()
          }
        } else {
          return o
        }
      }
    }
  }
  * findWithLowerBound (from) {
    var n = this.findNodeWithLowerBound(from)
    return n == null ? null : n.val
  }
  * findWithUpperBound (to) {
    var n = this.findNodeWithUpperBound(to)
    return n == null ? null : n.val
  }
  * iterate (t, from, to, f) {
    var o = this.findNodeWithLowerBound(from)
    while (o !== null && (to === null || Y.utils.smaller(o.val.id, to) || Y.utils.compareIds(o.val.id, to))) {
      yield* f.call(t, o.val)
      o = o.next()
    }
    return true
  }
  * logTable (from, to, filter) {
    if (filter == null) {
      filter = function () {
        return true
      }
    }
    if (from == null) { from = null }
    if (to == null) { to = null }
    var os = []
    yield* this.iterate(this, from, to, function * (o) {
      if (filter(o)) {
        var o_ = {}
        for (var key in o) {
          if (typeof o[key] === 'object') {
            o_[key] = JSON.stringify(o[key])
          } else {
            o_[key] = o[key]
          }
        }
        os.push(o_)
      }
    })
    if (console.table != null) {
      console.table(os)
    }
  }
  * find (id) {
    var n
    return (n = this.findNode(id)) ? n.val : null
  }
  findNode (id) {
    if (id == null || id.constructor !== Array) {
      throw new Error('Expect id to be an array!')
    }
    var o = this.root
    if (o === null) {
      return false
    } else {
      while (true) {
        if (o === null) {
          return false
        }
        if (Y.utils.smaller(id, o.val.id)) {
          o = o.left
        } else if (Y.utils.smaller(o.val.id, id)) {
          o = o.right
        } else {
          return o
        }
      }
    }
  }
  * delete (id) {
    if (id == null || id.constructor !== Array) {
      throw new Error('id is expected to be an Array!')
    }
    var d = this.findNode(id)
    if (d == null) {
      throw new Error('Element does not exist!')
    }
    this.length--
    if (d.left !== null && d.right !== null) {
      // switch d with the greates element in the left subtree.
      // o should have at most one child.
      var o = d.left
      // find
      while (o.right !== null) {
        o = o.right
      }
      // switch
      d.val = o.val
      d = o
    }
    // d has at most one child
    // let n be the node that replaces d
    var isFakeChild
    var child = d.left || d.right
    if (child === null) {
      isFakeChild = true
      child = new N({id: 0})
      child.blacken()
      d.right = child
    } else {
      isFakeChild = false
    }

    if (d.parent === null) {
      if (!isFakeChild) {
        this.root = child
        child.blacken()
        child._parent = null
      } else {
        this.root = null
      }
      return
    } else if (d.parent.left === d) {
      d.parent.left = child
    } else if (d.parent.right === d) {
      d.parent.right = child
    } else {
      throw new Error('Impossible!')
    }
    if (d.isBlack()) {
      if (child.isRed()) {
        child.blacken()
      } else {
        this._fixDelete(child)
      }
    }
    this.root.blacken()
    if (isFakeChild) {
      if (child.parent.left === child) {
        child.parent.left = null
      } else if (child.parent.right === child) {
        child.parent.right = null
      } else {
        throw new Error('Impossible #3')
      }
    }
  }
  _fixDelete (n) {
    function isBlack (node) {
      return node !== null ? node.isBlack() : true
    }
    function isRed (node) {
      return node !== null ? node.isRed() : false
    }
    if (n.parent === null) {
      // this can only be called after the first iteration of fixDelete.
      return
    }
    // d was already replaced by the child
    // d is not the root
    // d and child are black
    var sibling = n.sibling
    if (isRed(sibling)) {
      // make sibling the grandfather
      n.parent.redden()
      sibling.blacken()
      if (n === n.parent.left) {
        n.parent.rotateLeft(this)
      } else if (n === n.parent.right) {
        n.parent.rotateRight(this)
      } else {
        throw new Error('Impossible #2')
      }
      sibling = n.sibling
    }
    // parent, sibling, and children of n are black
    if (n.parent.isBlack() &&
      sibling.isBlack() &&
      isBlack(sibling.left) &&
      isBlack(sibling.right)
    ) {
      sibling.redden()
      this._fixDelete(n.parent)
    } else if (n.parent.isRed() &&
      sibling.isBlack() &&
      isBlack(sibling.left) &&
      isBlack(sibling.right)
    ) {
      sibling.redden()
      n.parent.blacken()
    } else {
      if (n === n.parent.left &&
        sibling.isBlack() &&
        isRed(sibling.left) &&
        isBlack(sibling.right)
      ) {
        sibling.redden()
        sibling.left.blacken()
        sibling.rotateRight(this)
        sibling = n.sibling
      } else if (n === n.parent.right &&
        sibling.isBlack() &&
        isRed(sibling.right) &&
        isBlack(sibling.left)
      ) {
        sibling.redden()
        sibling.right.blacken()
        sibling.rotateLeft(this)
        sibling = n.sibling
      }
      sibling.color = n.parent.color
      n.parent.blacken()
      if (n === n.parent.left) {
        sibling.right.blacken()
        n.parent.rotateLeft(this)
      } else {
        sibling.left.blacken()
        n.parent.rotateRight(this)
      }
    }
  }
  * put (v) {
    if (v == null || v.id == null || v.id.constructor !== Array) {
      throw new Error('v is expected to have an id property which is an Array!')
    }
    var node = new N(v)
    if (this.root !== null) {
      var p = this.root // p abbrev. parent
      while (true) {
        if (Y.utils.smaller(node.val.id, p.val.id)) {
          if (p.left === null) {
            p.left = node
            break
          } else {
            p = p.left
          }
        } else if (Y.utils.smaller(p.val.id, node.val.id)) {
          if (p.right === null) {
            p.right = node
            break
          } else {
            p = p.right
          }
        } else {
          p.val = node.val
          return p
        }
      }
      this._fixInsert(node)
    } else {
      this.root = node
    }
    this.length++
    this.root.blacken()
    return node
  }
  _fixInsert (n) {
    if (n.parent === null) {
      n.blacken()
      return
    } else if (n.parent.isBlack()) {
      return
    }
    var uncle = n.getUncle()
    if (uncle !== null && uncle.isRed()) {
      // Note: parent: red, uncle: red
      n.parent.blacken()
      uncle.blacken()
      n.grandparent.redden()
      this._fixInsert(n.grandparent)
    } else {
      // Note: parent: red, uncle: black or null
      // Now we transform the tree in such a way that
      // either of these holds:
      //   1) grandparent.left.isRed
      //     and grandparent.left.left.isRed
      //   2) grandparent.right.isRed
      //     and grandparent.right.right.isRed
      if (n === n.parent.right && n.parent === n.grandparent.left) {
        n.parent.rotateLeft(this)
        // Since we rotated and want to use the previous
        // cases, we need to set n in such a way that
        // n.parent.isRed again
        n = n.left
      } else if (n === n.parent.left && n.parent === n.grandparent.right) {
        n.parent.rotateRight(this)
        // see above
        n = n.right
      }
      // Case 1) or 2) hold from here on.
      // Now traverse grandparent, make parent a black node
      // on the highest level which holds two red nodes.
      n.parent.blacken()
      n.grandparent.redden()
      if (n === n.parent.left) {
        // Case 1
        n.grandparent.rotateRight(this)
      } else {
        // Case 2
        n.grandparent.rotateLeft(this)
      }
    }
  }
}

Y.utils.RBTree = RBTree

},{}],7:[function(require,module,exports){
/* global Y */
'use strict'

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

var Struct = {
  /* This is the only operation that is actually not a structure, because
  it is not stored in the OS. This is why it _does not_ have an id

  op = {
    target: Id
  }
  */
  Delete: {
    encode: function (op) {
      return op
    },
    requiredOps: function (op) {
      return [] // [op.target]
    },
    execute: function * (op) {
      return yield* this.deleteOperation(op.target)
    }
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
    encode: function (op) {
      // TODO: you could not send the "left" property, then you also have to
      // "op.left = null" in $execute or $decode
      var e = {
        id: op.id,
        left: op.left,
        right: op.right,
        origin: op.origin,
        parent: op.parent,
        struct: op.struct
      }
      if (op.parentSub != null) {
        e.parentSub = op.parentSub
      }
      if (op.opContent != null) {
        e.opContent = op.opContent
      } else {
        e.content = op.content
      }

      return e
    },
    requiredOps: function (op) {
      var ids = []
      if (op.left != null) {
        ids.push(op.left)
      }
      if (op.right != null) {
        ids.push(op.right)
      }
      if (op.origin != null && !Y.utils.compareIds(op.left, op.origin)) {
        ids.push(op.origin)
      }
      // if (op.right == null && op.left == null) {
      ids.push(op.parent)

      if (op.opContent != null) {
        ids.push(op.opContent)
      }
      return ids
    },
    getDistanceToOrigin: function * (op) {
      if (op.left == null) {
        return 0
      } else {
        var d = 0
        var o = yield* this.getOperation(op.left)
        while (!Y.utils.compareIds(op.origin, (o ? o.id : null))) {
          d++
          if (o.left == null) {
            break
          } else {
            o = yield* this.getOperation(o.left)
          }
        }
        return d
      }
    },
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
    execute: function *(op) {
      var i // loop counter
      var distanceToOrigin = i = yield* Struct.Insert.getDistanceToOrigin.call(this, op) // most cases: 0 (starts from 0)
      var o
      var parent
      var start

      // find o. o is the first conflicting operation
      if (op.left != null) {
        o = yield* this.getOperation(op.left)
        o = (o.right == null) ? null : yield* this.getOperation(o.right)
      } else { // left == null
        parent = yield* this.getOperation(op.parent)
        let startId = op.parentSub ? parent.map[op.parentSub] : parent.start
        start = startId == null ? null : yield* this.getOperation(startId)
        o = start
      }

      // handle conflicts
      while (true) {
        if (o != null && !Y.utils.compareIds(o.id, op.right)) {
          var oOriginDistance = yield* Struct.Insert.getDistanceToOrigin.call(this, o)
          if (oOriginDistance === i) {
            // case 1
            if (o.id[0] < op.id[0]) {
              op.left = o.id
              distanceToOrigin = i + 1
            }
          } else if (oOriginDistance < i) {
            // case 2
            if (i - distanceToOrigin <= oOriginDistance) {
              op.left = o.id
              distanceToOrigin = i + 1
            }
          } else {
            break
          }
          i++
          o = o.right ? yield* this.getOperation(o.right) : null
        } else {
          break
        }
      }

      // reconnect..
      var left = null
      var right = null
      parent = parent || (yield* this.getOperation(op.parent))

      // reconnect left and set right of op
      if (op.left != null) {
        left = yield* this.getOperation(op.left)
        op.right = left.right
        left.right = op.id

        yield* this.setOperation(left)
      } else {
        op.right = op.parentSub ? parent.map[op.parentSub] || null : parent.start
      }
      // reconnect right
      if (op.right != null) {
        right = yield* this.getOperation(op.right)
        right.left = op.id

        // if right exists, and it is supposed to be gc'd. Remove it from the gc
        if (right.gc != null) {
          this.store.removeFromGarbageCollector(right)
        }
        yield* this.setOperation(right)
      }

      // update parents .map/start/end properties
      if (op.parentSub != null) {
        if (left == null) {
          parent.map[op.parentSub] = op.id
          yield* this.setOperation(parent)
        }
        // is a child of a map struct.
        // Then also make sure that only the most left element is not deleted
        if (op.right != null) {
          yield* this.deleteOperation(op.right, true)
        }
        if (op.left != null) {
          yield* this.deleteOperation(op.id, true)
        }
      } else {
        if (right == null || left == null) {
          if (right == null) {
            parent.end = op.id
          }
          if (left == null) {
            parent.start = op.id
          }
          yield* this.setOperation(parent)
        }
      }
    }
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
    encode: function (op) {
      return {
        struct: 'List',
        id: op.id,
        type: op.type
      }
    },
    requiredOps: function () {
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
      return []
    },
    execute: function * (op) {
      op.start = null
      op.end = null
    },
    ref: function * (op, pos) {
      if (op.start == null) {
        return null
      }
      var res = null
      var o = yield* this.getOperation(op.start)

      while (true) {
        if (!o.deleted) {
          res = o
          pos--
        }
        if (pos >= 0 && o.right != null) {
          o = (yield* this.getOperation(o.right))
        } else {
          break
        }
      }
      return res
    },
    map: function * (o, f) {
      o = o.start
      var res = []
      while (o != null) { // TODO: change to != (at least some convention)
        var operation = yield* this.getOperation(o)
        if (!operation.deleted) {
          res.push(f(operation))
        }
        o = operation.right
      }
      return res
    }
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
    encode: function (op) {
      return {
        struct: 'Map',
        type: op.type,
        id: op.id,
        map: {} // overwrite map!!
      }
    },
    requiredOps: function () {
      return []
    },
    execute: function * () {},
    /*
      Get a property by name
    */
    get: function * (op, name) {
      var oid = op.map[name]
      if (oid != null) {
        var res = yield* this.getOperation(oid)
        return (res == null || res.deleted) ? void 0 : (res.opContent == null
          ? res.content : yield* this.getType(res.opContent))
      }
    },
    /*
      Delete a property by name
    */
    delete: function * (op, name) {
      var v = op.map[name] || null
      if (v != null) {
        yield* Struct.Delete.create.call(this, {
          target: v
        })
      }
    }
  }
}
Y.Struct = Struct

},{}],8:[function(require,module,exports){
/* global Y */
'use strict'

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
class Transaction {
  /*
    Get a type based on the id of its model.
    If it does not exist yes, create it.
    TODO: delete type from store.initializedTypes[id] when corresponding id was deleted!
  */
  * getType (id) {
    var sid = JSON.stringify(id)
    var t = this.store.initializedTypes[sid]
    if (t == null) {
      var op = yield* this.getOperation(id)
      if (op != null) {
        t = yield* Y[op.type].initType.call(this, this.store, op)
        this.store.initializedTypes[sid] = t
      }
    }
    return t
  }
  /*
    Apply operations that this user created (no remote ones!)
      * does not check for Struct.*.requiredOps()
      * also broadcasts it through the connector
  */
  * applyCreatedOperations (ops) {
    var send = []
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i]
      yield* this.store.tryExecute.call(this, op)
      send.push(Y.Struct[op.struct].encode(op))
    }
    if (!this.store.y.connector.isDisconnected()) {
      this.store.y.connector.broadcast({
        type: 'update',
        ops: send
      })
    }
  }

  * deleteList (start) {
    if (this.store.y.connector.isSynced) {
      while (start != null && this.store.y.connector.isSynced) {
        start = (yield* this.getOperation(start))
        start.gc = true
        yield* this.setOperation(start)
        // TODO: will always reset the parent..
        this.store.gc1.push(start.id)
        start = start.right
      }
    } else {
      // TODO: when not possible??? do later in (gcWhenSynced)
    }
  }

  /*
    Mark an operation as deleted, and add it to the GC, if possible.
  */
  * deleteOperation (targetId, preventCallType) {
    var target = yield* this.getOperation(targetId)
    var callType = false

    if (target == null || !target.deleted) {
      yield* this.markDeleted(targetId)
    }

    if (target != null && target.gc == null) {
      if (!target.deleted) {
        callType = true
        // set deleted & notify type
        target.deleted = true
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
        if (target.start != null) {
          // TODO: don't do it like this .. -.-
          yield* this.deleteList(target.start)
          yield* this.deleteList(target.id)
        }
        if (target.map != null) {
          for (var name in target.map) {
            yield* this.deleteList(target.map[name])
          }
          // TODO: here to..  (see above)
          yield* this.deleteList(target.id)
        }
        if (target.opContent != null) {
          yield* this.deleteOperation(target.opContent)
          target.opContent = null
        }
      }
      var left = target.left != null ? yield* this.getOperation(target.left) : null

      this.store.addToGarbageCollector(target, left)

      // set here because it was deleted and/or gc'd
      yield* this.setOperation(target)

      /*
        Check if it is possible to add right to the gc.
        Because this delete can't be responsible for left being gc'd,
        we don't have to add left to the gc..
      */
      var right = target.right != null ? yield* this.getOperation(target.right) : null
      if (
        right != null &&
        this.store.addToGarbageCollector(right, target)
      ) {
        yield* this.setOperation(right)
      }
      return callType
    }
  }
  /*
    Mark an operation as deleted&gc'd
  */
  * markGarbageCollected (id) {
    // this.mem.push(["gc", id]);
    var n = yield* this.markDeleted(id)
    if (!n.gc) {
      if (n.id[1] < id[1]) {
        // un-extend left
        var newlen = n.len - (id[1] - n.id[1])
        n.len -= newlen
        yield* this.ds.put(n)
        n = {id: id, len: newlen, gc: false}
        yield* this.ds.put(n)
      }
      // get prev&next before adding a new operation
      var prev = yield* this.ds.findPrev(id)
      var next = yield* this.ds.findNext(id)

      if (id[1] < n.id[1] + n.len - 1) {
        // un-extend right
        yield* this.ds.put({id: [id[0], id[1] + 1], len: n.len - 1, gc: false})
        n.len = 1
      }
      // set gc'd
      n.gc = true
      // can extend left?
      if (
        prev != null &&
        prev.gc &&
        Y.utils.compareIds([prev.id[0], prev.id[1] + prev.len], n.id)
      ) {
        prev.len += n.len
        yield* this.ds.delete(n.id)
        n = prev
        // ds.put n here?
      }
      // can extend right?
      if (
        next != null &&
        next.gc &&
        Y.utils.compareIds([n.id[0], n.id[1] + n.len], next.id)
      ) {
        n.len += next.len
        yield* this.ds.delete(next.id)
      }
      yield* this.ds.put(n)
    }
  }
  /*
    Mark an operation as deleted.

    returns the delete node
  */
  * markDeleted (id) {
    // this.mem.push(["del", id]);
    var n = yield* this.ds.findWithUpperBound(id)
    if (n != null && n.id[0] === id[0]) {
      if (n.id[1] <= id[1] && id[1] < n.id[1] + n.len) {
        // already deleted
        return n
      } else if (n.id[1] + n.len === id[1] && !n.gc) {
        // can extend existing deletion
        n.len++
      } else {
        // cannot extend left
        n = {id: id, len: 1, gc: false}
        yield* this.ds.put(n)
      }
    } else {
      // cannot extend left
      n = {id: id, len: 1, gc: false}
      yield* this.ds.put(n)
    }
    // can extend right?
    var next = yield* this.ds.findNext(n.id)
    if (
      next != null &&
      Y.utils.compareIds([n.id[0], n.id[1] + n.len], next.id) &&
      !next.gc
    ) {
      n.len = n.len + next.len
      yield* this.ds.delete(next.id)
    }
    yield* this.ds.put(n)
    return n
  }
  /*
    Call this method when the client is connected&synced with the
    other clients (e.g. master). This will query the database for
    operations that can be gc'd and add them to the garbage collector.
  */
  * garbageCollectAfterSync () {
    yield* this.os.iterate(this, null, null, function * (op) {
      if (op.deleted && op.left != null) {
        var left = yield* this.getOperation(op.left)
        this.store.addToGarbageCollector(op, left)
      }
    })
  }
  /*
    Really remove an op and all its effects.
    The complicated case here is the Insert operation:
    * reset left
    * reset right
    * reset parent.start
    * reset parent.end
    * reset origins of all right ops
  */
  * garbageCollectOperation (id) {
    this.store.addToDebug('yield* this.garbageCollectOperation(', id, ')')
    // check to increase the state of the respective user
    var state = yield* this.getState(id[0])
    if (state.clock === id[1]) {
      state.clock++
      // also check if more expected operations were gc'd
      yield* this.checkDeleteStoreForState(state)
      // then set the state
      yield* this.setState(state)
    }
    yield* this.markGarbageCollected(id)

    // if op exists, then clean that mess up..
    var o = yield* this.getOperation(id)
    if (o != null) {
      /*
      if (!o.deleted) {
        yield* this.deleteOperation(id)
        o = yield* this.getOperation(id)
      }
      */

      // remove gc'd op from the left op, if it exists
      if (o.left != null) {
        var left = yield* this.getOperation(o.left)
        left.right = o.right
        yield* this.setOperation(left)
      }
      // remove gc'd op from the right op, if it exists
      // also reset origins of right ops
      if (o.right != null) {
        var right = yield* this.getOperation(o.right)
        right.left = o.left
        if (Y.utils.compareIds(right.origin, o.id)) { // rights origin is o
          // find new origin of right ops
          // origin is the first left deleted operation
          var neworigin = o.left
          while (neworigin != null) {
            var neworigin_ = yield* this.getOperation(neworigin)
            if (neworigin_.deleted) {
              break
            }
            neworigin = neworigin_.left
          }

          // reset origin of right
          right.origin = neworigin

          // reset origin of all right ops (except first right - duh!),
          // until you find origin pointer to the left of o
          var i = right.right == null ? null : yield* this.getOperation(right.right)
          var ids = [o.id, o.right]
          while (i != null && ids.some(function (id) {
            return Y.utils.compareIds(id, i.origin)
          })) {
            if (Y.utils.compareIds(i.origin, o.id)) {
              // reset origin of i
              i.origin = neworigin
              yield* this.setOperation(i)
            }
            // get next i
            i = i.right == null ? null : yield* this.getOperation(i.right)
          }
        } /* otherwise, rights origin is to the left of o,
             then there is no right op (from o), that origins in o */
        yield* this.setOperation(right)
      }

      if (o.parent != null) {
        // remove gc'd op from parent, if it exists
        var parent = yield* this.getOperation(o.parent)
        var setParent = false // whether to save parent to the os
        if (o.parentSub != null) {
          if (Y.utils.compareIds(parent.map[o.parentSub], o.id)) {
            setParent = true
            parent.map[o.parentSub] = o.right
          }
        } else {
          if (Y.utils.compareIds(parent.start, o.id)) {
            // gc'd op is the start
            setParent = true
            parent.start = o.right
          }
          if (Y.utils.compareIds(parent.end, o.id)) {
            // gc'd op is the end
            setParent = true
            parent.end = o.left
          }
        }
        if (setParent) {
          yield* this.setOperation(parent)
        }
      }
      // finally remove it from the os
      yield* this.removeOperation(o.id)
    }
  }
  * checkDeleteStoreForState (state) {
    var n = yield* this.ds.findWithUpperBound([state.user, state.clock])
    if (n != null && n.id[0] === state.user && n.gc) {
      state.clock = Math.max(state.clock, n.id[1] + n.len)
    }
  }
  /*
    apply a delete set in order to get
    the state of the supplied ds
  */
  * applyDeleteSet (ds) {
    var deletions = []
    function createDeletions (user, start, len, gc) {
      for (var c = start; c < start + len; c++) {
        deletions.push([user, c, gc])
      }
    }

    for (var user in ds) {
      var dv = ds[user]
      var pos = 0
      var d = dv[pos]
      yield* this.ds.iterate(this, [user, 0], [user, Number.MAX_VALUE], function * (n) {
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
        while (d != null) {
          var diff = 0 // describe the diff of length in 1) and 2)
          if (n.id[1] + n.len <= d[0]) {
            // 1)
            break
          } else if (d[0] < n.id[1]) {
            // 2)
            // delete maximum the len of d
            // else delete as much as possible
            diff = Math.min(n.id[1] - d[0], d[1])
            createDeletions(user, d[0], diff, d[2])
          } else {
            // 3)
            diff = n.id[1] + n.len - d[0] // never null (see 1)
            if (d[2] && !n.gc) {
              // d marks as gc'd but n does not
              // then delete either way
              createDeletions(user, d[0], Math.min(diff, d[1]), d[2])
            }
          }
          if (d[1] <= diff) {
            // d doesn't delete anything anymore
            d = dv[++pos]
          } else {
            d[0] = d[0] + diff // reset pos
            d[1] = d[1] - diff // reset length
          }
        }
      })
      // for the rest.. just apply it
      for (; pos < dv.length; pos++) {
        d = dv[pos]
        createDeletions(user, d[0], d[1], d[2])
      }
    }
    for (var i in deletions) {
      var del = deletions[i]
      var id = [del[0], del[1]]
      // always try to delete..
      var addOperation = yield* this.deleteOperation(id)
      if (addOperation) {
        // TODO:.. really .. here? You could prevent calling all these functions in operationAdded
        yield* this.store.operationAdded(this, {struct: 'Delete', target: id})
      }
      if (del[2]) {
        // gc
        yield* this.garbageCollectOperation(id)
      }
    }
  }
  * isGarbageCollected (id) {
    var n = yield* this.ds.findWithUpperBound(id)
    return n != null && n.id[0] === id[0] && id[1] < n.id[1] + n.len && n.gc
  }
  /*
    A DeleteSet (ds) describes all the deleted ops in the OS
  */
  * getDeleteSet () {
    var ds = {}
    yield* this.ds.iterate(this, null, null, function * (n) {
      var user = n.id[0]
      var counter = n.id[1]
      var len = n.len
      var gc = n.gc
      var dv = ds[user]
      if (dv === void 0) {
        dv = []
        ds[user] = dv
      }
      dv.push([counter, len, gc])
    })
    return ds
  }
  * isDeleted (id) {
    var n = yield* this.ds.findWithUpperBound(id)
    return n != null && n.id[0] === id[0] && id[1] < n.id[1] + n.len
  }
  * setOperation (op) {
    yield* this.os.put(op)
    return op
  }
  * addOperation (op) {
    yield* this.os.put(op)
  }
  * getOperation (id) {
    return yield* this.os.find(id)
  }
  * removeOperation (id) {
    yield* this.os.delete(id)
  }
  * setState (state) {
    var val = {
      id: [state.user],
      clock: state.clock
    }
    // TODO: find a way to skip this step.. (after implementing some dbs..)
    if (yield* this.ss.find([state.user])) {
      yield* this.ss.put(val)
    } else {
      yield* this.ss.put(val)
    }
  }
  * getState (user) {
    var n
    var clock = (n = yield* this.ss.find([user])) == null ? null : n.clock
    if (clock == null) {
      clock = 0
    }
    return {
      user: user,
      clock: clock
    }
  }
  * getStateVector () {
    var stateVector = []
    yield* this.ss.iterate(this, null, null, function * (n) {
      stateVector.push({
        user: n.id[0],
        clock: n.clock
      })
    })
    return stateVector
  }
  * getStateSet () {
    var ss = {}
    yield* this.ss.iterate(this, null, null, function * (n) {
      ss[n.id[0]] = n.clock
    })
    return ss
  }
  * getOperations (startSS) {
    // TODO: use bounds here!
    if (startSS == null) {
      startSS = {}
    }
    var ops = []

    var endSV = yield* this.getStateVector()
    for (var endState of endSV) {
      var user = endState.user
      if (user === '_') {
        continue
      }
      var startPos = startSS[user] || 0

      yield* this.os.iterate(this, [user, startPos], [user, Number.MAX_VALUE], function * (op) {
        ops.push(op)
      })
    }
    var res = []
    for (var op of ops) {
      res.push(yield* this.makeOperationReady(startSS, op))
    }
    return res
  }
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
  * makeOperationReady (startSS, op) {
    op = Y.Struct[op.struct].encode(op)
    op = Y.utils.copyObject(op)
    var o = op
    var ids = [op.id]
    // search for the new op.right
    // it is either the first known op (according to startSS)
    // or the o that has no origin to the right of op
    // (this is why we use the ids array)
    while (o.right != null) {
      var right = yield* this.getOperation(o.right)
      if (o.right[1] < (startSS[o.right[0]] || 0) || !ids.some(function (id) {
        return Y.utils.compareIds(id, right.origin)
      })) {
        break
      }
      ids.push(o.right)
      o = right
    }
    op.right = o.right
    op.left = op.origin
    return op
  }
}
Y.Transaction = Transaction

},{}],9:[function(require,module,exports){
/* global Y */
'use strict'

;(function () {
  class YArray {
    constructor (os, _model, idArray, valArray) {
      this.os = os
      this._model = _model
      // Array of all the operation id's
      this.idArray = idArray
      // Array of all the values
      this.valArray = valArray
      this.eventHandler = new Y.utils.EventHandler(ops => {
        var userEvents = []
        for (var i in ops) {
          var op = ops[i]
          if (op.struct === 'Insert') {
            let pos
            // we check op.left only!,
            // because op.right might not be defined when this is called
            if (op.left === null) {
              pos = 0
            } else {
              var sid = JSON.stringify(op.left)
              pos = this.idArray.indexOf(sid) + 1
              if (pos <= 0) {
                throw new Error('Unexpected operation!')
              }
            }
            this.idArray.splice(pos, 0, JSON.stringify(op.id))
            this.valArray.splice(pos, 0, op.content)
            userEvents.push({
              type: 'insert',
              object: this,
              index: pos,
              length: 1
            })
          } else if (op.struct === 'Delete') {
            let pos = this.idArray.indexOf(JSON.stringify(op.target))
            if (pos >= 0) {
              this.idArray.splice(pos, 1)
              this.valArray.splice(pos, 1)
              userEvents.push({
                type: 'delete',
                object: this,
                index: pos,
                length: 1
              })
            }
          } else {
            throw new Error('Unexpected struct!')
          }
        }
        this.eventHandler.callEventListeners(userEvents)
      })
    }
    get length () {
      return this.idArray.length
    }
    get (pos) {
      if (pos == null || typeof pos !== 'number') {
        throw new Error('pos must be a number!')
      }
      return this.valArray[pos]
    }
    toArray () {
      return this.valArray.slice()
    }
    insert (pos, contents) {
      if (typeof pos !== 'number') {
        throw new Error('pos must be a number!')
      }
      if (!(contents instanceof Array)) {
        throw new Error('contents must be an Array of objects!')
      }
      if (contents.length === 0) {
        return
      }
      if (pos > this.idArray.length || pos < 0) {
        throw new Error('This position exceeds the range of the array!')
      }
      var mostLeft = pos === 0 ? null : JSON.parse(this.idArray[pos - 1])

      var ops = []
      var prevId = mostLeft
      for (var i = 0; i < contents.length; i++) {
        var op = {
          left: prevId,
          origin: prevId,
          // right: mostRight,
          // NOTE: I intentionally do not define right here, because it could be deleted
          // at the time of creating this operation, and is therefore not defined in idArray
          parent: this._model,
          content: contents[i],
          struct: 'Insert',
          id: this.os.getNextOpId()
        }
        ops.push(op)
        prevId = op.id
      }
      var eventHandler = this.eventHandler
      eventHandler.awaitAndPrematurelyCall(ops)
      this.os.requestTransaction(function *() {
        // now we can set the right reference.
        var mostRight
        if (mostLeft != null) {
          mostRight = (yield* this.getOperation(mostLeft)).right
        } else {
          mostRight = (yield* this.getOperation(ops[0].parent)).start
        }
        for (var j in ops) {
          ops[j].right = mostRight
        }
        yield* this.applyCreatedOperations(ops)
        eventHandler.awaitedInserts(ops.length)
      })
    }
    delete (pos, length) {
      if (length == null) { length = 1 }
      if (typeof length !== 'number') {
        throw new Error('pos must be a number!')
      }
      if (typeof pos !== 'number') {
        throw new Error('pos must be a number!')
      }
      if (pos + length > this.idArray.length || pos < 0 || length < 0) {
        throw new Error('The deletion range exceeds the range of the array!')
      }
      if (length === 0) {
        return
      }
      var eventHandler = this.eventHandler
      var newLeft = pos > 0 ? JSON.parse(this.idArray[pos - 1]) : null
      var dels = []
      for (var i = 0; i < length; i++) {
        dels.push({
          target: JSON.parse(this.idArray[pos + i]),
          struct: 'Delete'
        })
      }
      eventHandler.awaitAndPrematurelyCall(dels)
      this.os.requestTransaction(function *() {
        yield* this.applyCreatedOperations(dels)
        eventHandler.awaitedDeletes(dels.length, newLeft)
      })
    }
    observe (f) {
      this.eventHandler.addEventListener(f)
    }
    * _changed (transaction, op) {
      if (!op.deleted) {
        if (op.struct === 'Insert') {
          var l = op.left
          var left
          while (l != null) {
            left = yield* transaction.getOperation(l)
            if (!left.deleted) {
              break
            }
            l = left.left
          }
          op.left = l
        }
        this.eventHandler.receivedOp(op)
      }
    }
  }

  Y.Array = new Y.utils.CustomType({
    class: YArray,
    createType: function * YArrayCreator () {
      var modelid = this.store.getNextOpId()
      var model = {
        struct: 'List',
        type: 'Array',
        start: null,
        end: null,
        id: modelid
      }
      yield* this.applyCreatedOperations([model])
      return modelid
    },
    initType: function * YArrayInitializer (os, model) {
      var valArray = []
      var idArray = yield* Y.Struct.List.map.call(this, model, function (c) {
        valArray.push(c.content)
        return JSON.stringify(c.id)
      })
      return new YArray(os, model.id, idArray, valArray)
    }
  })
})()

},{}],10:[function(require,module,exports){
/* global Y */
'use strict'

;(function () {
  class YMap {
    constructor (os, model, contents, opContents) {
      this._model = model.id
      this.os = os
      this.map = Y.utils.copyObject(model.map)
      this.contents = contents
      this.opContents = opContents
      this.eventHandler = new Y.utils.EventHandler(ops => {
        var userEvents = []
        for (var i in ops) {
          var op = ops[i]
          var oldValue
          // key is the name to use to access (op)content
          var key = op.struct === 'Delete' ? op.key : op.parentSub

          // compute oldValue
          if (this.opContents[key] != null) {
            let prevType = this.opContents[key]
            oldValue = () => {// eslint-disable-line
              return new Promise((resolve) => {
                this.os.requestTransaction(function *() {// eslint-disable-line
                  resolve(yield* this.getType(prevType))
                })
              })
            }
          } else {
            oldValue = this.contents[key]
          }
          // compute op event
          if (op.struct === 'Insert') {
            if (op.left === null) {
              if (op.opContent != null) {
                delete this.contents[key]
                if (op.deleted) {
                  delete this.opContents[key]
                } else {
                  this.opContents[key] = op.opContent
                }
              } else {
                delete this.opContents[key]
                if (op.deleted) {
                  delete this.contents[key]
                } else {
                  this.contents[key] = op.content
                }
              }
              this.map[key] = op.id
              var insertEvent = {
                name: key,
                object: this
              }
              if (oldValue === undefined) {
                insertEvent.type = 'add'
              } else {
                insertEvent.type = 'update'
                insertEvent.oldValue = oldValue
              }
              userEvents.push(insertEvent)
            }
          } else if (op.struct === 'Delete') {
            if (Y.utils.compareIds(this.map[key], op.target)) {
              delete this.opContents[key]
              delete this.contents[key]
              var deleteEvent = {
                name: key,
                object: this,
                oldValue: oldValue,
                type: 'delete'
              }
              userEvents.push(deleteEvent)
            }
          } else {
            throw new Error('Unexpected Operation!')
          }
        }
        this.eventHandler.callEventListeners(userEvents)
      })
    }
    get (key) {
      // return property.
      // if property does not exist, return null
      // if property is a type, return a promise
      if (key == null) {
        throw new Error('You must specify key!')
      }
      if (this.opContents[key] == null) {
        return this.contents[key]
      } else {
        return new Promise((resolve) => {
          var oid = this.opContents[key]
          this.os.requestTransaction(function *() {
            resolve(yield* this.getType(oid))
          })
        })
      }
    }
    /*
      If there is a primitive (not a custom type), then return it.
      Returns all primitive values, if propertyName is specified!
      Note: modifying the return value could result in inconsistencies!
        -- so make sure to copy it first!
    */
    getPrimitive (key) {
      if (key == null) {
        return Y.utils.copyObject(this.contents)
      } else {
        return this.contents[key]
      }
    }
    delete (key) {
      var right = this.map[key]
      if (right != null) {
        var del = {
          target: right,
          struct: 'Delete'
        }
        var eventHandler = this.eventHandler
        var modDel = Y.utils.copyObject(del)
        modDel.key = key
        eventHandler.awaitAndPrematurelyCall([modDel])
        this.os.requestTransaction(function *() {
          yield* this.applyCreatedOperations([del])
          eventHandler.awaitedDeletes(1)
        })
      }
    }
    set (key, value) {
      // set property.
      // if property is a type, return a promise
      // if not, apply immediately on this type an call event

      var right = this.map[key] || null
      var insert = {
        left: null,
        right: right,
        origin: null,
        parent: this._model,
        parentSub: key,
        struct: 'Insert'
      }
      return new Promise((resolve) => {
        if (value instanceof Y.utils.CustomType) {
          // construct a new type
          this.os.requestTransaction(function *() {
            var typeid = yield* value.createType.call(this)
            var type = yield* this.getType(typeid)
            insert.opContent = typeid
            insert.id = this.store.getNextOpId()
            yield* this.applyCreatedOperations([insert])
            resolve(type)
          })
        } else {
          insert.content = value
          insert.id = this.os.getNextOpId()
          var eventHandler = this.eventHandler
          eventHandler.awaitAndPrematurelyCall([insert])

          this.os.requestTransaction(function *() {
            yield* this.applyCreatedOperations([insert])
            eventHandler.awaitedInserts(1)
          })
          resolve(value)
        }
      })
    }
    observe (f) {
      this.eventHandler.addEventListener(f)
    }
    unobserve (f) {
      this.eventHandler.removeEventListener(f)
    }
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
    observePath (path, f) {
      var self = this
      function observeProperty (events) {
        // call f whenever path changes
        for (var i = 0; i < events.length; i++) {
          var event = events[i]
          if (event.name === propertyName) {
            // call this also for delete events!
            var property = self.get(propertyName)
            if (property instanceof Promise) {
              property.then(f)
            } else {
              f(property)
            }
          }
        }
      }

      if (path.length < 1) {
        throw new Error('Path must contain at least one element!')
      } else if (path.length === 1) {
        var propertyName = path[0]
        var property = self.get(propertyName)
        if (property instanceof Promise) {
          property.then(f)
        } else {
          f(property)
        }
        this.observe(observeProperty)
        return Promise.resolve(function () {
          self.unobserve(f)
        })
      } else {
        var deleteChildObservers
        var resetObserverPath = function () {
          var promise = self.get(path[0])
          if (!promise instanceof Promise) {
            // its either not defined or a primitive value
            promise = self.set(path[0], Y.Map)
          }
          return promise.then(function (map) {
            return map.observePath(path.slice(1), f)
          }).then(function (_deleteChildObservers) {
            // update deleteChildObservers
            deleteChildObservers = _deleteChildObservers
            return Promise.resolve() // Promise does not return anything
          })
        }
        var observer = function (events) {
          for (var e in events) {
            var event = events[e]
            if (event.name === path[0]) {
              deleteChildObservers()
              if (event.type === 'add' || event.type === 'update') {
                resetObserverPath()
              }
              // TODO: what about the delete events?
            }
          }
        }
        self.observe(observer)
        return resetObserverPath().then(
          // this promise contains a function that deletes all the child observers
          // and how to unobserve the observe from this object
          Promise.resolve(function () {
            deleteChildObservers()
            self.unobserve(observer)
          })
        )
      }
    }
    * _changed (transaction, op) {
      if (op.struct === 'Delete') {
        op.key = (yield* transaction.getOperation(op.target)).parentSub
      }
      this.eventHandler.receivedOp(op)
    }
  }
  Y.Map = new Y.utils.CustomType({
    class: YMap,
    createType: function * YMapCreator () {
      var modelid = this.store.getNextOpId()
      var model = {
        map: {},
        struct: 'Map',
        type: 'Map',
        id: modelid
      }
      yield* this.applyCreatedOperations([model])
      return modelid
    },
    initType: function * YMapInitializer (os, model) {
      var contents = {}
      var opContents = {}
      var map = model.map
      for (var name in map) {
        var op = yield* this.getOperation(map[name])
        if (op.opContent != null) {
          opContents[name] = op.opContent
        } else {
          contents[name] = op.content
        }
      }
      return new YMap(os, model, contents, opContents)
    }
  })
})()

},{}],11:[function(require,module,exports){
/* global Y */
'use strict'

;(function () {
  class YTextBind extends Y.Array['class'] {
    constructor (os, _model, idArray, valArray) {
      super(os, _model, idArray, valArray)
      this.textfields = []
    }
    toString () {
      return this.valArray.join('')
    }
    insert (pos, content) {
      super.insert(pos, content.split(''))
    }
    bind (textfield, domRoot) {
      domRoot = domRoot || window; // eslint-disable-line
      if (domRoot.getSelection == null) {
        domRoot = window;// eslint-disable-line
      }

      // don't duplicate!
      for (var t in this.textfields) {
        if (this.textfields[t] === textfield) {
          return
        }
      }
      var creatorToken = false

      var word = this
      textfield.value = this.toString()
      this.textfields.push(textfield)
      var createRange, writeRange, writeContent
      if (textfield.selectionStart != null && textfield.setSelectionRange != null) {
        createRange = function (fix) {
          var left = textfield.selectionStart
          var right = textfield.selectionEnd
          if (fix != null) {
            left = fix(left)
            right = fix(right)
          }
          return {
            left: left,
            right: right
          }
        }
        writeRange = function (range) {
          writeContent(word.toString())
          textfield.setSelectionRange(range.left, range.right)
        }
        writeContent = function (content) {
          textfield.value = content
        }
      } else {
        createRange = function (fix) {
          var range = {}
          var s = domRoot.getSelection()
          var clength = textfield.textContent.length
          range.left = Math.min(s.anchorOffset, clength)
          range.right = Math.min(s.focusOffset, clength)
          if (fix != null) {
            range.left = fix(range.left)
            range.right = fix(range.right)
          }
          var editedElement = s.focusNode
          if (editedElement === textfield || editedElement === textfield.childNodes[0]) {
            range.isReal = true
          } else {
            range.isReal = false
          }
          return range
        }

        writeRange = function (range) {
          writeContent(word.toString())
          var textnode = textfield.childNodes[0]
          if (range.isReal && textnode != null) {
            if (range.left < 0) {
              range.left = 0
            }
            range.right = Math.max(range.left, range.right)
            if (range.right > textnode.length) {
              range.right = textnode.length
            }
            range.left = Math.min(range.left, range.right)
            var r = document.createRange(); // eslint-disable-line
            r.setStart(textnode, range.left)
            r.setEnd(textnode, range.right)
            var s = window.getSelection(); // eslint-disable-line
            s.removeAllRanges()
            s.addRange(r)
          }
        }
        writeContent = function (content) {
          var contentArray = content.replace(new RegExp('\n', 'g'), ' ').split(' ');// eslint-disable-line
          textfield.innerText = ''
          for (var i in contentArray) {
            var c = contentArray[i]
            textfield.innerText += c
            if (i !== contentArray.length - 1) {
              textfield.innerHTML += '&nbsp;'
            }
          }
        }
      }
      writeContent(this.toString())

      this.observe(function (events) {
        for (var e in events) {
          var event = events[e]
          if (!creatorToken) {
            var oPos, fix
            if (event.type === 'insert') {
              oPos = event.index
              fix = function (cursor) {// eslint-disable-line
                if (cursor <= oPos) {
                  return cursor
                } else {
                  cursor += 1
                  return cursor
                }
              }
              var r = createRange(fix)
              writeRange(r)
            } else if (event.type === 'delete') {
              oPos = event.index
              fix = function (cursor) {// eslint-disable-line
                if (cursor < oPos) {
                  return cursor
                } else {
                  cursor -= 1
                  return cursor
                }
              }
              r = createRange(fix)
              writeRange(r)
            }
          }
        }
      })
      // consume all text-insert changes.
      textfield.onkeypress = function (event) {
        if (word.is_deleted) {
          // if word is deleted, do not do anything ever again
          textfield.onkeypress = null
          return true
        }
        creatorToken = true
        var char
        if (event.keyCode === 13) {
          char = '\n'
        } else if (event.key != null) {
          if (event.charCode === 32) {
            char = ' '
          } else {
            char = event.key
          }
        } else {
          char = window.String.fromCharCode(event.keyCode); // eslint-disable-line
        }
        if (char.length > 1) {
          return true
        } else if (char.length > 0) {
          var r = createRange()
          var pos = Math.min(r.left, r.right, word.length)
          var diff = Math.abs(r.right - r.left)
          word.delete(pos, diff)
          word.insert(pos, char)
          r.left = pos + char.length
          r.right = r.left
          writeRange(r)
        }
        event.preventDefault()
        creatorToken = false
        return false
      }
      textfield.onpaste = function (event) {
        if (word.is_deleted) {
          // if word is deleted, do not do anything ever again
          textfield.onpaste = null
          return true
        }
        event.preventDefault()
      }
      textfield.oncut = function (event) {
        if (word.is_deleted) {
          // if word is deleted, do not do anything ever again
          textfield.oncut = null
          return true
        }
        event.preventDefault()
      }
      //
      // consume deletes. Note that
      //   chrome: won't consume deletions on keypress event.
      //   keyCode is deprecated. BUT: I don't see another way.
      //     since event.key is not implemented in the current version of chrome.
      //     Every browser supports keyCode. Let's stick with it for now..
      //
      textfield.onkeydown = function (event) {
        creatorToken = true
        if (word.is_deleted) {
          // if word is deleted, do not do anything ever again
          textfield.onkeydown = null
          return true
        }
        var r = createRange()
        var pos = Math.min(r.left, r.right, word.toString().length)
        var diff = Math.abs(r.left - r.right)
        if (event.keyCode != null && event.keyCode === 8) { // Backspace
          if (diff > 0) {
            word.delete(pos, diff)
            r.left = pos
            r.right = pos
            writeRange(r)
          } else {
            if (event.ctrlKey != null && event.ctrlKey) {
              var val = word.toString()
              var newPos = pos
              var delLength = 0
              if (pos > 0) {
                newPos--
                delLength++
              }
              while (newPos > 0 && val[newPos] !== ' ' && val[newPos] !== '\n') {
                newPos--
                delLength++
              }
              word.delete(newPos, pos - newPos)
              r.left = newPos
              r.right = newPos
              writeRange(r)
            } else {
              if (pos > 0) {
                word.delete(pos - 1, 1)
                r.left = pos - 1
                r.right = pos - 1
                writeRange(r)
              }
            }
          }
          event.preventDefault()
          creatorToken = false
          return false
        } else if (event.keyCode != null && event.keyCode === 46) { // Delete
          if (diff > 0) {
            word.delete(pos, diff)
            r.left = pos
            r.right = pos
            writeRange(r)
          } else {
            word.delete(pos, 1)
            r.left = pos
            r.right = pos
            writeRange(r)
          }
          event.preventDefault()
          creatorToken = false
          return false
        } else {
          creatorToken = false
          return true
        }
      }
    }
  }
  Y.TextBind = new Y.utils.CustomType({
    class: YTextBind,
    createType: function * YTextBindCreator () {
      var modelid = this.store.getNextOpId()
      var model = {
        start: null,
        end: null,
        struct: 'List',
        type: 'TextBind',
        id: modelid
      }
      yield* this.applyCreatedOperations([model])
      return modelid
    },
    initType: function * YTextBindInitializer (os, model) {
      var valArray = []
      var idArray = yield* Y.Struct.List.map.call(this, model, function (c) {
        valArray.push(c.content)
        return JSON.stringify(c.id)
      })
      return new YTextBind(os, model.id, idArray, valArray)
    }
  })
})()

},{}],12:[function(require,module,exports){
/* global Y */
'use strict'

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
class EventHandler {
  /*
    onevent: is called when the structure changes.

    Note: "awaiting opertations" is used to denote operations that were
    prematurely called. Events for received operations can not be executed until
    all prematurely called operations were executed ("waiting operations")
  */
  constructor (onevent) {
    this.waiting = []
    this.awaiting = 0
    this.onevent = onevent
    this.eventListeners = []
  }
  /*
    Call this when a new operation arrives. It will be executed right away if
    there are no waiting operations, that you prematurely executed
  */
  receivedOp (op) {
    if (this.awaiting <= 0) {
      this.onevent([op])
    } else {
      this.waiting.push(Y.utils.copyObject(op))
    }
  }
  /*
    You created some operations, and you want the `onevent` function to be
    called right away. Received operations will not be executed untill all
    prematurely called operations are executed
  */
  awaitAndPrematurelyCall (ops) {
    this.awaiting++
    this.onevent(ops)
  }
  /*
    Basic event listener boilerplate...
    TODO: maybe put this in a different type..
  */
  addEventListener (f) {
    this.eventListeners.push(f)
  }
  removeEventListener (f) {
    this.eventListeners = this.eventListeners.filter(function (g) {
      return f !== g
    })
  }
  removeAllEventListeners () {
    this.eventListeners = []
  }
  callEventListeners (event) {
    for (var i in this.eventListeners) {
      try {
        this.eventListeners[i](event)
      } catch (e) {
        console.log('User events must not throw Errors!') // eslint-disable-line
      }
    }
  }
  /*
    Call this when you successfully awaited the execution of n Insert operations
  */
  awaitedInserts (n) {
    var ops = this.waiting.splice(this.waiting.length - n)
    for (var oid = 0; oid < ops.length; oid++) {
      var op = ops[oid]
      for (var i = this.waiting.length - 1; i >= 0; i--) {
        let w = this.waiting[i]
        if (Y.utils.compareIds(op.left, w.id)) {
          // include the effect of op in w
          w.right = op.id
          // exclude the effect of w in op
          op.left = w.left
        } else if (Y.utils.compareIds(op.right, w.id)) {
          // similar..
          w.left = op.id
          op.right = w.right
        }
      }
    }
    this._tryCallEvents()
  }
  /*
    Call this when you successfully awaited the execution of n Delete operations
  */
  awaitedDeletes (n, newLeft) {
    var ops = this.waiting.splice(this.waiting.length - n)
    for (var j in ops) {
      var del = ops[j]
      if (newLeft != null) {
        for (var i in this.waiting) {
          let w = this.waiting[i]
          // We will just care about w.left
          if (Y.utils.compareIds(del.target, w.left)) {
            del.left = newLeft
          }
        }
      }
    }
    this._tryCallEvents()
  }
  /* (private)
    Try to execute the events for the waiting operations
  */
  _tryCallEvents () {
    this.awaiting--
    if (this.awaiting <= 0 && this.waiting.length > 0) {
      var events = this.waiting
      this.waiting = []
      this.onevent(events)
    }
  }
}
Y.utils.EventHandler = EventHandler

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
class CustomType { // eslint-disable-line
  constructor (def) {
    if (def.createType == null ||
      def.initType == null ||
      def.class == null
    ) {
      throw new Error('Custom type was not initialized correctly!')
    }
    this.createType = def.createType
    this.initType = def.initType
    this.class = def.class
  }
}
Y.utils.CustomType = CustomType

/*
  Make a flat copy of an object
  (just copy properties)
*/
function copyObject (o) {
  var c = {}
  for (var key in o) {
    c[key] = o[key]
  }
  return c
}
Y.utils.copyObject = copyObject

/*
  Defines a smaller relation on Id's
*/
function smaller (a, b) {
  return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])
}
Y.utils.smaller = smaller

function compareIds (id1, id2) {
  if (id1 == null || id2 == null) {
    if (id1 == null && id2 == null) {
      return true
    }
    return false
  }
  if (id1[0] === id2[0] && id1[1] === id2[1]) {
    return true
  } else {
    return false
  }
}
Y.utils.compareIds = compareIds

},{}],13:[function(require,module,exports){
/* @flow */
'use strict'

function Y (opts) {
  return new Promise(function (resolve) {
    var yconfig = new YConfig(opts, function () {
      yconfig.db.whenUserIdSet(function () {
        resolve(yconfig)
      })
    })
  })
}

class YConfig {
  constructor (opts, callback) {
    this.db = new Y[opts.db.name](this, opts.db)
    this.connector = new Y[opts.connector.name](this, opts.connector)
    this.db.requestTransaction(function * requestTransaction () {
      // create initial Map type
      var model = {
        id: ['_', 0],
        struct: 'Map',
        type: 'Map',
        map: {}
      }
      yield* this.store.tryExecute.call(this, model)
      var root = yield* this.getType(model.id)
      this.store.y.root = root
      callback()
    })
  }
  isConnected () {
    return this.connector.isSynced
  }
  disconnect () {
    return this.connector.disconnect()
  }
  reconnect () {
    return this.connector.reconnect()
  }
  destroy () {
    this.disconnect()
    this.db.destroy()
    this.connector = null
    this.db = null
  }
}

if (typeof window !== 'undefined') {
  window.Y = Y
}

if (typeof YConcurrency_TestingMode !== 'undefined') {
  g.Y = Y //eslint-disable-line
  // debugger //eslint-disable-line
}
Y.utils = {}

},{}]},{},[13,1,3,8,7,12,6,5,4,2,9,10,11])


//# sourceMappingURL=y.js.map