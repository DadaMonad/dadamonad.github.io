var Connector, XMPP, XMPPConnector, encode_message, extract_resource_from_jid, ltx, parse_message,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

XMPP = require("node-xmpp-client");

ltx = require("ltx");

extract_resource_from_jid = function(jid) {
  return jid.split("/")[1];
};

Connector = require('../connector');

parse_message = function(m) {
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

encode_message = function(m, json) {
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

XMPPConnector = (function(_super) {
  __extends(XMPPConnector, _super);

  function XMPPConnector(room, opts) {
    var creds, that;
    if (opts == null) {
      opts = {};
    }
    if (opts.node_xmpp_client != null) {
      this.xmpp = opts.node_xmpp_client;
    } else {
      creds = {};
      if (opts.jid != null) {
        creds.jid = opts.jid;
        creds.password = opts.password;
      } else {
        creds.jid = '@yatta.ninja';
        creds.preferred = 'ANONYMOUS';
      }
      if (opts.host != null) {
        creds.host = opts.host;
        creds.port = opts.port;
      } else {
        if (opts.websocket == null) {
          opts.websocket = 'wss:yatta.ninja:5281/xmpp-websocket';
        }
        creds.websocket = {
          url: opts.websocket
        };
      }
      this.xmpp = new XMPP.Client(creds);
    }
    this.debug = false;
    XMPPConnector.__super__.constructor.call(this);
    this._is_server = true;
    this.is_syncing = false;
    this.connections = {};
    that = this;
    this.xmpp.on('online', function() {
      var subscribeToRoom;
      subscribeToRoom = function() {
        var f, room_subscription, _i, _len, _ref;
        that.room = room + "@conference.yatta.ninja";
        that.room_jid = that.room + "/" + that.xmpp.jid.resource;
        that.id = that.xmpp.jid.resource;
        _ref = that.when_user_id_set;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          f = _ref[_i];
          f(that.id);
        }
        room_subscription = new ltx.Element('presence', {
          to: that.room_jid
        }).c('x', {});
        return that.xmpp.send(room_subscription);
      };
      if (that.getHB == null) {
        return that._whenBoundToY = subscribeToRoom;
      } else {
        return subscribeToRoom();
      }
    });
    this.xmpp.on('stanza', function(stanza) {
      var data, f, hb, o, res, send_again, sender, sender_role, _hb, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2;
      sender = stanza.getAttribute("from");
      if (stanza.is("presence")) {
        sender_role = stanza.getChild("x", "http://jabber.org/protocol/muc#user").getChild("item").getAttribute("role");
        if (sender === that.room_jid) {
          that.role = sender_role;
          if (that.role === "moderator") {
            that.is_synced = true;
            _ref = that.compute_when_synced;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              f = _ref[_i];
              f();
            }
          }
        } else if (stanza.getAttribute("type") === "unavailable") {
          delete that.connections[extract_resource_from_jid(sender)];
        } else {
          that.connections[extract_resource_from_jid(sender)] = sender;
          if (!this.is_synced && sender_role === "moderator") {
            that._performSync(sender);
          }
        }
      } else {
        if (sender === that.room_jid) {
          return true;
        }
        res = stanza.getChild("y", "http://y.ninja/connector-stanza");
        if (that.receive_counter == null) {
          that.receive_counter = 0;
        }
        that.receive_counter++;
        if (res != null) {
          res = parse_message(res);
          if (res.sync_step == null) {
            _ref1 = that.receive_handlers;
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              f = _ref1[_j];
              f(sender, res);
            }
          } else {
            if (res.sync_step === "getHB") {
              data = that.getHB([]);
              hb = data.hb;
              _hb = [];
              for (_k = 0, _len2 = hb.length; _k < _len2; _k++) {
                o = hb[_k];
                _hb.push(o);
                if (_hb.length > 30) {
                  that._send(sender, {
                    sync_step: "applyHB_",
                    data: _hb
                  });
                  _hb = [];
                }
              }
              that._send(sender, {
                sync_step: "applyHB",
                data: _hb
              });
              if (res.send_again != null) {
                send_again = (function(sv) {
                  return function() {
                    hb = that.getHB(sv).hb;
                    return that._send(sender, {
                      sync_step: "applyHB",
                      data: hb,
                      sent_again: "true"
                    });
                  };
                })(data.state_vector);
                setTimeout(send_again, 3000);
              }
            } else if (res.sync_step === "applyHB") {
              that.applyHB(res.data);
              if ((res.sent_again != null) && !that.is_synced) {
                that.is_synced = true;
                _ref2 = that.compute_when_synced;
                for (_l = 0, _len3 = _ref2.length; _l < _len3; _l++) {
                  f = _ref2[_l];
                  f();
                }
              }
            } else if (res.sync_step === "applyHB_") {
              that.applyHB(res.data);
            }
          }
        }
      }
      if (that.debug) {
        return console.log("RECEIVED: " + stanza.toString());
      }
    });
  }

  XMPPConnector.prototype._send = function(user, json, type) {
    var m, message;
    if (this.is_synced || (json.sync_step != null) || this.is_syncing) {
      if (this.send_conter == null) {
        this.send_conter = 0;
      }
      this.send_conter++;
      m = new ltx.Element("message", {
        to: user,
        type: type != null ? type : "chat"
      });
      message = encode_message(m, json);
      if (this.debug) {
        console.log("SENDING: " + message.toString());
      }
      return this.xmpp.send(message);
    }
  };

  XMPPConnector.prototype._broadcast = function(json) {
    return this._send(this.room, json, "groupchat");
  };

  XMPPConnector.prototype.invokeSync = function() {};

  XMPPConnector.prototype._performSync = function(user) {
    var hb, o, _hb, _i, _len;
    if (!this.is_syncing) {
      this.is_syncing = true;
      this._send(user, {
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
          this._broadcast({
            sync_step: "applyHB_",
            data: _hb
          });
          _hb = [];
        }
      }
      return this._broadcast({
        sync_step: "applyHB",
        data: _hb
      });
    }
  };

  return XMPPConnector;

})(Connector);

if (module.exports != null) {
  module.exports = XMPPConnector;
}

if (typeof window !== "undefined" && window !== null) {
  if (typeof Y === "undefined" || Y === null) {
    throw new Error("You must import Y first");
  } else {
    Y.XMPP = XMPPConnector;
  }
}
