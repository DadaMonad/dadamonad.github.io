(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Connector;

Connector = (function() {
  function Connector() {
    this.is_synced = false;
    this.compute_when_synced = [];
    this.connections = {};
    this.unsynced_connections = {};
    this.receive_handlers = [];
    this.sync_process_order = [];
    this.when_user_id_set = [];
  }

  Connector.prototype.getUniqueConnectionId = function() {
    return this.id;
  };

  Connector.prototype.whenUserIdSet = function(f) {
    return this.when_user_id_set.push(f);
  };

  Connector.prototype.whenSynced = function(args) {
    if (this.is_synced) {
      return args[0].apply(this, args.slice(1));
    } else {
      return this.compute_when_synced.push(args);
    }
  };

  Connector.prototype.whenReceiving = function(f) {
    return this.receive_handlers.push(f);
  };

  Connector.prototype.multicast = function(peers, message) {
    return this.whenSynced([_send, peers, message]);
  };

  Connector.prototype.unicast = function(peer, message) {
    return this.whenSynced([_send, peer, message]);
  };

  Connector.prototype.broadcast = function(message) {
    return this._broadcast(message);
  };

  Connector.prototype.whenSyncing = function() {
    var i, _i, _ref, _results;
    _results = [];
    for (i = _i = _ref = arguments.length - 1; _ref <= 0 ? _i <= 0 : _i >= 0; i = _ref <= 0 ? ++_i : --_i) {
      _results.push(this.sync_process_order.unshift(arguments[i]));
    }
    return _results;
  };

  return Connector;

})();

module.exports = Connector;



},{}],2:[function(require,module,exports){

/*
Parameters:
(String) nick - The nick name used in the chat room.
(String) message - The Json object you want to encode
Returns:
msgiq - the unique id used to send the message
 */
var Connector, StrohpeConnector, encode_message, parse_message, send_yatta_element,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

send_yatta_element = function(room, nick, message) {
  var append_nick, msg, msgid, room_nick, type;
  append_nick = function(room, nick) {
    var domain, node;
    node = Strophe.escapeNode(Strophe.getNodeFromJid(room));
    domain = Strophe.getDomainFromJid(room);
    return node + "@" + domain + (nick != null ? "/" + nick : "");
  };
  type = nick != null ? "chat" : "groupchat";
  room_nick = append_nick(room, nick);
  msgid = this.getUniqueId();
  msg = $msg({
    to: room_nick,
    from: this.jid,
    type: type,
    id: msgid
  });
  window.message = message;
  window.encoded_message = (new DOMParser()).parseFromString(message, "text/xml").querySelector("yatta");
  msg.cnode(window.encoded_message);
  msg.up().up();
  this.send(msg);
  return msgid;
};

Connector = require('../connector');

parse_message = function(message) {
  var parse_array, parse_object;
  parse_array = function(node) {
    var n, _i, _len, _ref, _results;
    _ref = node.children;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      n = _ref[_i];
      if (n.getAttribute("isArrayContainer") === "true") {
        _results.push(parse_array(n));
      } else {
        _results.push(parse_object(n));
      }
    }
    return _results;
  };
  parse_object = function(node) {
    var attr, int, json, n, name, _i, _j, _len, _len1, _ref, _ref1;
    json = {};
    _ref = node.attributes;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      attr = _ref[_i];
      int = parseInt(attr.value);
      if (isNaN(int) || ("" + int) !== attr.value) {
        json[attr.name] = attr.value;
      } else {
        json[attr.name] = int;
      }
    }
    _ref1 = node.children;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      n = _ref1[_j];
      name = n.tagName.toLowerCase();
      if (n.getAttribute("isArrayContainer") === "true") {
        json[name] = parse_array(n);
      } else {
        json[name] = parse_object(n);
      }
    }
    return json;
  };
  return parse_object(message.querySelector("yatta"));
};

encode_message = function(message) {
  var encode_array, encode_object;
  encode_object = function(tagname, message, attributes) {
    var enc_inner, enc_tag, name, value;
    enc_tag = "<" + tagname;
    if (attributes != null) {
      enc_tag += " " + attributes;
    }
    enc_inner = "";
    for (name in message) {
      value = message[name];
      if (value == null) {

      } else if (value.constructor === Object) {
        enc_inner += encode_object(name, value);
      } else if (value.constructor === Array) {
        enc_inner += encode_array(name, value);
      } else {
        enc_tag += " " + name + '="' + value + '"';
      }
    }
    return enc_tag + ">" + enc_inner + "</" + tagname + ">";
  };
  encode_array = function(tagname, message) {
    var enc, m, _i, _len;
    enc = "<" + tagname + ' isArrayContainer="true">';
    for (_i = 0, _len = message.length; _i < _len; _i++) {
      m = message[_i];
      if (m.constructor === Object) {
        enc += encode_object("array-element", m);
      } else {
        enc += encode_array("array-element", m);
      }
    }
    return enc += "</" + tagname + ">";
  };
  return encode_object('yatta', message, 'xmlns="http://yatta.ninja/connector-stanza"');
};

Strophe.log = function(status, msg) {
  return console.log("STROPHE: " + msg);
};

