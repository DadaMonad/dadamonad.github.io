var Connector, TestConnector, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require("underscore");

Connector = require('../connector');

TestConnector = (function(_super) {
  __extends(TestConnector, _super);

  function TestConnector(id) {
    this.id = id;
    TestConnector.__super__.constructor.call(this);
    this.execution_order = [];
    this.receive_buffer = {};
    this.connections = {};
    this.whenReceiving((function(_this) {
      return function(user, message) {
        return _this.execution_order.push(message);
      };
    })(this));
    this.is_synced = true;
  }

  TestConnector.prototype.join = function(conn) {
    var c, cid, comp, _i, _len, _ref, _ref1, _results;
    this._addConnection(conn.id, conn);
    _ref = conn.connections;
    for (cid in _ref) {
      c = _ref[cid];
      this._addConnection(cid, c);
    }
    _ref1 = this.compute_when_synced;
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      comp = _ref1[_i];
      _results.push(comp[0].apply(this, comp.slice(1)));
    }
    return _results;
  };

  TestConnector.prototype._addConnection = function(id, user_connector) {
    var data, data_, i, user_data, _i, _ref;
    if ((this.connections[id] == null) && id !== this.id) {
      data = null;
      user_data = null;
      for (i = _i = 0, _ref = this.sync_process_order.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        data_ = this.sync_process_order[i].call(this, user_data);
        user_data = user_connector.sync_process_order[i].call(user_connector, data);
        data = data_;
      }
      this.connections[id] = user_connector;
      return user_connector.connections[this.id] = this;
    }
  };

  TestConnector.prototype.getOpsInExecutionOrder = function() {
    return this.execution_order;
  };

  TestConnector.prototype.invokeSync = function() {};

  TestConnector.prototype._send = function(uid, message) {
    var rb, _name;
    rb = this.connections[uid].receive_buffer;
    if (rb[_name = this.id] == null) {
      rb[_name] = [];
    }
    return rb[this.id].push(message);
  };

  TestConnector.prototype.flushOne = function(uid) {
    var f, message, _i, _len, _ref, _ref1, _results;
    if (((_ref = this.receive_buffer[uid]) != null ? _ref.length : void 0) > 0) {
      message = this.receive_buffer[uid].shift();
      _ref1 = this.receive_handlers;
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        f = _ref1[_i];
        _results.push(f(uid, message));
      }
      return _results;
    }
  };

  TestConnector.prototype.flushOneRandom = function() {
    var c, cid, connlist;
    connlist = (function() {
      var _ref, _results;
      _ref = this.receive_buffer;
      _results = [];
      for (cid in _ref) {
        c = _ref[cid];
        _results.push(cid);
      }
      return _results;
    }).call(this);
    return this.flushOne(connlist[_.random(0, connlist.length - 1)]);
  };

  TestConnector.prototype.flushAll = function() {
    var f, message, messages, n, _i, _j, _len, _len1, _ref, _ref1;
    _ref = this.receive_buffer;
    for (n in _ref) {
      messages = _ref[n];
      for (_i = 0, _len = messages.length; _i < _len; _i++) {
        message = messages[_i];
        _ref1 = this.receive_handlers;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          f = _ref1[_j];
          f(n, message);
        }
      }
    }
    return this.receive_buffer = {};
  };

  return TestConnector;

})(Connector);

if (typeof window !== "undefined" && window !== null) {
  window.TestConnector = TestConnector;
}

if (typeof module !== "undefined" && module !== null) {
  module.exports = TestConnector;
}
