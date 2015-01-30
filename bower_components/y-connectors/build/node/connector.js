var Connector;

Connector = (function() {
  function Connector() {
    this.is_synced = false;
    this.is_syncing = false;
    this.compute_when_synced = [];
    this.connections = {};
    this.unsynced_connections = {};
    this.receive_handlers = [];
    this.is_bound_to_y = false;
    this.when_bound_to_y_listeners = [];
    this.on_user_id_set = [];
  }

  Connector.prototype.onUserIdSet = function(f) {
    return this.on_user_id_set.push(f);
  };

  Connector.prototype.setUserId = function(id) {
    var f, _i, _len, _ref;
    this.id = id;
    _ref = this.on_user_id_set;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      f = _ref[_i];
      f(this.id);
    }
    return null;
  };

  Connector.prototype.whenSynced = function(args) {
    if (args.constructore === Function) {
      args = [args];
    }
    if (this.is_synced) {
      return args[0].apply(this, args.slice(1));
    } else {
      return this.compute_when_synced.push(args);
    }
  };

  Connector.prototype.onReceive = function(f) {
    return this.receive_handlers.push(f);
  };

  Connector.prototype.broadcast = function(message) {
    throw new Error("You must implement broadcast!");
  };

  Connector.prototype.send = function(peer_s, message) {
    throw new Error("You must implement send!");
  };

  Connector.prototype.performSync = function(user) {
    var hb, o, _hb, _i, _len;
    this.send(user, {
      sync_step: "getHB",
      data: []
    });
    hb = this.getHB([]).hb;
    _hb = [];
    for (_i = 0, _len = hb.length; _i < _len; _i++) {
      o = hb[_i];
      _hb.push(o);
      if (_hb.length > 30) {
        this.send(user, {
          sync_step: "applyHB_",
          data: _hb
        });
        _hb = [];
      }
    }
    return this.send(user, {
      sync_step: "applyHB",
      data: _hb
    });
  };

  Connector.prototype.performSyncWithMaster = function(user) {
    var hb, o, _hb, _i, _len;
    if (!this.is_syncing) {
      this.is_syncing = true;
      this.send(user, {
        sync_step: "getHB",
        send_again: "true",
        data: []
      });
      hb = this.getHB([]).hb;
      _hb = [];
      for (_i = 0, _len = hb.length; _i < _len; _i++) {
        o = hb[_i];
        _hb.push(o);
        if (_hb.length > 30) {
          this.broadcast({
            sync_step: "applyHB_",
            data: _hb
          });
          _hb = [];
        }
      }
      return this.broadcast({
        sync_step: "applyHB",
        data: _hb
      });
    }
  };

  Connector.prototype.setStateSynced = function() {
    var f, _i, _len, _ref;
    this.is_synced = true;
    _ref = this.compute_when_synced;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      f = _ref[_i];
      f();
    }
    return null;
  };

  Connector.prototype.receiveMessage = function(sender, res) {
    var data, f, hb, o, send_again, _hb, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _results, _results1;
    if (res.sync_step == null) {
      _ref = this.receive_handlers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        f = _ref[_i];
        _results.push(f(sender, res));
      }
      return _results;
    } else {
      if (res.sync_step === "getHB") {
        data = this.getHB([]);
        hb = data.hb;
        _hb = [];
        for (_j = 0, _len1 = hb.length; _j < _len1; _j++) {
          o = hb[_j];
          _hb.push(o);
          if (_hb.length > 30) {
            this.send(sender, {
              sync_step: "applyHB_",
              data: _hb
            });
            _hb = [];
          }
        }
        this.send(sender, {
          sync_step: "applyHB",
          data: _hb
        });
        if (res.send_again != null) {
          send_again = (function(_this) {
            return function(sv) {
              return function() {
                hb = _this.getHB(sv).hb;
                return _this.send(sender, {
                  sync_step: "applyHB",
                  data: hb,
                  sent_again: "true"
                });
              };
            };
          })(this)(data.state_vector);
          return setTimeout(send_again, 3000);
        }
      } else if (res.sync_step === "applyHB") {
        this.applyHB(res.data);
        if ((res.sent_again != null) && !this.is_synced) {
          this.is_synced = true;
          _ref1 = this.compute_when_synced;
          _results1 = [];
          for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
            f = _ref1[_k];
            _results1.push(f());
          }
          return _results1;
        }
      } else if (res.sync_step === "applyHB_") {
        return this.applyHB(res.data);
      }
    }
  };

  Connector.prototype.parseMessageFromXml = function(m) {
    var parse_array, parse_object;
    parse_array = function(node) {
      var n, _i, _len, _ref, _results;
      _ref = node.children;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        n = _ref[_i];
        if (n.getAttribute("isArray") === "true") {
          _results.push(parse_array(n));
        } else {
          _results.push(parse_object(n));
        }
      }
      return _results;
    };
    parse_object = function(node) {
      var int, json, n, name, value, _i, _len, _ref, _ref1;
      json = {};
      _ref = node.attrs;
      for (name in _ref) {
        value = _ref[name];
        int = parseInt(value);
        if (isNaN(int) || ("" + int) !== value) {
          json[name] = value;
        } else {
          json[name] = int;
        }
      }
      _ref1 = node.children;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        n = _ref1[_i];
        name = n.name;
        if (n.getAttribute("isArray") === "true") {
          json[name] = parse_array(n);
        } else {
          json[name] = parse_object(n);
        }
      }
      return json;
    };
    return parse_object(m);
  };

  Connector.prototype.encodeMessageToXml = function(m, json) {
    var encode_array, encode_object;
    encode_object = function(m, json) {
      var name, value;
      for (name in json) {
        value = json[name];
        if (value == null) {

        } else if (value.constructor === Object) {
          encode_object(m.c(name), value);
        } else if (value.constructor === Array) {
          encode_array(m.c(name), value);
        } else {
          m.setAttribute(name, value);
        }
      }
      return m;
    };
    encode_array = function(m, array) {
      var e, _i, _len;
      m.setAttribute("isArray", "true");
      for (_i = 0, _len = array.length; _i < _len; _i++) {
        e = array[_i];
        if (e.constructor === Object) {
          encode_object(m.c("array-element"), e);
        } else {
          encode_array(m.c("array-element"), e);
        }
      }
      return m;
    };
    if (json.constructor === Object) {
      return encode_object(m.c("y", {
        xmlns: "http://y.ninja/connector-stanza"
      }), json);
    } else if (json.constructor === Array) {
      return encode_array(m.c("y", {
        xmlns: "http://y.ninja/connector-stanza"
      }), json);
    } else {
      throw new Error("I can't encode this json!");
    }
  };

  Connector.prototype.whenBoundToY = function(f) {
    if (this.is_bound_to_y) {
      return f();
    } else {
      return this.when_bound_to_y_listeners.push(f);
    }
  };

  Connector.prototype.setIsBoundToY = function() {
    var f, _i, _len, _ref;
    _ref = this.when_bound_to_y_listeners;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      f = _ref[_i];
      f();
    }
    return this.is_bound_to_y = true;
  };

  return Connector;

})();

module.exports = Connector;
