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
    if (args.constructore === Function) {
      args = [args];
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9ib3dlcl9jb21wb25lbnRzL1lhdHRhLUNvbm5lY3RvcnMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvY29kaW8vd29ya3NwYWNlL2Jvd2VyX2NvbXBvbmVudHMvWWF0dGEtQ29ubmVjdG9ycy9saWIvY29ubmVjdG9yLmNvZmZlZSIsIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9ib3dlcl9jb21wb25lbnRzL1lhdHRhLUNvbm5lY3RvcnMvbGliL3N0cm9waGUtY29ubmVjdG9yL3N0cm9waGUtY29ubmVjdG9yLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0NBLElBQUEsU0FBQTs7QUFBQTtBQUVlLEVBQUEsbUJBQUEsR0FBQTtBQUVYLElBQUEsSUFBQyxDQUFBLFNBQUQsR0FBYSxLQUFiLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxtQkFBRCxHQUF1QixFQUZ2QixDQUFBO0FBQUEsSUFJQSxJQUFDLENBQUEsV0FBRCxHQUFlLEVBSmYsQ0FBQTtBQUFBLElBTUEsSUFBQyxDQUFBLG9CQUFELEdBQXdCLEVBTnhCLENBQUE7QUFBQSxJQVFBLElBQUMsQ0FBQSxnQkFBRCxHQUFvQixFQVJwQixDQUFBO0FBQUEsSUFVQSxJQUFDLENBQUEsa0JBQUQsR0FBc0IsRUFWdEIsQ0FBQTtBQUFBLElBV0EsSUFBQyxDQUFBLGdCQUFELEdBQW9CLEVBWHBCLENBRlc7RUFBQSxDQUFiOztBQUFBLHNCQWVBLHFCQUFBLEdBQXVCLFNBQUEsR0FBQTtXQUNyQixJQUFDLENBQUEsR0FEb0I7RUFBQSxDQWZ2QixDQUFBOztBQUFBLHNCQWtCQSxhQUFBLEdBQWUsU0FBQyxDQUFELEdBQUE7V0FDYixJQUFDLENBQUEsZ0JBQWdCLENBQUMsSUFBbEIsQ0FBdUIsQ0FBdkIsRUFEYTtFQUFBLENB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QSw2QkFnTUEsS0FBQSxHQUFPLFNBQUMsTUFBRCxFQUFTLE9BQVQsR0FBQTtBQUNMLFFBQUEsNkJBQUE7QUFBQSxJQUFBLElBQUcsTUFBTSxDQUFDLFdBQVAsS0FBc0IsRUFBRSxDQUFDLFdBQTVCO0FBR0UsTUFBQSxNQUFBLEdBQVMsRUFBVCxDQUFBO0FBQ0EsV0FBQSw2Q0FBQTswQkFBQTtBQUNFO0FBQ0UsVUFBQSxJQUFDLENBQUEsSUFBSSxDQUFDLGtCQUFOLENBQXlCLElBQUMsQ0FBQSxJQUExQixFQUFnQyxJQUFDLENBQUEsV0FBWSxDQUFBLElBQUEsQ0FBSyxDQUFDLElBQW5ELEVBQXlELGNBQUEsQ0FDdkQ7QUFBQSxZQUFBLElBQUEsRUFBTSxPQUFOO1dBRHVELENBQXpELENBQUEsQ0FERjtTQUFBLGNBQUE7QUFJRSxVQURJLGNBQ0osQ0FBQTtBQUFBLFVBQUEsTUFBTSxDQUFDLElBQVAsQ0FBWSxLQUFBLEdBQU0sRUFBbEIsQ0FBQSxDQUpGO1NBREY7QUFBQSxPQURBO0FBT0EsTUFBQSxJQUFHLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLENBQW5CO0FBQ0UsY0FBVSxJQUFBLEtBQUEsQ0FBTSxNQUFOLENBQVYsQ0FERjtPQVZGO0tBQUEsTUFBQTthQWFFLElBQUMsQ0FBQSxJQUFJLENBQUMsa0JBQU4sQ0FBeUIsSUFBQyxDQUFBLElBQTFCLEVBQWdDLElBQUMsQ0FBQSxXQUFZLENBQUEsTUFBQSxDQUFPLENBQUMsSUFBckQsRUFBMkQsY0FBQSxDQUN6RDtBQUFBLFFBQUEsSUFBQSxFQUFNLE9BQU47T0FEeUQsQ0FBM0QsRUFiRjtLQURLO0VBQUEsQ0FoTVAsQ0FBQTs7MEJBQUE7O0dBRnVELFVBdEd6RCxDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuY2xhc3MgQ29ubmVjdG9yXG4gIFxuICBjb25zdHJ1Y3RvcjogKCktPlxuICAgICMgaXMgc2V0IHRvIHRydWUgd2hlbiB0aGlzIGlzIHN5bmNlZCB3aXRoIGFsbCBvdGhlciBjb25uZWN0aW9uc1xuICAgIEBpc19zeW5jZWQgPSBmYWxzZVxuICAgICMgY29tcHV0ZSBhbGwgb2YgdGhlc2UgZnVuY3Rpb25zIHdoZW4gYWxsIGNvbm5lY3Rpb25zIGFyZSBzeW5jZWQuXG4gICAgQGNvbXB1dGVfd2hlbl9zeW5jZWQgPSBbXVxuICAgICMgUGVlcmpzIENvbm5lY3Rpb25zOiBrZXk6IGNvbm4taWQsIHZhbHVlOiBjb25uXG4gICAgQGNvbm5lY3Rpb25zID0ge31cbiAgICAjIENvbm5lY3Rpb25zLCB0aGF0IGhhdmUgYmVlbiBpbml0aWFsaXplZCwgYnV0IGhhdmUgbm90IGJlZW4gKGZ1bGx5KSBzeW5jZWQgeWV0LlxuICAgIEB1bnN5bmNlZF9jb25uZWN0aW9ucyA9IHt9XG4gICAgIyBMaXN0IG9mIGZ1bmN0aW9ucyB0aGF0IHNoYWxsIHByb2Nlc3MgaW5jb21pbmcgZGF0YVxuICAgIEByZWNlaXZlX2hhbmRsZXJzID0gW11cbiAgICAjIEEgbGlzdCBvZiBmdW5jdGlvbnMgdGhhdCBhcmUgZXhlY3V0ZWQgKGxlZnQgdG8gcmlnaHQpIHdoZW4gc3luY2luZyB3aXRoIGEgcGVlci4gXG4gICAgQHN5bmNfcHJvY2Vzc19vcmRlciA9IFtdXG4gICAgQHdoZW5fdXNlcl9pZF9zZXQgPSBbXVxuICBcbiAgZ2V0VW5pcXVlQ29ubmVjdGlvbklkOiAtPlxuICAgIEBpZCAjIG1ha2Ugc3VyZSwgdGhhdCBldmVyeSBjb25uZWN0b3IgaW1wbGVtZW50YXRpb24gZG9lcyBpdCBsaWtlIHRoaXNcbiAgXG4gIHdoZW5Vc2VySWRTZXQ6IChmKS0+XG4gICAgQHdoZW5fdXNlcl9pZF9zZXQucHVzaCBmXG4gIFxuICAjXG4gICMgRXhlY3V0ZSBhIGZ1bmN0aW9uIF93aGVuXyB3ZSBhcmUgY29ubmVjdGVkLiBJZiBub3QgY29ubmVjdGVkLCB3YWl0IHVudGlsIGNvbm5lY3RlZC5cbiAgIyBAcGFyYW0gZiB7RnVuY3Rpb259IFdpbGwgYmUgZXhlY3V0ZWQgb24gdGhlIFBlZXJKcy1Db25uZWN0b3IgY29udGV4dC5cbiAgI1xuICB3aGVuU3luY2VkOiAoYXJncyktPlxuICAgIGlmIGFyZ3MuY29uc3RydWN0b3JlIGlzIEZ1bmN0aW9uXG4gICAgICBhcmdzID0gW2FyZ3NdXG4gICAgaWYgQGlzX3N5bmNlZFxuICAgICAgYXJnc1swXS5hcHBseSB0aGlzLCBhcmdzWzEuLl1cbiAgICBlbHNlXG4gICAgICBAY29tcHV0ZV93aGVuX3N5bmNlZC5wdXNoIGFyZ3NcbiAgXG4gICNcbiAgIyBFeGVjdXRlIGFuIGZ1bmN0aW9uIF93aGVuXyBhIG1lc3NhZ2UgaXMgcmVjZWl2ZWQuXG4gICMgQHBhcmFtIGYge0Z1bmN0aW9ufSBXaWxsIGJlIGV4ZWN1dGVkIG9uIHRoZSBQZWVySnMtQ29ubmVjdG9yIGNvbnRleHQuIGYgd2lsbCBiZSBjYWxsZWQgd2l0aCAoc2VuZGVyX2lkLCBicm9hZGNhc3Qge3RydWV8ZmFsc2V9LCBtZXNzYWdlKS5cbiAgI1xuICB3aGVuUmVjZWl2aW5nOiAoZiktPlxuICAgIEByZWNlaXZlX2hhbmRsZXJzLnB1c2ggZlxuICBcbiAgI1xuICAjIFNlbmQgYSBtZXNzYWdlIHRvIGEgKHN1Yiktc2V0IG9mIGFsbCBjb25uZWN0ZWQgcGVlcnMuXG4gICMgQHBhcmFtIHBlZXJzIHtBcnJheTxjb25uZWN0aW9uX2lkcz59IEEgc2V0IG9mIGlkcy5cbiAgIyBAcGFyYW0gbWVzc2FnZSB7T2JqZWN0fSBUaGUgbWVzc2FnZSB0byBzZW5kLlxuICAjXG4gIG11bHRpY2FzdDogKHBlZXJzLCBtZXNzYWdlKS0+XG4gICAgQHdoZW5TeW5jZWQgW19zZW5kLCBwZWVycywgbWVzc2FnZV1cbiAgXG4gICNcbiAgIyBTZW5kIGEgbWVzc2FnZSB0byBvbmUgb2YgdGhlIGNvbm5lY3RlZCBwZWVycy5cbiAgIyBAcGFyYW0gcGVlcnMge2Nvbm5lY3Rpb25faWR9IEEgY29ubmVjdGlvbiBpZC5cbiAgIyBAcGFyYW0gbWVzc2FnZSB7T2JqZWN0fSBUaGUgbWVzc2FnZSB0byBzZW5kLlxuICAjXG4gIHVuaWNhc3Q6IChwZWVyLCBtZXNzYWdlKS0+XG4gICAgQHdoZW5TeW5jZWQgW19zZW5kLCBwZWVyLCBtZXNzYWdlXVxuICBcbiAgIyBcbiAgIyBCcm9hZGNhc3QgYSBtZXNzYWdlIHRvIGFsbCBjb25uZWN0ZWQgcGVlcnMuXG4gICMgQHBhcmFtIG1lc3NhZ2Uge09iamVjdH0gVGhlIG1lc3NhZ2UgdG8gYnJvYWRjYXN0LlxuICAjIFxuICBicm9hZGNhc3Q6IChtZXNzYWdlKS0+XG4gICAgQF9icm9hZGNhc3QobWVzc2FnZSlcblxuIFxuICAjXG4gICMgRGVmaW5lIGhvdyB5b3Ugd2FudCB0byBoYW5kbGUgdGhlIHN5bmMgcHJvY2VzcyBvZiB0d28gdXNlcnMuXG4gICMgVGhpcyBpcyBhIHN5bmNocm9ub3VzIGhhbmRzaGFrZS4gRXZlcnkgdXNlciB3aWxsIHBlcmZvcm0gZXhhY3RseSB0aGUgc2FtZSBhY3Rpb25zIGF0IHRoZSBzYW1lIHRpbWUuIEUuZy5cbiAgIyBAZXhhbXBsZVxuICAjICAgd2hlblN5bmNpbmcoZnVuY3Rpb24oKXsgLy8gZmlyc3QgY2FsbCBtdXN0IG5vdCBoYXZlIHBhcmFtZXRlcnMhXG4gICMgICAgICAgcmV0dXJuIHRoaXMuaWQ7IC8vIFNlbmQgdGhlIGlkIG9mIHRoaXMgY29ubmVjdG9yLlxuICAjICAgfSxmdW5jdGlvbihwZWVyaWQpeyAvLyB5b3UgcmVjZWl2ZSB0aGUgcGVlcmlkIG9mIHRoZSBvdGhlciBjb25uZWN0aW9ucy5cbiAgIyAgICAgICAvLyB5b3UgY2FuIGRvIHNvbWV0aGluZyB3aXRoIHRoZSBwZWVyaWRcbiAgIyAgICAgICAvLyByZXR1cm4gXCJ5b3UgYXJlIG15IGZyaWVuZFwiOyAvLyB5b3UgY291bGQgc2VuZCBhbm90aGVyIG1hc3NhZ2UuXG4gICMgICB9KTsgLy8gdGhpcyBpcyB0aGUgZW5kIG9mIHRoZSBzeW5jIHByb2Nlc3MuXG4gICNcbiAgd2hlblN5bmNpbmc6ICgpLT5cbiAgICBmb3IgaSBpbiBbKGFyZ3VtZW50cy5sZW5ndGgtMSkuLjBdXG4gICAgICBAc3luY19wcm9jZXNzX29yZGVyLnVuc2hpZnQgYXJndW1lbnRzW2ldXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbm5lY3RvclxuIiwiIyMjXG5QYXJhbWV0ZXJzOlxuKFN0cmluZykgbmljayAtIFRoZSBuaWNrIG5hbWUgdXNlZCBpbiB0aGUgY2hhdCByb29tLlxuKFN0cmluZykgbWVzc2FnZSAtIFRoZSBKc29uIG9iamVjdCB5b3Ugd2FudCB0byBlbmNvZGVcblJldHVybnM6XG5tc2dpcSAtIHRoZSB1bmlxdWUgaWQgdXNlZCB0byBzZW5kIHRoZSBtZXNzYWdlXG4jIyNcbnNlbmRfeWF0dGFfZWxlbWVudCA9IChyb29tLCBuaWNrLCBtZXNzYWdlKS0+XG4gIGFwcGVuZF9uaWNrID0gKHJvb20sIG5pY2spLT5cbiAgICBub2RlID0gU3Ryb3BoZS5lc2NhcGVOb2RlKFN0cm9waGUuZ2V0Tm9kZUZyb21KaWQocm9vbSkpXG4gICAgZG9tYWluID0gU3Ryb3BoZS5nZXREb21haW5Gcm9tSmlkKHJvb20pXG4gICAgbm9kZSArIFwiQFwiICsgZG9tYWluICsgKGlmIG5pY2s/IHRoZW4gXCIvXCIgKyBuaWNrIGVsc2UgXCJcIilcbiAgdHlwZSA9IGlmIG5pY2s/IHRoZW4gXCJjaGF0XCIgZWxzZSBcImdyb3VwY2hhdFwiXG4gIHJvb21fbmljayA9IGFwcGVuZF9uaWNrKHJvb20sIG5pY2spXG4gIG1zZ2lkID0gdGhpcy5nZXRVbmlxdWVJZCgpXG4gIG1zZyA9ICRtc2coXG4gICAgICB0bzogcm9vbV9uaWNrXG4gICAgICBmcm9tOiB0aGlzLmppZFxuICAgICAgdHlwZTogdHlwZVxuICAgICAgaWQ6IG1zZ2lkXG4gICAgKVxuICB3aW5kb3cubWVzc2FnZSA9IG1lc3NhZ2VcbiAgd2luZG93LmVuY29kZWRfbWVzc2FnZSA9IChuZXcgRE9NUGFyc2VyKCkpLnBhcnNlRnJvbVN0cmluZyhtZXNzYWdlLFwidGV4dC94bWxcIikucXVlcnlTZWxlY3RvcihcInlhdHRhXCIpXG4gIG1zZy5jbm9kZSh3aW5kb3cuZW5jb2RlZF9tZXNzYWdlKVxuICBtc2cudXAoKS51cCgpXG4gIHRoaXMuc2VuZChtc2cpXG4gIG1zZ2lkXG5cbkNvbm5lY3RvciA9IHJlcXVpcmUgJy4uL2Nvbm5lY3RvcidcblxuIyBDdXJyZW50bHksIHRoZSBIQiBlbmNvZGVzIG9wZXJhdGlvbnMgYXMgSlNPTi4gRm9yIHRoZSBtb21lbnQgSSB3YW50IHRvIGtlZXAgaXRcbiMgdGhhdCB3YXkuIE1heWJlIHdlIHN1cHBvcnQgZW5jb2RpbmcgaW4gdGhlIEhCIGFzIFhNTCBpbiB0aGUgZnV0dXJlLCBidXQgZm9yIG5vdyBJIGRvbid0IHdhbnRcbiMgdG9vIG11Y2ggb3ZlcmhlYWQuIFlhdHRhIGlzIHZlcnkgbGlrZWx5IHRvIGdldCBjaGFuZ2VkIGEgbG90IGluIHRoZSBmdXR1cmVcbiNcbiMgQmVjYXVzZSB3ZSBkb24ndCB3YW50IHRvIGVuY29kZSBKU09OIGFzIHN0cmluZyAod2l0aCBjaGFyYWN0ZXIgZXNjYXBpbmcsIHdpY2ggbWFrZXMgaXQgcHJldHR5IG11Y2ggdW5yZWFkYWJsZSlcbiMgd2UgZW5jb2RlIHRoZSBKU09OIGFzIFhNTC5cbiNcbiMgV2hlbiB0aGUgSEIgc3VwcG9ydCBlbmNvZGluZyBhcyBYTUwsIHRoZSBmb3JtYXQgc2hvdWxkIGxvb2sgcHJldHR5IG11Y2ggbGlrZSB0aGlzLlxuXG4jIGRvZXMgbm90IHN1cHBvcnQgcHJpbWl0aXZlIHZhbHVlcyBhcyBhcnJheSBlbGVtZW50c1xucGFyc2VfbWVzc2FnZSA9IChtZXNzYWdlKS0+XG4gIHBhcnNlX2FycmF5ID0gKG5vZGUpLT5cbiAgICBmb3IgbiBpbiBub2RlLmNoaWxkcmVuXG4gICAgICBpZiBuLmdldEF0dHJpYnV0ZShcImlzQXJyYXlDb250YWluZXJcIikgaXMgXCJ0cnVlXCJcbiAgICAgICAgcGFyc2VfYXJyYXkgblxuICAgICAgZWxzZVxuICAgICAgICBwYXJzZV9vYmplY3QgblxuXG4gIHBhcnNlX29iamVjdCA9IChub2RlKS0+XG4gICAganNvbiA9IHt9XG4gICAgZm9yIGF0dHIgaW4gbm9kZS5hdHRyaWJ1dGVzXG4gICAgICBpbnQgPSBwYXJzZUludChhdHRyLnZhbHVlKVxuICAgICAgaWYgaXNOYU4oaW50KSBvciAoXCJcIitpbnQpIGlzbnQgYXR0ci52YWx1ZVxuICAgICAgICBqc29uW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlXG4gICAgICBlbHNlXG4gICAgICAgIGpzb25bYXR0ci5uYW1lXSA9IGludFxuICAgIGZvciBuIGluIG5vZGUuY2hpbGRyZW5cbiAgICAgIG5hbWUgPSBuLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgICAgaWYgbi5nZXRBdHRyaWJ1dGUoXCJpc0FycmF5Q29udGFpbmVyXCIpIGlzIFwidHJ1ZVwiXG4gICAgICAgIGpzb25bbmFtZV0gPSBwYXJzZV9hcnJheSBuXG4gICAgICBlbHNlXG4gICAgICAgIGpzb25bbmFtZV0gPSBwYXJzZV9vYmplY3QgblxuICAgIGpzb25cbiAgcGFyc2Vfb2JqZWN0IG1lc3NhZ2UucXVlcnlTZWxlY3RvcihcInlhdHRhXCIpXG5cbiMgZW5jb2RlIG1lc3NhZ2UgaW4geG1sXG4jIHdlIHVzZSBzdHJpbmcgYmVjYXVzZSBTdHJvcGhlIG9ubHkgYWNjZXB0cyBhbiBcInhtbC1zdHJpbmdcIi4uXG4jIFNvIHthOjQsYjp7Yzo1fX0gd2lsbCBsb29rIGxpa2VcbiMgPHlhdHRhIGE9XCI0XCI+XG4jICAgPGIgYz1cIjVcIj48L2I+XG4jIDwveWF0dGE+XG4jXG5lbmNvZGVfbWVzc2FnZSA9IChtZXNzYWdlKS0+XG4gICMgYXR0cmlidXRlcyBpcyBvcHRpb25hbFxuICBlbmNvZGVfb2JqZWN0ID0gKHRhZ25hbWUsIG1lc3NhZ2UsIGF0dHJpYnV0ZXMpLT5cbiAgICBlbmNfdGFnID0gXCI8XCIrdGFnbmFtZVxuICAgIGlmIGF0dHJpYnV0ZXM/XG4gICAgICBlbmNfdGFnICs9IFwiIFwiK2F0dHJpYnV0ZXNcbiAgICBlbmNfaW5uZXIgPSBcIlwiXG4gICAgZm9yIG5hbWUsdmFsdWUgb2YgbWVzc2FnZVxuICAgICAgaWYgbm90IHZhbHVlP1xuICAgICAgICAjIG5vcFxuICAgICAgZWxzZSBpZiB2YWx1ZS5jb25zdHJ1Y3RvciBpcyBPYmplY3RcbiAgICAgICAgZW5jX2lubmVyICs9IGVuY29kZV9vYmplY3QgbmFtZSwgdmFsdWVcbiAgICAgIGVsc2UgaWYgdmFsdWUuY29uc3RydWN0b3IgaXMgQXJyYXlcbiAgICAgICAgZW5jX2lubmVyICs9IGVuY29kZV9hcnJheSBuYW1lLCB2YWx1ZVxuICAgICAgZWxzZVxuICAgICAgICBlbmNfdGFnICs9IFwiIFwiK25hbWUrJz1cIicrdmFsdWUrJ1wiJ1xuICAgIGVuY190YWcgKyBcIj5cIitlbmNfaW5uZXIrXCI8L1wiK3RhZ25hbWUrXCI+XCJcbiAgZW5jb2RlX2FycmF5ID0gKHRhZ25hbWUsIG1lc3NhZ2UpLT5cbiAgICBlbmMgPSBcIjxcIit0YWduYW1lKycgaXNBcnJheUNvbnRhaW5lcj1cInRydWVcIj4nXG4gICAgZm9yIG0gaW4gbWVzc2FnZVxuICAgICAgaWYgbS5jb25zdHJ1Y3RvciBpcyBPYmplY3RcbiAgICAgICAgZW5jICs9IGVuY29kZV9vYmplY3QgXCJhcnJheS1lbGVtZW50XCIsIG1cbiAgICAgIGVsc2VcbiAgICAgICAgZW5jICs9IGVuY29kZV9hcnJheSBcImFycmF5LWVsZW1lbnRcIiwgbVxuICAgIGVuYyArPSBcIjwvXCIrdGFnbmFtZStcIj5cIlxuICBlbmNvZGVfb2JqZWN0ICd5YXR0YScsIG1lc3NhZ2UsICd4bWxucz1cImh0dHA6Ly95YXR0YS5uaW5qYS9jb25uZWN0b3Itc3RhbnphXCInXG5cblN0cm9waGUubG9nID0gKHN0YXR1cywgbXNnKS0+XG4gIGNvbnNvbGUubG9nKFwiU1RST1BIRTogXCIrbXNnKVxuXG53aW5kb3cuU3Ryb2hwZUNvbm5lY3RvciA9IGNsYXNzIFN0cm9ocGVDb25uZWN0b3IgZXh0ZW5kcyBDb25uZWN0b3JcblxuICBjb25zdHJ1Y3RvcjogKEByb29tID0gXCJ0aGluZ1wiKS0+XG4gICAgc3VwZXIoKVxuICAgIHRoYXQgPSBAXG4gICAgQHJvb20gPSBAcm9vbStcIkBjb25mZXJlbmNlLnlhdHRhLm5pbmphXCJcbiAgICBAdW5zeW5jZWRfY29ubmVjdGlvbnMgPSB7fVxuXG4gICAgIyBDcmVhdGUgdGhlIFBlZXJqcyBpbnN0YW5jZVxuICAgIEB4bXBwID0gbmV3IFN0cm9waGUuQ29ubmVjdGlvbignd3NzOnlhdHRhLm5pbmphOjUyODEveG1wcC13ZWJzb2NrZXQnKVxuICAgIEB4bXBwLnNlbmRfeWF0dGFfZWxlbWVudCA9IHNlbmRfeWF0dGFfZWxlbWVudFxuICAgICMjXG4gICAgQHhtcHAucmF3SW5wdXQgPSAoeCktPlxuICAgICAgY29uc29sZS5sb2cgXCJSZWNlaXZlOiBcIit4XG4gICAgQHhtcHAucmF3T3V0cHV0ID0gKHgpLT5cbiAgICAgIGNvbnNvbGUubG9nIFwiU2VuZDogXCIreFxuICAgICMjXG5cbiAgICBAeG1wcC5jb25uZWN0IFwieWF0dGEubmluamFcIiwgXCJhbm9ueW1vdXNcIiwgKHN0YXR1cyktPlxuICAgICAgaWYgc3RhdHVzIGlzIFN0cm9waGUuU3RhdHVzLkNPTk5FQ1RFRFxuICAgICAgICB0aGF0LnhtcHAubXVjLmpvaW4gdGhhdC5yb29tLCB0aGF0LnhtcHAuamlkLnNwbGl0KFwiL1wiKVsxXVxuICAgICAgICB0aGF0LnhtcHAubXVjLnJvb21zW3RoYXQucm9vbV0uYWRkSGFuZGxlciBcInByZXNlbmNlXCIsIChwcmVzZW5jZSxjb25uKS0+XG4gICAgICAgICAgdGhhdC5jb25uID0gY29ublxuICAgICAgICAgIHRoYXQuY29ubmVjdGlvbnMgPSB0aGF0LmNvbm4ucm9zdGVyXG4gICAgICAgICAgdGhhdC5pZCA9IHRoYXQuY29ubi5uaWNrXG4gICAgICAgICAgZm9yIGYgaW4gdGhhdC53aGVuX3VzZXJfaWRfc2V0XG4gICAgICAgICAgICBmKHRoYXQuaWQpXG5cbiAgICAgICAgICBwZXJmb3JtX3doZW5fc3luY2VkID0gKHNlbmRlciktPlxuICAgICAgICAgICAgZGVsZXRlIHRoYXQudW5zeW5jZWRfY29ubmVjdGlvbnNbc2VuZGVyXVxuICAgICAgICAgICAgdGhhdC5pc19zeW5jZWQgPSB0cnVlXG4gICAgICAgICAgICBmb3IgY29tcCBpbiB0aGF0LmNvbXB1dGVfd2hlbl9zeW5jZWRcbiAgICAgICAgICAgICAgY29tcFswXS5hcHBseSB0aGF0LCBjb21wWzEuLl1cbiAgICAgICAgICAgIHRoYXQuY29tcHV0ZV93aGVuX3N5bmNlZCA9IFtdXG4gICAgICAgICAgdGhhdC5jb25uLmFkZEhhbmRsZXIgXCJtZXNzYWdlXCIsIChtKS0+XG4gICAgICAgICAgICBzZW5kZXIgPSBtLmdldEF0dHJpYnV0ZShcImZyb21cIikuc3BsaXQoXCIvXCIpWzFdXG4gICAgICAgICAgICBpZiBzZW5kZXIgaXMgdGhhdC5jb25uLm5pY2tcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIGVycm9yX25vZGUgPSBtLnF1ZXJ5U2VsZWN0b3IoXCJlcnJvclwiKVxuICAgICAgICAgICAgaWYgZXJyb3Jfbm9kZT9cbiAgICAgICAgICAgICAgY29uc29sZS5sb2cgXCJTVFJPUEhFOiBTVEFOWkEtRVJST1I6IFwiK2Vycm9yX25vZGUudGV4dENvbnRlbnRcbiAgICAgICAgICAgICAgIyBtb3N0IHByb2JhYmx5IHRoZSB1c2VyIHRvIHdoaWNoIHlvdSB3YW50IHRvIHN5bmMsIGlzIG5vdCBhdmFpbGFibGUgYW55bW9yZVxuICAgICAgICAgICAgICAjIFRPRE86IGNoZWNrIGlmIHRoYXQgaXMgdHJ1ZSBlcnJvciA9IFwiUmVjaXBpZW50IG5vdCBpbiByb29tXCJcbiAgICAgICAgICAgICAgaWYgd2FpdF9mb3JfY29ubmVjdGlvbnMoKVxuICAgICAgICAgICAgICAgIHRoYXQuY29ubi5hZGRIYW5kbGVyIFwicHJlc2VuY2VcIiwgd2FpdF9mb3JfY29ubmVjdGlvbnMgIyB3YWl0IGFnYWluIC0gc2VlIGRvd25cbiAgICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICAgIHJlcyA9IHBhcnNlX21lc3NhZ2UgbVxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZWNlaXZlZCBzdGg6XCIrKGlmIHJlcy5zeW5jX3N0ZXA/IHRoZW4gIFwiIC0gc3luY19zdGVwOiBcIiArIHJlcy5zeW5jX3N0ZXAgZWxzZSBcIlwiKSApXG4gICAgICAgICAgICBjb25zb2xlLmRpcihyZXMuZGF0YSlcbiAgICAgICAgICAgIGlmIHJlcy5zeW5jX3N0ZXA/XG4gICAgICAgICAgICAgIGlmIHJlcy5zeW5jX3N0ZXAgKyAxIDwgdGhhdC5zeW5jX3Byb2Nlc3Nfb3JkZXIubGVuZ3RoXG4gICAgICAgICAgICAgICAgaWYgKHJlcy5zeW5jX3N0ZXAgaXMgMCkgYW5kIChub3QgdGhhdC51bnN5bmNlZF9jb25uZWN0aW9uc1tzZW5kZXJdPykgYW5kIChyZXMuc3RhbXBlZCBpc250IFwidHJ1ZVwiKVxuICAgICAgICAgICAgICAgICAgI1RPRE86IGRvIEkgbmVlZCAuY2FsbCA/PyAoYWxzbyBpbiBQZWVyanMgY29ubmVjdG9yKVxuICAgICAgICAgICAgICAgICAgdGhhdC54bXBwLnNlbmRfeWF0dGFfZWxlbWVudCB0aGF0LnJvb20sIHNlbmRlciwgZW5jb2RlX21lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgc3luY19zdGVwOiAwXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHRoYXQuc3luY19wcm9jZXNzX29yZGVyWzBdLmNhbGwgdGhhdFxuICAgICAgICAgICAgICAgICAgICBzdGFtcGVkOiB0cnVlICMgVGhlIG90aGVyIGNvbGxhYm9yYXRvciBhbHJlYWR5IHNlbmQgYSBtZXNzZWdlIHdpdGggc3luY19zdGVwID0gMCwgd2Ugd2FudCB0byBtYWtlIHNodXJlLCB0aGF0IGhlIGRvZXNuJ3Qgc2VuZCBpdCBhZ2FpblxuICAgICAgICAgICAgICAgIGlmIG5vdCB0aGF0LnVuc3luY2VkX2Nvbm5lY3Rpb25zW3NlbmRlcl0/XG4gICAgICAgICAgICAgICAgICB0aGF0LnVuc3luY2VkX2Nvbm5lY3Rpb25zW3NlbmRlcl0gPSByZXMuc3luY19zdGVwXG4gICAgICAgICAgICAgICAgaWYgKG5vdCB0aGF0LnVuc3luY2VkX2Nvbm5lY3Rpb25zW3NlbmRlcl0/KSBvciB0aGF0LnVuc3luY2VkX2Nvbm5lY3Rpb25zW3NlbmRlcl0gPD0gcmVzLnN5bmNfc3RlcFxuICAgICAgICAgICAgICAgICAgIyBvbmx5IGNvbXB1dGUgaWYgdGhlIHN5bmNfc3RlcCBpcyBleHBlY3RlZCFcbiAgICAgICAgICAgICAgICAgIGRhdGEgPSB0aGF0LnN5bmNfcHJvY2Vzc19vcmRlcltyZXMuc3luY19zdGVwKzFdLmNhbGwgdGhhdCwgcmVzLmRhdGFcbiAgICAgICAgICAgICAgICAgIGlmIHRoYXQuc3luY19wcm9jZXNzX29yZGVyW3Jlcy5zeW5jX3N0ZXArMl0/XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudW5zeW5jZWRfY29ubmVjdGlvbnNbc2VuZGVyXSA9IHJlcy5zeW5jX3N0ZXAgKyAxXG4gICAgICAgICAgICAgICAgICAgIGlmIHRoYXQuaXNfc3luY2VkXG4gICAgICAgICAgICAgICAgICAgICAgdGhhdC54bXBwLnNlbmRfeWF0dGFfZWxlbWVudCB0aGF0LnJvb20sIHNlbmRlciwgZW5jb2RlX21lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHN5bmNfc3RlcDogcmVzLnN5bmNfc3RlcCsxXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAjIEFsbCB0aGUgY2hhbmdlZCBvZiB0aGlzIGNsaWVudCB3ZXJlIGdlbmVyYXRlZCBvZmZsaW5lIChubyBzeW5jIHVudGlsIG5vdylcbiAgICAgICAgICAgICAgICAgICAgICAjIExldHMgYnJvYWRjYXN0IHRoZSBjaGFuZ2VzIHRvIF9hbGxfIHRoZSBjbGllbnRzLlxuICAgICAgICAgICAgICAgICAgICAgICMgQnV0IHRoZSBjbGllbnRzIG11c3Qgbm90IHJlbmV3IHRoZWlyIHN0YXRlIHZlY3RvciBpZiB3ZSBkbyBpdCBsaWtlIHRoaXNcbiAgICAgICAgICAgICAgICAgICAgICAjIFRPRE86IERvIEkgcmVhbGx5IHdhbnQgdG8gZG8gaXQgbGlrZSB0aGlzPywgSWYgd2UgcmVhbGx5IHdvcmsgb2ZmbGluZSAoZGlzY29ubmVjdCtyZWNvbm5lY3QpLCB0aGVuXG4gICAgICAgICAgICAgICAgICAgICAgIyB0aGlzIGFwcHJvYWNoIG1heSBsZWFkIHRvIHNlbmQgdGhlIEhCIHR3aWNlXG4gICAgICAgICAgICAgICAgICAgICAgIyAgIC0gb25jZSBpbiB0aGUgcm9vbVxuICAgICAgICAgICAgICAgICAgICAgICMgICAtIG9uY2UgdG8gZXZlcnkgY2xpZW50XG4gICAgICAgICAgICAgICAgICAgICAgIyBCdXQsIG9uIHRoZSBvdGhlciBoYW5kLCB0aGlzIG1heSBzYWZlIGEgX2xvdF8gb2YgbWVzc2FnZXMgdW5kZXIgY2lyY3Vtc3RhbmNlcy5cbiAgICAgICAgICAgICAgICAgICAgICAjIEVpdGhlciB3YXk6IFRPRE86IGRlZmluZSB0aGlzIGFwcHJvYWNoIGluIHRoZSBDb25uZWN0b3IgY2xhc3MuIFRoaXMgYXBwcm9hY2ggaXMgbm90IGdlbmVyaWMhXG4gICAgICAgICAgICAgICAgICAgICAgZGF0YS5zdGF0ZV92ZWN0b3IgPSBbXSAjIEFycmF5LCBiZWNhdXNlIG9mIG91ciBzcGVjaWFsIHN0YXRlLXZlY3RvciBlbmNvZGluZ1xuICAgICAgICAgICAgICAgICAgICAgIHRoYXQueG1wcC5zZW5kX3lhdHRhX2VsZW1lbnQgdGhhdC5yb29tLCBudWxsLCBlbmNvZGVfbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICAgICAgc3luY19zdGVwOiByZXMuc3luY19zdGVwKzFcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcGVyZm9ybV93aGVuX3N5bmNlZChzZW5kZXIpXG4gICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBwZXJmb3JtX3doZW5fc3luY2VkKHNlbmRlcilcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgZm9yIGYgaW4gdGhhdC5yZWNlaXZlX2hhbmRsZXJzXG4gICAgICAgICAgICAgICAgZiBzZW5kZXIsIHJlcy5kYXRhXG4gICAgICAgICAgICB0cnVlXG5cblxuICAgICAgICAgICMgZ2V0QXJiaXRyYXJ5Q29ubiB0aGF0IGlzIG5vdCB0aGlzIHVzZXJcbiAgICAgICAgICBnZXRBcmJpdHJhcnlDb25uID0gKCktPlxuICAgICAgICAgICAgY19uYW1lcyA9IGZvciBuLHVzZXIgb2YgdGhhdC5jb25uZWN0aW9uc1xuICAgICAgICAgICAgICB1c2VyXG4gICAgICAgICAgICB0ZW1wX2xlbmd0aCA9IGNfbmFtZXMubGVuZ3RoXG4gICAgICAgICAgICBjX25hbWVzID0gY19uYW1lcy5maWx0ZXIgKG4pLT5cbiAgICAgICAgICAgICAgbi5uaWNrIGlzbnQgdGhhdC5jb25uLm5pY2tcbiAgICAgICAgICAgICMjI1xuICAgICAgICAgICAgaWYgdGVtcF9sZW5ndGggaXMgY19uYW1lcy5sZW5ndGhcbiAgICAgICAgICAgICMgd2UgaGF2ZW50IHJlbW92ZWQgdGhlIG5pY2sgb2YgdGhpcyBuaWNrLFxuICAgICAgICAgICAgIyB0aGVyZWZvcmUsIHRoZSBzdGFuemEgaGFzIG5vdCB5ZXQgYXJyaXZlZFxuICAgICAgICAgICAgIyB3YWl0IHVudGlsIGl0IGRvZXMgYXJyaXZlXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICAgICAgIyMjXG4gICAgICAgICAgICBpZiBjX25hbWVzLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgY19uYW1lc1tNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkqKGNfbmFtZXMubGVuZ3RoLTEpKV0ubmlja1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgIG51bGxcblxuICAgICAgICAgICMgd2FpdCBmb3IgaW5jb21pbmcgY29ubnMsIGdldCBhcmJpdHJhcnlDb25uJ3MgdW50aWwgc3VjY2Vzc1xuICAgICAgICAgIHdhaXRfZm9yX2Nvbm5lY3Rpb25zID0gLT5cbiAgICAgICAgICAgIGFyYml0cmFyeUNvbm4gPSBnZXRBcmJpdHJhcnlDb25uKClcbiAgICAgICAgICAgIGlmIGFyYml0cmFyeUNvbm4/XG4gICAgICAgICAgICAgIGlmIG5vdCB0aGF0Ll9pc1N5bmNpbmcoKVxuICAgICAgICAgICAgICAgIHRoYXQudW5zeW5jZWRfY29ubmVjdGlvbnNbYXJiaXRyYXJ5Q29ubl0gPSAwXG4gICAgICAgICAgICAgICAgdGhhdC54bXBwLnNlbmRfeWF0dGFfZWxlbWVudCB0aGF0LnJvb20sIGFyYml0cmFyeUNvbm4sIGVuY29kZV9tZXNzYWdlXG4gICAgICAgICAgICAgICAgICBzeW5jX3N0ZXA6IDBcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHRoYXQuc3luY19wcm9jZXNzX29yZGVyWzBdLmNhbGwgdGhhdFxuICAgICAgICAgICAgICBmYWxzZVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICB0cnVlXG4gICAgICAgICAgIyBjaGVjayBpZiB0aGVyZSBhcmUgYWxyZWFkeSB1c2VycyBpbiB0aGUgcm9vbSwgYWRkIHRvIGhhbmRsZXIgb3RoZXJ3aXNlXG4gICAgICAgICAgaWYgd2FpdF9mb3JfY29ubmVjdGlvbnMoKVxuICAgICAgICAgICAgdGhhdC5jb25uLmFkZEhhbmRsZXIgXCJwcmVzZW5jZVwiLCB3YWl0X2Zvcl9jb25uZWN0aW9uc1xuXG4gICAgICAgICAgdGhhdC53aGVuU3luY2VkIFstPlxuICAgICAgICAgICAgICAjIFdoZW4gc3luY2VkLCBwZXJmb3JtIGEgaGFuZHNoYWtlIHdpdGggZXZlcnlvbmVcbiAgICAgICAgICAgICAgIyBhbHNvIGV2ZXJ5IHNlY29uZCAqIChudW1iZXIgb2YgdXNlcnMpXG4gICAgICAgICAgICAgIGhhbmRzaGFrZSA9IC0+XG4gICAgICAgICAgICAgICAgdGhhdC54bXBwLnNlbmRfeWF0dGFfZWxlbWVudCB0aGF0LnJvb20sIG51bGwsIGVuY29kZV9tZXNzYWdlXG4gICAgICAgICAgICAgICAgIHN5bmNfc3RlcDogMFxuICAgICAgICAgICAgICAgICBkYXRhOiB0aGF0LnN5bmNfcHJvY2Vzc19vcmRlclswXS5jYWxsIHRoYXRcbiAgICAgICAgICAgICAgaGFuZHNoYWtlKClcbiAgICAgICAgICAgICAgIyBUT0RPOiBvbmx5IHBlcmZvcm0gd2hlbiB0aGlzIHVzZXIgYWN0dWFsbHkgY2hhbmdlZCBzdGhcbiAgICAgICAgICAgICAgIyBUT0RPOiBhY3R1YWxseSBpbXBsZW1lbnQgc3RoIGxpa2UgdGhpc1xuICAgICAgICAgICAgICAjICMgIyBzZXRJbnRlcnZhbChoYW5kc2hha2UsIDEwMDApXG4gICAgICAgICAgICBdXG4gICAgICAgICAgZmFsc2VcblxuICAjIHRydWUgaWZmIGN1cnJlbnRseSB0aGlzIGNsaWVudCBpcyBzeW5jaW5nIHdpdGggYW5vdGhlciBjbGllbnRcbiAgX2lzU3luY2luZzogKCktPlxuICAgIGV4aXN0c191bnN5bmNlZCA9IGZhbHNlXG4gICAgZm9yIGMgb2YgQHVuc3luY2VkX2Nvbm5lY3Rpb25zXG4gICAgICBleGlzdHNfdW5zeW5jZWQgPSB0cnVlXG4gICAgICBicmVha1xuICAgIGV4aXN0c191bnN5bmNlZFxuXG4gIGludm9rZVN5bmM6ICgpPT5cbiAgICBpZiBAaXNfc3luY2VkXG4gICAgICBAeG1wcC5zZW5kX3lhdHRhX2VsZW1lbnQgQHJvb20sIG51bGwsIGVuY29kZV9tZXNzYWdlXG4gICAgICAgIHN5bmNfc3RlcDogMFxuICAgICAgICBkYXRhOiBAc3luY19wcm9jZXNzX29yZGVyWzBdLmNhbGwgdGhpc1xuXG4gICAgIyBUT0RPOiBkbyBlcnJvciBoYW5kbGluZ1xuICAgICMgVE9ETzogeW91IGp1c3QgY2FuJ3Qgc2F2ZSBzb28gbXVjaCAodGhpbmsgb2Ygb2ZmbGluZSBlZGl0aW5nKVxuICBfYnJvYWRjYXN0OiAobWVzc2FnZSktPlxuICAgIGlmIEBjb25uP1xuICAgICAgIyMjXG4gICAgICBpZiBAeG1wcC5fcHJvdG8uc29ja2V0P1xuICAgICAgICAjIHNvbWV0aW1lcyBzdHJvcGhlIHRocm93cyBhbiBlcnJvciBiZWNhdXNlIHRoZSBzb2NrZXQgZG9lcyBub3QgZXhpc3RzX3Vuc3luY2VkXG4gICAgICAgICMgVGhpcyBoYXBwZW5zIG9uIHRoZSBcImlkbGVcIiBzdGF0ZSBpbiBzdHJvcGhlXG4gICAgICAgICMgQ2hlY2tpbmcgZm9yIHRoZSBleGlzdGVuY2Ugb2Ygc29ja2V0IGlzIGp1c3Qgc29tZSBidWdmaXghXG4gICAgICAgIEB4bXBwLnNlbmRfeWF0dGFfZWxlbWVudCBAcm9vbSwgbnVsbCwgZW5jb2RlX21lc3NhZ2VcbiAgICAgICAgICBkYXRhOiBtZXNzYWdlXG4gICAgICBlbHNlXG4gICAgICAjIyNcbiAgICAgIGlmIEBpc19zeW5jZWQgIyBhbmQgQHhtcHAuX3Byb3RvLnNvY2tldD9cbiAgICAgICAgQHhtcHAuc2VuZF95YXR0YV9lbGVtZW50IEByb29tLCBudWxsLCBlbmNvZGVfbWVzc2FnZVxuICAgICAgICAgIGRhdGE6IG1lc3NhZ2VcbiAgICAgICMgZWxzZVxuICAgICAgIyAgQHdoZW5TeW5jZWQgW0BfYnJvYWRjYXN0LCBtZXNzYWdlXVxuXG4gICAgIyMjIGFsc28gbmljZSAuLlxuICAgIGlmIEBpc19zeW5jZWRcbiAgICAgIEB4bXBwLnNlbmRfeWF0dGFfZWxlbWVudCBAcm9vbSwgbnVsbCwgZW5jb2RlX21lc3NhZ2VcbiAgICAgICAgZGF0YTogbWVzc2FnZVxuICAgIGVsc2UgaWYgQF9pc1N5bmNpbmcoKVxuICAgICAgQHdoZW5TeW5jZWQgWyAtPlxuICAgICAgICAgIEB4bXBwLnNlbmRfeWF0dGFfZWxlbWVudCBAcm9vbSwgbnVsbCwgZW5jb2RlX21lc3NhZ2VcbiAgICAgICAgICAgIGRhdGE6IG1lc3NhZ2VcbiAgICAgICAgXVxuICAgICMjI1xuXG4gICNcbiAgIyBTZW5kIGEgbWVzc2FnZSB0byBhIHBlZXIgb3Igc2V0IG9mIHBlZXJzLiBUaGlzIGlzIHBlZXJqcyBzcGVjaWZpYy5cbiAgIyBAb3ZlcmxvYWQgX3NlbmQocGVlcmlkLCBtZXNzYWdlKVxuICAjICAgQHBhcmFtIHBlZXJpZCB7U3RyaW5nfSBQZWVySnMgY29ubmVjdGlvbiBpZCBvZiBfYW5vdGhlcl8gcGVlclxuICAjICAgQHBhcmFtIG1lc3NhZ2Uge09iamVjdH0gU29tZSBvYmplY3QgdGhhdCBzaGFsbCBiZSBzZW5kXG4gICMgQG92ZXJsb2FkIF9zZW5kKHBlZXJpZHMsIG1lc3NhZ2UpXG4gICMgICBAcGFyYW0gcGVlcmlkcyB7QXJyYXk8U3RyaW5nPn0gUGVlckpzIGNvbm5lY3Rpb24gaWRzIG9mIF9vdGhlcl8gcGVlcnNcbiAgIyAgIEBwYXJhbSBtZXNzYWdlIHtPYmplY3R9IFNvbWUgb2JqZWN0IHRoYXQgc2hhbGwgYmUgc2VuZFxuICAjXG4gIF9zZW5kOiAocGVlcl9zLCBtZXNzYWdlKS0+XG4gICAgaWYgcGVlcl9zLmNvbnN0cnVjdG9yIGlzIFtdLmNvbnN0cnVjdG9yXG4gICAgICAjIFRocm93IGVycm9ycyBfYWZ0ZXJfIHRoZSBtZXNzYWdlIGhhcyBiZWVuIHNlbnQgdG8gYWxsIG90aGVyIHBlZXJzLlxuICAgICAgIyBKdXN0IGluIGNhc2UgYSBjb25uZWN0aW9uIGlzIGludmFsaWQuXG4gICAgICBlcnJvcnMgPSBbXVxuICAgICAgZm9yIHBlZXIgaW4gcGVlcl9zXG4gICAgICAgIHRyeVxuICAgICAgICAgIEB4bXBwLnNlbmRfeWF0dGFfZWxlbWVudCBAcm9vbSwgQGNvbm5lY3Rpb25zW3BlZXJdLm5pY2ssIGVuY29kZV9tZXNzYWdlXG4gICAgICAgICAgICBkYXRhOiBtZXNzYWdlXG4gICAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgICAgZXJyb3JzLnB1c2goZXJyb3IrXCJcIilcbiAgICAgIGlmIGVycm9ycy5sZW5ndGggPiAwXG4gICAgICAgIHRocm93IG5ldyBFcnJvciBlcnJvcnNcbiAgICBlbHNlXG4gICAgICBAeG1wcC5zZW5kX3lhdHRhX2VsZW1lbnQgQHJvb20sIEBjb25uZWN0aW9uc1twZWVyX3NdLm5pY2ssIGVuY29kZV9tZXNzYWdlXG4gICAgICAgIGRhdGE6IG1lc3NhZ2VcblxuXG4iXX0=
