var Connector, NXMPP, XMPPConnector, XMPPHandler, extract_bare_from_jid, extract_resource_from_jid, ltx,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

NXMPP = require("node-xmpp-client");

ltx = require("ltx");

extract_resource_from_jid = function(jid) {
  return jid.split("/")[1];
};

extract_bare_from_jid = function(jid) {
  return jid.split("/")[0];
};

Connector = require('../connector');

XMPPHandler = (function() {
  function XMPPHandler(opts) {
    var creds;
    if (opts == null) {
      opts = {};
    }
    this.rooms = {};
    if (opts.node_xmpp_client != null) {
      this.xmpp = opts.node_xmpp_client;
    } else {
      if (opts.defaultRoomComponent != null) {
        this.defaultRoomComponent = opts.defaultRoomComponent;
      } else {
        this.defaultRoomComponent = "@conference.yatta.ninja";
      }
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
      this.xmpp = new NXMPP.Client(creds);
    }
    this.is_online = false;
    this.connections = {};
    this.when_online_listeners = [];
    this.xmpp.on('online', (function(_this) {
      return function() {
        return _this.setIsOnline();
      };
    })(this));
    this.xmpp.on('stanza', (function(_this) {
      return function(stanza) {
        var room;
        room = extract_bare_from_jid(stanza.getAttribute("from"));
        if (_this.rooms[room] != null) {
          return _this.rooms[room].onStanza(stanza);
        }
      };
    })(this));
    this.debug = false;
  }

  XMPPHandler.prototype.whenOnline = function(f) {
    if (this.is_online) {
      return f();
    } else {
      return this.when_online_listeners.push(f);
    }
  };

  XMPPHandler.prototype.setIsOnline = function() {
    var f, _i, _len, _ref;
    _ref = this.when_online_listeners;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      f = _ref[_i];
      f();
    }
    return this.is_online = true;
  };

  XMPPHandler.prototype.join = function(room) {
    var room_conn;
    if (room == null) {
      throw new Error("you must specify a room!");
    }
    if (room.indexOf("@") === -1) {
      room += this.defaultRoomComponent;
    }
    if (this.rooms[room] == null) {
      room_conn = new XMPPConnector();
      this.rooms[room] = room_conn;
      this.whenOnline((function(_this) {
        return function() {
          return room_conn.whenBoundToY(function() {
            var room_subscription;
            room_conn.setUserId(_this.xmpp.jid.resource);
            room_conn.room = room;
            room_conn.room_jid = room + "/" + _this.xmpp.jid.resource;
            room_conn.xmpp = _this.xmpp;
            room_conn.xmpp_handler = _this;
            room_subscription = new ltx.Element('presence', {
              to: room_conn.room_jid
            }).c('x', {});
            return _this.xmpp.send(room_subscription);
          });
        };
      })(this));
    }
    return this.rooms[room];
  };

  return XMPPHandler;

})();

XMPPConnector = (function(_super) {
  __extends(XMPPConnector, _super);

  function XMPPConnector() {
    return XMPPConnector.__super__.constructor.apply(this, arguments);
  }

  XMPPConnector.prototype.exit = function() {
    this.xmpp.send(new ltx.Element('presence', {
      to: this.room_jid,
      type: "unavailable"
    }));
    return delete this.xmpp_handler.rooms[this.room];
  };

  XMPPConnector.prototype.onStanza = function(stanza) {
    var res, sender, sender_role;
    sender = stanza.getAttribute("from");
    if (stanza.is("presence")) {
      sender_role = stanza.getChild("x", "http://jabber.org/protocol/muc#user").getChild("item").getAttribute("role");
      if (sender === this.room_jid) {
        this.role = sender_role;
        if (this.role === "moderator") {
          this.setStateSynced();
        }
      } else if (stanza.getAttribute("type") === "unavailable") {
        delete this.connections[extract_resource_from_jid(sender)];
      } else {
        this.connections[extract_resource_from_jid(sender)] = sender;
        if (!this.is_synced && sender_role === "moderator") {
          this.performSyncWithMaster(sender);
        }
      }
    } else {
      if (sender === this.room_jid) {
        return true;
      }
      res = stanza.getChild("y", "http://y.ninja/connector-stanza");
      if (res != null) {
        this.receiveMessage(sender, this.parseMessageFromXml(res));
      }
    }
    if (this.debug) {
      return console.log("RECEIVED: " + stanza.toString());
    }
  };

  XMPPConnector.prototype.send = function(user, json, type) {
    var m, message;
    if (type == null) {
      type = "message";
    }
    if (this.is_synced || (json.sync_step != null) || this.is_syncing) {
      m = new ltx.Element("message", {
        to: user,
        type: type != null ? type : "chat"
      });
      message = this.encodeMessageToXml(m, json);
      if (this.debug) {
        console.log("SENDING: " + message.toString());
      }
      return this.xmpp.send(message);
    }
  };

  XMPPConnector.prototype.broadcast = function(json) {
    return this.send(this.room, json, "groupchat");
  };

  return XMPPConnector;

})(Connector);

if (module.exports != null) {
  module.exports = XMPPHandler;
}

if (typeof window !== "undefined" && window !== null) {
  if (typeof Y === "undefined" || Y === null) {
    throw new Error("You must import Y first!");
  } else {
    Y.XMPP = XMPPHandler;
  }
}
