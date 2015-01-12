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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9ZYXR0YS1Db25uZWN0b3JzL25vZGVfbW9kdWxlcy9ndWxwLWJyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9ob21lL2NvZGlvL3dvcmtzcGFjZS9ZYXR0YS1Db25uZWN0b3JzL2xpYi9wZWVyanMtY29ubmVjdG9yL3BlZXJqcy1jb25uZWN0b3ItcG9seW1lci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNDQSxJQUFJLE9BQUEsQ0FBUSxrQkFBUixFQUNGO0FBQUEsRUFBQSxJQUFBLEVBQU0sU0FBQyxFQUFELEdBQUEsQ0FBTjtBQUFBLEVBQ0EsU0FBQSxFQUFXLFNBQUMsT0FBRCxFQUFTLE9BQVQsR0FBQTtBQUNULElBQUEsSUFBRyxJQUFJLENBQUMsY0FBUjtBQUNFLFlBQVUsSUFBQSxLQUFBLENBQU0scUNBQU4sQ0FBVixDQURGO0tBQUEsTUFBQTthQUdFLElBQUksQ0FBQyxvQkFBTCxDQUFBLEVBSEY7S0FEUztFQUFBLENBRFg7QUFBQSxFQU9BLG9CQUFBLEVBQXNCLFNBQUEsR0FBQTtBQUNwQixRQUFBLHlCQUFBO0FBQUEsSUFBQSxJQUFHLG9CQUFIO0FBQ0UsTUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLGtCQUFaLENBQUEsQ0FBQTtBQUFBLE1BQ0EsT0FBQSxHQUFVLEVBRFYsQ0FBQTtBQUFBLE1BRUEsZ0JBQUEsR0FBbUIsU0FBQyxJQUFELEVBQU8sS0FBUCxHQUFBO0FBQ2pCLFFBQUEsSUFBRyxhQUFIO2lCQUNFLE9BQVEsQ0FBQSxJQUFBLENBQVIsR0FBZ0IsTUFEbEI7U0FEaUI7TUFBQSxDQUZuQixDQUFBO0FBQUEsTUFLQSxnQkFBQSxDQUFpQixLQUFqQixFQUF3QixJQUFJLENBQUMsR0FBN0IsQ0FMQSxDQUFBO0FBQUEsTUFNQSxnQkFBQSxDQUFpQixNQUFqQixFQUF5QixJQUFJLENBQUMsSUFBOUIsQ0FOQSxDQUFBO0FBQUEsTUFPQSxnQkFBQSxDQUFpQixNQUFqQixFQUF5QixJQUFJLENBQUMsSUFBOUIsQ0FQQSxDQUFBO0FBQUEsTUFRQSxnQkFBQSxDQUFpQixNQUFqQixFQUF5QixJQUFJLENBQUMsSUFBOUIsQ0FSQSxDQUFBO0FBQUEsTUFTQSxnQkFBQSxDQUFpQixRQUFqQixFQUEyQixJQUFJLENBQUMsTUFBaEMsQ0FUQSxDQUFBO0FBQUEsTUFVQSxnQkFBQSxDQUFpQixPQUFqQixFQUEwQixJQUFJLENBQUMsS0FBL0IsQ0FWQSxDQUFBO0FBQUEsTUFXQSxJQUFJLENBQUMsY0FBTCxHQUFzQixJQVh0QixDQUFBO2FBWUEsSUFBSSxDQUFDLFNBQUwsR0FBcUIsSUFBQSxlQUFBLENBQWdCLElBQUksQ0FBQyxPQUFyQixFQUE4QixPQUE5QixFQWJ2QjtLQURvQjtFQUFBLENBUHRCO0FBQUEsRUF1QkEsS0FBQSxFQUFPLFNBQUEsR0FBQTtBQUNMLElBQUEsSUFBRyxJQUFJLENBQUMsT0FBTCxLQUFnQixJQUFuQjthQUNFLElBQUksQ0FBQyxvQkFBTCxDQUFBLEVBREY7S0FESztFQUFBLENBdkJQO0NBREUsQ0FBSixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxubmV3IFBvbHltZXIgJ3BlZXJqcy1jb25uZWN0b3InLFxuICBqb2luOiAoaWQpLT5cbiAgaWRDaGFuZ2VkOiAob2xkX3ZhbCxuZXdfdmFsKS0+XG4gICAgaWYgdGhpcy5pc19pbml0aWFsaXplZFxuICAgICAgdGhyb3cgbmV3IEVycm9yIFwiWW91IG11c3Qgbm90IHNldCB0aGUgdXNlcl9pZCB0d2ljZSFcIlxuICAgIGVsc2VcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZUNvbm5lY3Rpb24oKVxuXG4gIGluaXRpYWxpemVDb25uZWN0aW9uOiAoKS0+IFxuICAgIGlmIHRoaXMuY29ubl9pZD9cbiAgICAgIGNvbnNvbGUubG9nKFwibm93IGluaXRpYWxpemluZ1wiKVxuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgICB3cml0ZUlmQXZhaWxhYmxlID0gKG5hbWUsIHZhbHVlKS0+XG4gICAgICAgIGlmIHZhbHVlP1xuICAgICAgICAgIG9wdGlvbnNbbmFtZV0gPSB2YWx1ZVxuICAgICAgd3JpdGVJZkF2YWlsYWJsZSAna2V5JywgdGhpcy5rZXlcbiAgICAgIHdyaXRlSWZBdmFpbGFibGUgJ2hvc3QnLCB0aGlzLmhvc3RcbiAgICAgIHdyaXRlSWZBdmFpbGFibGUgJ3BvcnQnLCB0aGlzLnBvcnRcbiAgICAgIHdyaXRlSWZBdmFpbGFibGUgJ3BhdGgnLCB0aGlzLnBhdGhcbiAgICAgIHdyaXRlSWZBdmFpbGFibGUgJ3NlY3VyZScsIHRoaXMuc2VjdXJlXG4gICAgICB3cml0ZUlmQXZhaWxhYmxlICdkZWJ1ZycsIHRoaXMuZGVidWdcbiAgICAgIHRoaXMuaXNfaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5jb25uZWN0b3IgPSBuZXcgUGVlckpzQ29ubmVjdG9yIHRoaXMuY29ubl9pZCwgb3B0aW9uc1xuXG4gIHJlYWR5OiAoKS0+XG4gICAgaWYgdGhpcy5jb25uX2lkICE9IG51bGxcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZUNvbm5lY3Rpb24oKVxuIl19
