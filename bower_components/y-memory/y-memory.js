"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);var f = new Error("Cannot find module '" + o + "'");throw (f.code = "MODULE_NOT_FOUND", f);
      }var l = n[o] = { exports: {} };t[o][0].call(l.exports, function (e) {
        var n = t[o][1][e];return s(n ? n : e);
      }, l, l.exports, e, t, n, r);
    }return n[o].exports;
  }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) s(r[o]);return s;
})({ 1: [function (require, module, exports) {
    /* global Y */
    'use strict';

    function extend(Y) {
      require('./RedBlackTree.js')(Y);

      var Transaction = (function (_Y$Transaction) {
        _inherits(Transaction, _Y$Transaction);

        function Transaction(store) {
          _classCallCheck(this, Transaction);

          _Y$Transaction.call(this, store);
          this.store = store;
          this.ss = store.ss;
          this.os = store.os;
          this.ds = store.ds;
        }

        return Transaction;
      })(Y.Transaction);

      var Database = (function (_Y$AbstractDatabase) {
        _inherits(Database, _Y$AbstractDatabase);

        function Database(y, opts) {
          _classCallCheck(this, Database);

          _Y$AbstractDatabase.call(this, y, opts);
          this.os = new Y.utils.RBTree();
          this.ds = new Y.utils.RBTree();
          this.ss = new Y.utils.RBTree();
        }

        Database.prototype.logTable = function logTable() {
          var self = this;
          self.requestTransaction(regeneratorRuntime.mark(function callee$4$0() {
            return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
              while (1) switch (context$5$0.prev = context$5$0.next) {
                case 0:
                  console.log('User: ', this.store.y.connector.userId, "=============================="); // eslint-disable-line
                  context$5$0.t0 = console;
                  return context$5$0.delegateYield(this.getStateSet(), "t1", 3);

                case 3:
                  context$5$0.t2 = context$5$0.t1;
                  context$5$0.t0.log.call(context$5$0.t0, "State Set (SS):", context$5$0.t2);
                  // eslint-disable-line
                  console.log("Operation Store (OS):"); // eslint-disable-line
                  return context$5$0.delegateYield(this.os.logTable(), "t3", 7);

                case 7:
                  // eslint-disable-line
                  console.log("Deletion Store (DS):"); //eslint-disable-line
                  return context$5$0.delegateYield(this.ds.logTable(), "t4", 9);

                case 9:
                  // eslint-disable-line
                  if (this.store.gc1.length > 0 || this.store.gc2.length > 0) {
                    console.warn('GC1|2 not empty!', this.store.gc1, this.store.gc2);
                  }
                  if (JSON.stringify(this.store.listenersById) !== '{}') {
                    console.warn('listenersById not empty!');
                  }
                  if (JSON.stringify(this.store.listenersByIdExecuteNow) !== '[]') {
                    console.warn('listenersByIdExecuteNow not empty!');
                  }
                  if (this.store.transactionInProgress) {
                    console.warn('Transaction still in progress!');
                  }

                case 13:
                case "end":
                  return context$5$0.stop();
              }
            }, callee$4$0, this);
          }), true);
        };

        Database.prototype.transact = function transact(makeGen) {
          var t = new Transaction(this);
          while (makeGen !== null) {
            var gen = makeGen.call(t);
            var res = gen.next();
            while (!res.done) {
              res = gen.next(res.value);
            }
            makeGen = this.getNextRequest();
          }
        };

        Database.prototype.destroy = regeneratorRuntime.mark(function destroy() {
          return regeneratorRuntime.wrap(function destroy$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                _Y$AbstractDatabase.prototype.destroy.call(this);
                delete this.os;
                delete this.ss;
                delete this.ds;

              case 4:
              case "end":
                return context$4$0.stop();
            }
          }, destroy, this);
        });
        return Database;
      })(Y.AbstractDatabase);

      Y.extend('memory', Database);
    }

    module.exports = extend;
    if (typeof Y !== 'undefined') {
      extend(Y);
    }
  }, { "./RedBlackTree.js": 2 }], 2: [function (require, module, exports) {
    'use strict';

    /*
      This file contains a not so fancy implemantion of a Red Black Tree.
    */
    module.exports = function (Y) {
      var N = (function () {
        // A created node is always red!

        function N(val) {
          _classCallCheck(this, N);

          this.val = val;
          this.color = true;
          this._left = null;
          this._right = null;
          this._parent = null;
          if (val.id === null) {
            throw new Error('You must define id!');
          }
        }

        N.prototype.isRed = function isRed() {
          return this.color;
        };

        N.prototype.isBlack = function isBlack() {
          return !this.color;
        };

        N.prototype.redden = function redden() {
          this.color = true;return this;
        };

        N.prototype.blacken = function blacken() {
          this.color = false;return this;
        };

        N.prototype.rotateLeft = function rotateLeft(tree) {
          var parent = this.parent;
          var newParent = this.right;
          var newRight = this.right.left;
          newParent.left = this;
          this.right = newRight;
          if (parent === null) {
            tree.root = newParent;
            newParent._parent = null;
          } else if (parent.left === this) {
            parent.left = newParent;
          } else if (parent.right === this) {
            parent.right = newParent;
          } else {
            throw new Error('The elements are wrongly connected!');
          }
        };

        N.prototype.next = function next() {
          if (this.right !== null) {
            // search the most left node in the right tree
            var o = this.right;
            while (o.left !== null) {
              o = o.left;
            }
            return o;
          } else {
            var p = this;
            while (p.parent !== null && p !== p.parent.left) {
              p = p.parent;
            }
            return p.parent;
          }
        };

        N.prototype.prev = function prev() {
          if (this.left !== null) {
            // search the most right node in the left tree
            var o = this.left;
            while (o.right !== null) {
              o = o.right;
            }
            return o;
          } else {
            var p = this;
            while (p.parent !== null && p !== p.parent.right) {
              p = p.parent;
            }
            return p.parent;
          }
        };

        N.prototype.rotateRight = function rotateRight(tree) {
          var parent = this.parent;
          var newParent = this.left;
          var newLeft = this.left.right;
          newParent.right = this;
          this.left = newLeft;
          if (parent === null) {
            tree.root = newParent;
            newParent._parent = null;
          } else if (parent.left === this) {
            parent.left = newParent;
          } else if (parent.right === this) {
            parent.right = newParent;
          } else {
            throw new Error('The elements are wrongly connected!');
          }
        };

        N.prototype.getUncle = function getUncle() {
          // we can assume that grandparent exists when this is called!
          if (this.parent === this.parent.parent.left) {
            return this.parent.parent.right;
          } else {
            return this.parent.parent.left;
          }
        };

        _createClass(N, [{
          key: "grandparent",
          get: function get() {
            return this.parent.parent;
          }
        }, {
          key: "parent",
          get: function get() {
            return this._parent;
          }
        }, {
          key: "sibling",
          get: function get() {
            return this === this.parent.left ? this.parent.right : this.parent.left;
          }
        }, {
          key: "left",
          get: function get() {
            return this._left;
          },
          set: function set(n) {
            if (n !== null) {
              n._parent = this;
            }
            this._left = n;
          }
        }, {
          key: "right",
          get: function get() {
            return this._right;
          },
          set: function set(n) {
            if (n !== null) {
              n._parent = this;
            }
            this._right = n;
          }
        }]);

        return N;
      })();

      var RBTree = (function () {
        function RBTree() {
          _classCallCheck(this, RBTree);

          this.root = null;
          this.length = 0;
        }

        RBTree.prototype.findNext = regeneratorRuntime.mark(function findNext(id) {
          return regeneratorRuntime.wrap(function findNext$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.findWithLowerBound([id[0], id[1] + 1]), "t0", 1);

              case 1:
                return context$4$0.abrupt("return", context$4$0.t0);

              case 2:
              case "end":
                return context$4$0.stop();
            }
          }, findNext, this);
        });
        RBTree.prototype.findPrev = regeneratorRuntime.mark(function findPrev(id) {
          return regeneratorRuntime.wrap(function findPrev$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.delegateYield(this.findWithUpperBound([id[0], id[1] - 1]), "t0", 1);

              case 1:
                return context$4$0.abrupt("return", context$4$0.t0);

              case 2:
              case "end":
                return context$4$0.stop();
            }
          }, findPrev, this);
        });

        RBTree.prototype.findNodeWithLowerBound = function findNodeWithLowerBound(from) {
          if (from === void 0) {
            throw new Error('You must define from!');
          }
          var o = this.root;
          if (o === null) {
            return null;
          } else {
            while (true) {
              if ((from === null || Y.utils.smaller(from, o.val.id)) && o.left !== null) {
                // o is included in the bound
                // try to find an element that is closer to the bound
                o = o.left;
              } else if (from !== null && Y.utils.smaller(o.val.id, from)) {
                // o is not within the bound, maybe one of the right elements is..
                if (o.right !== null) {
                  o = o.right;
                } else {
                  // there is no right element. Search for the next bigger element,
                  // this should be within the bounds
                  return o.next();
                }
              } else {
                return o;
              }
            }
          }
        };

        RBTree.prototype.findNodeWithUpperBound = function findNodeWithUpperBound(to) {
          if (to === void 0) {
            throw new Error('You must define from!');
          }
          var o = this.root;
          if (o === null) {
            return null;
          } else {
            while (true) {
              if ((to === null || Y.utils.smaller(o.val.id, to)) && o.right !== null) {
                // o is included in the bound
                // try to find an element that is closer to the bound
                o = o.right;
              } else if (to !== null && Y.utils.smaller(to, o.val.id)) {
                // o is not within the bound, maybe one of the left elements is..
                if (o.left !== null) {
                  o = o.left;
                } else {
                  // there is no left element. Search for the prev smaller element,
                  // this should be within the bounds
                  return o.prev();
                }
              } else {
                return o;
              }
            }
          }
        };

        RBTree.prototype.findWithLowerBound = regeneratorRuntime.mark(function findWithLowerBound(from) {
          var n;
          return regeneratorRuntime.wrap(function findWithLowerBound$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                n = this.findNodeWithLowerBound(from);
                return context$4$0.abrupt("return", n == null ? null : n.val);

              case 2:
              case "end":
                return context$4$0.stop();
            }
          }, findWithLowerBound, this);
        });
        RBTree.prototype.findWithUpperBound = regeneratorRuntime.mark(function findWithUpperBound(to) {
          var n;
          return regeneratorRuntime.wrap(function findWithUpperBound$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                n = this.findNodeWithUpperBound(to);
                return context$4$0.abrupt("return", n == null ? null : n.val);

              case 2:
              case "end":
                return context$4$0.stop();
            }
          }, findWithUpperBound, this);
        });
        RBTree.prototype.iterate = regeneratorRuntime.mark(function iterate(t, from, to, f) {
          var o;
          return regeneratorRuntime.wrap(function iterate$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                o = this.findNodeWithLowerBound(from);

              case 1:
                if (!(o !== null && (to === null || Y.utils.smaller(o.val.id, to) || Y.utils.compareIds(o.val.id, to)))) {
                  context$4$0.next = 6;
                  break;
                }

                return context$4$0.delegateYield(f.call(t, o.val), "t0", 3);

              case 3:
                o = o.next();
                context$4$0.next = 1;
                break;

              case 6:
                return context$4$0.abrupt("return", true);

              case 7:
              case "end":
                return context$4$0.stop();
            }
          }, iterate, this);
        });
        RBTree.prototype.logTable = regeneratorRuntime.mark(function logTable(from, to, filter) {
          var os;
          return regeneratorRuntime.wrap(function logTable$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                if (filter == null) {
                  filter = function () {
                    return true;
                  };
                }
                if (from == null) {
                  from = null;
                }
                if (to == null) {
                  to = null;
                }
                os = [];
                return context$4$0.delegateYield(this.iterate(this, from, to, regeneratorRuntime.mark(function callee$4$0(o) {
                  var o_, key;
                  return regeneratorRuntime.wrap(function callee$4$0$(context$5$0) {
                    while (1) switch (context$5$0.prev = context$5$0.next) {
                      case 0:
                        if (filter(o)) {
                          o_ = {};

                          for (key in o) {
                            if (typeof o[key] === 'object') {
                              o_[key] = JSON.stringify(o[key]);
                            } else {
                              o_[key] = o[key];
                            }
                          }
                          os.push(o_);
                        }

                      case 1:
                      case "end":
                        return context$5$0.stop();
                    }
                  }, callee$4$0, this);
                })), "t0", 5);

              case 5:
                if (console.table != null) {
                  console.table(os);
                }

              case 6:
              case "end":
                return context$4$0.stop();
            }
          }, logTable, this);
        });
        RBTree.prototype.find = regeneratorRuntime.mark(function find(id) {
          var n;
          return regeneratorRuntime.wrap(function find$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                return context$4$0.abrupt("return", (n = this.findNode(id)) ? n.val : null);

              case 1:
              case "end":
                return context$4$0.stop();
            }
          }, find, this);
        });

        RBTree.prototype.findNode = function findNode(id) {
          if (id == null || id.constructor !== Array) {
            throw new Error('Expect id to be an array!');
          }
          var o = this.root;
          if (o === null) {
            return false;
          } else {
            while (true) {
              if (o === null) {
                return false;
              }
              if (Y.utils.smaller(id, o.val.id)) {
                o = o.left;
              } else if (Y.utils.smaller(o.val.id, id)) {
                o = o.right;
              } else {
                return o;
              }
            }
          }
        };

        RBTree.prototype["delete"] = regeneratorRuntime.mark(function _delete(id) {
          var d, o, isFakeChild, child;
          return regeneratorRuntime.wrap(function _delete$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                if (!(id == null || id.constructor !== Array)) {
                  context$4$0.next = 2;
                  break;
                }

                throw new Error('id is expected to be an Array!');

              case 2:
                d = this.findNode(id);

                if (!(d == null)) {
                  context$4$0.next = 5;
                  break;
                }

                throw new Error('Element does not exist!');

              case 5:
                this.length--;
                if (d.left !== null && d.right !== null) {
                  o = d.left;

                  // find
                  while (o.right !== null) {
                    o = o.right;
                  }
                  // switch
                  d.val = o.val;
                  d = o;
                }
                // d has at most one child
                // let n be the node that replaces d
                child = d.left || d.right;

                if (child === null) {
                  isFakeChild = true;
                  child = new N({ id: 0 });
                  child.blacken();
                  d.right = child;
                } else {
                  isFakeChild = false;
                }

                if (!(d.parent === null)) {
                  context$4$0.next = 14;
                  break;
                }

                if (!isFakeChild) {
                  this.root = child;
                  child.blacken();
                  child._parent = null;
                } else {
                  this.root = null;
                }
                return context$4$0.abrupt("return");

              case 14:
                if (!(d.parent.left === d)) {
                  context$4$0.next = 18;
                  break;
                }

                d.parent.left = child;
                context$4$0.next = 23;
                break;

              case 18:
                if (!(d.parent.right === d)) {
                  context$4$0.next = 22;
                  break;
                }

                d.parent.right = child;
                context$4$0.next = 23;
                break;

              case 22:
                throw new Error('Impossible!');

              case 23:
                if (d.isBlack()) {
                  if (child.isRed()) {
                    child.blacken();
                  } else {
                    this._fixDelete(child);
                  }
                }
                this.root.blacken();

                if (!isFakeChild) {
                  context$4$0.next = 35;
                  break;
                }

                if (!(child.parent.left === child)) {
                  context$4$0.next = 30;
                  break;
                }

                child.parent.left = null;
                context$4$0.next = 35;
                break;

              case 30:
                if (!(child.parent.right === child)) {
                  context$4$0.next = 34;
                  break;
                }

                child.parent.right = null;
                context$4$0.next = 35;
                break;

              case 34:
                throw new Error('Impossible #3');

              case 35:
              case "end":
                return context$4$0.stop();
            }
          }, _delete, this);
        });

        RBTree.prototype._fixDelete = function _fixDelete(n) {
          function isBlack(node) {
            return node !== null ? node.isBlack() : true;
          }
          function isRed(node) {
            return node !== null ? node.isRed() : false;
          }
          if (n.parent === null) {
            // this can only be called after the first iteration of fixDelete.
            return;
          }
          // d was already replaced by the child
          // d is not the root
          // d and child are black
          var sibling = n.sibling;
          if (isRed(sibling)) {
            // make sibling the grandfather
            n.parent.redden();
            sibling.blacken();
            if (n === n.parent.left) {
              n.parent.rotateLeft(this);
            } else if (n === n.parent.right) {
              n.parent.rotateRight(this);
            } else {
              throw new Error('Impossible #2');
            }
            sibling = n.sibling;
          }
          // parent, sibling, and children of n are black
          if (n.parent.isBlack() && sibling.isBlack() && isBlack(sibling.left) && isBlack(sibling.right)) {
            sibling.redden();
            this._fixDelete(n.parent);
          } else if (n.parent.isRed() && sibling.isBlack() && isBlack(sibling.left) && isBlack(sibling.right)) {
            sibling.redden();
            n.parent.blacken();
          } else {
            if (n === n.parent.left && sibling.isBlack() && isRed(sibling.left) && isBlack(sibling.right)) {
              sibling.redden();
              sibling.left.blacken();
              sibling.rotateRight(this);
              sibling = n.sibling;
            } else if (n === n.parent.right && sibling.isBlack() && isRed(sibling.right) && isBlack(sibling.left)) {
              sibling.redden();
              sibling.right.blacken();
              sibling.rotateLeft(this);
              sibling = n.sibling;
            }
            sibling.color = n.parent.color;
            n.parent.blacken();
            if (n === n.parent.left) {
              sibling.right.blacken();
              n.parent.rotateLeft(this);
            } else {
              sibling.left.blacken();
              n.parent.rotateRight(this);
            }
          }
        };

        RBTree.prototype.put = regeneratorRuntime.mark(function put(v) {
          var node, p;
          return regeneratorRuntime.wrap(function put$(context$4$0) {
            while (1) switch (context$4$0.prev = context$4$0.next) {
              case 0:
                if (!(v == null || v.id == null || v.id.constructor !== Array)) {
                  context$4$0.next = 2;
                  break;
                }

                throw new Error('v is expected to have an id property which is an Array!');

              case 2:
                node = new N(v);

                if (!(this.root !== null)) {
                  context$4$0.next = 31;
                  break;
                }

                p = this.root;

              case 5:
                if (!true) {
                  context$4$0.next = 28;
                  break;
                }

                if (!Y.utils.smaller(node.val.id, p.val.id)) {
                  context$4$0.next = 15;
                  break;
                }

                if (!(p.left === null)) {
                  context$4$0.next = 12;
                  break;
                }

                p.left = node;
                return context$4$0.abrupt("break", 28);

              case 12:
                p = p.left;

              case 13:
                context$4$0.next = 26;
                break;

              case 15:
                if (!Y.utils.smaller(p.val.id, node.val.id)) {
                  context$4$0.next = 24;
                  break;
                }

                if (!(p.right === null)) {
                  context$4$0.next = 21;
                  break;
                }

                p.right = node;
                return context$4$0.abrupt("break", 28);

              case 21:
                p = p.right;

              case 22:
                context$4$0.next = 26;
                break;

              case 24:
                p.val = node.val;
                return context$4$0.abrupt("return", p);

              case 26:
                context$4$0.next = 5;
                break;

              case 28:
                this._fixInsert(node);
                context$4$0.next = 32;
                break;

              case 31:
                this.root = node;

              case 32:
                this.length++;
                this.root.blacken();
                return context$4$0.abrupt("return", node);

              case 35:
              case "end":
                return context$4$0.stop();
            }
          }, put, this);
        });

        RBTree.prototype._fixInsert = function _fixInsert(n) {
          if (n.parent === null) {
            n.blacken();
            return;
          } else if (n.parent.isBlack()) {
            return;
          }
          var uncle = n.getUncle();
          if (uncle !== null && uncle.isRed()) {
            // Note: parent: red, uncle: red
            n.parent.blacken();
            uncle.blacken();
            n.grandparent.redden();
            this._fixInsert(n.grandparent);
          } else {
            // Note: parent: red, uncle: black or null
            // Now we transform the tree in such a way that
            // either of these holds:
            //   1) grandparent.left.isRed
            //     and grandparent.left.left.isRed
            //   2) grandparent.right.isRed
            //     and grandparent.right.right.isRed
            if (n === n.parent.right && n.parent === n.grandparent.left) {
              n.parent.rotateLeft(this);
              // Since we rotated and want to use the previous
              // cases, we need to set n in such a way that
              // n.parent.isRed again
              n = n.left;
            } else if (n === n.parent.left && n.parent === n.grandparent.right) {
              n.parent.rotateRight(this);
              // see above
              n = n.right;
            }
            // Case 1) or 2) hold from here on.
            // Now traverse grandparent, make parent a black node
            // on the highest level which holds two red nodes.
            n.parent.blacken();
            n.grandparent.redden();
            if (n === n.parent.left) {
              // Case 1
              n.grandparent.rotateRight(this);
            } else {
              // Case 2
              n.grandparent.rotateLeft(this);
            }
          }
        };

        return RBTree;
      })();

      Y.utils.RBTree = RBTree;
    };
  }, {}] }, {}, [1]);

// switch d with the greates element in the left subtree.
// o should have at most one child.
// p abbrev. parent