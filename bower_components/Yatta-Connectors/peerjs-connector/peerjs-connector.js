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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9ZYXR0YS1Db25uZWN0b3JzL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9ZYXR0YS1Db25uZWN0b3JzL2xpYi9jb25uZWN0b3IuY29mZmVlIiwiL2hvbWUvY29kaW8vd29ya3NwYWNlL1lhdHRhLUNvbm5lY3RvcnMvbGliL3BlZXJqcy1jb25uZWN0b3IvcGVlcmpzLWNvbm5lY3Rvci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNDQSxJQUFBLFNBQUE7O0FBQUE7QUFFZSxFQUFBLG1CQUFBLEdBQUE7QUFFWCxJQUFBLElBQUMsQ0FBQSxTQUFELEdBQWEsS0FBYixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsbUJBQUQsR0FBdUIsRUFGdkIsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLFdBQUQsR0FBZSxFQUpmLENBQUE7QUFBQSxJQU1BLElBQUMsQ0FBQSxvQkFBRCxHQUF3QixFQU54QixDQUFBO0FBQUEsSUFRQSxJQUFDLENBQUEsZ0JBQUQsR0FBb0IsRUFScEIsQ0FBQTtBQUFBLElBVUEsSUFBQyxDQUFBLGtCQUFELEdBQXNCLEVBVnRCLENBQUE7QUFBQSxJQVdBLElBQUMsQ0FBQSxnQkFBRCxHQUFvQixFQVhwQixDQUZXO0VBQUEsQ0FBYjs7QUFBQSxzQkFlQSxxQkFBQSxHQUF1QixTQUFBLEdBQUE7V0FDckIsSUFBQyxDQUFBLEdBRG9CO0VBQUEsQ0FmdkIsQ0FBQTs7QUFBQSxzQkFrQkEsYUFBQSxHQUFlLFNBQUMsQ0FBRCxHQUFBO1dBQ2IsSUFBQyxDQUFBLGdCQUFnQixDQUFDLElBQWxCLENBQXVCLENBQXZCLEVBRGE7RUFBQSxDQWxCZixDQUFBOztBQUFBLHNCQXlCQSxVQUFBLEdBQVksU0FBQyxJQUFELEdBQUE7QUFDVixJ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LFNBQXpCLENBQUEsQ0FERjtBQUFBLGVBREE7cUJBR0EsSUFBSSxDQUFDLG1CQUFMLEdBQTJCLEdBTjdCO2FBZEc7V0FBQSxNQUFBO0FBd0JIO0FBQUE7aUJBQUEsOENBQUE7NEJBQUE7QUFDRSw0QkFBQSxDQUFBLENBQUUsSUFBSSxDQUFDLElBQVAsRUFBYSxJQUFiLEVBQUEsQ0FERjtBQUFBOzRCQXhCRztXQUpTO1FBQUEsQ0FBaEIsRUFKYztNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWhCLEVBRGM7RUFBQSxDQXRFaEIsQ0FBQTs7eUJBQUE7O0dBRnFELFVBRnZELENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5jbGFzcyBDb25uZWN0b3JcbiAgXG4gIGNvbnN0cnVjdG9yOiAoKS0+XG4gICAgIyBpcyBzZXQgdG8gdHJ1ZSB3aGVuIHRoaXMgaXMgc3luY2VkIHdpdGggYWxsIG90aGVyIGNvbm5lY3Rpb25zXG4gICAgQGlzX3N5bmNlZCA9IGZhbHNlXG4gICAgIyBjb21wdXRlIGFsbCBvZiB0aGVzZSBmdW5jdGlvbnMgd2hlbiBhbGwgY29ubmVjdGlvbnMgYXJlIHN5bmNlZC5cbiAgICBAY29tcHV0ZV93aGVuX3N5bmNlZCA9IFtdXG4gICAgIyBQZWVyanMgQ29ubmVjdGlvbnM6IGtleTogY29ubi1pZCwgdmFsdWU6IGNvbm5cbiAgICBAY29ubmVjdGlvbnMgPSB7fVxuICAgICMgQ29ubmVjdGlvbnMsIHRoYXQgaGF2ZSBiZWVuIGluaXRpYWxpemVkLCBidXQgaGF2ZSBub3QgYmVlbiAoZnVsbHkpIHN5bmNlZCB5ZXQuXG4gICAgQHVuc3luY2VkX2Nvbm5lY3Rpb25zID0ge31cbiAgICAjIExpc3Qgb2YgZnVuY3Rpb25zIHRoYXQgc2hhbGwgcHJvY2VzcyBpbmNvbWluZyBkYXRhXG4gICAgQHJlY2VpdmVfaGFuZGxlcnMgPSBbXVxuICAgICMgQSBsaXN0IG9mIGZ1bmN0aW9ucyB0aGF0IGFyZSBleGVjdXRlZCAobGVmdCB0byByaWdodCkgd2hlbiBzeW5jaW5nIHdpdGggYSBwZWVyLiBcbiAgICBAc3luY19wcm9jZXNzX29yZGVyID0gW11cbiAgICBAd2hlbl91c2VyX2lkX3NldCA9IFtdXG4gIFxuICBnZXRVbmlxdWVDb25uZWN0aW9uSWQ6IC0+XG4gICAgQGlkICMgbWFrZSBzdXJlLCB0aGF0IGV2ZXJ5IGNvbm5lY3RvciBpbXBsZW1lbnRhdGlvbiBkb2VzIGl0IGxpa2UgdGhpc1xuICBcbiAgd2hlblVzZXJJZFNldDogKGYpLT5cbiAgICBAd2hlbl91c2VyX2lkX3NldC5wdXNoIGZcbiAgXG4gICNcbiAgIyBFeGVjdXRlIGEgZnVuY3Rpb24gX3doZW5fIHdlIGFyZSBjb25uZWN0ZWQuIElmIG5vdCBjb25uZWN0ZWQsIHdhaXQgdW50aWwgY29ubmVjdGVkLlxuICAjIEBwYXJhbSBmIHtGdW5jdGlvbn0gV2lsbCBiZSBleGVjdXRlZCBvbiB0aGUgUGVlckpzLUNvbm5lY3RvciBjb250ZXh0LlxuICAjXG4gIHdoZW5TeW5jZWQ6IChhcmdzKS0+XG4gICAgaWYgQGlzX3N5bmNlZFxuICAgICAgYXJnc1swXS5hcHBseSB0aGlzLCBhcmdzWzEuLl1cbiAgICBlbHNlXG4gICAgICBAY29tcHV0ZV93aGVuX3N5bmNlZC5wdXNoIGFyZ3MgXG4gIFxuICAjXG4gICMgRXhlY3V0ZSBhbiBmdW5jdGlvbiBfd2hlbl8gYSBtZXNzYWdlIGlzIHJlY2VpdmVkLlxuICAjIEBwYXJhbSBmIHtGdW5jdGlvbn0gV2lsbCBiZSBleGVjdXRlZCBvbiB0aGUgUGVlckpzLUNvbm5lY3RvciBjb250ZXh0LiBmIHdpbGwgYmUgY2FsbGVkIHdpdGggKHNlbmRlcl9pZCwgYnJvYWRjYXN0IHt0cnVlfGZhbHNlfSwgbWVzc2FnZSkuXG4gICNcbiAgd2hlblJlY2VpdmluZzogKGYpLT5cbiAgICBAcmVjZWl2ZV9oYW5kbGVycy5wdXNoIGZcbiAgXG4gICNcbiAgIyBTZW5kIGEgbWVzc2FnZSB0byBhIChzdWIpLXNldCBvZiBhbGwgY29ubmVjdGVkIHBlZXJzLlxuICAjIEBwYXJhbSBwZWVycyB7QXJyYXk8Y29ubmVjdGlvbl9pZHM+fSBBIHNldCBvZiBpZHMuXG4gICMgQHBhcmFtIG1lc3NhZ2Uge09iamVjdH0gVGhlIG1lc3NhZ2UgdG8gc2VuZC5cbiAgI1xuICBtdWx0aWNhc3Q6IChwZWVycywgbWVzc2FnZSktPlxuICAgIEB3aGVuU3luY2VkIFtfc2VuZCwgcGVlcnMsIG1lc3NhZ2VdXG4gIFxuICAjXG4gICMgU2VuZCBhIG1lc3NhZ2UgdG8gb25lIG9mIHRoZSBjb25uZWN0ZWQgcGVlcnMuXG4gICMgQHBhcmFtIHBlZXJzIHtjb25uZWN0aW9uX2lkfSBBIGNvbm5lY3Rpb24gaWQuXG4gICMgQHBhcmFtIG1lc3NhZ2Uge09iamVjdH0gVGhlIG1lc3NhZ2UgdG8gc2VuZC5cbiAgI1xuICB1bmljYXN0OiAocGVlciwgbWVzc2FnZSktPlxuICAgIEB3aGVuU3luY2VkIFtfc2VuZCwgcGVlciwgbWVzc2FnZV1cbiAgXG4gICMgXG4gICMgQnJvYWRjYXN0IGEgbWVzc2FnZSB0byBhbGwgY29ubmVjdGVkIHBlZXJzLlxuICAjIEBwYXJhbSBtZXNzYWdlIHtPYmplY3R9IFRoZSBtZXNzYWdlIHRvIGJyb2FkY2FzdC5cbiAgIyBcbiAgYnJvYWRjYXN0OiAobWVzc2FnZSktPlxuICAgIEBfYnJvYWRjYXN0KG1lc3NhZ2UpXG5cbiBcbiAgI1xuICAjIERlZmluZSBob3cgeW91IHdhbnQgdG8gaGFuZGxlIHRoZSBzeW5jIHByb2Nlc3Mgb2YgdHdvIHVzZXJzLlxuICAjIFRoaXMgaXMgYSBzeW5jaHJvbm91cyBoYW5kc2hha2UuIEV2ZXJ5IHVzZXIgd2lsbCBwZXJmb3JtIGV4YWN0bHkgdGhlIHNhbWUgYWN0aW9ucyBhdCB0aGUgc2FtZSB0aW1lLiBFLmcuXG4gICMgQGV4YW1wbGVcbiAgIyAgIHdoZW5TeW5jaW5nKGZ1bmN0aW9uKCl7IC8vIGZpcnN0IGNhbGwgbXVzdCBub3QgaGF2ZSBwYXJhbWV0ZXJzIVxuICAjICAgICAgIHJldHVybiB0aGlzLmlkOyAvLyBTZW5kIHRoZSBpZCBvZiB0aGlzIGNvbm5lY3Rvci5cbiAgIyAgIH0sZnVuY3Rpb24ocGVlcmlkKXsgLy8geW91IHJlY2VpdmUgdGhlIHBlZXJpZCBvZiB0aGUgb3RoZXIgY29ubmVjdGlvbnMuXG4gICMgICAgICAgLy8geW91IGNhbiBkbyBzb21ldGhpbmcgd2l0aCB0aGUgcGVlcmlkXG4gICMgICAgICAgLy8gcmV0dXJuIFwieW91IGFyZSBteSBmcmllbmRcIjsgLy8geW91IGNvdWxkIHNlbmQgYW5vdGhlciBtYXNzYWdlLlxuICAjICAgfSk7IC8vIHRoaXMgaXMgdGhlIGVuZCBvZiB0aGUgc3luYyBwcm9jZXNzLlxuICAjXG4gIHdoZW5TeW5jaW5nOiAoKS0+XG4gICAgZm9yIGkgaW4gWyhhcmd1bWVudHMubGVuZ3RoLTEpLi4wXVxuICAgICAgQHN5bmNfcHJvY2Vzc19vcmRlci51bnNoaWZ0IGFyZ3VtZW50c1tpXVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBDb25uZWN0b3JcbiIsIkNvbm5lY3RvciA9IHJlcXVpcmUgJy4uL2Nvbm5lY3Rvcidcblxud2luZG93LlBlZXJKc0Nvbm5lY3RvciA9IGNsYXNzIFBlZXJKc0Nvbm5lY3RvciBleHRlbmRzIENvbm5lY3RvclxuXG4gIGNvbnN0cnVjdG9yOiAoQGlkLCBvcHRpb25zKS0+XG4gICAgc3VwZXIoKVxuICAgIHRoYXQgPSB0aGlzXG4gICAgIyBUaGUgZm9sbG93aW5nIHR3byBmdW5jdGlvbnMgc2hvdWxkIGJlIHBlcmZvcm1lZCBhdCB0aGUgZW5kIG9mIHRoZSBzeW5jaW5nIHByb2Nlc3MuXG4gICAgIyBJbiBwZWVyanMgYWxsIGNvbm5lY3Rpb24gaWRzIG11c3QgYmUgc2VuZC4gXG4gICAgQHN5bmNfcHJvY2Vzc19vcmRlci5wdXNoICgpLT5cbiAgICAgIHBlZXJzID0gZm9yIHBlZXJpZCxjb25uIG9mIHRoYXQuY29ubmVjdGlvbnMgXG4gICAgICAgIHBlZXJpZFxuICAgICAgcGVlcnMgXG4gICAgIyBUaGVuIGNvbm5lY3QgdG8gdGhlIGNvbm5lY3Rpb24gaWRzLiBcbiAgICBAc3luY19wcm9jZXNzX29yZGVyLnB1c2ggKHBlZXJzKS0+XG4gICAgICBmb3IgcGVlcmlkIGluIHBlZXJzIFxuICAgICAgICAgIHRoYXQuam9pbiBwZWVyaWRcbiAgICAgIHRydWUgXG4gICAgIyBDcmVhdGUgdGhlIFBlZXJqcyBpbnN0YW5jZVxuICAgIEBjb25uID0gbmV3IFBlZXIgQGlkLCBvcHRpb25zXG4gICAgIyBUT0RPOiBpbXByb3ZlIGVycm9yIGhhbmRsaW5nLCB3aGF0IGhhcHBlbnMgaWYgZGlzY29ubmVjdGVkPyBwcm92aWRlIGZlZWRiYWNrXG4gICAgQGNvbm4ub24gJ2Vycm9yJywgKGVyciktPlxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiUGVlcmpzIGNvbm5lY3RvcjogI3tlcnJ9XCJcbiAgICBAY29ubi5vbiAnZGlzY29ubmVjdGVkJywgKCktPlxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiUGVlcmpzIGNvbm5lY3RvciBkaXNjb25uZWN0ZWQgZnJvbSBzaWduYWxsaW5nIHNlcnZlci4gQ2Fubm90IGFjY2VwdCBuZXcgY29ubmVjdGlvbnMuIE5vdCBmYXRhbCwgYnV0IG5vdCBzbyBnb29kIGVpdGhlci4uXCJcbiAgICBAY29ubi5vbiAnZGlzY29ubmVjdCcsICgpLT5cbiAgICAgIHRoYXQuY29ubi5yZWNvbm5lY3QoKVxuICAgIEBjb25uLm9uICdjb25uZWN0aW9uJywgQF9hZGRDb25uZWN0aW9uXG4gIFxuICAjXG4gICMgSm9pbiBhIGNvbW11bmljYXRpb24gcm9vbS4gSW4gY2FzZSBvZiBwZWVyanMsIHlvdSBqdXN0IGhhdmUgdG8gam9pbiB0byBvbmUgb3RoZXIgY2xpZW50LiBUaGlzIGNvbm5lY3RvciB3aWxsIGpvaW4gdG8gdGhlIG90aGVyIHBlZXJzIGF1dG9tYXRpY2FsbHkuXG4gICMgQHBhcmFtIGlkIHtTdHJpbmd9IFRoZSBjb25uZWN0aW9uIGlkIG9mIGFub3RoZXIgY2xpZW50LlxuICAjXG4gIGpvaW46IChwZWVyaWQpLT5cbiAgICBpZiBub3QgQHVuc3luY2VkX2Nvbm5lY3Rpb25zW3BlZXJpZF0/IGFuZCBub3QgQGNvbm5lY3Rpb25zW3BlZXJpZF0/IGFuZCBwZWVyaWQgaXNudCBAaWRcbiAgICAgIHBlZXIgPSBAY29ubi5jb25uZWN0IHBlZXJpZCwge3JlbGlhYmxlOiB0cnVlfVxuICAgICAgQHVuc3luY2VkX2Nvbm5lY3Rpb25zW3BlZXJpZF0gPSBwZWVyXG4gICAgICBAX2FkZENvbm5lY3Rpb24gcGVlclxuICAgICAgdHJ1ZVxuICAgIGVsc2VcbiAgICAgIGZhbHNlXG5cbiAgX2Jyb2FkY2FzdDogKG1lc3NhZ2UpLT5cbiAgICBAd2hlblN5bmNlZCBbKCk9PlxuICAgICAgZm9yIHBlZXJpZCxwZWVyIG9mIEBjb25uZWN0aW9uc1xuICAgICAgICBAX3NlbmQgcGVlcmlkLCBtZXNzYWdlXVxuICAjXG4gICMgU2VuZCBhIG1lc3NhZ2UgdG8gYSBwZWVyIG9yIHNldCBvZiBwZWVycy4gVGhpcyBpcyBwZWVyanMgc3BlY2lmaWMuXG4gICMgQG92ZXJsb2FkIF9zZW5kKHBlZXJpZCwgbWVzc2FnZSlcbiAgIyAgIEBwYXJhbSBwZWVyaWQge1N0cmluZ30gUGVlckpzIGNvbm5lY3Rpb24gaWQgb2YgX2Fub3RoZXJfIHBlZXJcbiAgIyAgIEBwYXJhbSBtZXNzYWdlIHtPYmplY3R9IFNvbWUgb2JqZWN0IHRoYXQgc2hhbGwgYmUgc2VuZFxuICAjIEBvdmVybG9hZCBfc2VuZChwZWVyaWRzLCBtZXNzYWdlKVxuICAjICAgQHBhcmFtIHBlZXJpZHMge0FycmF5PFN0cmluZz59IFBlZXJKcyBjb25uZWN0aW9uIGlkcyBvZiBfb3RoZXJfIHBlZXJzXG4gICMgICBAcGFyYW0gbWVzc2FnZSB7T2JqZWN0fSBTb21lIG9iamVjdCB0aGF0IHNoYWxsIGJlIHNlbmRcbiAgI1xuICBfc2VuZDogKHBlZXJfcywgbWVzc2FnZSktPlxuICAgIGlmIHBlZXJfcy5jb25zdHJ1Y3RvciBpcyBbXS5jb25zdHJ1Y3RvclxuICAgICAgIyBUaHJvdyBlcnJvcnMgX2FmdGVyXyB0aGUgbWVzc2FnZSBoYXMgYmVlbiBzZW5kIHRvIGFsbCBvdGhlciBwZWVycy4gXG4gICAgICAjIEp1c3QgaW4gY2FzZSBhIGNvbm5lY3Rpb24gaXMgaW52YWxpZC5cbiAgICAgIGVycm9ycyA9IFtdXG4gICAgICBmb3IgcGVlciBpbiBwZWVyX3NcbiAgICAgICAgdHJ5XG4gICAgICAgICAgQGNvbm5lY3Rpb25zW3BlZXJdLnNlbmQgbWVzc2FnZVxuICAgICAgICBjYXRjaCBlcnJvciBcbiAgICAgICAgICBlcnJvcnMucHVzaChlcnJvcitcIlwiKVxuICAgICAgaWYgZXJyb3JzLmxlbmd0aCA+IDBcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yIGVycm9ycyBcbiAgICBlbHNlXG4gICAgICBAY29ubmVjdGlvbnNbcGVlcl9zXS5zZW5kIG1lc3NhZ2VcbiAgICBcbiAgI1xuICAjIEBwcml2YXRlXG4gICMgVGhpcyBpcyBhIGhlbHBlciBmdW5jdGlvbiB0aGF0IGlzIG9ubHkgcmVsYXRlZCB0byB0aGUgcGVlcmpzIGNvbm5lY3Rvci4gXG4gICMgQ29ubmVjdCB0byBhbm90aGVyIHBlZXIuXG4gIF9hZGRDb25uZWN0aW9uOiAocGVlcik9PlxuICAgIHBlZXIub24gJ29wZW4nLCAoKT0+XG4gICAgICB0aGF0ID0gQFxuICAgICAgcGVlci5zZW5kIHRoYXQuc3luY19wcm9jZXNzX29yZGVyWzBdKClcbiAgICAgIGN1cnJlbnRfc3luY19pID0gMVxuICAgICAgcGVlci5vbiAnZGF0YScsIChkYXRhKS0+XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVjZWl2ZSBkYXRhOiAje0pTT04uc3RyaW5naWZ5IGRhdGF9XCIpXG4gICAgICAgIGlmIGN1cnJlbnRfc3luY19pIDwgdGhhdC5zeW5jX3Byb2Nlc3Nfb3JkZXIubGVuZ3RoXG4gICAgICAgICAgcGVlci5zZW5kIHRoYXQuc3luY19wcm9jZXNzX29yZGVyW2N1cnJlbnRfc3luY19pKytdLmNhbGwgdGhhdCwgZGF0YVxuICAgICAgICBlbHNlIGlmIGN1cnJlbnRfc3luY19pIGlzIHRoYXQuc3luY19wcm9jZXNzX29yZGVyLmxlbmd0aFxuICAgICAgICAgICMgQWxsIHN5bmMgZnVuY3Rpb25zIGhhdmUgYmVlbiBjYWxsZWQuIEluY3JlbWVudCBjdXJyZW50X3N5bmNfaSBvbmUgbGFzdCB0aW1lXG4gICAgICAgICAgY3VycmVudF9zeW5jX2krK1xuICAgICAgICAgICMgYWRkIGl0IHRvIHRoZSBjb25uZWN0aW9ucyBvYmplY3RcbiAgICAgICAgICBkZWxldGUgdGhhdC51bnN5bmNlZF9jb25uZWN0aW9uc1twZWVyLnBlZXJdXG4gICAgICAgICAgdGhhdC5jb25uZWN0aW9uc1twZWVyLnBlZXJdID0gcGVlclxuICAgICAgICAgICMgd2hlbiB0aGUgY29ubiBjbG9zZXMsIGRlbGV0ZSBpdCBmcm9tIHRoZSBjb25uZWN0aW9ucyBvYmplY3RcbiAgICAgICAgICBwZWVyLm9uICdjbG9zZScsICgpLT5cbiAgICAgICAgICAgIGRlbGV0ZSB0aGF0LmNvbm5lY3Rpb25zW3BlZXIucGVlcl1cbiAgICAgICAgICAjIGhlbHBlciBma3QuIHRydWUgaWZmIG9wIGlzIGFuIG9iamVjdCB0aGF0IGRvZXMgbm90IGhvbGQgZW51bWVyYWJsZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgaXNFbXB0eSA9IChvcyktPlxuICAgICAgICAgICAgZm9yIG8gb2Ygb3NcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgIGlmIGlzRW1wdHkodGhhdC51bnN5bmNlZF9jb25uZWN0aW9ucylcbiAgICAgICAgICAgICMgdGhlcmUgYXJlIG5vIHVuc3luY2VkIGNvbm5lY3Rpb25zLiB3ZSBhcmUgbm93IHN5bmNlZC5cbiAgICAgICAgICAgICMgdGhlcmVmb3JlIGV4ZWN1dGUgYWxsIGZrdHMgaW4gdGhpcy5jb21wdXRlX3doZW5fc3luY2VkXG4gICAgICAgICAgICB0aGF0LmlzX3N5bmNlZCA9IHRydWVcbiAgICAgICAgICAgIGZvciBjb21wIGluIHRoYXQuY29tcHV0ZV93aGVuX3N5bmNlZFxuICAgICAgICAgICAgICBjb21wWzBdLmFwcGx5IHRoYXQsIGNvbXBbMS4uXVxuICAgICAgICAgICAgdGhhdC5jb21wdXRlX3doZW5fc3luY2VkID0gW11cbiAgICAgICAgZWxzZVxuICAgICAgICAgICMgeW91IHJlY2VpdmVkIGEgbmV3IG1lc3NhZ2UsIHRoYXQgaXMgbm90IGEgc3luYyBtZXNzYWdlLlxuICAgICAgICAgICMgbm90aWZ5IHRoZSByZWNlaXZlX2hhbmRsZXJzXG4gICAgICAgICAgZm9yIGYgaW4gdGhhdC5yZWNlaXZlX2hhbmRsZXJzIFxuICAgICAgICAgICAgZiBwZWVyLnBlZXIsIGRhdGFcblxuXG4gICAgICAiXX0=