window.StrohpeConnector = StrohpeConnector = (function(_super) {
  __extends(StrohpeConnector, _super);

  function StrohpeConnector(room) {
    var that;
    this.room = room != null ? room : "thing";
    this.invokeSync = __bind(this.invokeSync, this);
    StrohpeConnector.__super__.constructor.call(this);
    that = this;
    this.room = this.room + "@conference.yatta.ninja";
    this.unsynced_connections = {};
    this.xmpp = new Strophe.Connection('wss:yatta.ninja:5281/xmpp-websocket');
    this.xmpp.send_yatta_element = send_yatta_element;
    this.xmpp.rawInput = function(x) {
      return console.log("Receive: " + x);
    };
    this.xmpp.rawOutput = function(x) {
      return console.log("Send: " + x);
    };
    this.xmpp.connect("yatta.ninja", "anonymous", function(status) {
      if (status === Strophe.Status.CONNECTED) {
        that.xmpp.muc.join(that.room, that.xmpp.jid.split("/")[1]);
        return that.xmpp.muc.rooms[that.room].addHandler("presence", function(presence, conn) {
          var f, getArbitraryConn, perform_when_synced, wait_for_connections, _i, _len, _ref;
          that.conn = conn;
          that.connections = that.conn.roster;
          that.id = that.conn.nick;
          _ref = that.when_user_id_set;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            f = _ref[_i];
            f(that.id);
          }
          perform_when_synced = function(sender) {
            var comp, _j, _len1, _ref1;
            delete that.unsynced_connections[sender];
            that.is_synced = true;
            _ref1 = that.compute_when_synced;
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              comp = _ref1[_j];
              comp[0].apply(that, comp.slice(1));
            }
            return that.compute_when_synced = [];
          };
          that.conn.addHandler("message", function(m) {
            var data, error_node, res, sender, _j, _len1, _ref1;
            sender = m.getAttribute("from").split("/")[1];
            if (sender === that.conn.nick) {
              return true;
            }
            error_node = m.querySelector("error");
            if (error_node != null) {
              console.log("STROPHE: STANZA-ERROR: " + error_node.textContent);
              if (wait_for_connections()) {
                that.conn.addHandler("presence", wait_for_connections);
              }
              return true;
            }
            res = parse_message(m);
            console.log("received sth:" + (res.sync_step != null ? " - sync_step: " + res.sync_step : ""));
            console.dir(res.data);
            if (res.sync_step != null) {
              if (res.sync_step + 1 < that.sync_process_order.length) {
                if ((res.sync_step === 0) && (that.unsynced_connections[sender] == null) && (res.stamped !== "true")) {
                  that.xmpp.send_yatta_element(that.room, sender, encode_message({
                    sync_step: 0,
                    data: that.sync_process_order[0].call(that),
                    stamped: true
                  }));
                }
                if (that.unsynced_connections[sender] == null) {
                  that.unsynced_connections[sender] = res.sync_step;
                }
                if ((that.unsynced_connections[sender] == null) || that.unsynced_connections[sender] <= res.sync_step) {
                  data = that.sync_process_order[res.sync_step + 1].call(that, res.data);
                  if (that.sync_process_order[res.sync_step + 2] != null) {
                    that.unsynced_connections[sender] = res.sync_step + 1;
                    if (that.is_synced) {
                      that.xmpp.send_yatta_element(that.room, sender, encode_message({
                        sync_step: res.sync_step + 1,
                        data: data
                      }));
                    } else {
                      data.state_vector = [];
                      that.xmpp.send_yatta_element(that.room, null, encode_message({
                        sync_step: res.sync_step + 1,
                        data: data
                      }));
                    }
                  } else {
                    perform_when_synced(sender);
                  }
                }
              } else {
                perform_when_synced(sender);
              }
            } else {
              _ref1 = that.receive_handlers;
              for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                f = _ref1[_j];
                f(sender, res.data);
              }
            }
            return true;
          });
          getArbitraryConn = function() {
            var c_names, n, temp_length, user;
            c_names = (function() {
              var _ref1, _results;
              _ref1 = that.connections;
              _results = [];
              for (n in _ref1) {
                user = _ref1[n];
                _results.push(user);
              }
              return _results;
            })();
            temp_length = c_names.length;
            c_names = c_names.filter(function(n) {
              return n.nick !== that.conn.nick;
            });

            /*
            if temp_length is c_names.length
             * we havent removed the nick of this nick,
             * therefore, the stanza has not yet arrived
             * wait until it does arrive
            return null
             */
            if (c_names.length > 0) {
              return c_names[Math.round(Math.random() * (c_names.length - 1))].nick;
            } else {
              return null;
            }
          };
          wait_for_connections = function() {
            var arbitraryConn;
            arbitraryConn = getArbitraryConn();
            if (arbitraryConn != null) {
              if (!that._isSyncing()) {
                that.unsynced_connections[arbitraryConn] = 0;
                that.xmpp.send_yatta_element(that.room, arbitraryConn, encode_message({
                  sync_step: 0,
                  data: that.sync_process_order[0].call(that)
                }));
              }
              return false;
            } else {
              return true;
            }
          };
          if (wait_for_connections()) {
            that.conn.addHandler("presence", wait_for_connections);
          }
          that.whenSynced([
            function() {
              var handshake;
              handshake = function() {
                return that.xmpp.send_yatta_element(that.room, null, encode_message({
                  sync_step: 0,
                  data: that.sync_process_order[0].call(that)
                }));
              };
              return handshake();
            }
          ]);
          return false;
        });
      }
    });
  }

  StrohpeConnector.prototype._isSyncing = function() {
    var c, exists_unsynced;
    exists_unsynced = false;
    for (c in this.unsynced_connections) {
      exists_unsynced = true;
      break;
    }
    return exists_unsynced;
  };

  StrohpeConnector.prototype.invokeSync = function() {
    if (this.is_synced) {
      return this.xmpp.send_yatta_element(this.room, null, encode_message({
        sync_step: 0,
        data: this.sync_process_order[0].call(this)
      }));
    }
  };

  StrohpeConnector.prototype._broadcast = function(message) {
    if (this.conn != null) {

      /*
      if @xmpp._proto.socket?
         * sometimes strophe throws an error because the socket does not exists_unsynced
         * This happens on the "idle" state in strophe
         * Checking for the existence of socket is just some bugfix!
        @xmpp.send_yatta_element @room, null, encode_message
          data: message
      else
       */
      if (this.is_synced) {
        return this.xmpp.send_yatta_element(this.room, null, encode_message({
          data: message
        }));
      }
    }

    /* also nice ..
    if @is_synced
      @xmpp.send_yatta_element @room, null, encode_message
        data: message
    else if @_isSyncing()
      @whenSynced [ ->
          @xmpp.send_yatta_element @room, null, encode_message
            data: message
        ]
     */
  };

  StrohpeConnector.prototype._send = function(peer_s, message) {
    var error, errors, peer, _i, _len;
    if (peer_s.constructor === [].constructor) {
      errors = [];
      for (_i = 0, _len = peer_s.length; _i < _len; _i++) {
        peer = peer_s[_i];
        try {
          this.xmpp.send_yatta_element(this.room, this.connections[peer].nick, encode_message({
            data: message
          }));
        } catch (_error) {
          error = _error;
          errors.push(error + "");
        }
      }
      if (errors.length > 0) {
        throw new Error(errors);
      }
    } else {
      return this.xmpp.send_yatta_element(this.room, this.connections[peer_s].nick, encode_message({
        data: message
      }));
    }
  };

  return StrohpeConnector;

})(Connector);



},{"../connector":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9ZYXR0YS1Db25uZWN0b3JzL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9ZYXR0YS1Db25uZWN0b3JzL2xpYi9jb25uZWN0b3IuY29mZmVlIiwiL2hvbWUvY29kaW8vd29ya3NwYWNlL1lhdHRhLUNvbm5lY3RvcnMvbGliL3N0cm9waGUtY29ubmVjdG9yL3N0cm9waGUtY29ubmVjdG9yLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0NBLElBQUEsU0FBQTs7QUFBQTtBQUVlLEVBQUEsbUJBQUEsR0FBQTtBQUVYLElBQUEsSUFBQyxDQUFBLFNBQUQsR0FBYSxLQUFiLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxtQkFBRCxHQUF1QixFQUZ2QixDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsV0FBRCxHQUFlLEVBSmYsQ0FBQTtBQUFBLElBTUEsSUFBQyxDQUFBLG9CQUFELEdBQXdCLEVBTnhCLENBQUE7QUFBQSxJQVFBLElBQUMsQ0FBQSxnQkFBRCxHQUFvQixFQVJwQixDQUFBO0FBQUEsSUFVQSxJQUFDLENBQUEsa0JBQUQsR0FBc0IsRUFWdEIsQ0FBQTtBQUFBLElBV0EsSUFBQyxDQUFBLGdCQUFELEdBQW9CLEVBWHBCLENBRlc7RUFBQSxDQUFiOztBQUFBLHNCQWVBLHFCQUFBLEdBQXVCLFNBQUEsR0FBQTtXQUNyQixJQUFDLENBQUEsR0FEb0I7RUFBQSxDQWZ2QixDQUFBOztBQUFBLHNCQWtCQSxhQUFBLEdBQWUsU0FBQyxDQUFELEdBQUE7V0FDYixJQUFDLENBQUEsZ0JBQWdCLENBQUMsSUFBbEIsQ0FBdUIsQ0FBdkIsRUFEYTtFQUFBLENBbEJmLENBQUE7O0FBQUEsc0JBeUJBLFVBQUEsR0FBWSxTQUFDLElBQUQsR0FBQTtBQUNW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QUFBO0FBQ0EsV0FBQSw2Q0FBQTswQkFBQTtBQUNFO0FBQ0UsVUFBQSxJQUFDLENBQUEsSUFBSSxDQUFDLGtCQUFOLENBQXlCLElBQUMsQ0FBQSxJQUExQixFQUFnQyxJQUFDLENBQUEsV0FBWSxDQUFBLElBQUEsQ0FBSyxDQUFDLElBQW5ELEVBQXlELGNBQUEsQ0FDdkQ7QUFBQSxZQUFBLElBQUEsRUFBTSxPQUFOO1dBRHVELENBQXpELENBQUEsQ0FERjtTQUFBLGNBQUE7QUFJRSxVQURJLGNBQ0osQ0FBQTtBQUFBLFVBQUEsTUFBTSxDQUFDLElBQVAsQ0FBWSxLQUFBLEdBQU0sRUFBbEIsQ0FBQSxDQUpGO1NBREY7QUFBQSxPQURBO0FBT0EsTUFBQSxJQUFHLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLENBQW5CO0FBQ0UsY0FBVSxJQUFBLEtBQUEsQ0FBTSxNQUFOLENBQVYsQ0FERjtPQVZGO0tBQUEsTUFBQTthQWFFLElBQUMsQ0FBQSxJQUFJLENBQUMsa0JBQU4sQ0FBeUIsSUFBQyxDQUFBLElBQTFCLEVBQWdDLElBQUMsQ0FBQSxXQUFZLENBQUEsTUFBQSxDQUFPLENBQUMsSUFBckQsRUFBMkQsY0FBQSxDQUN6RDtBQUFBLFFBQUEsSUFBQSxFQUFNLE9BQU47T0FEeUQsQ0FBM0QsRUFiRjtLQURLO0VBQUEsQ0FoTVAsQ0FBQTs7MEJBQUE7O0dBRnVELFVBdEd6RCxDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuY2xhc3MgQ29ubmVjdG9yXG4gIFxuICBjb25zdHJ1Y3RvcjogKCktPlxuICAgICMgaXMgc2V0IHRvIHRydWUgd2hlbiB0aGlzIGlzIHN5bmNlZCB3aXRoIGFsbCBvdGhlciBjb25uZWN0aW9uc1xuICAgIEBpc19zeW5jZWQgPSBmYWxzZVxuICAgICMgY29tcHV0ZSBhbGwgb2YgdGhlc2UgZnVuY3Rpb25zIHdoZW4gYWxsIGNvbm5lY3Rpb25zIGFyZSBzeW5jZWQuXG4gICAgQGNvbXB1dGVfd2hlbl9zeW5jZWQgPSBbXVxuICAgICMgUGVlcmpzIENvbm5lY3Rpb25zOiBrZXk6IGNvbm4taWQsIHZhbHVlOiBjb25uXG4gICAgQGNvbm5lY3Rpb25zID0ge31cbiAgICAjIENvbm5lY3Rpb25zLCB0aGF0IGhhdmUgYmVlbiBpbml0aWFsaXplZCwgYnV0IGhhdmUgbm90IGJlZW4gKGZ1bGx5KSBzeW5jZWQgeWV0LlxuICAgIEB1bnN5bmNlZF9jb25uZWN0aW9ucyA9IHt9XG4gICAgIyBMaXN0IG9mIGZ1bmN0aW9ucyB0aGF0IHNoYWxsIHByb2Nlc3MgaW5jb21pbmcgZGF0YVxuICAgIEByZWNlaXZlX2hhbmRsZXJzID0gW11cbiAgICAjIEEgbGlzdCBvZiBmdW5jdGlvbnMgdGhhdCBhcmUgZXhlY3V0ZWQgKGxlZnQgdG8gcmlnaHQpIHdoZW4gc3luY2luZyB3aXRoIGEgcGVlci4gXG4gICAgQHN5bmNfcHJvY2Vzc19vcmRlciA9IFtdXG4gICAgQHdoZW5fdXNlcl9pZF9zZXQgPSBbXVxuICBcbiAgZ2V0VW5pcXVlQ29ubmVjdGlvbklkOiAtPlxuICAgIEBpZCAjIG1ha2Ugc3VyZSwgdGhhdCBldmVyeSBjb25uZWN0b3IgaW1wbGVtZW50YXRpb24gZG9lcyBpdCBsaWtlIHRoaXNcbiAgXG4gIHdoZW5Vc2VySWRTZXQ6IChmKS0+XG4gICAgQHdoZW5fdXNlcl9pZF9zZXQucHVzaCBmXG4gIFxuICAjXG4gICMgRXhlY3V0ZSBhIGZ1bmN0aW9uIF93aGVuXyB3ZSBhcmUgY29ubmVjdGVkLiBJZiBub3QgY29ubmVjdGVkLCB3YWl0IHVudGlsIGNvbm5lY3RlZC5cbiAgIyBAcGFyYW0gZiB7RnVuY3Rpb259IFdpbGwgYmUgZXhlY3V0ZWQgb24gdGhlIFBlZXJKcy1Db25uZWN0b3IgY29udGV4dC5cbiAgI1xuICB3aGVuU3luY2VkOiAoYXJncyktPlxuICAgIGlmIEBpc19zeW5jZWRcbiAgICAgIGFyZ3NbMF0uYXBwbHkgdGhpcywgYXJnc1sxLi5dXG4gICAgZWxzZVxuICAgICAgQGNvbXB1dGVfd2hlbl9zeW5jZWQucHVzaCBhcmdzIFxuICBcbiAgI1xuICAjIEV4ZWN1dGUgYW4gZnVuY3Rpb24gX3doZW5fIGEgbWVzc2FnZSBpcyByZWNlaXZlZC5cbiAgIyBAcGFyYW0gZiB7RnVuY3Rpb259IFdpbGwgYmUgZXhlY3V0ZWQgb24gdGhlIFBlZXJKcy1Db25uZWN0b3IgY29udGV4dC4gZiB3aWxsIGJlIGNhbGxlZCB3aXRoIChzZW5kZXJfaWQsIGJyb2FkY2FzdCB7dHJ1ZXxmYWxzZX0sIG1lc3NhZ2UpLlxuICAjXG4gIHdoZW5SZWNlaXZpbmc6IChmKS0+XG4gICAgQHJlY2VpdmVfaGFuZGxlcnMucHVzaCBmXG4gIFxuICAjXG4gICMgU2VuZCBhIG1lc3NhZ2UgdG8gYSAoc3ViKS1zZXQgb2YgYWxsIGNvbm5lY3RlZCBwZWVycy5cbiAgIyBAcGFyYW0gcGVlcnMge0FycmF5PGNvbm5lY3Rpb25faWRzPn0gQSBzZXQgb2YgaWRzLlxuICAjIEBwYXJhbSBtZXNzYWdlIHtPYmplY3R9IFRoZSBtZXNzYWdlIHRvIHNlbmQuXG4gICNcbiAgbXVsdGljYXN0OiAocGVlcnMsIG1lc3NhZ2UpLT5cbiAgICBAd2hlblN5bmNlZCBbX3NlbmQsIHBlZXJzLCBtZXNzYWdlXVxuICBcbiAgI1xuICAjIFNlbmQgYSBtZXNzYWdlIHRvIG9uZSBvZiB0aGUgY29ubmVjdGVkIHBlZXJzLlxuICAjIEBwYXJhbSBwZWVycyB7Y29ubmVjdGlvbl9pZH0gQSBjb25uZWN0aW9uIGlkLlxuICAjIEBwYXJhbSBtZXNzYWdlIHtPYmplY3R9IFRoZSBtZXNzYWdlIHRvIHNlbmQuXG4gICNcbiAgdW5pY2FzdDogKHBlZXIsIG1lc3NhZ2UpLT5cbiAgICBAd2hlblN5bmNlZCBbX3NlbmQsIHBlZXIsIG1lc3NhZ2VdXG4gIFxuICAjIFxuICAjIEJyb2FkY2FzdCBhIG1lc3NhZ2UgdG8gYWxsIGNvbm5lY3RlZCBwZWVycy5cbiAgIyBAcGFyYW0gbWVzc2FnZSB7T2JqZWN0fSBUaGUgbWVzc2FnZSB0byBicm9hZGNhc3QuXG4gICMgXG4gIGJyb2FkY2FzdDogKG1lc3NhZ2UpLT5cbiAgICBAX2Jyb2FkY2FzdChtZXNzYWdlKVxuXG4gXG4gICNcbiAgIyBEZWZpbmUgaG93IHlvdSB3YW50IHRvIGhhbmRsZSB0aGUgc3luYyBwcm9jZXNzIG9mIHR3byB1c2Vycy5cbiAgIyBUaGlzIGlzIGEgc3luY2hyb25vdXMgaGFuZHNoYWtlLiBFdmVyeSB1c2VyIHdpbGwgcGVyZm9ybSBleGFjdGx5IHRoZSBzYW1lIGFjdGlvbnMgYXQgdGhlIHNhbWUgdGltZS4gRS5nLlxuICAjIEBleGFtcGxlXG4gICMgICB3aGVuU3luY2luZyhmdW5jdGlvbigpeyAvLyBmaXJzdCBjYWxsIG11c3Qgbm90IGhhdmUgcGFyYW1ldGVycyFcbiAgIyAgICAgICByZXR1cm4gdGhpcy5pZDsgLy8gU2VuZCB0aGUgaWQgb2YgdGhpcyBjb25uZWN0b3IuXG4gICMgICB9LGZ1bmN0aW9uKHBlZXJpZCl7IC8vIHlvdSByZWNlaXZlIHRoZSBwZWVyaWQgb2YgdGhlIG90aGVyIGNvbm5lY3Rpb25zLlxuICAjICAgICAgIC8vIHlvdSBjYW4gZG8gc29tZXRoaW5nIHdpdGggdGhlIHBlZXJpZFxuICAjICAgICAgIC8vIHJldHVybiBcInlvdSBhcmUgbXkgZnJpZW5kXCI7IC8vIHlvdSBjb3VsZCBzZW5kIGFub3RoZXIgbWFzc2FnZS5cbiAgIyAgIH0pOyAvLyB0aGlzIGlzIHRoZSBlbmQgb2YgdGhlIHN5bmMgcHJvY2Vzcy5cbiAgI1xuICB3aGVuU3luY2luZzogKCktPlxuICAgIGZvciBpIGluIFsoYXJndW1lbnRzLmxlbmd0aC0xKS4uMF1cbiAgICAgIEBzeW5jX3Byb2Nlc3Nfb3JkZXIudW5zaGlmdCBhcmd1bWVudHNbaV1cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gQ29ubmVjdG9yXG4iLCIjIyNcblBhcmFtZXRlcnM6XG4oU3RyaW5nKSBuaWNrIC0gVGhlIG5pY2sgbmFtZSB1c2VkIGluIHRoZSBjaGF0IHJvb20uXG4oU3RyaW5nKSBtZXNzYWdlIC0gVGhlIEpzb24gb2JqZWN0IHlvdSB3YW50IHRvIGVuY29kZVxuUmV0dXJuczpcbm1zZ2lxIC0gdGhlIHVuaXF1ZSBpZCB1c2VkIHRvIHNlbmQgdGhlIG1lc3NhZ2VcbiMjI1xuc2VuZF95YXR0YV9lbGVtZW50ID0gKHJvb20sIG5pY2ssIG1lc3NhZ2UpLT5cbiAgYXBwZW5kX25pY2sgPSAocm9vbSwgbmljayktPlxuICAgIG5vZGUgPSBTdHJvcGhlLmVzY2FwZU5vZGUoU3Ryb3BoZS5nZXROb2RlRnJvbUppZChyb29tKSlcbiAgICBkb21haW4gPSBTdHJvcGhlLmdldERvbWFpbkZyb21KaWQocm9vbSlcbiAgICBub2RlICsgXCJAXCIgKyBkb21haW4gKyAoaWYgbmljaz8gdGhlbiBcIi9cIiArIG5pY2sgZWxzZSBcIlwiKVxuICB0eXBlID0gaWYgbmljaz8gdGhlbiBcImNoYXRcIiBlbHNlIFwiZ3JvdXBjaGF0XCJcbiAgcm9vbV9uaWNrID0gYXBwZW5kX25pY2socm9vbSwgbmljaylcbiAgbXNnaWQgPSB0aGlzLmdldFVuaXF1ZUlkKClcbiAgbXNnID0gJG1zZyhcbiAgICAgIHRvOiByb29tX25pY2tcbiAgICAgIGZyb206IHRoaXMuamlkXG4gICAgICB0eXBlOiB0eXBlXG4gICAgICBpZDogbXNnaWRcbiAgICApXG4gIHdpbmRvdy5tZXNzYWdlID0gbWVzc2FnZVxuICB3aW5kb3cuZW5jb2RlZF9tZXNzYWdlID0gKG5ldyBET01QYXJzZXIoKSkucGFyc2VGcm9tU3RyaW5nKG1lc3NhZ2UsXCJ0ZXh0L3htbFwiKS5xdWVyeVNlbGVjdG9yKFwieWF0dGFcIilcbiAgbXNnLmNub2RlKHdpbmRvdy5lbmNvZGVkX21lc3NhZ2UpXG4gIG1zZy51cCgpLnVwKClcbiAgdGhpcy5zZW5kKG1zZylcbiAgbXNnaWRcblxuQ29ubmVjdG9yID0gcmVxdWlyZSAnLi4vY29ubmVjdG9yJ1xuXG4jIEN1cnJlbnRseSwgdGhlIEhCIGVuY29kZXMgb3BlcmF0aW9ucyBhcyBKU09OLiBGb3IgdGhlIG1vbWVudCBJIHdhbnQgdG8ga2VlcCBpdFxuIyB0aGF0IHdheS4gTWF5YmUgd2Ugc3VwcG9ydCBlbmNvZGluZyBpbiB0aGUgSEIgYXMgWE1MIGluIHRoZSBmdXR1cmUsIGJ1dCBmb3Igbm93IEkgZG9uJ3Qgd2FudFxuIyB0b28gbXVjaCBvdmVyaGVhZC4gWWF0dGEgaXMgdmVyeSBsaWtlbHkgdG8gZ2V0IGNoYW5nZWQgYSBsb3QgaW4gdGhlIGZ1dHVyZVxuI1xuIyBCZWNhdXNlIHdlIGRvbid0IHdhbnQgdG8gZW5jb2RlIEpTT04gYXMgc3RyaW5nICh3aXRoIGNoYXJhY3RlciBlc2NhcGluZywgd2ljaCBtYWtlcyBpdCBwcmV0dHkgbXVjaCB1bnJlYWRhYmxlKVxuIyB3ZSBlbmNvZGUgdGhlIEpTT04gYXMgWE1MLlxuI1xuIyBXaGVuIHRoZSBIQiBzdXBwb3J0IGVuY29kaW5nIGFzIFhNTCwgdGhlIGZvcm1hdCBzaG91bGQgbG9vayBwcmV0dHkgbXVjaCBsaWtlIHRoaXMuXG5cbiMgZG9lcyBub3Qgc3VwcG9ydCBwcmltaXRpdmUgdmFsdWVzIGFzIGFycmF5IGVsZW1lbnRzXG5wYXJzZV9tZXNzYWdlID0gKG1lc3NhZ2UpLT5cbiAgcGFyc2VfYXJyYXkgPSAobm9kZSktPlxuICAgIGZvciBuIGluIG5vZGUuY2hpbGRyZW5cbiAgICAgIGlmIG4uZ2V0QXR0cmlidXRlKFwiaXNBcnJheUNvbnRhaW5lclwiKSBpcyBcInRydWVcIlxuICAgICAgICBwYXJzZV9hcnJheSBuXG4gICAgICBlbHNlXG4gICAgICAgIHBhcnNlX29iamVjdCBuXG5cbiAgcGFyc2Vfb2JqZWN0ID0gKG5vZGUpLT5cbiAgICBqc29uID0ge31cbiAgICBmb3IgYXR0ciBpbiBub2RlLmF0dHJpYnV0ZXNcbiAgICAgIGludCA9IHBhcnNlSW50KGF0dHIudmFsdWUpXG4gICAgICBpZiBpc05hTihpbnQpIG9yIChcIlwiK2ludCkgaXNudCBhdHRyLnZhbHVlXG4gICAgICAgIGpzb25bYXR0ci5uYW1lXSA9IGF0dHIudmFsdWVcbiAgICAgIGVsc2VcbiAgICAgICAganNvblthdHRyLm5hbWVdID0gaW50XG4gICAgZm9yIG4gaW4gbm9kZS5jaGlsZHJlblxuICAgICAgbmFtZSA9IG4udGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICBpZiBuLmdldEF0dHJpYnV0ZShcImlzQXJyYXlDb250YWluZXJcIikgaXMgXCJ0cnVlXCJcbiAgICAgICAganNvbltuYW1lXSA9IHBhcnNlX2FycmF5IG5cbiAgICAgIGVsc2VcbiAgICAgICAganNvbltuYW1lXSA9IHBhcnNlX29iamVjdCBuXG4gICAganNvblxuICBwYXJzZV9vYmplY3QgbWVzc2FnZS5xdWVyeVNlbGVjdG9yKFwieWF0dGFcIilcblxuIyBlbmNvZGUgbWVzc2FnZSBpbiB4bWxcbiMgd2UgdXNlIHN0cmluZyBiZWNhdXNlIFN0cm9waGUgb25seSBhY2NlcHRzIGFuIFwieG1sLXN0cmluZ1wiLi5cbiMgU28ge2E6NCxiOntjOjV9fSB3aWxsIGxvb2sgbGlrZVxuIyA8eWF0dGEgYT1cIjRcIj5cbiMgICA8YiBjPVwiNVwiPjwvYj5cbiMgPC95YXR0YT5cbiNcbmVuY29kZV9tZXNzYWdlID0gKG1lc3NhZ2UpLT5cbiAgIyBhdHRyaWJ1dGVzIGlzIG9wdGlvbmFsXG4gIGVuY29kZV9vYmplY3QgPSAodGFnbmFtZSwgbWVzc2FnZSwgYXR0cmlidXRlcyktPlxuICAgIGVuY190YWcgPSBcIjxcIit0YWduYW1lXG4gICAgaWYgYXR0cmlidXRlcz9cbiAgICAgIGVuY190YWcgKz0gXCIgXCIrYXR0cmlidXRlc1xuICAgIGVuY19pbm5lciA9IFwiXCJcbiAgICBmb3IgbmFtZSx2YWx1ZSBvZiBtZXNzYWdlXG4gICAgICBpZiBub3QgdmFsdWU/XG4gICAgICAgICMgbm9wXG4gICAgICBlbHNlIGlmIHZhbHVlLmNvbnN0cnVjdG9yIGlzIE9iamVjdFxuICAgICAgICBlbmNfaW5uZXIgKz0gZW5jb2RlX29iamVjdCBuYW1lLCB2YWx1ZVxuICAgICAgZWxzZSBpZiB2YWx1ZS5jb25zdHJ1Y3RvciBpcyBBcnJheVxuICAgICAgICBlbmNfaW5uZXIgKz0gZW5jb2RlX2FycmF5IG5hbWUsIHZhbHVlXG4gICAgICBlbHNlXG4gICAgICAgIGVuY190YWcgKz0gXCIgXCIrbmFtZSsnPVwiJyt2YWx1ZSsnXCInXG4gICAgZW5jX3RhZyArIFwiPlwiK2VuY19pbm5lcitcIjwvXCIrdGFnbmFtZStcIj5cIlxuICBlbmNvZGVfYXJyYXkgPSAodGFnbmFtZSwgbWVzc2FnZSktPlxuICAgIGVuYyA9IFwiPFwiK3RhZ25hbWUrJyBpc0FycmF5Q29udGFpbmVyPVwidHJ1ZVwiPidcbiAgICBmb3IgbSBpbiBtZXNzYWdlXG4gICAgICBpZiBtLmNvbnN0cnVjdG9yIGlzIE9iamVjdFxuICAgICAgICBlbmMgKz0gZW5jb2RlX29iamVjdCBcImFycmF5LWVsZW1lbnRcIiwgbVxuICAgICAgZWxzZVxuICAgICAgICBlbmMgKz0gZW5jb2RlX2FycmF5IFwiYXJyYXktZWxlbWVudFwiLCBtXG4gICAgZW5jICs9IFwiPC9cIit0YWduYW1lK1wiPlwiXG4gIGVuY29kZV9vYmplY3QgJ3lhdHRhJywgbWVzc2FnZSwgJ3htbG5zPVwiaHR0cDovL3lhdHRhLm5pbmphL2Nvbm5lY3Rvci1zdGFuemFcIidcblxuU3Ryb3BoZS5sb2cgPSAoc3RhdHVzLCBtc2cpLT5cbiAgY29uc29sZS5sb2coXCJTVFJPUEhFOiBcIittc2cpXG5cbndpbmRvdy5TdHJvaHBlQ29ubmVjdG9yID0gY2xhc3MgU3Ryb2hwZUNvbm5lY3RvciBleHRlbmRzIENvbm5lY3RvclxuXG4gIGNvbnN0cnVjdG9yOiAoQHJvb20gPSBcInRoaW5nXCIpLT5cbiAgICBzdXBlcigpXG4gICAgdGhhdCA9IEBcbiAgICBAcm9vbSA9IEByb29tK1wiQGNvbmZlcmVuY2UueWF0dGEubmluamFcIlxuICAgIEB1bnN5bmNlZF9jb25uZWN0aW9ucyA9IHt9XG5cbiAgICAjIENyZWF0ZSB0aGUgUGVlcmpzIGluc3RhbmNlXG4gICAgQHhtcHAgPSBuZXcgU3Ryb3BoZS5Db25uZWN0aW9uKCd3c3M6eWF0dGEubmluamE6NTI4MS94bXBwLXdlYnNvY2tldCcpXG4gICAgQHhtcHAuc2VuZF95YXR0YV9lbGVtZW50ID0gc2VuZF95YXR0YV9lbGVtZW50XG4gICAgIyNcbiAgICBAeG1wcC5yYXdJbnB1dCA9ICh4KS0+XG4gICAgICBjb25zb2xlLmxvZyBcIlJlY2VpdmU6IFwiK3hcbiAgICBAeG1wcC5yYXdPdXRwdXQgPSAoeCktPlxuICAgICAgY29uc29sZS5sb2cgXCJTZW5kOiBcIit4XG4gICAgIyNcblxuICAgIEB4bXBwLmNvbm5lY3QgXCJ5YXR0YS5uaW5qYVwiLCBcImFub255bW91c1wiLCAoc3RhdHVzKS0+XG4gICAgICBpZiBzdGF0dXMgaXMgU3Ryb3BoZS5TdGF0dXMuQ09OTkVDVEVEXG4gICAgICAgIHRoYXQueG1wcC5tdWMuam9pbiB0aGF0LnJvb20sIHRoYXQueG1wcC5qaWQuc3BsaXQoXCIvXCIpWzFdXG4gICAgICAgIHRoYXQueG1wcC5tdWMucm9vbXNbdGhhdC5yb29tXS5hZGRIYW5kbGVyIFwicHJlc2VuY2VcIiwgKHByZXNlbmNlLGNvbm4pLT5cbiAgICAgICAgICB0aGF0LmNvbm4gPSBjb25uXG4gICAgICAgICAgdGhhdC5jb25uZWN0aW9ucyA9IHRoYXQuY29ubi5yb3N0ZXJcbiAgICAgICAgICB0aGF0LmlkID0gdGhhdC5jb25uLm5pY2tcbiAgICAgICAgICBmb3IgZiBpbiB0aGF0LndoZW5fdXNlcl9pZF9zZXRcbiAgICAgICAgICAgIGYodGhhdC5pZClcblxuICAgICAgICAgIHBlcmZvcm1fd2hlbl9zeW5jZWQgPSAoc2VuZGVyKS0+XG4gICAgICAgICAgICBkZWxldGUgdGhhdC51bnN5bmNlZF9jb25uZWN0aW9uc1tzZW5kZXJdXG4gICAgICAgICAgICB0aGF0LmlzX3N5bmNlZCA9IHRydWVcbiAgICAgICAgICAgIGZvciBjb21wIGluIHRoYXQuY29tcHV0ZV93aGVuX3N5bmNlZFxuICAgICAgICAgICAgICBjb21wWzBdLmFwcGx5IHRoYXQsIGNvbXBbMS4uXVxuICAgICAgICAgICAgdGhhdC5jb21wdXRlX3doZW5fc3luY2VkID0gW11cbiAgICAgICAgICB0aGF0LmNvbm4uYWRkSGFuZGxlciBcIm1lc3NhZ2VcIiwgKG0pLT5cbiAgICAgICAgICAgIHNlbmRlciA9IG0uZ2V0QXR0cmlidXRlKFwiZnJvbVwiKS5zcGxpdChcIi9cIilbMV1cbiAgICAgICAgICAgIGlmIHNlbmRlciBpcyB0aGF0LmNvbm4ubmlja1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgZXJyb3Jfbm9kZSA9IG0ucXVlcnlTZWxlY3RvcihcImVycm9yXCIpXG4gICAgICAgICAgICBpZiBlcnJvcl9ub2RlP1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyBcIlNUUk9QSEU6IFNUQU5aQS1FUlJPUjogXCIrZXJyb3Jfbm9kZS50ZXh0Q29udGVudFxuICAgICAgICAgICAgICAjIG1vc3QgcHJvYmFibHkgdGhlIHVzZXIgdG8gd2hpY2ggeW91IHdhbnQgdG8gc3luYywgaXMgbm90IGF2YWlsYWJsZSBhbnltb3JlXG4gICAgICAgICAgICAgICMgVE9ETzogY2hlY2sgaWYgdGhhdCBpcyB0cnVlIGVycm9yID0gXCJSZWNpcGllbnQgbm90IGluIHJvb21cIlxuICAgICAgICAgICAgICBpZiB3YWl0X2Zvcl9jb25uZWN0aW9ucygpXG4gICAgICAgICAgICAgICAgdGhhdC5jb25uLmFkZEhhbmRsZXIgXCJwcmVzZW5jZVwiLCB3YWl0X2Zvcl9jb25uZWN0aW9ucyAjIHdhaXQgYWdhaW4gLSBzZWUgZG93blxuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgcmVzID0gcGFyc2VfbWVzc2FnZSBtXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlY2VpdmVkIHN0aDpcIisoaWYgcmVzLnN5bmNfc3RlcD8gdGhlbiAgXCIgLSBzeW5jX3N0ZXA6IFwiICsgcmVzLnN5bmNfc3RlcCBlbHNlIFwiXCIpIClcbiAgICAgICAgICAgIGNvbnNvbGUuZGlyKHJlcy5kYXRhKVxuICAgICAgICAgICAgaWYgcmVzLnN5bmNfc3RlcD9cbiAgICAgICAgICAgICAgaWYgcmVzLnN5bmNfc3RlcCArIDEgPCB0aGF0LnN5bmNfcHJvY2Vzc19vcmRlci5sZW5ndGhcbiAgICAgICAgICAgICAgICBpZiAocmVzLnN5bmNfc3RlcCBpcyAwKSBhbmQgKG5vdCB0aGF0LnVuc3luY2VkX2Nvbm5lY3Rpb25zW3NlbmRlcl0/KSBhbmQgKHJlcy5zdGFtcGVkIGlzbnQgXCJ0cnVlXCIpXG4gICAgICAgICAgICAgICAgICAjVE9ETzogZG8gSSBuZWVkIC5jYWxsID8/IChhbHNvIGluIFBlZXJqcyBjb25uZWN0b3IpXG4gICAgICAgICAgICAgICAgICB0aGF0LnhtcHAuc2VuZF95YXR0YV9lbGVtZW50IHRoYXQucm9vbSwgc2VuZGVyLCBlbmNvZGVfbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICBzeW5jX3N0ZXA6IDBcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogdGhhdC5zeW5jX3Byb2Nlc3Nfb3JkZXJbMF0uY2FsbCB0aGF0XG4gICAgICAgICAgICAgICAgICAgIHN0YW1wZWQ6IHRydWUgIyBUaGUgb3RoZXIgY29sbGFib3JhdG9yIGFscmVhZHkgc2VuZCBhIG1lc3NlZ2Ugd2l0aCBzeW5jX3N0ZXAgPSAwLCB3ZSB3YW50IHRvIG1ha2Ugc2h1cmUsIHRoYXQgaGUgZG9lc24ndCBzZW5kIGl0IGFnYWluXG4gICAgICAgICAgICAgICAgaWYgbm90IHRoYXQudW5zeW5jZWRfY29ubmVjdGlvbnNbc2VuZGVyXT9cbiAgICAgICAgICAgICAgICAgIHRoYXQudW5zeW5jZWRfY29ubmVjdGlvbnNbc2VuZGVyXSA9IHJlcy5zeW5jX3N0ZXBcbiAgICAgICAgICAgICAgICBpZiAobm90IHRoYXQudW5zeW5jZWRfY29ubmVjdGlvbnNbc2VuZGVyXT8pIG9yIHRoYXQudW5zeW5jZWRfY29ubmVjdGlvbnNbc2VuZGVyXSA8PSByZXMuc3luY19zdGVwXG4gICAgICAgICAgICAgICAgICAjIG9ubHkgY29tcHV0ZSBpZiB0aGUgc3luY19zdGVwIGlzIGV4cGVjdGVkIVxuICAgICAgICAgICAgICAgICAgZGF0YSA9IHRoYXQuc3luY19wcm9jZXNzX29yZGVyW3Jlcy5zeW5jX3N0ZXArMV0uY2FsbCB0aGF0LCByZXMuZGF0YVxuICAgICAgICAgICAgICAgICAgaWYgdGhhdC5zeW5jX3Byb2Nlc3Nfb3JkZXJbcmVzLnN5bmNfc3RlcCsyXT9cbiAgICAgICAgICAgICAgICAgICAgdGhhdC51bnN5bmNlZF9jb25uZWN0aW9uc1tzZW5kZXJdID0gcmVzLnN5bmNfc3RlcCArIDFcbiAgICAgICAgICAgICAgICAgICAgaWYgdGhhdC5pc19zeW5jZWRcbiAgICAgICAgICAgICAgICAgICAgICB0aGF0LnhtcHAuc2VuZF95YXR0YV9lbGVtZW50IHRoYXQucm9vbSwgc2VuZGVyLCBlbmNvZGVfbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICAgICAgc3luY19zdGVwOiByZXMuc3luY19zdGVwKzFcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICMgQWxsIHRoZSBjaGFuZ2VkIG9mIHRoaXMgY2xpZW50IHdlcmUgZ2VuZXJhdGVkIG9mZmxpbmUgKG5vIHN5bmMgdW50aWwgbm93KVxuICAgICAgICAgICAgICAgICAgICAgICMgTGV0cyBicm9hZGNhc3QgdGhlIGNoYW5nZXMgdG8gX2FsbF8gdGhlIGNsaWVudHMuXG4gICAgICAgICAgICAgICAgICAgICAgIyBCdXQgdGhlIGNsaWVudHMgbXVzdCBub3QgcmVuZXcgdGhlaXIgc3RhdGUgdmVjdG9yIGlmIHdlIGRvIGl0IGxpa2UgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICMgVE9ETzogRG8gSSByZWFsbHkgd2FudCB0byBkbyBpdCBsaWtlIHRoaXM/LCBJZiB3ZSByZWFsbHkgd29yayBvZmZsaW5lIChkaXNjb25uZWN0K3JlY29ubmVjdCksIHRoZW5cbiAgICAgICAgICAgICAgICAgICAgICAjIHRoaXMgYXBwcm9hY2ggbWF5IGxlYWQgdG8gc2VuZCB0aGUgSEIgdHdpY2VcbiAgICAgICAgICAgICAgICAgICAgICAjICAgLSBvbmNlIGluIHRoZSByb29tXG4gICAgICAgICAgICAgICAgICAgICAgIyAgIC0gb25jZSB0byBldmVyeSBjbGllbnRcbiAgICAgICAgICAgICAgICAgICAgICAjIEJ1dCwgb24gdGhlIG90aGVyIGhhbmQsIHRoaXMgbWF5IHNhZmUgYSBfbG90XyBvZiBtZXNzYWdlcyB1bmRlciBjaXJjdW1zdGFuY2VzLlxuICAgICAgICAgICAgICAgICAgICAgICMgRWl0aGVyIHdheTogVE9ETzogZGVmaW5lIHRoaXMgYXBwcm9hY2ggaW4gdGhlIENvbm5lY3RvciBjbGFzcy4gVGhpcyBhcHByb2FjaCBpcyBub3QgZ2VuZXJpYyFcbiAgICAgICAgICAgICAgICAgICAgICBkYXRhLnN0YXRlX3ZlY3RvciA9IFtdICMgQXJyYXksIGJlY2F1c2Ugb2Ygb3VyIHNwZWNpYWwgc3RhdGUtdmVjdG9yIGVuY29kaW5nXG4gICAgICAgICAgICAgICAgICAgICAgdGhhdC54bXBwLnNlbmRfeWF0dGFfZWxlbWVudCB0aGF0LnJvb20sIG51bGwsIGVuY29kZV9tZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICBzeW5jX3N0ZXA6IHJlcy5zeW5jX3N0ZXArMVxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBwZXJmb3JtX3doZW5fc3luY2VkKHNlbmRlcilcbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHBlcmZvcm1fd2hlbl9zeW5jZWQoc2VuZGVyKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBmb3IgZiBpbiB0aGF0LnJlY2VpdmVfaGFuZGxlcnNcbiAgICAgICAgICAgICAgICBmIHNlbmRlciwgcmVzLmRhdGFcbiAgICAgICAgICAgIHRydWVcblxuXG4gICAgICAgICAgIyBnZXRBcmJpdHJhcnlDb25uIHRoYXQgaXMgbm90IHRoaXMgdXNlclxuICAgICAgICAgIGdldEFyYml0cmFyeUNvbm4gPSAoKS0+XG4gICAgICAgICAgICBjX25hbWVzID0gZm9yIG4sdXNlciBvZiB0aGF0LmNvbm5lY3Rpb25zXG4gICAgICAgICAgICAgIHVzZXJcbiAgICAgICAgICAgIHRlbXBfbGVuZ3RoID0gY19uYW1lcy5sZW5ndGhcbiAgICAgICAgICAgIGNfbmFtZXMgPSBjX25hbWVzLmZpbHRlciAobiktPlxuICAgICAgICAgICAgICBuLm5pY2sgaXNudCB0aGF0LmNvbm4ubmlja1xuICAgICAgICAgICAgIyMjXG4gICAgICAgICAgICBpZiB0ZW1wX2xlbmd0aCBpcyBjX25hbWVzLmxlbmd0aFxuICAgICAgICAgICAgIyB3ZSBoYXZlbnQgcmVtb3ZlZCB0aGUgbmljayBvZiB0aGlzIG5pY2ssXG4gICAgICAgICAgICAjIHRoZXJlZm9yZSwgdGhlIHN0YW56YSBoYXMgbm90IHlldCBhcnJpdmVkXG4gICAgICAgICAgICAjIHdhaXQgdW50aWwgaXQgZG9lcyBhcnJpdmVcbiAgICAgICAgICAgIHJldHVybiBudWxsXG4gICAgICAgICAgICAjIyNcbiAgICAgICAgICAgIGlmIGNfbmFtZXMubGVuZ3RoID4gMFxuICAgICAgICAgICAgICBjX25hbWVzW01hdGgucm91bmQoTWF0aC5yYW5kb20oKSooY19uYW1lcy5sZW5ndGgtMSkpXS5uaWNrXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgbnVsbFxuXG4gICAgICAgICAgIyB3YWl0IGZvciBpbmNvbWluZyBjb25ucywgZ2V0IGFyYml0cmFyeUNvbm4ncyB1bnRpbCBzdWNjZXNzXG4gICAgICAgICAgd2FpdF9mb3JfY29ubmVjdGlvbnMgPSAtPlxuICAgICAgICAgICAgYXJiaXRyYXJ5Q29ubiA9IGdldEFyYml0cmFyeUNvbm4oKVxuICAgICAgICAgICAgaWYgYXJiaXRyYXJ5Q29ubj9cbiAgICAgICAgICAgICAgaWYgbm90IHRoYXQuX2lzU3luY2luZygpXG4gICAgICAgICAgICAgICAgdGhhdC51bnN5bmNlZF9jb25uZWN0aW9uc1thcmJpdHJhcnlDb25uXSA9IDBcbiAgICAgICAgICAgICAgICB0aGF0LnhtcHAuc2VuZF95YXR0YV9lbGVtZW50IHRoYXQucm9vbSwgYXJiaXRyYXJ5Q29ubiwgZW5jb2RlX21lc3NhZ2VcbiAgICAgICAgICAgICAgICAgIHN5bmNfc3RlcDogMFxuICAgICAgICAgICAgICAgICAgZGF0YTogdGhhdC5zeW5jX3Byb2Nlc3Nfb3JkZXJbMF0uY2FsbCB0aGF0XG4gICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIHRydWVcbiAgICAgICAgICAjIGNoZWNrIGlmIHRoZXJlIGFyZSBhbHJlYWR5IHVzZXJzIGluIHRoZSByb29tLCBhZGQgdG8gaGFuZGxlciBvdGhlcndpc2VcbiAgICAgICAgICBpZiB3YWl0X2Zvcl9jb25uZWN0aW9ucygpXG4gICAgICAgICAgICB0aGF0LmNvbm4uYWRkSGFuZGxlciBcInByZXNlbmNlXCIsIHdhaXRfZm9yX2Nvbm5lY3Rpb25zXG5cbiAgICAgICAgICB0aGF0LndoZW5TeW5jZWQgWy0+XG4gICAgICAgICAgICAgICMgV2hlbiBzeW5jZWQsIHBlcmZvcm0gYSBoYW5kc2hha2Ugd2l0aCBldmVyeW9uZVxuICAgICAgICAgICAgICAjIGFsc28gZXZlcnkgc2Vjb25kICogKG51bWJlciBvZiB1c2VycylcbiAgICAgICAgICAgICAgaGFuZHNoYWtlID0gLT5cbiAgICAgICAgICAgICAgICB0aGF0LnhtcHAuc2VuZF95YXR0YV9lbGVtZW50IHRoYXQucm9vbSwgbnVsbCwgZW5jb2RlX21lc3NhZ2VcbiAgICAgICAgICAgICAgICAgc3luY19zdGVwOiAwXG4gICAgICAgICAgICAgICAgIGRhdGE6IHRoYXQuc3luY19wcm9jZXNzX29yZGVyWzBdLmNhbGwgdGhhdFxuICAgICAgICAgICAgICBoYW5kc2hha2UoKVxuICAgICAgICAgICAgICAjIFRPRE86IG9ubHkgcGVyZm9ybSB3aGVuIHRoaXMgdXNlciBhY3R1YWxseSBjaGFuZ2VkIHN0aFxuICAgICAgICAgICAgICAjIFRPRE86IGFjdHVhbGx5IGltcGxlbWVudCBzdGggbGlrZSB0aGlzXG4gICAgICAgICAgICAgICMgIyAjIHNldEludGVydmFsKGhhbmRzaGFrZSwgMTAwMClcbiAgICAgICAgICAgIF1cbiAgICAgICAgICBmYWxzZVxuXG4gICMgdHJ1ZSBpZmYgY3VycmVudGx5IHRoaXMgY2xpZW50IGlzIHN5bmNpbmcgd2l0aCBhbm90aGVyIGNsaWVudFxuICBfaXNTeW5jaW5nOiAoKS0+XG4gICAgZXhpc3RzX3Vuc3luY2VkID0gZmFsc2VcbiAgICBmb3IgYyBvZiBAdW5zeW5jZWRfY29ubmVjdGlvbnNcbiAgICAgIGV4aXN0c191bnN5bmNlZCA9IHRydWVcbiAgICAgIGJyZWFrXG4gICAgZXhpc3RzX3Vuc3luY2VkXG5cbiAgaW52b2tlU3luYzogKCk9PlxuICAgIGlmIEBpc19zeW5jZWRcbiAgICAgIEB4bXBwLnNlbmRfeWF0dGFfZWxlbWVudCBAcm9vbSwgbnVsbCwgZW5jb2RlX21lc3NhZ2VcbiAgICAgICAgc3luY19zdGVwOiAwXG4gICAgICAgIGRhdGE6IEBzeW5jX3Byb2Nlc3Nfb3JkZXJbMF0uY2FsbCB0aGlzXG5cbiAgICAjIFRPRE86IGRvIGVycm9yIGhhbmRsaW5nXG4gICAgIyBUT0RPOiB5b3UganVzdCBjYW4ndCBzYXZlIHNvbyBtdWNoICh0aGluayBvZiBvZmZsaW5lIGVkaXRpbmcpXG4gIF9icm9hZGNhc3Q6IChtZXNzYWdlKS0+XG4gICAgaWYgQGNvbm4/XG4gICAgICAjIyNcbiAgICAgIGlmIEB4bXBwLl9wcm90by5zb2NrZXQ/XG4gICAgICAgICMgc29tZXRpbWVzIHN0cm9waGUgdGhyb3dzIGFuIGVycm9yIGJlY2F1c2UgdGhlIHNvY2tldCBkb2VzIG5vdCBleGlzdHNfdW5zeW5jZWRcbiAgICAgICAgIyBUaGlzIGhhcHBlbnMgb24gdGhlIFwiaWRsZVwiIHN0YXRlIGluIHN0cm9waGVcbiAgICAgICAgIyBDaGVja2luZyBmb3IgdGhlIGV4aXN0ZW5jZSBvZiBzb2NrZXQgaXMganVzdCBzb21lIGJ1Z2ZpeCFcbiAgICAgICAgQHhtcHAuc2VuZF95YXR0YV9lbGVtZW50IEByb29tLCBudWxsLCBlbmNvZGVfbWVzc2FnZVxuICAgICAgICAgIGRhdGE6IG1lc3NhZ2VcbiAgICAgIGVsc2VcbiAgICAgICMjI1xuICAgICAgaWYgQGlzX3N5bmNlZCAjIGFuZCBAeG1wcC5fcHJvdG8uc29ja2V0P1xuICAgICAgICBAeG1wcC5zZW5kX3lhdHRhX2VsZW1lbnQgQHJvb20sIG51bGwsIGVuY29kZV9tZXNzYWdlXG4gICAgICAgICAgZGF0YTogbWVzc2FnZVxuICAgICAgIyBlbHNlXG4gICAgICAjICBAd2hlblN5bmNlZCBbQF9icm9hZGNhc3QsIG1lc3NhZ2VdXG5cbiAgICAjIyMgYWxzbyBuaWNlIC4uXG4gICAgaWYgQGlzX3N5bmNlZFxuICAgICAgQHhtcHAuc2VuZF95YXR0YV9lbGVtZW50IEByb29tLCBudWxsLCBlbmNvZGVfbWVzc2FnZVxuICAgICAgICBkYXRhOiBtZXNzYWdlXG4gICAgZWxzZSBpZiBAX2lzU3luY2luZygpXG4gICAgICBAd2hlblN5bmNlZCBbIC0+XG4gICAgICAgICAgQHhtcHAuc2VuZF95YXR0YV9lbGVtZW50IEByb29tLCBudWxsLCBlbmNvZGVfbWVzc2FnZVxuICAgICAgICAgICAgZGF0YTogbWVzc2FnZVxuICAgICAgICBdXG4gICAgIyMjXG5cbiAgI1xuICAjIFNlbmQgYSBtZXNzYWdlIHRvIGEgcGVlciBvciBzZXQgb2YgcGVlcnMuIFRoaXMgaXMgcGVlcmpzIHNwZWNpZmljLlxuICAjIEBvdmVybG9hZCBfc2VuZChwZWVyaWQsIG1lc3NhZ2UpXG4gICMgICBAcGFyYW0gcGVlcmlkIHtTdHJpbmd9IFBlZXJKcyBjb25uZWN0aW9uIGlkIG9mIF9hbm90aGVyXyBwZWVyXG4gICMgICBAcGFyYW0gbWVzc2FnZSB7T2JqZWN0fSBTb21lIG9iamVjdCB0aGF0IHNoYWxsIGJlIHNlbmRcbiAgIyBAb3ZlcmxvYWQgX3NlbmQocGVlcmlkcywgbWVzc2FnZSlcbiAgIyAgIEBwYXJhbSBwZWVyaWRzIHtBcnJheTxTdHJpbmc+fSBQZWVySnMgY29ubmVjdGlvbiBpZHMgb2YgX290aGVyXyBwZWVyc1xuICAjICAgQHBhcmFtIG1lc3NhZ2Uge09iamVjdH0gU29tZSBvYmplY3QgdGhhdCBzaGFsbCBiZSBzZW5kXG4gICNcbiAgX3NlbmQ6IChwZWVyX3MsIG1lc3NhZ2UpLT5cbiAgICBpZiBwZWVyX3MuY29uc3RydWN0b3IgaXMgW10uY29uc3RydWN0b3JcbiAgICAgICMgVGhyb3cgZXJyb3JzIF9hZnRlcl8gdGhlIG1lc3NhZ2UgaGFzIGJlZW4gc2VudCB0byBhbGwgb3RoZXIgcGVlcnMuXG4gICAgICAjIEp1c3QgaW4gY2FzZSBhIGNvbm5lY3Rpb24gaXMgaW52YWxpZC5cbiAgICAgIGVycm9ycyA9IFtdXG4gICAgICBmb3IgcGVlciBpbiBwZWVyX3NcbiAgICAgICAgdHJ5XG4gICAgICAgICAgQHhtcHAuc2VuZF95YXR0YV9lbGVtZW50IEByb29tLCBAY29ubmVjdGlvbnNbcGVlcl0ubmljaywgZW5jb2RlX21lc3NhZ2VcbiAgICAgICAgICAgIGRhdGE6IG1lc3NhZ2VcbiAgICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgICAgICBlcnJvcnMucHVzaChlcnJvcitcIlwiKVxuICAgICAgaWYgZXJyb3JzLmxlbmd0aCA+IDBcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yIGVycm9yc1xuICAgIGVsc2VcbiAgICAgIEB4bXBwLnNlbmRfeWF0dGFfZWxlbWVudCBAcm9vbSwgQGNvbm5lY3Rpb25zW3BlZXJfc10ubmljaywgZW5jb2RlX21lc3NhZ2VcbiAgICAgICAgZGF0YTogbWVzc2FnZVxuXG5cbiJdfQ==
