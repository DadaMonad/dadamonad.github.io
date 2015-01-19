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



},{"../connector":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9ib3dlcl9jb21wb25lbnRzL1lhdHRhLUNvbm5lY3RvcnMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvY29kaW8vd29ya3NwYWNlL2Jvd2VyX2NvbXBvbmVudHMvWWF0dGEtQ29ubmVjdG9ycy9saWIvY29ubmVjdG9yLmNvZmZlZSIsIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9ib3dlcl9jb21wb25lbnRzL1lhdHRhLUNvbm5lY3RvcnMvbGliL3BlZXJqcy1jb25uZWN0b3IvcGVlcmpzLWNvbm5lY3Rvci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNDQSxJQUFBLFNBQUE7O0FBQUE7QUFFZSxFQUFBLG1CQUFBLEdBQUE7QUFFWCxJQUFBLElBQUMsQ0FBQSxTQUFELEdBQWEsS0FBYixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsbUJBQUQsR0FBdUIsRUFGdkIsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLFdBQUQsR0FBZSxFQUpmLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxvQkFBRCxHQUF3QixFQU54QixDQUFBO0FBQUEsSUFRQSxJQUFDLENBQUEsZ0JBQUQsR0FBb0IsRUFScEIsQ0FBQTtBQUFBLElBVUEsSUFBQyxDQUFBLGtCQUFELEdBQXNCLEVBVnRCLENBQUE7QUFBQSxJQVdBLElBQUMsQ0FBQSxnQkFBRCxHQUFvQixFQVhwQixDQUZXO0VBQUEsQ0FBYjs7QUFBQSxzQkFlQSxxQkFBQSxHQUF1QixTQUFBLEdBQUE7V0FDckIsSUFBQyxDQUFBLEdBRG9CO0VBQUEsQ0FmdkIsQ0FBQTs7QUFBQSxzQkFrQkEsYUFBQSxHQUFlLFNBQUMsQ0FBRCxHQUFBO1dBQ2IsSUFBQyxDQUFBLGdCQUFnQixDQUFDLElBQWxCLENBQXVCLENBQXZCLEVBRGE7RUFBQSxDQWxC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YixDQUFIO0FBR0UsY0FBQSxJQUFJLENBQUMsU0FBTCxHQUFpQixJQUFqQixDQUFBO0FBQ0E7QUFBQSxtQkFBQSwyQ0FBQTtnQ0FBQTtBQUNFLGdCQUFBLElBQUssQ0FBQSxDQUFBLENBQUUsQ0FBQyxLQUFSLENBQWMsSUFBZCxFQUFvQixJQUFLLFNBQXpCLENBQUEsQ0FERjtBQUFBLGVBREE7cUJBR0EsSUFBSSxDQUFDLG1CQUFMLEdBQTJCLEdBTjdCO2FBZEc7V0FBQSxNQUFBO0FBd0JIO0FBQUE7aUJBQUEsOENBQUE7NEJBQUE7QUFDRSw0QkFBQSxDQUFBLENBQUUsSUFBSSxDQUFDLElBQVAsRUFBYSxJQUFiLEVBQUEsQ0FERjtBQUFBOzRCQXhCRztXQUpTO1FBQUEsQ0FBaEIsRUFKYztNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWhCLEVBRGM7RUFBQSxDQXRFaEIsQ0FBQTs7eUJBQUE7O0dBRnFELFVBRnZELENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5jbGFzcyBDb25uZWN0b3JcbiAgXG4gIGNvbnN0cnVjdG9yOiAoKS0+XG4gICAgIyBpcyBzZXQgdG8gdHJ1ZSB3aGVuIHRoaXMgaXMgc3luY2VkIHdpdGggYWxsIG90aGVyIGNvbm5lY3Rpb25zXG4gICAgQGlzX3N5bmNlZCA9IGZhbHNlXG4gICAgIyBjb21wdXRlIGFsbCBvZiB0aGVzZSBmdW5jdGlvbnMgd2hlbiBhbGwgY29ubmVjdGlvbnMgYXJlIHN5bmNlZC5cbiAgICBAY29tcHV0ZV93aGVuX3N5bmNlZCA9IFtdXG4gICAgIyBQZWVyanMgQ29ubmVjdGlvbnM6IGtleTogY29ubi1pZCwgdmFsdWU6IGNvbm5cbiAgICBAY29ubmVjdGlvbnMgPSB7fVxuICAgICMgQ29ubmVjdGlvbnMsIHRoYXQgaGF2ZSBiZWVuIGluaXRpYWxpemVkLCBidXQgaGF2ZSBub3QgYmVlbiAoZnVsbHkpIHN5bmNlZCB5ZXQuXG4gICAgQHVuc3luY2VkX2Nvbm5lY3Rpb25zID0ge31cbiAgICAjIExpc3Qgb2YgZnVuY3Rpb25zIHRoYXQgc2hhbGwgcHJvY2VzcyBpbmNvbWluZyBkYXRhXG4gICAgQHJlY2VpdmVfaGFuZGxlcnMgPSBbXVxuICAgICMgQSBsaXN0IG9mIGZ1bmN0aW9ucyB0aGF0IGFyZSBleGVjdXRlZCAobGVmdCB0byByaWdodCkgd2hlbiBzeW5jaW5nIHdpdGggYSBwZWVyLiBcbiAgICBAc3luY19wcm9jZXNzX29yZGVyID0gW11cbiAgICBAd2hlbl91c2VyX2lkX3NldCA9IFtdXG4gIFxuICBnZXRVbmlxdWVDb25uZWN0aW9uSWQ6IC0+XG4gICAgQGlkICMgbWFrZSBzdXJlLCB0aGF0IGV2ZXJ5IGNvbm5lY3RvciBpbXBsZW1lbnRhdGlvbiBkb2VzIGl0IGxpa2UgdGhpc1xuICBcbiAgd2hlblVzZXJJZFNldDogKGYpLT5cbiAgICBAd2hlbl91c2VyX2lkX3NldC5wdXNoIGZcbiAgXG4gICNcbiAgIyBFeGVjdXRlIGEgZnVuY3Rpb24gX3doZW5fIHdlIGFyZSBjb25uZWN0ZWQuIElmIG5vdCBjb25uZWN0ZWQsIHdhaXQgdW50aWwgY29ubmVjdGVkLlxuICAjIEBwYXJhbSBmIHtGdW5jdGlvbn0gV2lsbCBiZSBleGVjdXRlZCBvbiB0aGUgUGVlckpzLUNvbm5lY3RvciBjb250ZXh0LlxuICAjXG4gIHdoZW5TeW5jZWQ6IChhcmdzKS0+XG4gICAgaWYgYXJncy5jb25zdHJ1Y3RvcmUgaXMgRnVuY3Rpb25cbiAgICAgIGFyZ3MgPSBbYXJnc11cbiAgICBpZiBAaXNfc3luY2VkXG4gICAgICBhcmdzWzBdLmFwcGx5IHRoaXMsIGFyZ3NbMS4uXVxuICAgIGVsc2VcbiAgICAgIEBjb21wdXRlX3doZW5fc3luY2VkLnB1c2ggYXJnc1xuICBcbiAgI1xuICAjIEV4ZWN1dGUgYW4gZnVuY3Rpb24gX3doZW5fIGEgbWVzc2FnZSBpcyByZWNlaXZlZC5cbiAgIyBAcGFyYW0gZiB7RnVuY3Rpb259IFdpbGwgYmUgZXhlY3V0ZWQgb24gdGhlIFBlZXJKcy1Db25uZWN0b3IgY29udGV4dC4gZiB3aWxsIGJlIGNhbGxlZCB3aXRoIChzZW5kZXJfaWQsIGJyb2FkY2FzdCB7dHJ1ZXxmYWxzZX0sIG1lc3NhZ2UpLlxuICAjXG4gIHdoZW5SZWNlaXZpbmc6IChmKS0+XG4gICAgQHJlY2VpdmVfaGFuZGxlcnMucHVzaCBmXG4gIFxuICAjXG4gICMgU2VuZCBhIG1lc3NhZ2UgdG8gYSAoc3ViKS1zZXQgb2YgYWxsIGNvbm5lY3RlZCBwZWVycy5cbiAgIyBAcGFyYW0gcGVlcnMge0FycmF5PGNvbm5lY3Rpb25faWRzPn0gQSBzZXQgb2YgaWRzLlxuICAjIEBwYXJhbSBtZXNzYWdlIHtPYmplY3R9IFRoZSBtZXNzYWdlIHRvIHNlbmQuXG4gICNcbiAgbXVsdGljYXN0OiAocGVlcnMsIG1lc3NhZ2UpLT5cbiAgICBAd2hlblN5bmNlZCBbX3NlbmQsIHBlZXJzLCBtZXNzYWdlXVxuICBcbiAgI1xuICAjIFNlbmQgYSBtZXNzYWdlIHRvIG9uZSBvZiB0aGUgY29ubmVjdGVkIHBlZXJzLlxuICAjIEBwYXJhbSBwZWVycyB7Y29ubmVjdGlvbl9pZH0gQSBjb25uZWN0aW9uIGlkLlxuICAjIEBwYXJhbSBtZXNzYWdlIHtPYmplY3R9IFRoZSBtZXNzYWdlIHRvIHNlbmQuXG4gICNcbiAgdW5pY2FzdDogKHBlZXIsIG1lc3NhZ2UpLT5cbiAgICBAd2hlblN5bmNlZCBbX3NlbmQsIHBlZXIsIG1lc3NhZ2VdXG4gIFxuICAjIFxuICAjIEJyb2FkY2FzdCBhIG1lc3NhZ2UgdG8gYWxsIGNvbm5lY3RlZCBwZWVycy5cbiAgIyBAcGFyYW0gbWVzc2FnZSB7T2JqZWN0fSBUaGUgbWVzc2FnZSB0byBicm9hZGNhc3QuXG4gICMgXG4gIGJyb2FkY2FzdDogKG1lc3NhZ2UpLT5cbiAgICBAX2Jyb2FkY2FzdChtZXNzYWdlKVxuXG4gXG4gICNcbiAgIyBEZWZpbmUgaG93IHlvdSB3YW50IHRvIGhhbmRsZSB0aGUgc3luYyBwcm9jZXNzIG9mIHR3byB1c2Vycy5cbiAgIyBUaGlzIGlzIGEgc3luY2hyb25vdXMgaGFuZHNoYWtlLiBFdmVyeSB1c2VyIHdpbGwgcGVyZm9ybSBleGFjdGx5IHRoZSBzYW1lIGFjdGlvbnMgYXQgdGhlIHNhbWUgdGltZS4gRS5nLlxuICAjIEBleGFtcGxlXG4gICMgICB3aGVuU3luY2luZyhmdW5jdGlvbigpeyAvLyBmaXJzdCBjYWxsIG11c3Qgbm90IGhhdmUgcGFyYW1ldGVycyFcbiAgIyAgICAgICByZXR1cm4gdGhpcy5pZDsgLy8gU2VuZCB0aGUgaWQgb2YgdGhpcyBjb25uZWN0b3IuXG4gICMgICB9LGZ1bmN0aW9uKHBlZXJpZCl7IC8vIHlvdSByZWNlaXZlIHRoZSBwZWVyaWQgb2YgdGhlIG90aGVyIGNvbm5lY3Rpb25zLlxuICAjICAgICAgIC8vIHlvdSBjYW4gZG8gc29tZXRoaW5nIHdpdGggdGhlIHBlZXJpZFxuICAjICAgICAgIC8vIHJldHVybiBcInlvdSBhcmUgbXkgZnJpZW5kXCI7IC8vIHlvdSBjb3VsZCBzZW5kIGFub3RoZXIgbWFzc2FnZS5cbiAgIyAgIH0pOyAvLyB0aGlzIGlzIHRoZSBlbmQgb2YgdGhlIHN5bmMgcHJvY2Vzcy5cbiAgI1xuICB3aGVuU3luY2luZzogKCktPlxuICAgIGZvciBpIGluIFsoYXJndW1lbnRzLmxlbmd0aC0xKS4uMF1cbiAgICAgIEBzeW5jX3Byb2Nlc3Nfb3JkZXIudW5zaGlmdCBhcmd1bWVudHNbaV1cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gQ29ubmVjdG9yXG4iLCJDb25uZWN0b3IgPSByZXF1aXJlICcuLi9jb25uZWN0b3InXG5cbndpbmRvdy5QZWVySnNDb25uZWN0b3IgPSBjbGFzcyBQZWVySnNDb25uZWN0b3IgZXh0ZW5kcyBDb25uZWN0b3JcblxuICBjb25zdHJ1Y3RvcjogKEBpZCwgb3B0aW9ucyktPlxuICAgIHN1cGVyKClcbiAgICB0aGF0ID0gdGhpc1xuICAgICMgVGhlIGZvbGxvd2luZyB0d28gZnVuY3Rpb25zIHNob3VsZCBiZSBwZXJmb3JtZWQgYXQgdGhlIGVuZCBvZiB0aGUgc3luY2luZyBwcm9jZXNzLlxuICAgICMgSW4gcGVlcmpzIGFsbCBjb25uZWN0aW9uIGlkcyBtdXN0IGJlIHNlbmQuIFxuICAgIEBzeW5jX3Byb2Nlc3Nfb3JkZXIucHVzaCAoKS0+XG4gICAgICBwZWVycyA9IGZvciBwZWVyaWQsY29ubiBvZiB0aGF0LmNvbm5lY3Rpb25zIFxuICAgICAgICBwZWVyaWRcbiAgICAgIHBlZXJzIFxuICAgICMgVGhlbiBjb25uZWN0IHRvIHRoZSBjb25uZWN0aW9uIGlkcy4gXG4gICAgQHN5bmNfcHJvY2Vzc19vcmRlci5wdXNoIChwZWVycyktPlxuICAgICAgZm9yIHBlZXJpZCBpbiBwZWVycyBcbiAgICAgICAgICB0aGF0LmpvaW4gcGVlcmlkXG4gICAgICB0cnVlIFxuICAgICMgQ3JlYXRlIHRoZSBQZWVyanMgaW5zdGFuY2VcbiAgICBAY29ubiA9IG5ldyBQZWVyIEBpZCwgb3B0aW9uc1xuICAgICMgVE9ETzogaW1wcm92ZSBlcnJvciBoYW5kbGluZywgd2hhdCBoYXBwZW5zIGlmIGRpc2Nvbm5lY3RlZD8gcHJvdmlkZSBmZWVkYmFja1xuICAgIEBjb25uLm9uICdlcnJvcicsIChlcnIpLT5cbiAgICAgIHRocm93IG5ldyBFcnJvciBcIlBlZXJqcyBjb25uZWN0b3I6ICN7ZXJyfVwiXG4gICAgQGNvbm4ub24gJ2Rpc2Nvbm5lY3RlZCcsICgpLT5cbiAgICAgIHRocm93IG5ldyBFcnJvciBcIlBlZXJqcyBjb25uZWN0b3IgZGlzY29ubmVjdGVkIGZyb20gc2lnbmFsbGluZyBzZXJ2ZXIuIENhbm5vdCBhY2NlcHQgbmV3IGNvbm5lY3Rpb25zLiBOb3QgZmF0YWwsIGJ1dCBub3Qgc28gZ29vZCBlaXRoZXIuLlwiXG4gICAgQGNvbm4ub24gJ2Rpc2Nvbm5lY3QnLCAoKS0+XG4gICAgICB0aGF0LmNvbm4ucmVjb25uZWN0KClcbiAgICBAY29ubi5vbiAnY29ubmVjdGlvbicsIEBfYWRkQ29ubmVjdGlvblxuICBcbiAgI1xuICAjIEpvaW4gYSBjb21tdW5pY2F0aW9uIHJvb20uIEluIGNhc2Ugb2YgcGVlcmpzLCB5b3UganVzdCBoYXZlIHRvIGpvaW4gdG8gb25lIG90aGVyIGNsaWVudC4gVGhpcyBjb25uZWN0b3Igd2lsbCBqb2luIHRvIHRoZSBvdGhlciBwZWVycyBhdXRvbWF0aWNhbGx5LlxuICAjIEBwYXJhbSBpZCB7U3RyaW5nfSBUaGUgY29ubmVjdGlvbiBpZCBvZiBhbm90aGVyIGNsaWVudC5cbiAgI1xuICBqb2luOiAocGVlcmlkKS0+XG4gICAgaWYgbm90IEB1bnN5bmNlZF9jb25uZWN0aW9uc1twZWVyaWRdPyBhbmQgbm90IEBjb25uZWN0aW9uc1twZWVyaWRdPyBhbmQgcGVlcmlkIGlzbnQgQGlkXG4gICAgICBwZWVyID0gQGNvbm4uY29ubmVjdCBwZWVyaWQsIHtyZWxpYWJsZTogdHJ1ZX1cbiAgICAgIEB1bnN5bmNlZF9jb25uZWN0aW9uc1twZWVyaWRdID0gcGVlclxuICAgICAgQF9hZGRDb25uZWN0aW9uIHBlZXJcbiAgICAgIHRydWVcbiAgICBlbHNlXG4gICAgICBmYWxzZVxuXG4gIF9icm9hZGNhc3Q6IChtZXNzYWdlKS0+XG4gICAgQHdoZW5TeW5jZWQgWygpPT5cbiAgICAgIGZvciBwZWVyaWQscGVlciBvZiBAY29ubmVjdGlvbnNcbiAgICAgICAgQF9zZW5kIHBlZXJpZCwgbWVzc2FnZV1cbiAgI1xuICAjIFNlbmQgYSBtZXNzYWdlIHRvIGEgcGVlciBvciBzZXQgb2YgcGVlcnMuIFRoaXMgaXMgcGVlcmpzIHNwZWNpZmljLlxuICAjIEBvdmVybG9hZCBfc2VuZChwZWVyaWQsIG1lc3NhZ2UpXG4gICMgICBAcGFyYW0gcGVlcmlkIHtTdHJpbmd9IFBlZXJKcyBjb25uZWN0aW9uIGlkIG9mIF9hbm90aGVyXyBwZWVyXG4gICMgICBAcGFyYW0gbWVzc2FnZSB7T2JqZWN0fSBTb21lIG9iamVjdCB0aGF0IHNoYWxsIGJlIHNlbmRcbiAgIyBAb3ZlcmxvYWQgX3NlbmQocGVlcmlkcywgbWVzc2FnZSlcbiAgIyAgIEBwYXJhbSBwZWVyaWRzIHtBcnJheTxTdHJpbmc+fSBQZWVySnMgY29ubmVjdGlvbiBpZHMgb2YgX290aGVyXyBwZWVyc1xuICAjICAgQHBhcmFtIG1lc3NhZ2Uge09iamVjdH0gU29tZSBvYmplY3QgdGhhdCBzaGFsbCBiZSBzZW5kXG4gICNcbiAgX3NlbmQ6IChwZWVyX3MsIG1lc3NhZ2UpLT5cbiAgICBpZiBwZWVyX3MuY29uc3RydWN0b3IgaXMgW10uY29uc3RydWN0b3JcbiAgICAgICMgVGhyb3cgZXJyb3JzIF9hZnRlcl8gdGhlIG1lc3NhZ2UgaGFzIGJlZW4gc2VuZCB0byBhbGwgb3RoZXIgcGVlcnMuIFxuICAgICAgIyBKdXN0IGluIGNhc2UgYSBjb25uZWN0aW9uIGlzIGludmFsaWQuXG4gICAgICBlcnJvcnMgPSBbXVxuICAgICAgZm9yIHBlZXIgaW4gcGVlcl9zXG4gICAgICAgIHRyeVxuICAgICAgICAgIEBjb25uZWN0aW9uc1twZWVyXS5zZW5kIG1lc3NhZ2VcbiAgICAgICAgY2F0Y2ggZXJyb3IgXG4gICAgICAgICAgZXJyb3JzLnB1c2goZXJyb3IrXCJcIilcbiAgICAgIGlmIGVycm9ycy5sZW5ndGggPiAwXG4gICAgICAgIHRocm93IG5ldyBFcnJvciBlcnJvcnMgXG4gICAgZWxzZVxuICAgICAgQGNvbm5lY3Rpb25zW3BlZXJfc10uc2VuZCBtZXNzYWdlXG4gICAgXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjIFRoaXMgaXMgYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCBpcyBvbmx5IHJlbGF0ZWQgdG8gdGhlIHBlZXJqcyBjb25uZWN0b3IuIFxuICAjIENvbm5lY3QgdG8gYW5vdGhlciBwZWVyLlxuICBfYWRkQ29ubmVjdGlvbjogKHBlZXIpPT5cbiAgICBwZWVyLm9uICdvcGVuJywgKCk9PlxuICAgICAgdGhhdCA9IEBcbiAgICAgIHBlZXIuc2VuZCB0aGF0LnN5bmNfcHJvY2Vzc19vcmRlclswXSgpXG4gICAgICBjdXJyZW50X3N5bmNfaSA9IDFcbiAgICAgIHBlZXIub24gJ2RhdGEnLCAoZGF0YSktPlxuICAgICAgICBjb25zb2xlLmxvZyhcInJlY2VpdmUgZGF0YTogI3tKU09OLnN0cmluZ2lmeSBkYXRhfVwiKVxuICAgICAgICBpZiBjdXJyZW50X3N5bmNfaSA8IHRoYXQuc3luY19wcm9jZXNzX29yZGVyLmxlbmd0aFxuICAgICAgICAgIHBlZXIuc2VuZCB0aGF0LnN5bmNfcHJvY2Vzc19vcmRlcltjdXJyZW50X3N5bmNfaSsrXS5jYWxsIHRoYXQsIGRhdGFcbiAgICAgICAgZWxzZSBpZiBjdXJyZW50X3N5bmNfaSBpcyB0aGF0LnN5bmNfcHJvY2Vzc19vcmRlci5sZW5ndGhcbiAgICAgICAgICAjIEFsbCBzeW5jIGZ1bmN0aW9ucyBoYXZlIGJlZW4gY2FsbGVkLiBJbmNyZW1lbnQgY3VycmVudF9zeW5jX2kgb25lIGxhc3QgdGltZVxuICAgICAgICAgIGN1cnJlbnRfc3luY19pKytcbiAgICAgICAgICAjIGFkZCBpdCB0byB0aGUgY29ubmVjdGlvbnMgb2JqZWN0XG4gICAgICAgICAgZGVsZXRlIHRoYXQudW5zeW5jZWRfY29ubmVjdGlvbnNbcGVlci5wZWVyXVxuICAgICAgICAgIHRoYXQuY29ubmVjdGlvbnNbcGVlci5wZWVyXSA9IHBlZXJcbiAgICAgICAgICAjIHdoZW4gdGhlIGNvbm4gY2xvc2VzLCBkZWxldGUgaXQgZnJvbSB0aGUgY29ubmVjdGlvbnMgb2JqZWN0XG4gICAgICAgICAgcGVlci5vbiAnY2xvc2UnLCAoKS0+XG4gICAgICAgICAgICBkZWxldGUgdGhhdC5jb25uZWN0aW9uc1twZWVyLnBlZXJdXG4gICAgICAgICAgIyBoZWxwZXIgZmt0LiB0cnVlIGlmZiBvcCBpcyBhbiBvYmplY3QgdGhhdCBkb2VzIG5vdCBob2xkIGVudW1lcmFibGUgcHJvcGVydGllc1xuICAgICAgICAgIGlzRW1wdHkgPSAob3MpLT5cbiAgICAgICAgICAgIGZvciBvIG9mIG9zXG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgICBpZiBpc0VtcHR5KHRoYXQudW5zeW5jZWRfY29ubmVjdGlvbnMpXG4gICAgICAgICAgICAjIHRoZXJlIGFyZSBubyB1bnN5bmNlZCBjb25uZWN0aW9ucy4gd2UgYXJlIG5vdyBzeW5jZWQuXG4gICAgICAgICAgICAjIHRoZXJlZm9yZSBleGVjdXRlIGFsbCBma3RzIGluIHRoaXMuY29tcHV0ZV93aGVuX3N5bmNlZFxuICAgICAgICAgICAgdGhhdC5pc19zeW5jZWQgPSB0cnVlXG4gICAgICAgICAgICBmb3IgY29tcCBpbiB0aGF0LmNvbXB1dGVfd2hlbl9zeW5jZWRcbiAgICAgICAgICAgICAgY29tcFswXS5hcHBseSB0aGF0LCBjb21wWzEuLl1cbiAgICAgICAgICAgIHRoYXQuY29tcHV0ZV93aGVuX3N5bmNlZCA9IFtdXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAjIHlvdSByZWNlaXZlZCBhIG5ldyBtZXNzYWdlLCB0aGF0IGlzIG5vdCBhIHN5bmMgbWVzc2FnZS5cbiAgICAgICAgICAjIG5vdGlmeSB0aGUgcmVjZWl2ZV9oYW5kbGVyc1xuICAgICAgICAgIGZvciBmIGluIHRoYXQucmVjZWl2ZV9oYW5kbGVycyBcbiAgICAgICAgICAgIGYgcGVlci5wZWVyLCBkYXRhXG5cblxuICAgICAgIl19
