(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
new Polymer('peerjs-connector', {
  join: function(id) {},
  idChanged: function(old_val, new_val) {
    if (this.is_initialized) {
      throw new Error("You must not set the user_id twice!");
    } else {
      return this.initializeConnection();
    }
  },
  initializeConnection: function() {
    var options, writeIfAvailable;
    if (this.conn_id != null) {
      console.log("now initializing");
      options = {};
      writeIfAvailable = function(name, value) {
        if (value != null) {
          return options[name] = value;
        }
      };
      writeIfAvailable('key', this.key);
      writeIfAvailable('host', this.host);
      writeIfAvailable('port', this.port);
      writeIfAvailable('path', this.path);
      writeIfAvailable('secure', this.secure);
      writeIfAvailable('debug', this.debug);
      this.is_initialized = true;
      return this.connector = new PeerJsConnector(this.conn_id, options);
    }
  },
  ready: function() {
    if (this.conn_id !== null) {
      return this.initializeConnection();
    }
  }
});



},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9tb2R1bGVzL1lhdHRhLUNvbm5lY3RvcnMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvY29kaW8vd29ya3NwYWNlL21vZHVsZXMvWWF0dGEtQ29ubmVjdG9ycy9saWIvcGVlcmpzLWNvbm5lY3Rvci9wZWVyanMtY29ubmVjdG9yLXBvbHltZXIuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQ0EsSUFBSSxPQUFBLENBQVEsa0JBQVIsRUFDRjtBQUFBLEVBQUEsSUFBQSxFQUFNLFNBQUMsRUFBRCxHQUFBLENBQU47QUFBQSxFQUNBLFNBQUEsRUFBVyxTQUFDLE9BQUQsRUFBUyxPQUFULEdBQUE7QUFDVCxJQUFBLElBQUcsSUFBSSxDQUFDLGNBQVI7QUFDRSxZQUFVLElBQUEsS0FBQSxDQUFNLHFDQUFOLENBQVYsQ0FERjtLQUFBLE1BQUE7YUFHRSxJQUFJLENBQUMsb0JBQUwsQ0FBQSxFQUhGO0tBRFM7RUFBQSxDQURYO0FBQUEsRUFPQSxvQkFBQSxFQUFzQixTQUFBLEdBQUE7QUFDcEIsUUFBQSx5QkFBQTtBQUFBLElBQUEsSUFBRyxvQkFBSDtBQUNFLE1BQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSxrQkFBWixDQUFBLENBQUE7QUFBQSxNQUNBLE9BQUEsR0FBVSxFQURWLENBQUE7QUFBQSxNQUVBLGdCQUFBLEdBQW1CLFNBQUMsSUFBRCxFQUFPLEtBQVAsR0FBQTtBQUNqQixRQUFBLElBQUcsYUFBSDtpQkFDRSxPQUFRLENBQUEsSUFBQSxDQUFSLEdBQWdCLE1BRGxCO1NBRGlCO01BQUEsQ0FGbkIsQ0FBQTtBQUFBLE1BS0EsZ0JBQUEsQ0FBaUIsS0FBakIsRUFBd0IsSUFBSSxDQUFDLEdBQTdCLENBTEEsQ0FBQTtBQUFBLE1BTUEsZ0JBQUEsQ0FBaUIsTUFBakIsRUFBeUIsSUFBSSxDQUFDLElBQTlCLENBTkEsQ0FBQTtBQUFBLE1BT0EsZ0JBQUEsQ0FBaUIsTUFBakIsRUFBeUIsSUFBSSxDQUFDLElBQTlCLENBUEEsQ0FBQTtBQUFBLE1BUUEsZ0JBQUEsQ0FBaUIsTUFBakIsRUFBeUIsSUFBSSxDQUFDLElBQTlCLENBUkEsQ0FBQTtBQUFBLE1BU0EsZ0JBQUEsQ0FBaUIsUUFBakIsRUFBMkIsSUFBSSxDQUFDLE1BQWhDLENBVEEsQ0FBQTtBQUFBLE1BVUEsZ0JBQUEsQ0FBaUIsT0FBakIsRUFBMEIsSUFBSSxDQUFDLEtBQS9CLENBVkEsQ0FBQTtBQUFBLE1BV0EsSUFBSSxDQUFDLGNBQUwsR0FBc0IsSUFYdEIsQ0FBQTthQVlBLElBQUksQ0FBQyxTQUFMLEdBQXFCLElBQUEsZUFBQSxDQUFnQixJQUFJLENBQUMsT0FBckIsRUFBOEIsT0FBOUIsRUFidkI7S0FEb0I7RUFBQSxDQVB0QjtBQUFBLEVBdUJBLEtBQUEsRUFBTyxTQUFBLEdBQUE7QUFDTCxJQUFBLElBQUcsSUFBSSxDQUFDLE9BQUwsS0FBZ0IsSUFBbkI7YUFDRSxJQUFJLENBQUMsb0JBQUwsQ0FBQSxFQURGO0tBREs7RUFBQSxDQXZCUDtDQURFLENBQUosQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbm5ldyBQb2x5bWVyICdwZWVyanMtY29ubmVjdG9yJyxcbiAgam9pbjogKGlkKS0+XG4gIGlkQ2hhbmdlZDogKG9sZF92YWwsbmV3X3ZhbCktPlxuICAgIGlmIHRoaXMuaXNfaW5pdGlhbGl6ZWRcbiAgICAgIHRocm93IG5ldyBFcnJvciBcIllvdSBtdXN0IG5vdCBzZXQgdGhlIHVzZXJfaWQgdHdpY2UhXCJcbiAgICBlbHNlXG4gICAgICB0aGlzLmluaXRpYWxpemVDb25uZWN0aW9uKClcblxuICBpbml0aWFsaXplQ29ubmVjdGlvbjogKCktPiBcbiAgICBpZiB0aGlzLmNvbm5faWQ/XG4gICAgICBjb25zb2xlLmxvZyhcIm5vdyBpbml0aWFsaXppbmdcIilcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgICAgd3JpdGVJZkF2YWlsYWJsZSA9IChuYW1lLCB2YWx1ZSktPlxuICAgICAgICBpZiB2YWx1ZT9cbiAgICAgICAgICBvcHRpb25zW25hbWVdID0gdmFsdWVcbiAgICAgIHdyaXRlSWZBdmFpbGFibGUgJ2tleScsIHRoaXMua2V5XG4gICAgICB3cml0ZUlmQXZhaWxhYmxlICdob3N0JywgdGhpcy5ob3N0XG4gICAgICB3cml0ZUlmQXZhaWxhYmxlICdwb3J0JywgdGhpcy5wb3J0XG4gICAgICB3cml0ZUlmQXZhaWxhYmxlICdwYXRoJywgdGhpcy5wYXRoXG4gICAgICB3cml0ZUlmQXZhaWxhYmxlICdzZWN1cmUnLCB0aGlzLnNlY3VyZVxuICAgICAgd3JpdGVJZkF2YWlsYWJsZSAnZGVidWcnLCB0aGlzLmRlYnVnXG4gICAgICB0aGlzLmlzX2luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuY29ubmVjdG9yID0gbmV3IFBlZXJKc0Nvbm5lY3RvciB0aGlzLmNvbm5faWQsIG9wdGlvbnNcblxuICByZWFkeTogKCktPlxuICAgIGlmIHRoaXMuY29ubl9pZCAhPSBudWxsXG4gICAgICB0aGlzLmluaXRpYWxpemVDb25uZWN0aW9uKClcbiJdfQ==
