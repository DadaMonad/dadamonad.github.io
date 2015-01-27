var Connector, PeerJsConnector,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Connector = require('../connector');

window.PeerJsConnector = PeerJsConnector = (function(_super) {
  __extends(PeerJsConnector, _super);

  function PeerJsConnector(id, options) {
    var that;
    this.id = id;
    this._addConnection = __bind(this._addConnection, this);
    PeerJsConnector.__super__.constructor.call(this);
    that = this;
    this.sync_process_order.push(function() {
      var conn, peerid, peers;
      peers = (function() {
        var _ref, _results;
        _ref = that.connections;
        _results = [];
        for (peerid in _ref) {
          conn = _ref[peerid];
          _results.push(peerid);
        }
        return _results;
      })();
      return peers;
    });
    this.sync_process_order.push(function(peers) {
      var peerid, _i, _len;
      for (_i = 0, _len = peers.length; _i < _len; _i++) {
        peerid = peers[_i];
        that.join(peerid);
      }
      return true;
    });
    this.conn = new Peer(this.id, options);
    this.conn.on('error', function(err) {
      throw new Error("Peerjs connector: " + err);
    });
    this.conn.on('disconnected', function() {
      throw new Error("Peerjs connector disconnected from signalling server. Cannot accept new connections. Not fatal, but not so good either..");
    });
    this.conn.on('disconnect', function() {
      return that.conn.reconnect();
    });
    this.conn.on('connection', this._addConnection);
  }

  PeerJsConnector.prototype.join = function(peerid) {
    var peer;
    if ((this.unsynced_connections[peerid] == null) && (this.connections[peerid] == null) && peerid !== this.id) {
      peer = this.conn.connect(peerid, {
        reliable: true
      });
      this.unsynced_connections[peerid] = peer;
      this._addConnection(peer);
      return true;
    } else {
      return false;
    }
  };

  PeerJsConnector.prototype._broadcast = function(message) {
    return this.whenSynced([
      (function(_this) {
        return function() {
          var peer, peerid, _ref, _results;
          _ref = _this.connections;
          _results = [];
          for (peerid in _ref) {
            peer = _ref[peerid];
            _results.push(_this._send(peerid, message));
          }
          return _results;
        };
      })(this)
    ]);
  };

  PeerJsConnector.prototype._send = function(peer_s, message) {
    var error, errors, peer, _i, _len;
    if (peer_s.constructor === [].constructor) {
      errors = [];
      for (_i = 0, _len = peer_s.length; _i < _len; _i++) {
        peer = peer_s[_i];
        try {
          this.connections[peer].send(message);
        } catch (_error) {
          error = _error;
          errors.push(error + "");
        }
      }
      if (errors.length > 0) {
        throw new Error(errors);
      }
    } else {
      return this.connections[peer_s].send(message);
    }
  };

  PeerJsConnector.prototype._addConnection = function(peer) {
    return peer.on('open', (function(_this) {
      return function() {
        var current_sync_i, that;
        that = _this;
        peer.send(that.sync_process_order[0]());
        current_sync_i = 1;
        return peer.on('data', function(data) {
          var comp, f, isEmpty, _i, _j, _len, _len1, _ref, _ref1, _results;
          console.log("receive data: " + (JSON.stringify(data)));
          if (current_sync_i < that.sync_process_order.length) {
            return peer.send(that.sync_process_order[current_sync_i++].call(that, data));
          } else if (current_sync_i === that.sync_process_order.length) {
            current_sync_i++;
            delete that.unsynced_connections[peer.peer];
            that.connections[peer.peer] = peer;
            peer.on('close', function() {
              return delete that.connections[peer.peer];
            });
            isEmpty = function(os) {
              var o;
              for (o in os) {
                return false;
              }
              return true;
            };
            if (isEmpty(that.unsynced_connections)) {
              that.is_synced = true;
              _ref = that.compute_when_synced;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                comp = _ref[_i];
                comp[0].apply(that, comp.slice(1));
              }
              return that.compute_when_synced = [];
            }
          } else {
            _ref1 = that.receive_handlers;
            _results = [];
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
              f = _ref1[_j];
              _results.push(f(peer.peer, data));
            }
            return _results;
          }
        });
      };
    })(this));
  };

  return PeerJsConnector;

})(Connector);
