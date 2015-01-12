(function() {
  var Engine;

  if (typeof window !== "undefined" && window !== null) {
    window.unprocessed_counter = 0;
  }

  if (typeof window !== "undefined" && window !== null) {
    window.unprocessed_exec_counter = 0;
  }

  if (typeof window !== "undefined" && window !== null) {
    window.unprocessed_types = [];
  }

  Engine = (function() {
    function Engine(HB, parser) {
      this.HB = HB;
      this.parser = parser;
      this.unprocessed_ops = [];
    }

    Engine.prototype.parseOperation = function(json) {
      var typeParser;
      typeParser = this.parser[json.type];
      if (typeParser != null) {
        return typeParser(json);
      } else {
        throw new Error("You forgot to specify a parser for type " + json.type + ". The message is " + (JSON.stringify(json)) + ".");
      }
    };

    Engine.prototype.applyOpsBundle = function(ops_json) {
      var o, ops, _i, _j, _len, _len1;
      ops = [];
      for (_i = 0, _len = ops_json.length; _i < _len; _i++) {
        o = ops_json[_i];
        ops.push(this.parseOperation(o));
      }
      for (_j = 0, _len1 = ops.length; _j < _len1; _j++) {
        o = ops[_j];
        if (!o.execute()) {
          this.unprocessed_ops.push(o);
        }
      }
      return this.tryUnprocessed();
    };

    Engine.prototype.applyOpsCheckDouble = function(ops_json) {
      var o, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = ops_json.length; _i < _len; _i++) {
        o = ops_json[_i];
        if (this.HB.getOperation(o.uid) == null) {
          _results.push(this.applyOp(o));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Engine.prototype.applyOps = function(ops_json) {
      var o, _i, _len, _results;
      _results = [];
      for (_i = 0, _len = ops_json.length; _i < _len; _i++) {
        o = ops_json[_i];
        _results.push(this.applyOp(o));
      }
      return _results;
    };

    Engine.prototype.applyOp = function(op_json) {
      var o;
      o = this.parseOperation(op_json);
      this.HB.addToCounter(o);
      if (this.HB.getOperation(o) != null) {

      } else if (!o.execute()) {
        this.unprocessed_ops.push(o);
        if (typeof window !== "undefined" && window !== null) {
          window.unprocessed_counter++;
        }
        if (typeof window !== "undefined" && window !== null) {
          window.unprocessed_types.push(o.type);
        }
      }
      return this.tryUnprocessed();
    };

    Engine.prototype.tryUnprocessed = function() {
      var old_length, op, unprocessed, _i, _len, _ref, _results;
      _results = [];
      while (true) {
        if (typeof window !== "undefined" && window !== null) {
          window.unprocessed_exec_counter++;
        }
        old_length = this.unprocessed_ops.length;
        unprocessed = [];
        _ref = this.unprocessed_ops;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          op = _ref[_i];
          if (this.HB.getOperation(op) != null) {

          } else if (!op.execute()) {
            unprocessed.push(op);
          }
        }
        this.unprocessed_ops = unprocessed;
        if (this.unprocessed_ops.length === old_length) {
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    return Engine;

  })();

  module.exports = Engine;

}).call(this);

//# sourceMappingURL=Engine.js.map