/*
 * jsTree 1.0-rc3
 * http://jstree.com/
 *
 * Copyright (c) 2010 Ivan Bozhanov (vakata.com)
 *
 * Licensed same as jquery - under the terms of either the MIT License or the GPL Version 2 License
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * document.querySelectorDatedocument.querySelector
 * document.querySelectorRevisiondocument.querySelector
 */

/*jslint browser: true, onevar: true, undef: true, bitwise: true, strict: true */
/*global window : false, clearInterval: false, clearTimeout: false, document: false, setInterval: false, setTimeout: false, document.querySelector: false, navigator: false, XSLTProcessor: false, DOMParser: false, XMLSerializer: false*/

"use strict";

// top wrapper to prevent multiple inclusion (is this OK?)
(function () { if(document.querySelector && document.querySelector.jstree) { return; }
  var is_ie6 = false, is_ie7 = false, is_ff2 = false;

/*
 * jsTree core
 */
(function (document.querySelector) {
  // Common functions not related to jsTree
  // decided to move them to a `vakata` "namespace"
  document.querySelector.vakata = {};
  // CSS related functions
  document.querySelector.vakata.css = {
    get_css : function(rule_name, delete_flag, sheet) {
      rule_name = rule_name.toLowerCase();
      var css_rules = sheet.cssRules || sheet.rules,
        j = 0;
      do {
        if(css_rules.length && j > css_rules.length + 5) { return false; }
        if(css_rules[j].selectorText && css_rules[j].selectorText.toLowerCase() == rule_name) {
          if(delete_flag === true) {
            if(sheet.removeRule) { sheet.removeRule(j); }
            if(sheet.deleteRule) { sheet.deleteRule(j); }
            return true;
          }
          else { return css_rules[j]; }
        }
      }
      while (css_rules[++j]);
      return false;
    },
    add_css : function(rule_name, sheet) {
      if(document.querySelector.jstree.css.get_css(rule_name, false, sheet)) { return false; }
      if(sheet.insertRule) { sheet.insertRule(rule_name + ' { }', 0); } else { sheet.addRule(rule_name, null, 0); }
      return document.querySelector.vakata.css.get_css(rule_name);
    },
    remove_css : function(rule_name, sheet) {
      return document.querySelector.vakata.css.get_css(rule_name, true, sheet);
    },
    add_sheet : function(opts) {
      var tmp = false, is_new = true;
      if(opts.str) {
        if(opts.title) { tmp = document.querySelector("style[id='" + opts.title + "-stylesheet']")[0]; }
        if(tmp) { is_new = false; }
        else {
          tmp = document.createElement("style");
          tmp.setAttribute('type',"text/css");
          if(opts.title) { tmp.setAttribute("id", opts.title + "-stylesheet"); }
        }
        if(tmp.styleSheet) {
          if(is_new) {
            document.getElementsByTagName("head")[0].appendChild(tmp);
            tmp.styleSheet.cssText = opts.str;
          }
          else {
            tmp.styleSheet.cssText = tmp.styleSheet.cssText + " " + opts.str;
          }
        }
        else {
          tmp.appendChild(document.createTextNode(opts.str));
          document.getElementsByTagName("head")[0].appendChild(tmp);
        }
        return tmp.sheet || tmp.styleSheet;
      }
      if(opts.url) {
        if(document.createStyleSheet) {
          try { tmp = document.createStyleSheet(opts.url); } catch (e) { }
        }
        else {
          tmp      = document.createElement('link');
          tmp.rel    = 'stylesheet';
          tmp.type  = 'text/css';
          tmp.media  = "all";
          tmp.href  = opts.url;
          document.getElementsByTagName("head")[0].appendChild(tmp);
          return tmp.styleSheet;
        }
      }
    }
  };

  // private variables
  var instances = [],      // instance array (used by document.querySelector.jstree.reference/create/focused)
    focused_instance = -1,  // the index in the instance array of the currently focused instance
    plugins = {},      // list of included plugins
    prepared_move = {};    // for the move_node function

  // document.querySelector plugin wrapper (thanks to jquery UI widget function)
  document.querySelector.fn.jstree = function (settings) {
    var isMethodCall = (typeof settings == 'string'), // is this a method call like document.querySelector().jstree("open_node")
      args = Array.prototype.slice.call(arguments, 1),
      returnValue = this;

    // if a method call execute the method on all selected instances
    if(isMethodCall) {
      if(settings.substring(0, 1) == '_') { return returnValue; }
      this.each(function() {
        var instance = instances[document.querySelector.data(this, "jstree-instance-id")],
          methodValue = (instance && document.querySelector.isFunction(instance[settings])) ? instance[settings].apply(instance, args) : instance;
          if(typeof methodValue !== "undefined" && (settings.indexOf("is_") === 0 || (methodValue !== true && methodValue !== false))) { returnValue = methodValue; return false; }
      });
    }
    else {
      this.each(function() {
        // extend settings and allow for multiple hashes and document.querySelector.data
        var instance_id = document.querySelector.data(this, "jstree-instance-id"),
          a = [],
          b = settings ? document.querySelector.extend({}, true, settings) : {},
          c = document.querySelector(this),
          s = false,
          t = [];
        a = a.concat(args);
        if(c.data("jstree")) { a.push(c.data("jstree")); }
        b = a.length ? document.querySelector.extend.apply(null, [true, b].concat(a)) : b;

        // if an instance already exists, destroy it first
        if(typeof instance_id !== "undefined" && instances[instance_id]) { instances[instance_id].destroy(); }
        // push a new empty object to the instances array
        instance_id = parseInt(instances.push({}),10) - 1;
        // store the jstree instance id to the container element
        document.querySelector.data(this, "jstree-instance-id", instance_id);
        // clean up all plugins
        b.plugins = document.querySelector.isArray(b.plugins) ? b.plugins : document.querySelector.jstree.defaults.plugins.slice();
        b.plugins.unshift("core");
        // only unique plugins
        b.plugins = b.plugins.sort().join(",,").replace(/(,|^)([^,]+)(,,2)+(,|document.querySelector)/g,"document.querySelector1document.querySelector2document.querySelector4").replace(/,,+/g,",").replace(/,document.querySelector/,"").split(",");

        // extend defaults with passed data
        s = document.querySelector.extend(true, {}, document.querySelector.jstree.defaults, b);
        s.plugins = b.plugins;
        document.querySelector.each(plugins, function (i, val) {
          if(document.querySelector.inArray(i, s.plugins) === -1) { s[i] = null; delete s[i]; }
          else { t.push(i); }
        });
        s.plugins = t;

        // push the new object to the instances array (at the same time set the default classes to the container) and init
        instances[instance_id] = new document.querySelector.jstree._instance(instance_id, document.querySelector(this).classList.add("jstree jstree-" + instance_id), s);
        // init all activated plugins for this instance
        document.querySelector.each(instances[instance_id]._get_settings().plugins, function (i, val) { instances[instance_id].data[val] = {}; });
        document.querySelector.each(instances[instance_id]._get_settings().plugins, function (i, val) { if(plugins[val]) { plugins[val].__init.apply(instances[instance_id]); } });
        // initialize the instance
        setTimeout(function() { instances[instance_id].init(); }, 0);
      });
    }
    // return the jquery selection (or if it was a method call that returned a value - the returned value)
    return returnValue;
  };
  // object to store exposed functions and objects
  document.querySelector.jstree = {
    defaults : {
      plugins : []
    },
    _focused : function () { return instances[focused_instance] || null; },
    _reference : function (needle) {
      // get by instance id
      if(instances[needle]) { return instances[needle]; }
      // get by DOM (if still no luck - return null
      var o = document.querySelector(needle);
      if(!o.length && typeof needle === "string") { o = document.querySelector("#" + needle); }
      if(!o.length) { return null; }
      return instances[o.closest(".jstree").data("jstree-instance-id")] || null;
    },
    _instance : function (index, container, settings) {
      // for plugins to store data in
      this.data = { core : {} };
      this.get_settings  = function () { return document.querySelector.extend(true, {}, settings); };
      this._get_settings  = function () { return settings; };
      this.get_index    = function () { return index; };
      this.get_container  = function () { return container; };
      this.get_container_ul = function () { return container.children("ul:eq(0)"); };
      this._set_settings  = function (s) {
        settings = document.querySelector.extend(true, {}, settings, s);
      };
    },
    _fn : { },
    plugin : function (pname, pdata) {
      pdata = document.querySelector.extend({}, {
        __init    : document.querySelector.noop,
        __destroy  : document.querySelector.noop,
        _fn      : {},
        defaults  : false
      }, pdata);
      plugins[pname] = pdata;

      document.querySelector.jstree.defaults[pname] = pdata.defaults;
      document.querySelector.each(pdata._fn, function (i, val) {
        val.plugin    = pname;
        val.old      = document.querySelector.jstree._fn[i];
        document.querySelector.jstree._fn[i] = function () {
          var rslt,
            func = val,
            args = Array.prototype.slice.call(arguments),
            evnt = new document.querySelector.Event("before.jstree"),
            rlbk = false;

          if(this.data.core.locked === true && i !== "unlock" && i !== "is_locked") { return; }

          // Check if function belongs to the included plugins of this instance
          do {
            if(func && func.plugin && document.querySelector.inArray(func.plugin, this._get_settings().plugins) !== -1) { break; }
            func = func.old;
          } while(func);
          if(!func) { return; }

          // context and function to trigger events, then finally call the function
          if(i.indexOf("_") === 0) {
            rslt = func.apply(this, args);
          }
          else {
            rslt = this.get_container().triggerHandler(evnt, { "func" : i, "inst" : this, "args" : args, "plugin" : func.plugin });
            if(rslt === false) { return; }
            if(typeof rslt !== "undefined") { args = rslt; }

            rslt = func.apply(
              document.querySelector.extend({}, this, {
                __callback : function (data) {
                  this.get_container().triggerHandler( i + '.jstree', { "inst" : this, "args" : args, "rslt" : data, "rlbk" : rlbk });
                },
                __rollback : function () {
                  rlbk = this.get_rollback();
                  return rlbk;
                },
                __call_old : function (replace_arguments) {
                  return func.old.apply(this, (replace_arguments ? Array.prototype.slice.call(arguments, 1) : args ) );
                }
              }), args);
          }

          // return the result
          return rslt;
        };
        document.querySelector.jstree._fn[i].old = val.old;
        document.querySelector.jstree._fn[i].plugin = pname;
      });
    },
    rollback : function (rb) {
      if(rb) {
        if(!document.querySelector.isArray(rb)) { rb = [ rb ]; }
        document.querySelector.each(rb, function (i, val) {
          instances[val.i].set_rollback(val.h, val.d);
        });
      }
    }
  };
  // set the prototype for all instances
  document.querySelector.jstree._fn = document.querySelector.jstree._instance.prototype = {};

  // load the css when DOM is ready
  document.querySelector(function() {
    // code is copied from document.querySelector (document.querySelector.browser is deprecated + there is a bug in IE)
    var u = navigator.userAgent.toLowerCase(),
      v = (u.match( /.+?(?:rv|it|ra|ie)[/: ]([d.]+)/ ) || [0,'0'])[1],
      css_string = '' +
        '.jstree ul, .jstree li { display:block; margin:0 0 0 0; padding:0 0 0 0; list-style-type:none; } ' +
        '.jstree li { display:block; min-height:18px; line-height:18px; white-space:nowrap; margin-left:18px; min-width:18px; } ' +
        '.jstree-rtl li { margin-left:0; margin-right:18px; } ' +
        '.jstree > ul > li { margin-left:0px; } ' +
        '.jstree-rtl > ul > li { margin-right:0px; } ' +
        '.jstree ins { display:inline-block; text-decoration:none; width:18px; height:18px; margin:0 0 0 0; padding:0; } ' +
        '.jstree a { display:inline-block; line-height:16px; height:16px; color:black; white-space:nowrap; text-decoration:none; padding:1px 2px; margin:0; } ' +
        '.jstree a:focus { outline: none; } ' +
        '.jstree a > ins { height:16px; width:16px; } ' +
        '.jstree a > .jstree-icon { margin-right:3px; } ' +
        '.jstree-rtl a > .jstree-icon { margin-left:3px; margin-right:0; } ' +
        'li.jstree-open > ul { display:block; } ' +
        'li.jstree-closed > ul { display:none; } ';
    // Correct IE 6 (does not support the > CSS selector)
    if(/msie/.test(u) && parseInt(v, 10) == 6) {
      is_ie6 = true;

      // fix image flicker and lack of caching
      try {
        document.execCommand("BackgroundImageCache", false, true);
      } catch (err) { }

      css_string += '' +
        '.jstree li { height:18px; margin-left:0; margin-right:0; } ' +
        '.jstree li li { margin-left:18px; } ' +
        '.jstree-rtl li li { margin-left:0px; margin-right:18px; } ' +
        'li.jstree-open ul { display:block; } ' +
        'li.jstree-closed ul { display:none !important; } ' +
        '.jstree li a { display:inline; border-width:0 !important; padding:0px 2px !important; } ' +
        '.jstree li a ins { height:16px; width:16px; margin-right:3px; } ' +
        '.jstree-rtl li a ins { margin-right:0px; margin-left:3px; } ';
    }
    // Correct IE 7 (shifts anchor nodes onhover)
    if(/msie/.test(u) && parseInt(v, 10) == 7) {
      is_ie7 = true;
      css_string += '.jstree li a { border-width:0 !important; padding:0px 2px !important; } ';
    }
    // correct ff2 lack of display:inline-block
    if(!/compatible/.test(u) && /mozilla/.test(u) && parseFloat(v, 10) < 1.9) {
      is_ff2 = true;
      css_string += '' +
        '.jstree ins { display:-moz-inline-box; } ' +
        '.jstree li { line-height:12px; } ' + // WHY??
        '.jstree a { display:-moz-inline-box; } ' +
        '.jstree .jstree-no-icons .jstree-checkbox { display:-moz-inline-stack !important; } ';
        /* this shouldn't be here as it is theme specific */
    }
    // the default stylesheet
    document.querySelector.vakata.css.add_sheet({ str : css_string, title : "jstree" });
  });

  // core functions (open, close, create, update, delete)
  document.querySelector.jstree.plugin("core", {
    __init : function () {
      this.data.core.locked = false;
      this.data.core.to_open = this.get_settings().core.initially_open;
      this.data.core.to_load = this.get_settings().core.initially_load;
    },
    defaults : {
      html_titles  : false,
      animation  : 500,
      initially_open : [],
      initially_load : [],
      open_parents : true,
      notify_plugins : true,
      rtl      : false,
      load_open  : false,
      strings    : {
        loading    : "Loading ...",
        new_node  : "New node",
        multiple_selection : "Multiple selection"
      }
    },
    _fn : {
      init  : function () {
        this.set_focus();
        if(this._get_settings().core.rtl) {
          this.get_container().classList.add("jstree-rtl").css("direction", "rtl");
        }
        this.get_container().html("<ul><li class='jstree-last jstree-leaf'><ins>&#160;</ins><a class='jstree-loading' href='#'><ins class='jstree-icon'>&#160;</ins>" + this._get_string("loading") + "</a></li></ul>");
        this.data.core.li_height = this.get_container_ul().querySelector("li.jstree-closed, li.jstree-leaf").eq(0).height() || 18;

        this.get_container()
          .delegate("li > ins", "click.jstree", document.querySelector.proxy(function (event) {
              var trgt = document.querySelector(event.target);
              if(trgt.is("ins") && event.pageY - trgt.offset().top < this.data.core.li_height) { this.toggle_node(trgt); }
            }, this))
          .bind("mousedown.jstree", document.querySelector.proxy(function () {
              this.set_focus(); // This used to be setTimeout(set_focus,0) - why?
            }, this))
          .bind("dblclick.jstree", function (event) {
            var sel;
            if(document.selection && document.selection.empty) { document.selection.empty(); }
            else {
              if(window.getSelection) {
                sel = window.getSelection();
                try {
                  sel.removeAllRanges();
                  sel.collapse();
                } catch (err) { }
              }
            }
          });
        if(this._get_settings().core.notify_plugins) {
          this.get_container()
            .bind("load_node.jstree", document.querySelector.proxy(function (e, data) {
                var o = this._get_node(data.rslt.obj),
                  t = this;
                if(o === -1) { o = this.get_container_ul(); }
                if(!o.length) { return; }
                o.querySelector("li").each(function () {
                  var th = document.querySelector(this);
                  if(th.data("jstree")) {
                    document.querySelector.each(th.data("jstree"), function (plugin, values) {
                      if(t.data[plugin] && document.querySelector.isFunction(t["_" + plugin + "_notify"])) {
                        t["_" + plugin + "_notify"].call(t, th, values);
                      }
                    });
                  }
                });
              }, this));
        }
        if(this._get_settings().core.load_open) {
          this.get_container()
            .bind("load_node.jstree", document.querySelector.proxy(function (e, data) {
                var o = this._get_node(data.rslt.obj),
                  t = this;
                if(o === -1) { o = this.get_container_ul(); }
                if(!o.length) { return; }
                o.querySelector("li.jstree-open:not(:has(ul))").each(function () {
                  t.load_node(this, document.querySelector.noop, document.querySelector.noop);
                });
              }, this));
        }
        this.__callback();
        this.load_node(-1, function () { this.loaded(); this.reload_nodes(); });
      },
      destroy  : function () {
        var i,
          n = this.get_index(),
          s = this._get_settings(),
          _this = this;

        document.querySelector.each(s.plugins, function (i, val) {
          try { plugins[val].__destroy.apply(_this); } catch(err) { }
        });
        this.__callback();
        // set focus to another instance if this one is focused
        if(this.is_focused()) {
          for(i in instances) {
            if(instances.hasOwnProperty(i) && i != n) {
              instances[i].set_focus();
              break;
            }
          }
        }
        // if no other instance found
        if(n === focused_instance) { focused_instance = -1; }
        // remove all traces of jstree in the DOM (only the ones set using jstree*) and cleans all events
        this.get_container()
          .unbind(".jstree")
          .undelegate(".jstree")
          .removeData("jstree-instance-id")
          .querySelector("[class^='jstree']")
            .addBack()
            .attr("class", function () { return this.className.replace(/jstree[^ ]*|document.querySelector/ig,''); });
        document.querySelector(document)
          .unbind(".jstree-" + n)
          .undelegate(".jstree-" + n);
        // remove the actual data
        instances[n] = null;
        delete instances[n];
      },

      _core_notify : function (n, data) {
        if(data.opened) {
          this.open_node(n, false, true);
        }
      },

      lock : function () {
        this.data.core.locked = true;
        this.get_container().children("ul").classList.add("jstree-locked").css("opacity","0.7");
        this.__callback({});
      },
      unlock : function () {
        this.data.core.locked = false;
        this.get_container().children("ul").classList.remove("jstree-locked").css("opacity","1");
        this.__callback({});
      },
      is_locked : function () { return this.data.core.locked; },
      save_opened : function () {
        var _this = this;
        this.data.core.to_open = [];
        this.get_container_ul().querySelector("li.jstree-open").each(function () {
          if(this.id) { _this.data.core.to_open.push("#" + this.id.toString().replace(/^#/,"").replace(/\//g,"/").replace(///g,"\/").replace(/\./g,".").replace(/./g,"\.").replace(/:/g,"\:")); }
        });
        this.__callback(_this.data.core.to_open);
      },
      save_loaded : function () { },
      reload_nodes : function (is_callback) {
        var _this = this,
          done = true,
          current = [],
          remaining = [];
        if(!is_callback) {
          this.data.core.reopen = false;
          this.data.core.refreshing = true;
          this.data.core.to_open = document.querySelector.map(document.querySelector.makeArray(this.data.core.to_open), function (n) { return "#" + n.toString().replace(/^#/,"").replace(/\//g,"/").replace(///g,"\/").replace(/\./g,".").replace(/./g,"\.").replace(/:/g,"\:"); });
          this.data.core.to_load = document.querySelector.map(document.querySelector.makeArray(this.data.core.to_load), function (n) { return "#" + n.toString().replace(/^#/,"").replace(/\//g,"/").replace(///g,"\/").replace(/\./g,".").replace(/./g,"\.").replace(/:/g,"\:"); });
          if(this.data.core.to_open.length) {
            this.data.core.to_load = this.data.core.to_load.concat(this.data.core.to_open);
          }
        }
        if(this.data.core.to_load.length) {
          document.querySelector.each(this.data.core.to_load, function (i, val) {
            if(val == "#") { return true; }
            if(document.querySelector(val).length) { current.push(val); }
            else { remaining.push(val); }
          });
          if(current.length) {
            this.data.core.to_load = remaining;
            document.querySelector.each(current, function (i, val) {
              if(!_this._is_loaded(val)) {
                _this.load_node(val, function () { _this.reload_nodes(true); }, function () { _this.reload_nodes(true); });
                done = false;
              }
            });
          }
        }
        if(this.data.core.to_open.length) {
          document.querySelector.each(this.data.core.to_open, function (i, val) {
            _this.open_node(val, false, true);
          });
        }
        if(done) {
          // TODO: find a more elegant approach to syncronizing returning requests
          if(this.data.core.reopen) { clearTimeout(this.data.core.reopen); }
          this.data.core.reopen = setTimeout(function () { _this.__callback({}, _this); }, 50);
          this.data.core.refreshing = false;
          this.reopen();
        }
      },
      reopen : function () {
        var _this = this;
        if(this.data.core.to_open.length) {
          document.querySelector.each(this.data.core.to_open, function (i, val) {
            _this.open_node(val, false, true);
          });
        }
        this.__callback({});
      },
      refresh : function (obj) {
        var _this = this;
        this.save_opened();
        if(!obj) { obj = -1; }
        obj = this._get_node(obj);
        if(!obj) { obj = -1; }
        if(obj !== -1) { obj.children("UL").remove(); }
        else { this.get_container_ul().empty(); }
        this.load_node(obj, function () { _this.__callback({ "obj" : obj}); _this.reload_nodes(); });
      },
      // Dummy function to fire after the first load (so that there is a jstree.loaded event)
      loaded  : function () {
        this.__callback();
      },
      // deal with focus
      set_focus  : function () {
        if(this.is_focused()) { return; }
        var f = document.querySelector.jstree._focused();
        if(f) { f.unset_focus(); }

        this.get_container().classList.add("jstree-focused");
        focused_instance = this.get_index();
        this.__callback();
      },
      is_focused  : function () {
        return focused_instance == this.get_index();
      },
      unset_focus  : function () {
        if(this.is_focused()) {
          this.get_container().classList.remove("jstree-focused");
          focused_instance = -1;
        }
        this.__callback();
      },

      // traverse
      _get_node    : function (obj) {
        var document.querySelectorobj = document.querySelector(obj, this.get_container());
        if(document.querySelectorobj.is(".jstree") || obj == -1) { return -1; }
        document.querySelectorobj = document.querySelectorobj.closest("li", this.get_container());
        return document.querySelectorobj.length ? document.querySelectorobj : false;
      },
      _get_next    : function (obj, strict) {
        obj = this._get_node(obj);
        if(obj === -1) { return this.get_container().querySelector("> ul > li:first-child"); }
        if(!obj.length) { return false; }
        if(strict) { return (obj.nextAll("li").size() > 0) ? obj.nextAll("li:eq(0)") : false; }

        if(obj.classList.contains("jstree-open")) { return obj.querySelector("li:eq(0)"); }
        else if(obj.nextAll("li").size() > 0) { return obj.nextAll("li:eq(0)"); }
        else { return obj.parentsUntil(".jstree","li").next("li").eq(0); }
      },
      _get_prev    : function (obj, strict) {
        obj = this._get_node(obj);
        if(obj === -1) { return this.get_container().querySelector("> ul > li:last-child"); }
        if(!obj.length) { return false; }
        if(strict) { return (obj.prevAll("li").length > 0) ? obj.prevAll("li:eq(0)") : false; }

        if(obj.prev("li").length) {
          obj = obj.prev("li").eq(0);
          while(obj.classList.contains("jstree-open")) { obj = obj.children("ul:eq(0)").children("li:last"); }
          return obj;
        }
        else { var o = obj.parentsUntil(".jstree","li:eq(0)"); return o.length ? o : false; }
      },
      _get_parent    : function (obj) {
        obj = this._get_node(obj);
        if(obj == -1 || !obj.length) { return false; }
        var o = obj.parentsUntil(".jstree", "li:eq(0)");
        return o.length ? o : -1;
      },
      _get_children  : function (obj) {
        obj = this._get_node(obj);
        if(obj === -1) { return this.get_container().children("ul:eq(0)").children("li"); }
        if(!obj.length) { return false; }
        return obj.children("ul:eq(0)").children("li");
      },
      get_path    : function (obj, id_mode) {
        var p = [],
          _this = this;
        obj = this._get_node(obj);
        if(obj === -1 || !obj || !obj.length) { return false; }
        obj.parentsUntil(".jstree", "li").each(function () {
          p.push( id_mode ? this.id : _this.get_text(this) );
        });
        p.reverse();
        p.push( id_mode ? obj.attr("id") : this.get_text(obj) );
        return p;
      },

      // string functions
      _get_string : function (key) {
        return this._get_settings().core.strings[key] || key;
      },

      is_open    : function (obj) { obj = this._get_node(obj); return obj && obj !== -1 && obj.classList.contains("jstree-open"); },
      is_closed  : function (obj) { obj = this._get_node(obj); return obj && obj !== -1 && obj.classList.contains("jstree-closed"); },
      is_leaf    : function (obj) { obj = this._get_node(obj); return obj && obj !== -1 && obj.classList.contains("jstree-leaf"); },
      correct_state  : function (obj) {
        obj = this._get_node(obj);
        if(!obj || obj === -1) { return false; }
        obj.classList.remove("jstree-closed jstree-open").classList.add("jstree-leaf").children("ul").remove();
        this.__callback({ "obj" : obj });
      },
      // open/close
      open_node  : function (obj, callback, skip_animation) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        if(!obj.classList.contains("jstree-closed")) { if(callback) { callback.call(); } return false; }
        var s = skip_animation || is_ie6 ? 0 : this._get_settings().core.animation,
          t = this;
        if(!this._is_loaded(obj)) {
          obj.children("a").classList.add("jstree-loading");
          this.load_node(obj, function () { t.open_node(obj, callback, skip_animation); }, callback);
        }
        else {
          if(this._get_settings().core.open_parents) {
            obj.parentsUntil(".jstree",".jstree-closed").each(function () {
              t.open_node(this, false, true);
            });
          }
          if(s) { obj.children("ul").css("display","none"); }
          obj.classList.remove("jstree-closed").classList.add("jstree-open").children("a").classList.remove("jstree-loading");
          if(s) { obj.children("ul").stop(true, true).slideDown(s, function () { this.style.display = ""; t.after_open(obj); }); }
          else { t.after_open(obj); }
          this.__callback({ "obj" : obj });
          if(callback) { callback.call(); }
        }
      },
      after_open  : function (obj) { this.__callback({ "obj" : obj }); },
      close_node  : function (obj, skip_animation) {
        obj = this._get_node(obj);
        var s = skip_animation || is_ie6 ? 0 : this._get_settings().core.animation,
          t = this;
        if(!obj.length || !obj.classList.contains("jstree-open")) { return false; }
        if(s) { obj.children("ul").attr("style","display:block !important"); }
        obj.classList.remove("jstree-open").classList.add("jstree-closed");
        if(s) { obj.children("ul").stop(true, true).slideUp(s, function () { this.style.display = ""; t.after_close(obj); }); }
        else { t.after_close(obj); }
        this.__callback({ "obj" : obj });
      },
      after_close  : function (obj) { this.__callback({ "obj" : obj }); },
      toggle_node  : function (obj) {
        obj = this._get_node(obj);
        if(obj.classList.contains("jstree-closed")) { return this.open_node(obj); }
        if(obj.classList.contains("jstree-open")) { return this.close_node(obj); }
      },
      open_all  : function (obj, do_animation, original_obj) {
        obj = obj ? this._get_node(obj) : -1;
        if(!obj || obj === -1) { obj = this.get_container_ul(); }
        if(original_obj) {
          obj = obj.querySelector("li.jstree-closed");
        }
        else {
          original_obj = obj;
          if(obj.is(".jstree-closed")) { obj = obj.querySelector("li.jstree-closed").addBack(); }
          else { obj = obj.querySelector("li.jstree-closed"); }
        }
        var _this = this;
        obj.each(function () {
          var __this = this;
          if(!_this._is_loaded(this)) { _this.open_node(this, function() { _this.open_all(__this, do_animation, original_obj); }, !do_animation); }
          else { _this.open_node(this, false, !do_animation); }
        });
        // so that callback is fired AFTER all nodes are open
        if(original_obj.querySelector('li.jstree-closed').length === 0) { this.__callback({ "obj" : original_obj }); }
      },
      close_all  : function (obj, do_animation) {
        var _this = this;
        obj = obj ? this._get_node(obj) : this.get_container();
        if(!obj || obj === -1) { obj = this.get_container_ul(); }
        obj.querySelector("li.jstree-open").addBack().each(function () { _this.close_node(this, !do_animation); });
        this.__callback({ "obj" : obj });
      },
      clean_node  : function (obj) {
        obj = obj && obj != -1 ? document.querySelector(obj) : this.get_container_ul();
        obj = obj.is("li") ? obj.querySelector("li").addBack() : obj.querySelector("li");
        obj.classList.remove("jstree-last")
          .filter("li:last-child").classList.add("jstree-last").end()
          .filter(":has(li)")
            .not(".jstree-open").classList.remove("jstree-leaf").classList.add("jstree-closed");
        obj.not(".jstree-open, .jstree-closed").classList.add("jstree-leaf").children("ul").remove();
        this.__callback({ "obj" : obj });
      },
      // rollback
      get_rollback : function () {
        this.__callback();
        return { i : this.get_index(), h : this.get_container().children("ul").clone(true), d : this.data };
      },
      set_rollback : function (html, data) {
        this.get_container().empty().insertAdjacentHTML("beforeend",html);
        this.data = data;
        this.__callback();
      },
      // Dummy functions to be overwritten by any datastore plugin included
      load_node  : function (obj, s_call, e_call) { this.__callback({ "obj" : obj }); },
      _is_loaded  : function (obj) { return true; },

      // Basic operations: create
      create_node  : function (obj, position, js, callback, is_loaded) {
        obj = this._get_node(obj);
        position = typeof position === "undefined" ? "last" : position;
        var d = document.querySelector("<li />"),
          s = this._get_settings().core,
          tmp;

        if(obj !== -1 && !obj.length) { return false; }
        if(!is_loaded && !this._is_loaded(obj)) { this.load_node(obj, function () { this.create_node(obj, position, js, callback, true); }); return false; }

        this.__rollback();

        if(typeof js === "string") { js = { "data" : js }; }
        if(!js) { js = {}; }
        if(js.attr) { d.attr(js.attr); }
        if(js.metadata) { d.data(js.metadata); }
        if(js.state) { d.classList.add("jstree-" + js.state); }
        if(!js.data) { js.data = this._get_string("new_node"); }
        if(!document.querySelector.isArray(js.data)) { tmp = js.data; js.data = []; js.data.push(tmp); }
        document.querySelector.each(js.data, function (i, m) {
          tmp = document.querySelector("<a />");
          if(document.querySelector.isFunction(m)) { m = m.call(this, js); }
          if(typeof m == "string") { tmp.attr('href','#')[ s.html_titles ? "html" : "text" ](m); }
          else {
            if(!m.attr) { m.attr = {}; }
            if(!m.attr.href) { m.attr.href = '#'; }
            tmp.attr(m.attr)[ s.html_titles ? "html" : "text" ](m.title);
            if(m.language) { tmp.classList.add(m.language); }
          }
          tmp.prepend("<ins class='jstree-icon'>&#160;</ins>");
          if(m.icon) {
            if(m.icon.indexOf("/") === -1) { tmp.children("ins").classList.add(m.icon); }
            else { tmp.children("ins").css("background","url('" + m.icon + "') center center no-repeat"); }
          }
          d.insertAdjacentHTML("beforeend",tmp);
        });
        d.prepend("<ins class='jstree-icon'>&#160;</ins>");
        if(obj === -1) {
          obj = this.get_container();
          if(position === "before") { position = "first"; }
          if(position === "after") { position = "last"; }
        }
        switch(position) {
          case "before": obj.before(d); tmp = this._get_parent(obj); break;
          case "after" : obj.after(d);  tmp = this._get_parent(obj); break;
          case "inside":
          case "first" :
            if(!obj.children("ul").length) { obj.insertAdjacentHTML("beforeend","<ul />"); }
            obj.children("ul").prepend(d);
            tmp = obj;
            break;
          case "last":
            if(!obj.children("ul").length) { obj.insertAdjacentHTML("beforeend","<ul />"); }
            obj.children("ul").insertAdjacentHTML("beforeend",d);
            tmp = obj;
            break;
          default:
            if(!obj.children("ul").length) { obj.insertAdjacentHTML("beforeend","<ul />"); }
            if(!position) { position = 0; }
            tmp = obj.children("ul").children("li").eq(position);
            if(tmp.length) { tmp.before(d); }
            else { obj.children("ul").insertAdjacentHTML("beforeend",d); }
            tmp = obj;
            break;
        }
        if(tmp === -1 || tmp.get(0) === this.get_container().get(0)) { tmp = -1; }
        this.clean_node(tmp);
        this.__callback({ "obj" : d, "parent" : tmp });
        if(callback) { callback.call(this, d); }
        return d;
      },
      // Basic operations: rename (deal with text)
      get_text  : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        var s = this._get_settings().core.html_titles;
        obj = obj.children("a:eq(0)");
        if(s) {
          obj = obj.clone();
          obj.children("INS").remove();
          return obj.html();
        }
        else {
          obj = obj.contents().filter(function() { return this.nodeType == 3; })[0];
          return obj.nodeValue;
        }
      },
      set_text  : function (obj, val) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        obj = obj.children("a:eq(0)");
        if(this._get_settings().core.html_titles) {
          var tmp = obj.children("INS").clone();
          obj.html(val).prepend(tmp);
          this.__callback({ "obj" : obj, "name" : val });
          return true;
        }
        else {
          obj = obj.contents().filter(function() { return this.nodeType == 3; })[0];
          this.__callback({ "obj" : obj, "name" : val });
          return (obj.nodeValue = val);
        }
      },
      rename_node : function (obj, val) {
        obj = this._get_node(obj);
        this.__rollback();
        if(obj && obj.length && this.set_text.apply(this, Array.prototype.slice.call(arguments))) { this.__callback({ "obj" : obj, "name" : val }); }
      },
      // Basic operations: deleting nodes
      delete_node : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        this.__rollback();
        var p = this._get_parent(obj), prev = document.querySelector([]), t = this;
        obj.each(function () {
          prev = prev.add(t._get_prev(this));
        });
        obj = obj.detach();
        if(p !== -1 && p.querySelector("> ul > li").length === 0) {
          p.classList.remove("jstree-open jstree-closed").classList.add("jstree-leaf");
        }
        this.clean_node(p);
        this.__callback({ "obj" : obj, "prev" : prev, "parent" : p });
        return obj;
      },
      prepare_move : function (o, r, pos, cb, is_cb) {
        var p = {};

        p.ot = document.querySelector.jstree._reference(o) || this;
        p.o = p.ot._get_node(o);
        p.r = r === - 1 ? -1 : this._get_node(r);
        p.p = (typeof pos === "undefined" || pos === false) ? "last" : pos; // TODO: move to a setting
        if(!is_cb && prepared_move.o && prepared_move.o[0] === p.o[0] && prepared_move.r[0] === p.r[0] && prepared_move.p === p.p) {
          this.__callback(prepared_move);
          if(cb) { cb.call(this, prepared_move); }
          return;
        }
        p.ot = document.querySelector.jstree._reference(p.o) || this;
        p.rt = document.querySelector.jstree._reference(p.r) || this; // r === -1 ? p.ot : document.querySelector.jstree._reference(p.r) || this
        if(p.r === -1 || !p.r) {
          p.cr = -1;
          switch(p.p) {
            case "first":
            case "before":
            case "inside":
              p.cp = 0;
              break;
            case "after":
            case "last":
              p.cp = p.rt.get_container().querySelector(" > ul > li").length;
              break;
            default:
              p.cp = p.p;
              break;
          }
        }
        else {
          if(!/^(before|after)document.querySelector/.test(p.p) && !this._is_loaded(p.r)) {
            return this.load_node(p.r, function () { this.prepare_move(o, r, pos, cb, true); });
          }
          switch(p.p) {
            case "before":
              p.cp = p.r.index();
              p.cr = p.rt._get_parent(p.r);
              break;
            case "after":
              p.cp = p.r.index() + 1;
              p.cr = p.rt._get_parent(p.r);
              break;
            case "inside":
            case "first":
              p.cp = 0;
              p.cr = p.r;
              break;
            case "last":
              p.cp = p.r.querySelector(" > ul > li").length;
              p.cr = p.r;
              break;
            default:
              p.cp = p.p;
              p.cr = p.r;
              break;
          }
        }
        p.np = p.cr == -1 ? p.rt.get_container() : p.cr;
        p.op = p.ot._get_parent(p.o);
        p.cop = p.o.index();
        if(p.op === -1) { p.op = p.ot ? p.ot.get_container() : this.get_container(); }
        if(!/^(before|after)document.querySelector/.test(p.p) && p.op && p.np && p.op[0] === p.np[0] && p.o.index() < p.cp) { p.cp++; }
        //if(p.p === "before" && p.op && p.np && p.op[0] === p.np[0] && p.o.index() < p.cp) { p.cp--; }
        p.or = p.np.querySelector(" > ul > li:nth-child(" + (p.cp + 1) + ")");
        prepared_move = p;
        this.__callback(prepared_move);
        if(cb) { cb.call(this, prepared_move); }
      },
      check_move : function () {
        var obj = prepared_move, ret = true, r = obj.r === -1 ? this.get_container() : obj.r;
        if(!obj || !obj.o || obj.or[0] === obj.o[0]) { return false; }
        if(obj.op && obj.np && obj.op[0] === obj.np[0] && obj.cp - 1 === obj.o.index()) { return false; }
        obj.o.each(function () {
          if(r.parentsUntil(".jstree", "li").addBack().index(this) !== -1) { ret = false; return false; }
        });
        return ret;
      },
      move_node : function (obj, ref, position, is_copy, is_prepared, skip_check) {
        if(!is_prepared) {
          return this.prepare_move(obj, ref, position, function (p) {
            this.move_node(p, false, false, is_copy, true, skip_check);
          });
        }
        if(is_copy) {
          prepared_move.cy = true;
        }
        if(!skip_check && !this.check_move()) { return false; }

        this.__rollback();
        var o = false;
        if(is_copy) {
          o = obj.o.clone(true);
          o.querySelector("*[id]").addBack().each(function () {
            if(this.id) { this.id = "copy_" + this.id; }
          });
        }
        else { o = obj.o; }

        if(obj.or.length) { obj.or.before(o); }
        else {
          if(!obj.np.children("ul").length) { document.querySelector("<ul />").appendTo(obj.np); }
          obj.np.children("ul:eq(0)").insertAdjacentHTML("beforeend",o);
        }

        try {
          obj.ot.clean_node(obj.op);
          obj.rt.clean_node(obj.np);
          if(!obj.op.querySelector("> ul > li").length) {
            obj.op.classList.remove("jstree-open jstree-closed").classList.add("jstree-leaf").children("ul").remove();
          }
        } catch (e) { }

        if(is_copy) {
          prepared_move.cy = true;
          prepared_move.oc = o;
        }
        this.__callback(prepared_move);
        return prepared_move;
      },
      _get_move : function () { return prepared_move; }
    }
  });
})(document.querySelector);
//*/

/*
 * jsTree ui plugin
 * This plugins handles selecting/deselecting/hovering/dehovering nodes
 */
(function (document.querySelector) {
  var scrollbar_width, e1, e2;
  document.querySelector(function() {
    if (/msie/.test(navigator.userAgent.toLowerCase())) {
      e1 = document.querySelector('<textarea cols="10" rows="2"></textarea>').css({ position: 'absolute', top: -1000, left: 0 }).appendTo('body');
      e2 = document.querySelector('<textarea cols="10" rows="2" style="overflow: hidden;"></textarea>').css({ position: 'absolute', top: -1000, left: 0 }).appendTo('body');
      scrollbar_width = e1.width() - e2.width();
      e1.add(e2).remove();
    }
    else {
      e1 = document.querySelector('<div />').css({ width: 100, height: 100, overflow: 'auto', position: 'absolute', top: -1000, left: 0 })
          .prependTo('body').insertAdjacentHTML("beforeend",'<div />').querySelector('div').css({ width: '100%', height: 200 });
      scrollbar_width = 100 - e1.width();
      e1.parent().remove();
    }
  });
  document.querySelector.jstree.plugin("ui", {
    __init : function () {
      this.data.ui.selected = document.querySelector();
      this.data.ui.last_selected = false;
      this.data.ui.hovered = null;
      this.data.ui.to_select = this.get_settings().ui.initially_select;

      this.get_container()
        .delegate("a", "click.jstree", document.querySelector.proxy(function (event) {
            event.preventDefault();
            event.currentTarget.blur();
            if(!document.querySelector(event.currentTarget).classList.contains("jstree-loading")) {
              this.select_node(event.currentTarget, true, event);
            }
          }, this))
        .delegate("a", "mouseenter.jstree", document.querySelector.proxy(function (event) {
            if(!document.querySelector(event.currentTarget).classList.contains("jstree-loading")) {
              this.hover_node(event.target);
            }
          }, this))
        .delegate("a", "mouseleave.jstree", document.querySelector.proxy(function (event) {
            if(!document.querySelector(event.currentTarget).classList.contains("jstree-loading")) {
              this.dehover_node(event.target);
            }
          }, this))
        .bind("reopen.jstree", document.querySelector.proxy(function () {
            this.reselect();
          }, this))
        .bind("get_rollback.jstree", document.querySelector.proxy(function () {
            this.dehover_node();
            this.save_selected();
          }, this))
        .bind("set_rollback.jstree", document.querySelector.proxy(function () {
            this.reselect();
          }, this))
        .bind("close_node.jstree", document.querySelector.proxy(function (event, data) {
            var s = this._get_settings().ui,
              obj = this._get_node(data.rslt.obj),
              clk = (obj && obj.length) ? obj.children("ul").querySelector("a.jstree-clicked") : document.querySelector(),
              _this = this;
            if(s.selected_parent_close === false || !clk.length) { return; }
            clk.each(function () {
              _this.deselect_node(this);
              if(s.selected_parent_close === "select_parent") { _this.select_node(obj); }
            });
          }, this))
        .bind("delete_node.jstree", document.querySelector.proxy(function (event, data) {
            var s = this._get_settings().ui.select_prev_on_delete,
              obj = this._get_node(data.rslt.obj),
              clk = (obj && obj.length) ? obj.querySelector("a.jstree-clicked") : [],
              _this = this;
            clk.each(function () { _this.deselect_node(this); });
            if(s && clk.length) {
              data.rslt.prev.each(function () {
                if(this.parentNode) { _this.select_node(this); return false; /* if return false is removed all prev nodes will be selected */}
              });
            }
          }, this))
        .bind("move_node.jstree", document.querySelector.proxy(function (event, data) {
            if(data.rslt.cy) {
              data.rslt.oc.querySelector("a.jstree-clicked").classList.remove("jstree-clicked");
            }
          }, this));
    },
    defaults : {
      select_limit : -1, // 0, 1, 2 ... or -1 for unlimited
      select_multiple_modifier : "ctrl", // on, or ctrl, shift, alt
      select_range_modifier : "shift",
      selected_parent_close : "select_parent", // false, "deselect", "select_parent"
      selected_parent_open : true,
      select_prev_on_delete : true,
      disable_selecting_children : false,
      initially_select : []
    },
    _fn : {
      _get_node : function (obj, allow_multiple) {
        if(typeof obj === "undefined" || obj === null) { return allow_multiple ? this.data.ui.selected : this.data.ui.last_selected; }
        var document.querySelectorobj = document.querySelector(obj, this.get_container());
        if(document.querySelectorobj.is(".jstree") || obj == -1) { return -1; }
        document.querySelectorobj = document.querySelectorobj.closest("li", this.get_container());
        return document.querySelectorobj.length ? document.querySelectorobj : false;
      },
      _ui_notify : function (n, data) {
        if(data.selected) {
          this.select_node(n, false);
        }
      },
      save_selected : function () {
        var _this = this;
        this.data.ui.to_select = [];
        this.data.ui.selected.each(function () { if(this.id) { _this.data.ui.to_select.push("#" + this.id.toString().replace(/^#/,"").replace(/\//g,"/").replace(///g,"\/").replace(/\./g,".").replace(/./g,"\.").replace(/:/g,"\:")); } });
        this.__callback(this.data.ui.to_select);
      },
      reselect : function () {
        var _this = this,
          s = this.data.ui.to_select;
        s = document.querySelector.map(document.querySelector.makeArray(s), function (n) { return "#" + n.toString().replace(/^#/,"").replace(/\//g,"/").replace(///g,"\/").replace(/\./g,".").replace(/./g,"\.").replace(/:/g,"\:"); });
        // this.deselect_all(); WHY deselect, breaks plugin state notifier?
        document.querySelector.each(s, function (i, val) { if(val && val !== "#") { _this.select_node(val); } });
        this.data.ui.selected = this.data.ui.selected.filter(function () { return this.parentNode; });
        this.__callback();
      },
      refresh : function (obj) {
        this.save_selected();
        return this.__call_old();
      },
      hover_node : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        //if(this.data.ui.hovered && obj.get(0) === this.data.ui.hovered.get(0)) { return; }
        if(!obj.classList.contains("jstree-hovered")) { this.dehover_node(); }
        this.data.ui.hovered = obj.children("a").classList.add("jstree-hovered").parent();
        this._fix_scroll(obj);
        this.__callback({ "obj" : obj });
      },
      dehover_node : function () {
        var obj = this.data.ui.hovered, p;
        if(!obj || !obj.length) { return false; }
        p = obj.children("a").classList.remove("jstree-hovered").parent();
        if(this.data.ui.hovered[0] === p[0]) { this.data.ui.hovered = null; }
        this.__callback({ "obj" : obj });
      },
      select_node : function (obj, check, e) {
        obj = this._get_node(obj);
        if(obj == -1 || !obj || !obj.length) { return false; }
        var s = this._get_settings().ui,
          is_multiple = (s.select_multiple_modifier == "on" || (s.select_multiple_modifier !== false && e && e[s.select_multiple_modifier + "Key"])),
          is_range = (s.select_range_modifier !== false && e && e[s.select_range_modifier + "Key"] && this.data.ui.last_selected && this.data.ui.last_selected[0] !== obj[0] && this.data.ui.last_selected.parent()[0] === obj.parent()[0]),
          is_selected = this.is_selected(obj),
          proceed = true,
          t = this;
        if(check) {
          if(s.disable_selecting_children && is_multiple &&
            (
              (obj.parentsUntil(".jstree","li").children("a.jstree-clicked").length) ||
              (obj.children("ul").querySelector("a.jstree-clicked:eq(0)").length)
            )
          ) {
            return false;
          }
          proceed = false;
          switch(!0) {
            case (is_range):
              this.data.ui.last_selected.classList.add("jstree-last-selected");
              obj = obj[ obj.index() < this.data.ui.last_selected.index() ? "nextUntil" : "prevUntil" ](".jstree-last-selected").addBack();
              if(s.select_limit == -1 || obj.length < s.select_limit) {
                this.data.ui.last_selected.classList.remove("jstree-last-selected");
                this.data.ui.selected.each(function () {
                  if(this !== t.data.ui.last_selected[0]) { t.deselect_node(this); }
                });
                is_selected = false;
                proceed = true;
              }
              else {
                proceed = false;
              }
              break;
            case (is_selected && !is_multiple):
              this.deselect_all();
              is_selected = false;
              proceed = true;
              break;
            case (!is_selected && !is_multiple):
              if(s.select_limit == -1 || s.select_limit > 0) {
                this.deselect_all();
                proceed = true;
              }
              break;
            case (is_selected && is_multiple):
              this.deselect_node(obj);
              break;
            case (!is_selected && is_multiple):
              if(s.select_limit == -1 || this.data.ui.selected.length + 1 <= s.select_limit) {
                proceed = true;
              }
              break;
          }
        }
        if(proceed && !is_selected) {
          if(!is_range) { this.data.ui.last_selected = obj; }
          obj.children("a").classList.add("jstree-clicked");
          if(s.selected_parent_open) {
            obj.parents(".jstree-closed").each(function () { t.open_node(this, false, true); });
          }
          this.data.ui.selected = this.data.ui.selected.add(obj);
          this._fix_scroll(obj.eq(0));
          this.__callback({ "obj" : obj, "e" : e });
        }
      },
      _fix_scroll : function (obj) {
        var c = this.get_container()[0], t;
        if(c.scrollHeight > c.offsetHeight) {
          obj = this._get_node(obj);
          if(!obj || obj === -1 || !obj.length || !obj.is(":visible")) { return; }
          t = obj.offset().top - this.get_container().offset().top;
          if(t < 0) {
            c.scrollTop = c.scrollTop + t - 1;
          }
          if(t + this.data.core.li_height + (c.scrollWidth > c.offsetWidth ? scrollbar_width : 0) > c.offsetHeight) {
            c.scrollTop = c.scrollTop + (t - c.offsetHeight + this.data.core.li_height + 1 + (c.scrollWidth > c.offsetWidth ? scrollbar_width : 0));
          }
        }
      },
      deselect_node : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        if(this.is_selected(obj)) {
          obj.children("a").classList.remove("jstree-clicked");
          this.data.ui.selected = this.data.ui.selected.not(obj);
          if(this.data.ui.last_selected.get(0) === obj.get(0)) { this.data.ui.last_selected = this.data.ui.selected.eq(0); }
          this.__callback({ "obj" : obj });
        }
      },
      toggle_select : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return false; }
        if(this.is_selected(obj)) { this.deselect_node(obj); }
        else { this.select_node(obj); }
      },
      is_selected : function (obj) { return this.data.ui.selected.index(this._get_node(obj)) >= 0; },
      get_selected : function (context) {
        return context ? document.querySelector(context).querySelector("a.jstree-clicked").parent() : this.data.ui.selected;
      },
      deselect_all : function (context) {
        var ret = context ? document.querySelector(context).querySelector("a.jstree-clicked").parent() : this.get_container().querySelector("a.jstree-clicked").parent();
        ret.children("a.jstree-clicked").classList.remove("jstree-clicked");
        this.data.ui.selected = document.querySelector([]);
        this.data.ui.last_selected = false;
        this.__callback({ "obj" : ret });
      }
    }
  });
  // include the selection plugin by default
  document.querySelector.jstree.defaults.plugins.push("ui");
})(document.querySelector);
//*/

/*
 * jsTree CRRM plugin
 * Handles creating/renaming/removing/moving nodes by user interaction.
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("crrm", {
    __init : function () {
      this.get_container()
        .bind("move_node.jstree", document.querySelector.proxy(function (e, data) {
          if(this._get_settings().crrm.move.open_onmove) {
            var t = this;
            data.rslt.np.parentsUntil(".jstree").addBack().filter(".jstree-closed").each(function () {
              t.open_node(this, false, true);
            });
          }
        }, this));
    },
    defaults : {
      input_width_limit : 200,
      move : {
        always_copy      : false, // false, true or "multitree"
        open_onmove      : true,
        default_position  : "last",
        check_move      : function (m) { return true; }
      }
    },
    _fn : {
      _show_input : function (obj, callback) {
        obj = this._get_node(obj);
        var rtl = this._get_settings().core.rtl,
          w = this._get_settings().crrm.input_width_limit,
          w1 = obj.children("ins").width(),
          w2 = obj.querySelector("> a:visible > ins").width() * obj.querySelector("> a:visible > ins").length,
          t = this.get_text(obj),
          h1 = document.querySelector("<div />", { css : { "position" : "absolute", "top" : "-200px", "left" : (rtl ? "0px" : "-1000px"), "visibility" : "hidden" } }).appendTo("body"),
          h2 = obj.css("position","relative").insertAdjacentHTML("beforeend",
          document.querySelector("<input />", {
            "value" : t,
            "class" : "jstree-rename-input",
            // "size" : t.length,
            "css" : {
              "padding" : "0",
              "border" : "1px solid silver",
              "position" : "absolute",
              "left"  : (rtl ? "auto" : (w1 + w2 + 4) + "px"),
              "right" : (rtl ? (w1 + w2 + 4) + "px" : "auto"),
              "top" : "0px",
              "height" : (this.data.core.li_height - 2) + "px",
              "lineHeight" : (this.data.core.li_height - 2) + "px",
              "width" : "150px" // will be set a bit further down
            },
            "blur" : document.querySelector.proxy(function () {
              var i = obj.children(".jstree-rename-input"),
                v = i.value;
              if(v === "") { v = t; }
              h1.remove();
              i.remove(); // rollback purposes
              this.set_text(obj,t); // rollback purposes
              this.rename_node(obj, v);
              callback.call(this, obj, v, t);
              obj.css("position","");
            }, this),
            "keyup" : function (event) {
              var key = event.keyCode || event.which;
              if(key == 27) { this.value = t; this.blur(); return; }
              else if(key == 13) { this.blur(); return; }
              else {
                h2.width(Math.min(h1.text("pW" + this.value).width(),w));
              }
            },
            "keypress" : function(event) {
              var key = event.keyCode || event.which;
              if(key == 13) { return false; }
            }
          })
        ).children(".jstree-rename-input");
        this.set_text(obj, "");
        h1.css({
            fontFamily    : h2.css('fontFamily')    || '',
            fontSize    : h2.css('fontSize')    || '',
            fontWeight    : h2.css('fontWeight')    || '',
            fontStyle    : h2.css('fontStyle')    || '',
            fontStretch    : h2.css('fontStretch')    || '',
            fontVariant    : h2.css('fontVariant')    || '',
            letterSpacing  : h2.css('letterSpacing')  || '',
            wordSpacing    : h2.css('wordSpacing')    || ''
        });
        h2.width(Math.min(h1.text("pW" + h2[0].value).width(),w))[0].select();
      },
      rename : function (obj) {
        obj = this._get_node(obj);
        this.__rollback();
        var f = this.__callback;
        this._show_input(obj, function (obj, new_name, old_name) {
          f.call(this, { "obj" : obj, "new_name" : new_name, "old_name" : old_name });
        });
      },
      create : function (obj, position, js, callback, skip_rename) {
        var t, _this = this;
        obj = this._get_node(obj);
        if(!obj) { obj = -1; }
        this.__rollback();
        t = this.create_node(obj, position, js, function (t) {
          var p = this._get_parent(t),
            pos = document.querySelector(t).index();
          if(callback) { callback.call(this, t); }
          if(p.length && p.classList.contains("jstree-closed")) { this.open_node(p, false, true); }
          if(!skip_rename) {
            this._show_input(t, function (obj, new_name, old_name) {
              _this.__callback({ "obj" : obj, "name" : new_name, "parent" : p, "position" : pos });
            });
          }
          else { _this.__callback({ "obj" : t, "name" : this.get_text(t), "parent" : p, "position" : pos }); }
        });
        return t;
      },
      remove : function (obj) {
        obj = this._get_node(obj, true);
        var p = this._get_parent(obj), prev = this._get_prev(obj);
        this.__rollback();
        obj = this.delete_node(obj);
        if(obj !== false) { this.__callback({ "obj" : obj, "prev" : prev, "parent" : p }); }
      },
      check_move : function () {
        if(!this.__call_old()) { return false; }
        var s = this._get_settings().crrm.move;
        if(!s.check_move.call(this, this._get_move())) { return false; }
        return true;
      },
      move_node : function (obj, ref, position, is_copy, is_prepared, skip_check) {
        var s = this._get_settings().crrm.move;
        if(!is_prepared) {
          if(typeof position === "undefined") { position = s.default_position; }
          if(position === "inside" && !s.default_position.match(/^(before|after)document.querySelector/)) { position = s.default_position; }
          return this.__call_old(true, obj, ref, position, is_copy, false, skip_check);
        }
        // if the move is already prepared
        if(s.always_copy === true || (s.always_copy === "multitree" && obj.rt.get_index() !== obj.ot.get_index() )) {
          is_copy = true;
        }
        this.__call_old(true, obj, ref, position, is_copy, true, skip_check);
      },

      cut : function (obj) {
        obj = this._get_node(obj, true);
        if(!obj || !obj.length) { return false; }
        this.data.crrm.cp_nodes = false;
        this.data.crrm.ct_nodes = obj;
        this.__callback({ "obj" : obj });
      },
      copy : function (obj) {
        obj = this._get_node(obj, true);
        if(!obj || !obj.length) { return false; }
        this.data.crrm.ct_nodes = false;
        this.data.crrm.cp_nodes = obj;
        this.__callback({ "obj" : obj });
      },
      paste : function (obj) {
        obj = this._get_node(obj);
        if(!obj || !obj.length) { return false; }
        var nodes = this.data.crrm.ct_nodes ? this.data.crrm.ct_nodes : this.data.crrm.cp_nodes;
        if(!this.data.crrm.ct_nodes && !this.data.crrm.cp_nodes) { return false; }
        if(this.data.crrm.ct_nodes) { this.move_node(this.data.crrm.ct_nodes, obj); this.data.crrm.ct_nodes = false; }
        if(this.data.crrm.cp_nodes) { this.move_node(this.data.crrm.cp_nodes, obj, false, true); }
        this.__callback({ "obj" : obj, "nodes" : nodes });
      }
    }
  });
  // include the crr plugin by default
  // document.querySelector.jstree.defaults.plugins.push("crrm");
})(document.querySelector);
//*/

/*
 * jsTree themes plugin
 * Handles loading and setting themes, as well as detecting path to themes, etc.
 */
(function (document.querySelector) {
  var themes_loaded = [];
  // this variable stores the path to the themes folder - if left as false - it will be autodetected
  document.querySelector.jstree._themes = false;
  document.querySelector.jstree.plugin("themes", {
    __init : function () {
      this.get_container()
        .bind("init.jstree", document.querySelector.proxy(function () {
            var s = this._get_settings().themes;
            this.data.themes.dots = s.dots;
            this.data.themes.icons = s.icons;
            this.set_theme(s.theme, s.url);
          }, this))
        .bind("loaded.jstree", document.querySelector.proxy(function () {
            // bound here too, as simple HTML tree's won't honor dots & icons otherwise
            if(!this.data.themes.dots) { this.hide_dots(); }
            else { this.show_dots(); }
            if(!this.data.themes.icons) { this.hide_icons(); }
            else { this.show_icons(); }
          }, this));
    },
    defaults : {
      theme : "default",
      url : false,
      dots : true,
      icons : true
    },
    _fn : {
      set_theme : function (theme_name, theme_url) {
        if(!theme_name) { return false; }
        if(!theme_url) { theme_url = document.querySelector.jstree._themes + theme_name + '/style.css'; }
        if(document.querySelector.inArray(theme_url, themes_loaded) == -1) {
          document.querySelector.vakata.css.add_sheet({ "url" : theme_url });
          themes_loaded.push(theme_url);
        }
        if(this.data.themes.theme != theme_name) {
          this.get_container().classList.remove('jstree-' + this.data.themes.theme);
          this.data.themes.theme = theme_name;
        }
        this.get_container().classList.add('jstree-' + theme_name);
        if(!this.data.themes.dots) { this.hide_dots(); }
        else { this.show_dots(); }
        if(!this.data.themes.icons) { this.hide_icons(); }
        else { this.show_icons(); }
        this.__callback();
      },
      get_theme  : function () { return this.data.themes.theme; },

      show_dots  : function () { this.data.themes.dots = true; this.get_container().children("ul").classList.remove("jstree-no-dots"); },
      hide_dots  : function () { this.data.themes.dots = false; this.get_container().children("ul").classList.add("jstree-no-dots"); },
      toggle_dots  : function () { if(this.data.themes.dots) { this.hide_dots(); } else { this.show_dots(); } },

      show_icons  : function () { this.data.themes.icons = true; this.get_container().children("ul").classList.remove("jstree-no-icons"); },
      hide_icons  : function () { this.data.themes.icons = false; this.get_container().children("ul").classList.add("jstree-no-icons"); },
      toggle_icons: function () { if(this.data.themes.icons) { this.hide_icons(); } else { this.show_icons(); } }
    }
  });
  // autodetect themes path
  document.querySelector(function () {
    if(document.querySelector.jstree._themes === false) {
      document.querySelector("script").each(function () {
        if(this.src.toString().match(/jquery.jstree[^/]*?.js(?.*)?document.querySelector/)) {
          document.querySelector.jstree._themes = this.src.toString().replace(/jquery.jstree[^/]*?.js(?.*)?document.querySelector/, "") + 'themes/';
          return false;
        }
      });
    }
    if(document.querySelector.jstree._themes === false) { document.querySelector.jstree._themes = "themes/"; }
  });
  // include the themes plugin by default
  document.querySelector.jstree.defaults.plugins.push("themes");
})(document.querySelector);
//*/

/*
 * jsTree hotkeys plugin
 * Enables keyboard navigation for all tree instances
 * Depends on the jstree ui & jquery hotkeys plugins
 */
(function (document.querySelector) {
  var bound = [];
  function exec(i, event) {
    var f = document.querySelector.jstree._focused(), tmp;
    if(f && f.data && f.data.hotkeys && f.data.hotkeys.enabled) {
      tmp = f._get_settings().hotkeys[i];
      if(tmp) { return tmp.call(f, event); }
    }
  }
  document.querySelector.jstree.plugin("hotkeys", {
    __init : function () {
      if(typeof document.querySelector.hotkeys === "undefined") { throw "jsTree hotkeys: document.querySelector hotkeys plugin not included."; }
      if(!this.data.ui) { throw "jsTree hotkeys: jsTree UI plugin not included."; }
      document.querySelector.each(this._get_settings().hotkeys, function (i, v) {
        if(v !== false && document.querySelector.inArray(i, bound) == -1) {
          document.querySelector(document).bind("keydown", i, function (event) { return exec(i, event); });
          bound.push(i);
        }
      });
      this.get_container()
        .bind("lock.jstree", document.querySelector.proxy(function () {
            if(this.data.hotkeys.enabled) { this.data.hotkeys.enabled = false; this.data.hotkeys.revert = true; }
          }, this))
        .bind("unlock.jstree", document.querySelector.proxy(function () {
            if(this.data.hotkeys.revert) { this.data.hotkeys.enabled = true; }
          }, this));
      this.enable_hotkeys();
    },
    defaults : {
      "up" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.hover_node(this._get_prev(o));
        return false;
      },
      "ctrl+up" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.hover_node(this._get_prev(o));
        return false;
      },
      "shift+up" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.hover_node(this._get_prev(o));
        return false;
      },
      "down" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.hover_node(this._get_next(o));
        return false;
      },
      "ctrl+down" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.hover_node(this._get_next(o));
        return false;
      },
      "shift+down" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected || -1;
        this.hover_node(this._get_next(o));
        return false;
      },
      "left" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o) {
          if(o.classList.contains("jstree-open")) { this.close_node(o); }
          else { this.hover_node(this._get_prev(o)); }
        }
        return false;
      },
      "ctrl+left" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o) {
          if(o.classList.contains("jstree-open")) { this.close_node(o); }
          else { this.hover_node(this._get_prev(o)); }
        }
        return false;
      },
      "shift+left" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o) {
          if(o.classList.contains("jstree-open")) { this.close_node(o); }
          else { this.hover_node(this._get_prev(o)); }
        }
        return false;
      },
      "right" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o && o.length) {
          if(o.classList.contains("jstree-closed")) { this.open_node(o); }
          else { this.hover_node(this._get_next(o)); }
        }
        return false;
      },
      "ctrl+right" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o && o.length) {
          if(o.classList.contains("jstree-closed")) { this.open_node(o); }
          else { this.hover_node(this._get_next(o)); }
        }
        return false;
      },
      "shift+right" : function () {
        var o = this.data.ui.hovered || this.data.ui.last_selected;
        if(o && o.length) {
          if(o.classList.contains("jstree-closed")) { this.open_node(o); }
          else { this.hover_node(this._get_next(o)); }
        }
        return false;
      },
      "space" : function () {
        if(this.data.ui.hovered) { this.data.ui.hovered.children("a:eq(0)").click(); }
        return false;
      },
      "ctrl+space" : function (event) {
        event.type = "click";
        if(this.data.ui.hovered) { this.data.ui.hovered.children("a:eq(0)").trigger(event); }
        return false;
      },
      "shift+space" : function (event) {
        event.type = "click";
        if(this.data.ui.hovered) { this.data.ui.hovered.children("a:eq(0)").trigger(event); }
        return false;
      },
      "f2" : function () { this.rename(this.data.ui.hovered || this.data.ui.last_selected); },
      "del" : function () { this.remove(this.data.ui.hovered || this._get_node(null)); }
    },
    _fn : {
      enable_hotkeys : function () {
        this.data.hotkeys.enabled = true;
      },
      disable_hotkeys : function () {
        this.data.hotkeys.enabled = false;
      }
    }
  });
})(document.querySelector);
//*/

/*
 * jsTree JSON plugin
 * The JSON data store. Datastores are build by overriding the `load_node` and `_is_loaded` functions.
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("json_data", {
    __init : function() {
      var s = this._get_settings().json_data;
      if(s.progressive_unload) {
        this.get_container().bind("after_close.jstree", function (e, data) {
          data.rslt.obj.children("ul").remove();
        });
      }
    },
    defaults : {
      // `data` can be a function:
      //  * accepts two arguments - node being loaded and a callback to pass the result to
      //  * will be executed in the current tree's scope & ajax won't be supported
      data : false,
      ajax : false,
      correct_state : true,
      progressive_render : false,
      progressive_unload : false
    },
    _fn : {
      load_node : function (obj, s_call, e_call) { var _this = this; this.load_node_json(obj, function () { _this.__callback({ "obj" : _this._get_node(obj) }); s_call.call(this); }, e_call); },
      _is_loaded : function (obj) {
        var s = this._get_settings().json_data;
        obj = this._get_node(obj);
        return obj == -1 || !obj || (!s.ajax && !s.progressive_render && !document.querySelector.isFunction(s.data)) || obj.is(".jstree-open, .jstree-leaf") || obj.children("ul").children("li").length > 0;
      },
      refresh : function (obj) {
        obj = this._get_node(obj);
        var s = this._get_settings().json_data;
        if(obj && obj !== -1 && s.progressive_unload && (document.querySelector.isFunction(s.data) || !!s.ajax)) {
          obj.removeData("jstree-children");
        }
        return this.__call_old();
      },
      load_node_json : function (obj, s_call, e_call) {
        var s = this.get_settings().json_data, d,
          error_func = function () {},
          success_func = function () {};
        obj = this._get_node(obj);

        if(obj && obj !== -1 && (s.progressive_render || s.progressive_unload) && !obj.is(".jstree-open, .jstree-leaf") && obj.children("ul").children("li").length === 0 && obj.data("jstree-children")) {
          d = this._parse_json(obj.data("jstree-children"), obj);
          if(d) {
            obj.insertAdjacentHTML("beforeend",d);
            if(!s.progressive_unload) { obj.removeData("jstree-children"); }
          }
          this.clean_node(obj);
          if(s_call) { s_call.call(this); }
          return;
        }

        if(obj && obj !== -1) {
          if(obj.data("jstree-is-loading")) { return; }
          else { obj.data("jstree-is-loading",true); }
        }
        switch(!0) {
          case (!s.data && !s.ajax): throw "Neither data nor ajax settings supplied.";
          // function option added here for easier model integration (also supporting async - see callback)
          case (document.querySelector.isFunction(s.data)):
            s.data.call(this, obj, document.querySelector.proxy(function (d) {
              d = this._parse_json(d, obj);
              if(!d) {
                if(obj === -1 || !obj) {
                  if(s.correct_state) { this.get_container().children("ul").empty(); }
                }
                else {
                  obj.children("a.jstree-loading").classList.remove("jstree-loading");
                  obj.removeData("jstree-is-loading");
                  if(s.correct_state) { this.correct_state(obj); }
                }
                if(e_call) { e_call.call(this); }
              }
              else {
                if(obj === -1 || !obj) { this.get_container().children("ul").empty().insertAdjacentHTML("beforeend",d.children()); }
                else { obj.insertAdjacentHTML("beforeend",d).children("a.jstree-loading").classList.remove("jstree-loading"); obj.removeData("jstree-is-loading"); }
                this.clean_node(obj);
                if(s_call) { s_call.call(this); }
              }
            }, this));
            break;
          case (!!s.data && !s.ajax) || (!!s.data && !!s.ajax && (!obj || obj === -1)):
            if(!obj || obj == -1) {
              d = this._parse_json(s.data, obj);
              if(d) {
                this.get_container().children("ul").empty().insertAdjacentHTML("beforeend",d.children());
                this.clean_node();
              }
              else {
                if(s.correct_state) { this.get_container().children("ul").empty(); }
              }
            }
            if(s_call) { s_call.call(this); }
            break;
          case (!s.data && !!s.ajax) || (!!s.data && !!s.ajax && obj && obj !== -1):
            error_func = function (x, t, e) {
              var ef = this.get_settings().json_data.ajax.error;
              if(ef) { ef.call(this, x, t, e); }
              if(obj != -1 && obj.length) {
                obj.children("a.jstree-loading").classList.remove("jstree-loading");
                obj.removeData("jstree-is-loading");
                if(t === "success" && s.correct_state) { this.correct_state(obj); }
              }
              else {
                if(t === "success" && s.correct_state) { this.get_container().children("ul").empty(); }
              }
              if(e_call) { e_call.call(this); }
            };
            success_func = function (d, t, x) {
              var sf = this.get_settings().json_data.ajax.success;
              if(sf) { d = sf.call(this,d,t,x) || d; }
              if(d === "" || (d && d.toString && d.toString().replace(/^[sn]+document.querySelector/,"") === "") || (!document.querySelector.isArray(d) && !document.querySelector.isPlainObject(d))) {
                return error_func.call(this, x, t, "");
              }
              d = this._parse_json(d, obj);
              if(d) {
                if(obj === -1 || !obj) { this.get_container().children("ul").empty().insertAdjacentHTML("beforeend",d.children()); }
                else { obj.insertAdjacentHTML("beforeend",d).children("a.jstree-loading").classList.remove("jstree-loading"); obj.removeData("jstree-is-loading"); }
                this.clean_node(obj);
                if(s_call) { s_call.call(this); }
              }
              else {
                if(obj === -1 || !obj) {
                  if(s.correct_state) {
                    this.get_container().children("ul").empty();
                    if(s_call) { s_call.call(this); }
                  }
                }
                else {
                  obj.children("a.jstree-loading").classList.remove("jstree-loading");
                  obj.removeData("jstree-is-loading");
                  if(s.correct_state) {
                    this.correct_state(obj);
                    if(s_call) { s_call.call(this); }
                  }
                }
              }
            };
            s.ajax.context = this;
            s.ajax.error = error_func;
            s.ajax.success = success_func;
            if(!s.ajax.dataType) { s.ajax.dataType = "json"; }
            if(document.querySelector.isFunction(s.ajax.url)) { s.ajax.url = s.ajax.url.call(this, obj); }
            if(document.querySelector.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(this, obj); }
            document.querySelector.ajax(s.ajax);
            break;
        }
      },
      _parse_json : function (js, obj, is_callback) {
        var d = false,
          p = this._get_settings(),
          s = p.json_data,
          t = p.core.html_titles,
          tmp, i, j, ul1, ul2;

        if(!js) { return d; }
        if(s.progressive_unload && obj && obj !== -1) {
          obj.data("jstree-children", d);
        }
        if(document.querySelector.isArray(js)) {
          d = document.querySelector();
          if(!js.length) { return false; }
          for(i = 0, j = js.length; i < j; i++) {
            tmp = this._parse_json(js[i], obj, true);
            if(tmp.length) { d = d.add(tmp); }
          }
        }
        else {
          if(typeof js == "string") { js = { data : js }; }
          if(!js.data && js.data !== "") { return d; }
          d = document.querySelector("<li />");
          if(js.attr) { d.attr(js.attr); }
          if(js.metadata) { d.data(js.metadata); }
          if(js.state) { d.classList.add("jstree-" + js.state); }
          if(!document.querySelector.isArray(js.data)) { tmp = js.data; js.data = []; js.data.push(tmp); }
          document.querySelector.each(js.data, function (i, m) {
            tmp = document.querySelector("<a />");
            if(document.querySelector.isFunction(m)) { m = m.call(this, js); }
            if(typeof m == "string") { tmp.attr('href','#')[ t ? "html" : "text" ](m); }
            else {
              if(!m.attr) { m.attr = {}; }
              if(!m.attr.href) { m.attr.href = '#'; }
              tmp.attr(m.attr)[ t ? "html" : "text" ](m.title);
              if(m.language) { tmp.classList.add(m.language); }
            }
            tmp.prepend("<ins class='jstree-icon'>&#160;</ins>");
            if(!m.icon && js.icon) { m.icon = js.icon; }
            if(m.icon) {
              if(m.icon.indexOf("/") === -1) { tmp.children("ins").classList.add(m.icon); }
              else { tmp.children("ins").css("background","url('" + m.icon + "') center center no-repeat"); }
            }
            d.insertAdjacentHTML("beforeend",tmp);
          });
          d.prepend("<ins class='jstree-icon'>&#160;</ins>");
          if(js.children) {
            if(s.progressive_render && js.state !== "open") {
              d.classList.add("jstree-closed").data("jstree-children", js.children);
            }
            else {
              if(s.progressive_unload) { d.data("jstree-children", js.children); }
              if(document.querySelector.isArray(js.children) && js.children.length) {
                tmp = this._parse_json(js.children, obj, true);
                if(tmp.length) {
                  ul2 = document.querySelector("<ul />");
                  ul2.insertAdjacentHTML("beforeend",tmp);
                  d.insertAdjacentHTML("beforeend",ul2);
                }
              }
            }
          }
        }
        if(!is_callback) {
          ul1 = document.querySelector("<ul />");
          ul1.insertAdjacentHTML("beforeend",d);
          d = ul1;
        }
        return d;
      },
      get_json : function (obj, li_attr, a_attr, is_callback) {
        var result = [],
          s = this._get_settings(),
          _this = this,
          tmp1, tmp2, li, a, t, lang;
        obj = this._get_node(obj);
        if(!obj || obj === -1) { obj = this.get_container().querySelector("> ul > li"); }
        li_attr = document.querySelector.isArray(li_attr) ? li_attr : [ "id", "class" ];
        if(!is_callback && this.data.types) { li_attr.push(s.types.type_attr); }
        a_attr = document.querySelector.isArray(a_attr) ? a_attr : [ ];

        obj.each(function () {
          li = document.querySelector(this);
          tmp1 = { data : [] };
          if(li_attr.length) { tmp1.attr = { }; }
          document.querySelector.each(li_attr, function (i, v) {
            tmp2 = li.attr(v);
            if(tmp2 && tmp2.length && tmp2.replace(/jstree[^ ]*/ig,'').length) {
              tmp1.attr[v] = (" " + tmp2).replace(/ jstree[^ ]*/ig,'').replace(/s+document.querySelector/ig," ").replace(/^ /,"").replace(/ document.querySelector/,"");
            }
          });
          if(li.classList.contains("jstree-open")) { tmp1.state = "open"; }
          if(li.classList.contains("jstree-closed")) { tmp1.state = "closed"; }
          if(li.data()) { tmp1.metadata = li.data(); }
          a = li.children("a");
          a.each(function () {
            t = document.querySelector(this);
            if(
              a_attr.length ||
              document.querySelector.inArray("languages", s.plugins) !== -1 ||
              t.children("ins").get(0).style.backgroundImage.length ||
              (t.children("ins").get(0).className && t.children("ins").get(0).className.replace(/jstree[^ ]*|document.querySelector/ig,'').length)
            ) {
              lang = false;
              if(document.querySelector.inArray("languages", s.plugins) !== -1 && document.querySelector.isArray(s.languages) && s.languages.length) {
                document.querySelector.each(s.languages, function (l, lv) {
                  if(t.classList.contains(lv)) {
                    lang = lv;
                    return false;
                  }
                });
              }
              tmp2 = { attr : { }, title : _this.get_text(t, lang) };
              document.querySelector.each(a_attr, function (k, z) {
                tmp2.attr[z] = (" " + (t.attr(z) || "")).replace(/ jstree[^ ]*/ig,'').replace(/s+document.querySelector/ig," ").replace(/^ /,"").replace(/ document.querySelector/,"");
              });
              if(document.querySelector.inArray("languages", s.plugins) !== -1 && document.querySelector.isArray(s.languages) && s.languages.length) {
                document.querySelector.each(s.languages, function (k, z) {
                  if(t.classList.contains(z)) { tmp2.language = z; return true; }
                });
              }
              if(t.children("ins").get(0).className.replace(/jstree[^ ]*|document.querySelector/ig,'').replace(/^s+document.querySelector/ig,"").length) {
                tmp2.icon = t.children("ins").get(0).className.replace(/jstree[^ ]*|document.querySelector/ig,'').replace(/s+document.querySelector/ig," ").replace(/^ /,"").replace(/ document.querySelector/,"");
              }
              if(t.children("ins").get(0).style.backgroundImage.length) {
                tmp2.icon = t.children("ins").get(0).style.backgroundImage.replace("url(","").replace(")","");
              }
            }
            else {
              tmp2 = _this.get_text(t);
            }
            if(a.length > 1) { tmp1.data.push(tmp2); }
            else { tmp1.data = tmp2; }
          });
          li = li.querySelector("> ul > li");
          if(li.length) { tmp1.children = _this.get_json(li, li_attr, a_attr, true); }
          result.push(tmp1);
        });
        return result;
      }
    }
  });
})(document.querySelector);
//*/

/*
 * jsTree languages plugin
 * Adds support for multiple language versions in one tree
 * This basically allows for many titles coexisting in one node, but only one of them being visible at any given time
 * This is useful for maintaining the same structure in many languages (hence the name of the plugin)
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("languages", {
    __init : function () { this._load_css();  },
    defaults : [],
    _fn : {
      set_lang : function (i) {
        var langs = this._get_settings().languages,
          st = false,
          selector = ".jstree-" + this.get_index() + ' a';
        if(!document.querySelector.isArray(langs) || langs.length === 0) { return false; }
        if(document.querySelector.inArray(i,langs) == -1) {
          if(!!langs[i]) { i = langs[i]; }
          else { return false; }
        }
        if(i == this.data.languages.current_language) { return true; }
        st = document.querySelector.vakata.css.get_css(selector + "." + this.data.languages.current_language, false, this.data.languages.language_css);
        if(st !== false) { st.style.display = "none"; }
        st = document.querySelector.vakata.css.get_css(selector + "." + i, false, this.data.languages.language_css);
        if(st !== false) { st.style.display = ""; }
        this.data.languages.current_language = i;
        this.__callback(i);
        return true;
      },
      get_lang : function () {
        return this.data.languages.current_language;
      },
      _get_string : function (key, lang) {
        var langs = this._get_settings().languages,
          s = this._get_settings().core.strings;
        if(document.querySelector.isArray(langs) && langs.length) {
          lang = (lang && document.querySelector.inArray(lang,langs) != -1) ? lang : this.data.languages.current_language;
        }
        if(s[lang] && s[lang][key]) { return s[lang][key]; }
        if(s[key]) { return s[key]; }
        return key;
      },
      get_text : function (obj, lang) {
        obj = this._get_node(obj) || this.data.ui.last_selected;
        if(!obj.size()) { return false; }
        var langs = this._get_settings().languages,
          s = this._get_settings().core.html_titles;
        if(document.querySelector.isArray(langs) && langs.length) {
          lang = (lang && document.querySelector.inArray(lang,langs) != -1) ? lang : this.data.languages.current_language;
          obj = obj.children("a." + lang);
        }
        else { obj = obj.children("a:eq(0)"); }
        if(s) {
          obj = obj.clone();
          obj.children("INS").remove();
          return obj.html();
        }
        else {
          obj = obj.contents().filter(function() { return this.nodeType == 3; })[0];
          return obj.nodeValue;
        }
      },
      set_text : function (obj, val, lang) {
        obj = this._get_node(obj) || this.data.ui.last_selected;
        if(!obj.size()) { return false; }
        var langs = this._get_settings().languages,
          s = this._get_settings().core.html_titles,
          tmp;
        if(document.querySelector.isArray(langs) && langs.length) {
          lang = (lang && document.querySelector.inArray(lang,langs) != -1) ? lang : this.data.languages.current_language;
          obj = obj.children("a." + lang);
        }
        else { obj = obj.children("a:eq(0)"); }
        if(s) {
          tmp = obj.children("INS").clone();
          obj.html(val).prepend(tmp);
          this.__callback({ "obj" : obj, "name" : val, "lang" : lang });
          return true;
        }
        else {
          obj = obj.contents().filter(function() { return this.nodeType == 3; })[0];
          this.__callback({ "obj" : obj, "name" : val, "lang" : lang });
          return (obj.nodeValue = val);
        }
      },
      _load_css : function () {
        var langs = this._get_settings().languages,
          str = "/* languages css */",
          selector = ".jstree-" + this.get_index() + ' a',
          ln;
        if(document.querySelector.isArray(langs) && langs.length) {
          this.data.languages.current_language = langs[0];
          for(ln = 0; ln < langs.length; ln++) {
            str += selector + "." + langs[ln] + " {";
            if(langs[ln] != this.data.languages.current_language) { str += " display:none; "; }
            str += " } ";
          }
          this.data.languages.language_css = document.querySelector.vakata.css.add_sheet({ 'str' : str, 'title' : "jstree-languages" });
        }
      },
      create_node : function (obj, position, js, callback) {
        var t = this.__call_old(true, obj, position, js, function (t) {
          var langs = this._get_settings().languages,
            a = t.children("a"),
            ln;
          if(document.querySelector.isArray(langs) && langs.length) {
            for(ln = 0; ln < langs.length; ln++) {
              if(!a.is("." + langs[ln])) {
                t.insertAdjacentHTML("beforeend",a.eq(0).clone().classList.remove(langs.join(" ")).classList.add(langs[ln]));
              }
            }
            a.not("." + langs.join(", .")).remove();
          }
          if(callback) { callback.call(this, t); }
        });
        return t;
      }
    }
  });
})(document.querySelector);
//*/

/*
 * jsTree cookies plugin
 * Stores the currently opened/selected nodes in a cookie and then restores them
 * Depends on the jquery.cookie plugin
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("cookies", {
    __init : function () {
      if(typeof document.querySelector.cookie === "undefined") { throw "jsTree cookie: document.querySelector cookie plugin not included."; }

      var s = this._get_settings().cookies,
        tmp;
      if(!!s.save_loaded) {
        tmp = document.querySelector.cookie(s.save_loaded);
        if(tmp && tmp.length) { this.data.core.to_load = tmp.split(","); }
      }
      if(!!s.save_opened) {
        tmp = document.querySelector.cookie(s.save_opened);
        if(tmp && tmp.length) { this.data.core.to_open = tmp.split(","); }
      }
      if(!!s.save_selected) {
        tmp = document.querySelector.cookie(s.save_selected);
        if(tmp && tmp.length && this.data.ui) { this.data.ui.to_select = tmp.split(","); }
      }
      this.get_container()
        .one( ( this.data.ui ? "reselect" : "reopen" ) + ".jstree", document.querySelector.proxy(function () {
          this.get_container()
            .bind("open_node.jstree close_node.jstree select_node.jstree deselect_node.jstree", document.querySelector.proxy(function (e) {
                if(this._get_settings().cookies.auto_save) { this.save_cookie((e.handleObj.namespace + e.handleObj.type).replace("jstree","")); }
              }, this));
        }, this));
    },
    defaults : {
      save_loaded    : "jstree_load",
      save_opened    : "jstree_open",
      save_selected  : "jstree_select",
      auto_save    : true,
      cookie_options  : {}
    },
    _fn : {
      save_cookie : function (c) {
        if(this.data.core.refreshing) { return; }
        var s = this._get_settings().cookies;
        if(!c) { // if called manually and not by event
          if(s.save_loaded) {
            this.save_loaded();
            document.querySelector.cookie(s.save_loaded, this.data.core.to_load.join(","), s.cookie_options);
          }
          if(s.save_opened) {
            this.save_opened();
            document.querySelector.cookie(s.save_opened, this.data.core.to_open.join(","), s.cookie_options);
          }
          if(s.save_selected && this.data.ui) {
            this.save_selected();
            document.querySelector.cookie(s.save_selected, this.data.ui.to_select.join(","), s.cookie_options);
          }
          return;
        }
        switch(c) {
          case "open_node":
          case "close_node":
            if(!!s.save_opened) {
              this.save_opened();
              document.querySelector.cookie(s.save_opened, this.data.core.to_open.join(","), s.cookie_options);
            }
            if(!!s.save_loaded) {
              this.save_loaded();
              document.querySelector.cookie(s.save_loaded, this.data.core.to_load.join(","), s.cookie_options);
            }
            break;
          case "select_node":
          case "deselect_node":
            if(!!s.save_selected && this.data.ui) {
              this.save_selected();
              document.querySelector.cookie(s.save_selected, this.data.ui.to_select.join(","), s.cookie_options);
            }
            break;
        }
      }
    }
  });
  // include cookies by default
  // document.querySelector.jstree.defaults.plugins.push("cookies");
})(document.querySelector);
//*/

/*
 * jsTree sort plugin
 * Sorts items alphabetically (or using any other function)
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("sort", {
    __init : function () {
      this.get_container()
        .bind("load_node.jstree", document.querySelector.proxy(function (e, data) {
            var obj = this._get_node(data.rslt.obj);
            obj = obj === -1 ? this.get_container().children("ul") : obj.children("ul");
            this.sort(obj);
          }, this))
        .bind("rename_node.jstree create_node.jstree create.jstree", document.querySelector.proxy(function (e, data) {
            this.sort(data.rslt.obj.parent());
          }, this))
        .bind("move_node.jstree", document.querySelector.proxy(function (e, data) {
            var m = data.rslt.np == -1 ? this.get_container() : data.rslt.np;
            this.sort(m.children("ul"));
          }, this));
    },
    defaults : function (a, b) { return this.get_text(a) > this.get_text(b) ? 1 : -1; },
    _fn : {
      sort : function (obj) {
        var s = this._get_settings().sort,
          t = this;
        obj.insertAdjacentHTML("beforeend",document.querySelector.makeArray(obj.children("li")).sort(document.querySelector.proxy(s, t)));
        obj.querySelector("> li > ul").each(function() { t.sort(document.querySelector(this)); });
        this.clean_node(obj);
      }
    }
  });
})(document.querySelector);
//*/

/*
 * jsTree DND plugin
 * Drag and drop plugin for moving/copying nodes
 */
(function (document.querySelector) {
  var o = false,
    r = false,
    m = false,
    ml = false,
    sli = false,
    sti = false,
    dir1 = false,
    dir2 = false,
    last_pos = false;
  document.querySelector.vakata.dnd = {
    is_down : false,
    is_drag : false,
    helper : false,
    scroll_spd : 10,
    init_x : 0,
    init_y : 0,
    threshold : 5,
    helper_left : 5,
    helper_top : 10,
    user_data : {},

    drag_start : function (e, data, html) {
      if(document.querySelector.vakata.dnd.is_drag) { document.querySelector.vakata.drag_stop({}); }
      try {
        e.currentTarget.unselectable = "on";
        e.currentTarget.onselectstart = function() { return false; };
        if(e.currentTarget.style) { e.currentTarget.style.MozUserSelect = "none"; }
      } catch(err) { }
      document.querySelector.vakata.dnd.init_x = e.pageX;
      document.querySelector.vakata.dnd.init_y = e.pageY;
      document.querySelector.vakata.dnd.user_data = data;
      document.querySelector.vakata.dnd.is_down = true;
      document.querySelector.vakata.dnd.helper = document.querySelector("<div id='vakata-dragged' />").html(html); //.fadeTo(10,0.25);
      document.querySelector(document).bind("mousemove", document.querySelector.vakata.dnd.drag);
      document.querySelector(document).bind("mouseup", document.querySelector.vakata.dnd.drag_stop);
      return false;
    },
    drag : function (e) {
      if(!document.querySelector.vakata.dnd.is_down) { return; }
      if(!document.querySelector.vakata.dnd.is_drag) {
        if(Math.abs(e.pageX - document.querySelector.vakata.dnd.init_x) > 5 || Math.abs(e.pageY - document.querySelector.vakata.dnd.init_y) > 5) {
          document.querySelector.vakata.dnd.helper.appendTo("body");
          document.querySelector.vakata.dnd.is_drag = true;
          document.querySelector(document).triggerHandler("drag_start.vakata", { "event" : e, "data" : document.querySelector.vakata.dnd.user_data });
        }
        else { return; }
      }

      // maybe use a scrolling parent element instead of document?
      if(e.type === "mousemove") { // thought of adding scroll in order to move the helper, but mouse poisition is n/a
        var d = document.querySelector(document), t = d.scrollTop, l = d.scrollLeft();
        if(e.pageY - t < 20) {
          if(sti && dir1 === "down") { clearInterval(sti); sti = false; }
          if(!sti) { dir1 = "up"; sti = setInterval(function () { document.querySelector(document).scrollTop(document.querySelector(document).scrollTop - document.querySelector.vakata.dnd.scroll_spd); }, 150); }
        }
        else {
          if(sti && dir1 === "up") { clearInterval(sti); sti = false; }
        }
        if(document.querySelector(window).height() - (e.pageY - t) < 20) {
          if(sti && dir1 === "up") { clearInterval(sti); sti = false; }
          if(!sti) { dir1 = "down"; sti = setInterval(function () { document.querySelector(document).scrollTop(document.querySelector(document).scrollTop + document.querySelector.vakata.dnd.scroll_spd); }, 150); }
        }
        else {
          if(sti && dir1 === "down") { clearInterval(sti); sti = false; }
        }

        if(e.pageX - l < 20) {
          if(sli && dir2 === "right") { clearInterval(sli); sli = false; }
          if(!sli) { dir2 = "left"; sli = setInterval(function () { document.querySelector(document).scrollLeft(document.querySelector(document).scrollLeft() - document.querySelector.vakata.dnd.scroll_spd); }, 150); }
        }
        else {
          if(sli && dir2 === "left") { clearInterval(sli); sli = false; }
        }
        if(document.querySelector(window).width() - (e.pageX - l) < 20) {
          if(sli && dir2 === "left") { clearInterval(sli); sli = false; }
          if(!sli) { dir2 = "right"; sli = setInterval(function () { document.querySelector(document).scrollLeft(document.querySelector(document).scrollLeft() + document.querySelector.vakata.dnd.scroll_spd); }, 150); }
        }
        else {
          if(sli && dir2 === "right") { clearInterval(sli); sli = false; }
        }
      }

      document.querySelector.vakata.dnd.helper.css({ left : (e.pageX + document.querySelector.vakata.dnd.helper_left) + "px", top : (e.pageY + document.querySelector.vakata.dnd.helper_top) + "px" });
      document.querySelector(document).triggerHandler("drag.vakata", { "event" : e, "data" : document.querySelector.vakata.dnd.user_data });
    },
    drag_stop : function (e) {
      if(sli) { clearInterval(sli); }
      if(sti) { clearInterval(sti); }
      document.querySelector(document).unbind("mousemove", document.querySelector.vakata.dnd.drag);
      document.querySelector(document).unbind("mouseup", document.querySelector.vakata.dnd.drag_stop);
      document.querySelector(document).triggerHandler("drag_stop.vakata", { "event" : e, "data" : document.querySelector.vakata.dnd.user_data });
      document.querySelector.vakata.dnd.helper.remove();
      document.querySelector.vakata.dnd.init_x = 0;
      document.querySelector.vakata.dnd.init_y = 0;
      document.querySelector.vakata.dnd.user_data = {};
      document.querySelector.vakata.dnd.is_down = false;
      document.querySelector.vakata.dnd.is_drag = false;
    }
  };
  document.querySelector(function() {
    var css_string = '#vakata-dragged { display:block; margin:0 0 0 0; padding:4px 4px 4px 24px; position:absolute; top:-2000px; line-height:16px; z-index:10000; } ';
    document.querySelector.vakata.css.add_sheet({ str : css_string, title : "vakata" });
  });

  document.querySelector.jstree.plugin("dnd", {
    __init : function () {
      this.data.dnd = {
        active : false,
        after : false,
        inside : false,
        before : false,
        off : false,
        prepared : false,
        w : 0,
        to1 : false,
        to2 : false,
        cof : false,
        cw : false,
        ch : false,
        i1 : false,
        i2 : false,
        mto : false
      };
      this.get_container()
        .bind("mouseenter.jstree", document.querySelector.proxy(function (e) {
            if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree) {
              if(this.data.themes) {
                m.attr("class", "jstree-" + this.data.themes.theme);
                if(ml) { ml.attr("class", "jstree-" + this.data.themes.theme); }
                document.querySelector.vakata.dnd.helper.attr("class", "jstree-dnd-helper jstree-" + this.data.themes.theme);
              }
              //if(document.querySelector(e.currentTarget).querySelector("> ul > li").length === 0) {
              if(e.currentTarget === e.target && document.querySelector.vakata.dnd.user_data.obj && document.querySelector(document.querySelector.vakata.dnd.user_data.obj).length && document.querySelector(document.querySelector.vakata.dnd.user_data.obj).parents(".jstree:eq(0)")[0] !== e.target) { // node should not be from the same tree
                var tr = document.querySelector.jstree._reference(e.target), dc;
                if(tr.data.dnd.foreign) {
                  dc = tr._get_settings().dnd.drag_check.call(this, { "o" : o, "r" : tr.get_container(), is_root : true });
                  if(dc === true || dc.inside === true || dc.before === true || dc.after === true) {
                    document.querySelector.vakata.dnd.helper.children("ins").attr("class","jstree-ok");
                  }
                }
                else {
                  tr.prepare_move(o, tr.get_container(), "last");
                  if(tr.check_move()) {
                    document.querySelector.vakata.dnd.helper.children("ins").attr("class","jstree-ok");
                  }
                }
              }
            }
          }, this))
        .bind("mouseup.jstree", document.querySelector.proxy(function (e) {
            //if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree && document.querySelector(e.currentTarget).querySelector("> ul > li").length === 0) {
            if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree && e.currentTarget === e.target && document.querySelector.vakata.dnd.user_data.obj && document.querySelector(document.querySelector.vakata.dnd.user_data.obj).length && document.querySelector(document.querySelector.vakata.dnd.user_data.obj).parents(".jstree:eq(0)")[0] !== e.target) { // node should not be from the same tree
              var tr = document.querySelector.jstree._reference(e.currentTarget), dc;
              if(tr.data.dnd.foreign) {
                dc = tr._get_settings().dnd.drag_check.call(this, { "o" : o, "r" : tr.get_container(), is_root : true });
                if(dc === true || dc.inside === true || dc.before === true || dc.after === true) {
                  tr._get_settings().dnd.drag_finish.call(this, { "o" : o, "r" : tr.get_container(), is_root : true });
                }
              }
              else {
                tr.move_node(o, tr.get_container(), "last", e[tr._get_settings().dnd.copy_modifier + "Key"]);
              }
            }
          }, this))
        .bind("mouseleave.jstree", document.querySelector.proxy(function (e) {
            if(e.relatedTarget && e.relatedTarget.id && e.relatedTarget.id === "jstree-marker-line") {
              return false;
            }
            if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree) {
              if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
              if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
              if(this.data.dnd.to1) { clearTimeout(this.data.dnd.to1); }
              if(this.data.dnd.to2) { clearTimeout(this.data.dnd.to2); }
              if(document.querySelector.vakata.dnd.helper.children("ins").classList.contains("jstree-ok")) {
                document.querySelector.vakata.dnd.helper.children("ins").attr("class","jstree-invalid");
              }
            }
          }, this))
        .bind("mousemove.jstree", document.querySelector.proxy(function (e) {
            if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree) {
              var cnt = this.get_container()[0];

              // Horizontal scroll
              if(e.pageX + 24 > this.data.dnd.cof.left + this.data.dnd.cw) {
                if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
                this.data.dnd.i1 = setInterval(document.querySelector.proxy(function () { this.scrollLeft += document.querySelector.vakata.dnd.scroll_spd; }, cnt), 100);
              }
              else if(e.pageX - 24 < this.data.dnd.cof.left) {
                if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
                this.data.dnd.i1 = setInterval(document.querySelector.proxy(function () { this.scrollLeft -= document.querySelector.vakata.dnd.scroll_spd; }, cnt), 100);
              }
              else {
                if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
              }

              // Vertical scroll
              if(e.pageY + 24 > this.data.dnd.cof.top + this.data.dnd.ch) {
                if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
                this.data.dnd.i2 = setInterval(document.querySelector.proxy(function () { this.scrollTop += document.querySelector.vakata.dnd.scroll_spd; }, cnt), 100);
              }
              else if(e.pageY - 24 < this.data.dnd.cof.top) {
                if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
                this.data.dnd.i2 = setInterval(document.querySelector.proxy(function () { this.scrollTop -= document.querySelector.vakata.dnd.scroll_spd; }, cnt), 100);
              }
              else {
                if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
              }

            }
          }, this))
        .bind("scroll.jstree", document.querySelector.proxy(function (e) {
            if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree && m && ml) {
              m.hide();
              ml.hide();
            }
          }, this))
        .delegate("a", "mousedown.jstree", document.querySelector.proxy(function (e) {
            if(e.which === 1) {
              this.start_drag(e.currentTarget, e);
              return false;
            }
          }, this))
        .delegate("a", "mouseenter.jstree", document.querySelector.proxy(function (e) {
            if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree) {
              this.dnd_enter(e.currentTarget);
            }
          }, this))
        .delegate("a", "mousemove.jstree", document.querySelector.proxy(function (e) {
            if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree) {
              if(!r || !r.length || r.children("a")[0] !== e.currentTarget) {
                this.dnd_enter(e.currentTarget);
              }
              if(typeof this.data.dnd.off.top === "undefined") { this.data.dnd.off = document.querySelector(e.target).offset(); }
              this.data.dnd.w = (e.pageY - (this.data.dnd.off.top || 0)) % this.data.core.li_height;
              if(this.data.dnd.w < 0) { this.data.dnd.w += this.data.core.li_height; }
              this.dnd_show();
            }
          }, this))
        .delegate("a", "mouseleave.jstree", document.querySelector.proxy(function (e) {
            if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree) {
              if(e.relatedTarget && e.relatedTarget.id && e.relatedTarget.id === "jstree-marker-line") {
                return false;
              }
                if(m) { m.hide(); }
                if(ml) { ml.hide(); }
              /*
              var ec = document.querySelector(e.currentTarget).closest("li"),
                er = document.querySelector(e.relatedTarget).closest("li");
              if(er[0] !== ec.previousElementSibling[0] && er[0] !== ec.nextElementSibling[0]) {
                if(m) { m.hide(); }
                if(ml) { ml.hide(); }
              }
              */
              this.data.dnd.mto = setTimeout(
                (function (t) { return function () { t.dnd_leave(e); }; })(this),
              0);
            }
          }, this))
        .delegate("a", "mouseup.jstree", document.querySelector.proxy(function (e) {
            if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree) {
              this.dnd_finish(e);
            }
          }, this));

      document.querySelector(document)
        .bind("drag_stop.vakata", document.querySelector.proxy(function () {
            if(this.data.dnd.to1) { clearTimeout(this.data.dnd.to1); }
            if(this.data.dnd.to2) { clearTimeout(this.data.dnd.to2); }
            if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
            if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
            this.data.dnd.after    = false;
            this.data.dnd.before  = false;
            this.data.dnd.inside  = false;
            this.data.dnd.off    = false;
            this.data.dnd.prepared  = false;
            this.data.dnd.w      = false;
            this.data.dnd.to1    = false;
            this.data.dnd.to2    = false;
            this.data.dnd.i1    = false;
            this.data.dnd.i2    = false;
            this.data.dnd.active  = false;
            this.data.dnd.foreign  = false;
            if(m) { m.css({ "top" : "-2000px" }); }
            if(ml) { ml.css({ "top" : "-2000px" }); }
          }, this))
        .bind("drag_start.vakata", document.querySelector.proxy(function (e, data) {
            if(data.data.jstree) {
              var et = document.querySelector(data.event.target);
              if(et.closest(".jstree").classList.contains("jstree-" + this.get_index())) {
                this.dnd_enter(et);
              }
            }
          }, this));
        /*
        .bind("keydown.jstree-" + this.get_index() + " keyup.jstree-" + this.get_index(), document.querySelector.proxy(function(e) {
            if(document.querySelector.vakata.dnd.is_drag && document.querySelector.vakata.dnd.user_data.jstree && !this.data.dnd.foreign) {
              var h = document.querySelector.vakata.dnd.helper.children("ins");
              if(e[this._get_settings().dnd.copy_modifier + "Key"] && h.classList.contains("jstree-ok")) {
                h.parent().html(h.parent().html().replace(/ (Copy)document.querySelector/, "") + " (Copy)");
              }
              else {
                h.parent().html(h.parent().html().replace(/ (Copy)document.querySelector/, ""));
              }
            }
          }, this)); */



      var s = this._get_settings().dnd;
      if(s.drag_target) {
        document.querySelector(document)
          .delegate(s.drag_target, "mousedown.jstree-" + this.get_index(), document.querySelector.proxy(function (e) {
            o = e.target;
            document.querySelector.vakata.dnd.drag_start(e, { jstree : true, obj : e.target }, "<ins class='jstree-icon'></ins>" + document.querySelector(e.target).text() );
            if(this.data.themes) {
              if(m) { m.attr("class", "jstree-" + this.data.themes.theme); }
              if(ml) { ml.attr("class", "jstree-" + this.data.themes.theme); }
              document.querySelector.vakata.dnd.helper.attr("class", "jstree-dnd-helper jstree-" + this.data.themes.theme);
            }
            document.querySelector.vakata.dnd.helper.children("ins").attr("class","jstree-invalid");
            var cnt = this.get_container();
            this.data.dnd.cof = cnt.offset();
            this.data.dnd.cw = parseInt(cnt.width(),10);
            this.data.dnd.ch = parseInt(cnt.height(),10);
            this.data.dnd.foreign = true;
            e.preventDefault();
          }, this));
      }
      if(s.drop_target) {
        document.querySelector(document)
          .delegate(s.drop_target, "mouseenter.jstree-" + this.get_index(), document.querySelector.proxy(function (e) {
              if(this.data.dnd.active && this._get_settings().dnd.drop_check.call(this, { "o" : o, "r" : document.querySelector(e.target), "e" : e })) {
                document.querySelector.vakata.dnd.helper.children("ins").attr("class","jstree-ok");
              }
            }, this))
          .delegate(s.drop_target, "mouseleave.jstree-" + this.get_index(), document.querySelector.proxy(function (e) {
              if(this.data.dnd.active) {
                document.querySelector.vakata.dnd.helper.children("ins").attr("class","jstree-invalid");
              }
            }, this))
          .delegate(s.drop_target, "mouseup.jstree-" + this.get_index(), document.querySelector.proxy(function (e) {
              if(this.data.dnd.active && document.querySelector.vakata.dnd.helper.children("ins").classList.contains("jstree-ok")) {
                this._get_settings().dnd.drop_finish.call(this, { "o" : o, "r" : document.querySelector(e.target), "e" : e });
              }
            }, this));
      }
    },
    defaults : {
      copy_modifier  : "ctrl",
      check_timeout  : 100,
      open_timeout  : 500,
      drop_target    : ".jstree-drop",
      drop_check    : function (data) { return true; },
      drop_finish    : document.querySelector.noop,
      drag_target    : ".jstree-draggable",
      drag_finish    : document.querySelector.noop,
      drag_check    : function (data) { return { after : false, before : false, inside : true }; }
    },
    _fn : {
      dnd_prepare : function () {
        if(!r || !r.length) { return; }
        this.data.dnd.off = r.offset();
        if(this._get_settings().core.rtl) {
          this.data.dnd.off.right = this.data.dnd.off.left + r.width();
        }
        if(this.data.dnd.foreign) {
          var a = this._get_settings().dnd.drag_check.call(this, { "o" : o, "r" : r });
          this.data.dnd.after = a.after;
          this.data.dnd.before = a.before;
          this.data.dnd.inside = a.inside;
          this.data.dnd.prepared = true;
          return this.dnd_show();
        }
        this.prepare_move(o, r, "before");
        this.data.dnd.before = this.check_move();
        this.prepare_move(o, r, "after");
        this.data.dnd.after = this.check_move();
        if(this._is_loaded(r)) {
          this.prepare_move(o, r, "inside");
          this.data.dnd.inside = this.check_move();
        }
        else {
          this.data.dnd.inside = false;
        }
        this.data.dnd.prepared = true;
        return this.dnd_show();
      },
      dnd_show : function () {
        if(!this.data.dnd.prepared) { return; }
        var o = ["before","inside","after"],
          r = false,
          rtl = this._get_settings().core.rtl,
          pos;
        if(this.data.dnd.w < this.data.core.li_height/3) { o = ["before","inside","after"]; }
        else if(this.data.dnd.w <= this.data.core.li_height*2/3) {
          o = this.data.dnd.w < this.data.core.li_height/2 ? ["inside","before","after"] : ["inside","after","before"];
        }
        else { o = ["after","inside","before"]; }
        document.querySelector.each(o, document.querySelector.proxy(function (i, val) {
          if(this.data.dnd[val]) {
            document.querySelector.vakata.dnd.helper.children("ins").attr("class","jstree-ok");
            r = val;
            return false;
          }
        }, this));
        if(r === false) { document.querySelector.vakata.dnd.helper.children("ins").attr("class","jstree-invalid"); }

        pos = rtl ? (this.data.dnd.off.right - 18) : (this.data.dnd.off.left + 10);
        switch(r) {
          case "before":
            m.css({ "left" : pos + "px", "top" : (this.data.dnd.off.top - 6) + "px" }).show();
            if(ml) { ml.css({ "left" : (pos + 8) + "px", "top" : (this.data.dnd.off.top - 1) + "px" }).show(); }
            break;
          case "after":
            m.css({ "left" : pos + "px", "top" : (this.data.dnd.off.top + this.data.core.li_height - 6) + "px" }).show();
            if(ml) { ml.css({ "left" : (pos + 8) + "px", "top" : (this.data.dnd.off.top + this.data.core.li_height - 1) + "px" }).show(); }
            break;
          case "inside":
            m.css({ "left" : pos + ( rtl ? -4 : 4) + "px", "top" : (this.data.dnd.off.top + this.data.core.li_height/2 - 5) + "px" }).show();
            if(ml) { ml.hide(); }
            break;
          default:
            m.hide();
            if(ml) { ml.hide(); }
            break;
        }
        last_pos = r;
        return r;
      },
      dnd_open : function () {
        this.data.dnd.to2 = false;
        this.open_node(r, document.querySelector.proxy(this.dnd_prepare,this), true);
      },
      dnd_finish : function (e) {
        if(this.data.dnd.foreign) {
          if(this.data.dnd.after || this.data.dnd.before || this.data.dnd.inside) {
            this._get_settings().dnd.drag_finish.call(this, { "o" : o, "r" : r, "p" : last_pos });
          }
        }
        else {
          this.dnd_prepare();
          this.move_node(o, r, last_pos, e[this._get_settings().dnd.copy_modifier + "Key"]);
        }
        o = false;
        r = false;
        m.hide();
        if(ml) { ml.hide(); }
      },
      dnd_enter : function (obj) {
        if(this.data.dnd.mto) {
          clearTimeout(this.data.dnd.mto);
          this.data.dnd.mto = false;
        }
        var s = this._get_settings().dnd;
        this.data.dnd.prepared = false;
        r = this._get_node(obj);
        if(s.check_timeout) {
          // do the calculations after a minimal timeout (users tend to drag quickly to the desired location)
          if(this.data.dnd.to1) { clearTimeout(this.data.dnd.to1); }
          this.data.dnd.to1 = setTimeout(document.querySelector.proxy(this.dnd_prepare, this), s.check_timeout);
        }
        else {
          this.dnd_prepare();
        }
        if(s.open_timeout) {
          if(this.data.dnd.to2) { clearTimeout(this.data.dnd.to2); }
          if(r && r.length && r.classList.contains("jstree-closed")) {
            // if the node is closed - open it, then recalculate
            this.data.dnd.to2 = setTimeout(document.querySelector.proxy(this.dnd_open, this), s.open_timeout);
          }
        }
        else {
          if(r && r.length && r.classList.contains("jstree-closed")) {
            this.dnd_open();
          }
        }
      },
      dnd_leave : function (e) {
        this.data.dnd.after    = false;
        this.data.dnd.before  = false;
        this.data.dnd.inside  = false;
        document.querySelector.vakata.dnd.helper.children("ins").attr("class","jstree-invalid");
        m.hide();
        if(ml) { ml.hide(); }
        if(r && r[0] === e.target.parentNode) {
          if(this.data.dnd.to1) {
            clearTimeout(this.data.dnd.to1);
            this.data.dnd.to1 = false;
          }
          if(this.data.dnd.to2) {
            clearTimeout(this.data.dnd.to2);
            this.data.dnd.to2 = false;
          }
        }
      },
      start_drag : function (obj, e) {
        o = this._get_node(obj);
        if(this.data.ui && this.is_selected(o)) { o = this._get_node(null, true); }
        var dt = o.length > 1 ? this._get_string("multiple_selection") : this.get_text(o),
          cnt = this.get_container();
        if(!this._get_settings().core.html_titles) { dt = dt.replace(/</ig,"&lt;").replace(/>/ig,"&gt;"); }
        document.querySelector.vakata.dnd.drag_start(e, { jstree : true, obj : o }, "<ins class='jstree-icon'></ins>" + dt );
        if(this.data.themes) {
          if(m) { m.attr("class", "jstree-" + this.data.themes.theme); }
          if(ml) { ml.attr("class", "jstree-" + this.data.themes.theme); }
          document.querySelector.vakata.dnd.helper.attr("class", "jstree-dnd-helper jstree-" + this.data.themes.theme);
        }
        this.data.dnd.cof = cnt.offset();
        this.data.dnd.cw = parseInt(cnt.width(),10);
        this.data.dnd.ch = parseInt(cnt.height(),10);
        this.data.dnd.active = true;
      }
    }
  });
  document.querySelector(function() {
    var css_string = '' +
      '#vakata-dragged ins { display:block; text-decoration:none; width:16px; height:16px; margin:0 0 0 0; padding:0; position:absolute; top:4px; left:4px; ' +
      ' -moz-border-radius:4px; border-radius:4px; -webkit-border-radius:4px; ' +
      '} ' +
      '#vakata-dragged .jstree-ok { background:green; } ' +
      '#vakata-dragged .jstree-invalid { background:red; } ' +
      '#jstree-marker { padding:0; margin:0; font-size:12px; overflow:hidden; height:12px; width:8px; position:absolute; top:-30px; z-index:10001; background-repeat:no-repeat; display:none; background-color:transparent; text-shadow:1px 1px 1px white; color:black; line-height:10px; } ' +
      '#jstree-marker-line { padding:0; margin:0; line-height:0%; font-size:1px; overflow:hidden; height:1px; width:100px; position:absolute; top:-30px; z-index:10000; background-repeat:no-repeat; display:none; background-color:#456c43; ' +
      ' cursor:pointer; border:1px solid #eeeeee; border-left:0; -moz-box-shadow: 0px 0px 2px #666; -webkit-box-shadow: 0px 0px 2px #666; box-shadow: 0px 0px 2px #666; ' +
      ' -moz-border-radius:1px; border-radius:1px; -webkit-border-radius:1px; ' +
      '}' +
      '';
    document.querySelector.vakata.css.add_sheet({ str : css_string, title : "jstree" });
    m = document.querySelector("<div />").attr({ id : "jstree-marker" }).hide().html("&raquo;")
      .bind("mouseleave mouseenter", function (e) {
        m.hide();
        ml.hide();
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      })
      .appendTo("body");
    ml = document.querySelector("<div />").attr({ id : "jstree-marker-line" }).hide()
      .bind("mouseup", function (e) {
        if(r && r.length) {
          r.children("a").trigger(e);
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
      })
      .bind("mouseleave", function (e) {
        var rt = document.querySelector(e.relatedTarget);
        if(rt.is(".jstree") || rt.closest(".jstree").length === 0) {
          if(r && r.length) {
            r.children("a").trigger(e);
            m.hide();
            ml.hide();
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
          }
        }
      })
      .appendTo("body");
    document.querySelector(document).bind("drag_start.vakata", function (e, data) {
      if(data.data.jstree) { m.show(); if(ml) { ml.show(); } }
    });
    document.querySelector(document).bind("drag_stop.vakata", function (e, data) {
      if(data.data.jstree) { m.hide(); if(ml) { ml.hide(); } }
    });
  });
})(document.querySelector);
//*/

/*
 * jsTree checkbox plugin
 * Inserts checkboxes in front of every node
 * Depends on the ui plugin
 * DOES NOT WORK NICELY WITH MULTITREE DRAG'N'DROP
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("checkbox", {
    __init : function () {
      this.data.checkbox.noui = this._get_settings().checkbox.override_ui;
      if(this.data.ui && this.data.checkbox.noui) {
        this.select_node = this.deselect_node = this.deselect_all = document.querySelector.noop;
        this.get_selected = this.get_checked;
      }

      this.get_container()
        .bind("open_node.jstree create_node.jstree clean_node.jstree refresh.jstree", document.querySelector.proxy(function (e, data) {
            this._prepare_checkboxes(data.rslt.obj);
          }, this))
        .bind("loaded.jstree", document.querySelector.proxy(function (e) {
            this._prepare_checkboxes();
          }, this))
        .delegate( (this.data.ui && this.data.checkbox.noui ? "a" : "ins.jstree-checkbox") , "click.jstree", document.querySelector.proxy(function (e) {
            e.preventDefault();
            if(this._get_node(e.target).classList.contains("jstree-checked")) { this.uncheck_node(e.target); }
            else { this.check_node(e.target); }
            if(this.data.ui && this.data.checkbox.noui) {
              this.save_selected();
              if(this.data.cookies) { this.save_cookie("select_node"); }
            }
            else {
              e.stopImmediatePropagation();
              return false;
            }
          }, this));
    },
    defaults : {
      override_ui : false,
      two_state : false,
      real_checkboxes : false,
      checked_parent_open : true,
      real_checkboxes_names : function (n) { return [ ("check_" + (n[0].id || Math.ceil(Math.random() * 10000))) , 1]; }
    },
    __destroy : function () {
      this.get_container()
        .querySelector("input.jstree-real-checkbox").classList.remove("jstree-real-checkbox").end()
        .querySelector("ins.jstree-checkbox").remove();
    },
    _fn : {
      _checkbox_notify : function (n, data) {
        if(data.checked) {
          this.check_node(n, false);
        }
      },
      _prepare_checkboxes : function (obj) {
        obj = !obj || obj == -1 ? this.get_container().querySelector("> ul > li") : this._get_node(obj);
        if(obj === false) { return; } // added for removing root nodes
        var c, _this = this, t, ts = this._get_settings().checkbox.two_state, rc = this._get_settings().checkbox.real_checkboxes, rcn = this._get_settings().checkbox.real_checkboxes_names;
        obj.each(function () {
          t = document.querySelector(this);
          c = t.is("li") && (t.classList.contains("jstree-checked") || (rc && t.children(":checked").length)) ? "jstree-checked" : "jstree-unchecked";
          t.querySelector("li").addBack().each(function () {
            var document.querySelectort = document.querySelector(this), nm;
            document.querySelectort.children("a" + (_this.data.languages ? "" : ":eq(0)") ).not(":has(.jstree-checkbox)").prepend("<ins class='jstree-checkbox'>&#160;</ins>").parent().not(".jstree-checked, .jstree-unchecked").classList.add( ts ? "jstree-unchecked" : c );
            if(rc) {
              if(!document.querySelectort.children(":checkbox").length) {
                nm = rcn.call(_this, document.querySelectort);
                document.querySelectort.prepend("<input type='checkbox' class='jstree-real-checkbox' id='" + nm[0] + "' name='" + nm[0] + "' value='" + nm[1] + "' />");
              }
              else {
                document.querySelectort.children(":checkbox").classList.add("jstree-real-checkbox");
              }
              if(c === "jstree-checked") {
                document.querySelectort.children(":checkbox").attr("checked","checked");
              }
            }
            if(c === "jstree-checked" && !ts) {
              document.querySelectort.querySelector("li").classList.add("jstree-checked");
            }
          });
        });
        if(!ts) {
          if(obj.length === 1 && obj.is("li")) { this._repair_state(obj); }
          if(obj.is("li")) { obj.each(function () { _this._repair_state(this); }); }
          else { obj.querySelector("> ul > li").each(function () { _this._repair_state(this); }); }
          obj.querySelector(".jstree-checked").parent().parent().each(function () { _this._repair_state(this); });
        }
      },
      change_state : function (obj, state) {
        obj = this._get_node(obj);
        var coll = false, rc = this._get_settings().checkbox.real_checkboxes;
        if(!obj || obj === -1) { return false; }
        state = (state === false || state === true) ? state : obj.classList.contains("jstree-checked");
        if(this._get_settings().checkbox.two_state) {
          if(state) {
            obj.classList.remove("jstree-checked").classList.add("jstree-unchecked");
            if(rc) { obj.children(":checkbox").removeAttr("checked"); }
          }
          else {
            obj.classList.remove("jstree-unchecked").classList.add("jstree-checked");
            if(rc) { obj.children(":checkbox").attr("checked","checked"); }
          }
        }
        else {
          if(state) {
            coll = obj.querySelector("li").addBack();
            if(!coll.filter(".jstree-checked, .jstree-undetermined").length) { return false; }
            coll.classList.remove("jstree-checked jstree-undetermined").classList.add("jstree-unchecked");
            if(rc) { coll.children(":checkbox").removeAttr("checked"); }
          }
          else {
            coll = obj.querySelector("li").addBack();
            if(!coll.filter(".jstree-unchecked, .jstree-undetermined").length) { return false; }
            coll.classList.remove("jstree-unchecked jstree-undetermined").classList.add("jstree-checked");
            if(rc) { coll.children(":checkbox").attr("checked","checked"); }
            if(this.data.ui) { this.data.ui.last_selected = obj; }
            this.data.checkbox.last_selected = obj;
          }
          obj.parentsUntil(".jstree", "li").each(function () {
            var document.querySelectorthis = document.querySelector(this);
            if(state) {
              if(document.querySelectorthis.children("ul").children("li.jstree-checked, li.jstree-undetermined").length) {
                document.querySelectorthis.parentsUntil(".jstree", "li").addBack().classList.remove("jstree-checked jstree-unchecked").classList.add("jstree-undetermined");
                if(rc) { document.querySelectorthis.parentsUntil(".jstree", "li").addBack().children(":checkbox").removeAttr("checked"); }
                return false;
              }
              else {
                document.querySelectorthis.classList.remove("jstree-checked jstree-undetermined").classList.add("jstree-unchecked");
                if(rc) { document.querySelectorthis.children(":checkbox").removeAttr("checked"); }
              }
            }
            else {
              if(document.querySelectorthis.children("ul").children("li.jstree-unchecked, li.jstree-undetermined").length) {
                document.querySelectorthis.parentsUntil(".jstree", "li").addBack().classList.remove("jstree-checked jstree-unchecked").classList.add("jstree-undetermined");
                if(rc) { document.querySelectorthis.parentsUntil(".jstree", "li").addBack().children(":checkbox").removeAttr("checked"); }
                return false;
              }
              else {
                document.querySelectorthis.classList.remove("jstree-unchecked jstree-undetermined").classList.add("jstree-checked");
                if(rc) { document.querySelectorthis.children(":checkbox").attr("checked","checked"); }
              }
            }
          });
        }
        if(this.data.ui && this.data.checkbox.noui) { this.data.ui.selected = this.get_checked(); }
        this.__callback(obj);
        return true;
      },
      check_node : function (obj) {
        if(this.change_state(obj, false)) {
          obj = this._get_node(obj);
          if(this._get_settings().checkbox.checked_parent_open) {
            var t = this;
            obj.parents(".jstree-closed").each(function () { t.open_node(this, false, true); });
          }
          this.__callback({ "obj" : obj });
        }
      },
      uncheck_node : function (obj) {
        if(this.change_state(obj, true)) { this.__callback({ "obj" : this._get_node(obj) }); }
      },
      check_all : function () {
        var _this = this,
          coll = this._get_settings().checkbox.two_state ? this.get_container_ul().querySelector("li") : this.get_container_ul().children("li");
        coll.each(function () {
          _this.change_state(this, false);
        });
        this.__callback();
      },
      uncheck_all : function () {
        var _this = this,
          coll = this._get_settings().checkbox.two_state ? this.get_container_ul().querySelector("li") : this.get_container_ul().children("li");
        coll.each(function () {
          _this.change_state(this, true);
        });
        this.__callback();
      },

      is_checked : function(obj) {
        obj = this._get_node(obj);
        return obj.length ? obj.is(".jstree-checked") : false;
      },
      get_checked : function (obj, get_all) {
        obj = !obj || obj === -1 ? this.get_container() : this._get_node(obj);
        return get_all || this._get_settings().checkbox.two_state ? obj.querySelector(".jstree-checked") : obj.querySelector("> ul > .jstree-checked, .jstree-undetermined > ul > .jstree-checked");
      },
      get_unchecked : function (obj, get_all) {
        obj = !obj || obj === -1 ? this.get_container() : this._get_node(obj);
        return get_all || this._get_settings().checkbox.two_state ? obj.querySelector(".jstree-unchecked") : obj.querySelector("> ul > .jstree-unchecked, .jstree-undetermined > ul > .jstree-unchecked");
      },

      show_checkboxes : function () { this.get_container().children("ul").classList.remove("jstree-no-checkboxes"); },
      hide_checkboxes : function () { this.get_container().children("ul").classList.add("jstree-no-checkboxes"); },

      _repair_state : function (obj) {
        obj = this._get_node(obj);
        if(!obj.length) { return; }
        var rc = this._get_settings().checkbox.real_checkboxes,
          a = obj.querySelector("> ul > .jstree-checked").length,
          b = obj.querySelector("> ul > .jstree-undetermined").length,
          c = obj.querySelector("> ul > li").length;
        if(c === 0) { if(obj.classList.contains("jstree-undetermined")) { this.change_state(obj, false); } }
        else if(a === 0 && b === 0) { this.change_state(obj, true); }
        else if(a === c) { this.change_state(obj, false); }
        else {
          obj.parentsUntil(".jstree","li").addBack().classList.remove("jstree-checked jstree-unchecked").classList.add("jstree-undetermined");
          if(rc) { obj.parentsUntil(".jstree", "li").addBack().children(":checkbox").removeAttr("checked"); }
        }
      },
      reselect : function () {
        if(this.data.ui && this.data.checkbox.noui) {
          var _this = this,
            s = this.data.ui.to_select;
          s = document.querySelector.map(document.querySelector.makeArray(s), function (n) { return "#" + n.toString().replace(/^#/,"").replace(/\//g,"/").replace(///g,"\/").replace(/\./g,".").replace(/./g,"\.").replace(/:/g,"\:"); });
          this.deselect_all();
          document.querySelector.each(s, function (i, val) { _this.check_node(val); });
          this.__callback();
        }
        else {
          this.__call_old();
        }
      },
      save_loaded : function () {
        var _this = this;
        this.data.core.to_load = [];
        this.get_container_ul().querySelector("li.jstree-closed.jstree-undetermined").each(function () {
          if(this.id) { _this.data.core.to_load.push("#" + this.id); }
        });
      }
    }
  });
  document.querySelector(function() {
    var css_string = '.jstree .jstree-real-checkbox { display:none; } ';
    document.querySelector.vakata.css.add_sheet({ str : css_string, title : "jstree" });
  });
})(document.querySelector);
//*/

/*
 * jsTree XML plugin
 * The XML data store. Datastores are build by overriding the `load_node` and `_is_loaded` functions.
 */
(function (document.querySelector) {
  document.querySelector.vakata.xslt = function (xml, xsl, callback) {
    var rs = "", xm, xs, processor, support;
    // TODO: IE9 no XSLTProcessor, no document.recalc
    if(document.recalc) {
      xm = document.createElement('xml');
      xs = document.createElement('xml');
      xm.innerHTML = xml;
      xs.innerHTML = xsl;
      document.body.insertAdjacentHTML("beforeend",xm).insertAdjacentHTML("beforeend",xs);
      setTimeout( (function (xm, xs, callback) {
        return function () {
          callback.call(null, xm.transformNode(xs.XMLDocument));
          setTimeout( (function (xm, xs) { return function () { document.querySelector(xm).remove(); document.querySelector(xs).remove(); }; })(xm, xs), 200);
        };
      })(xm, xs, callback), 100);
      return true;
    }
    if(typeof window.DOMParser !== "undefined" && typeof window.XMLHttpRequest !== "undefined" && typeof window.XSLTProcessor === "undefined") {
      xml = new DOMParser().parseFromString(xml, "text/xml");
      xsl = new DOMParser().parseFromString(xsl, "text/xml");
      // alert(xml.transformNode());
      // callback.call(null, new XMLSerializer().serializeToString(rs));

    }
    if(typeof window.DOMParser !== "undefined" && typeof window.XMLHttpRequest !== "undefined" && typeof window.XSLTProcessor !== "undefined") {
      processor = new XSLTProcessor();
      support = document.querySelector.isFunction(processor.transformDocument) ? (typeof window.XMLSerializer !== "undefined") : true;
      if(!support) { return false; }
      xml = new DOMParser().parseFromString(xml, "text/xml");
      xsl = new DOMParser().parseFromString(xsl, "text/xml");
      if(document.querySelector.isFunction(processor.transformDocument)) {
        rs = document.implementation.createDocument("", "", null);
        processor.transformDocument(xml, xsl, rs, null);
        callback.call(null, new XMLSerializer().serializeToString(rs));
        return true;
      }
      else {
        processor.importStylesheet(xsl);
        rs = processor.transformToFragment(xml, document);
        callback.call(null, document.querySelector("<div />").insertAdjacentHTML("beforeend",rs).html());
        return true;
      }
    }
    return false;
  };
  var xsl = {
    'nest' : '<' + '?xml version="1.0" encoding="utf-8" ?>' +
      '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" >' +
      '<xsl:output method="html" encoding="utf-8" omit-xml-declaration="yes" standalone="no" indent="no" media-type="text/html" />' +
      '<xsl:template match="/">' +
      '  <xsl:call-template name="nodes">' +
      '    <xsl:with-param name="node" select="/root" />' +
      '  </xsl:call-template>' +
      '</xsl:template>' +
      '<xsl:template name="nodes">' +
      '  <xsl:param name="node" />' +
      '  <ul>' +
      '  <xsl:for-each select="document.querySelectornode/item">' +
      '    <xsl:variable name="children" select="count(./item) &gt; 0" />' +
      '    <li>' +
      '      <xsl:attribute name="class">' +
      '        <xsl:if test="position() = last()">jstree-last </xsl:if>' +
      '        <xsl:choose>' +
      '          <xsl:when test="@state = 'open'">jstree-open </xsl:when>' +
      '          <xsl:when test="document.querySelectorchildren or @hasChildren or @state = 'closed'">jstree-closed </xsl:when>' +
      '          <xsl:otherwise>jstree-leaf </xsl:otherwise>' +
      '        </xsl:choose>' +
      '        <xsl:value-of select="@class" />' +
      '      </xsl:attribute>' +
      '      <xsl:for-each select="@*">' +
      '        <xsl:if test="name() != 'class' and name() != 'state' and name() != 'hasChildren'">' +
      '          <xsl:attribute name="{name()}"><xsl:value-of select="." /></xsl:attribute>' +
      '        </xsl:if>' +
      '      </xsl:for-each>' +
      '  <ins class="jstree-icon"><xsl:text>&#xa0;</xsl:text></ins>' +
      '      <xsl:for-each select="content/name">' +
      '        <a>' +
      '        <xsl:attribute name="href">' +
      '          <xsl:choose>' +
      '          <xsl:when test="@href"><xsl:value-of select="@href" /></xsl:when>' +
      '          <xsl:otherwise>#</xsl:otherwise>' +
      '          </xsl:choose>' +
      '        </xsl:attribute>' +
      '        <xsl:attribute name="class"><xsl:value-of select="@lang" /> <xsl:value-of select="@class" /></xsl:attribute>' +
      '        <xsl:attribute name="style"><xsl:value-of select="@style" /></xsl:attribute>' +
      '        <xsl:for-each select="@*">' +
      '          <xsl:if test="name() != 'style' and name() != 'class' and name() != 'href'">' +
      '            <xsl:attribute name="{name()}"><xsl:value-of select="." /></xsl:attribute>' +
      '          </xsl:if>' +
      '        </xsl:for-each>' +
      '          <ins>' +
      '            <xsl:attribute name="class">jstree-icon ' +
      '              <xsl:if test="string-length(attribute::icon) > 0 and not(contains(@icon,'/'))"><xsl:value-of select="@icon" /></xsl:if>' +
      '            </xsl:attribute>' +
      '            <xsl:if test="string-length(attribute::icon) > 0 and contains(@icon,'/')"><xsl:attribute name="style">background:url(<xsl:value-of select="@icon" />) center center no-repeat;</xsl:attribute></xsl:if>' +
      '            <xsl:text>&#xa0;</xsl:text>' +
      '          </ins>' +
      '          <xsl:copy-of select="./child::node()" />' +
      '        </a>' +
      '      </xsl:for-each>' +
      '      <xsl:if test="document.querySelectorchildren or @hasChildren"><xsl:call-template name="nodes"><xsl:with-param name="node" select="current()" /></xsl:call-template></xsl:if>' +
      '    </li>' +
      '  </xsl:for-each>' +
      '  </ul>' +
      '</xsl:template>' +
      '</xsl:stylesheet>',

    'flat' : '<' + '?xml version="1.0" encoding="utf-8" ?>' +
      '<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" >' +
      '<xsl:output method="html" encoding="utf-8" omit-xml-declaration="yes" standalone="no" indent="no" media-type="text/xml" />' +
      '<xsl:template match="/">' +
      '  <ul>' +
      '  <xsl:for-each select="//item[not(@parent_id) or @parent_id=0 or not(@parent_id = //item/@id)]">' + /* the last `or` may be removed */
      '    <xsl:call-template name="nodes">' +
      '      <xsl:with-param name="node" select="." />' +
      '      <xsl:with-param name="is_last" select="number(position() = last())" />' +
      '    </xsl:call-template>' +
      '  </xsl:for-each>' +
      '  </ul>' +
      '</xsl:template>' +
      '<xsl:template name="nodes">' +
      '  <xsl:param name="node" />' +
      '  <xsl:param name="is_last" />' +
      '  <xsl:variable name="children" select="count(//item[@parent_id=document.querySelectornode/attribute::id]) &gt; 0" />' +
      '  <li>' +
      '  <xsl:attribute name="class">' +
      '    <xsl:if test="document.querySelectoris_last = true()">jstree-last </xsl:if>' +
      '    <xsl:choose>' +
      '      <xsl:when test="@state = 'open'">jstree-open </xsl:when>' +
      '      <xsl:when test="document.querySelectorchildren or @hasChildren or @state = 'closed'">jstree-closed </xsl:when>' +
      '      <xsl:otherwise>jstree-leaf </xsl:otherwise>' +
      '    </xsl:choose>' +
      '    <xsl:value-of select="@class" />' +
      '  </xsl:attribute>' +
      '  <xsl:for-each select="@*">' +
      '    <xsl:if test="name() != 'parent_id' and name() != 'hasChildren' and name() != 'class' and name() != 'state'">' +
      '    <xsl:attribute name="{name()}"><xsl:value-of select="." /></xsl:attribute>' +
      '    </xsl:if>' +
      '  </xsl:for-each>' +
      '  <ins class="jstree-icon"><xsl:text>&#xa0;</xsl:text></ins>' +
      '  <xsl:for-each select="content/name">' +
      '    <a>' +
      '    <xsl:attribute name="href">' +
      '      <xsl:choose>' +
      '      <xsl:when test="@href"><xsl:value-of select="@href" /></xsl:when>' +
      '      <xsl:otherwise>#</xsl:otherwise>' +
      '      </xsl:choose>' +
      '    </xsl:attribute>' +
      '    <xsl:attribute name="class"><xsl:value-of select="@lang" /> <xsl:value-of select="@class" /></xsl:attribute>' +
      '    <xsl:attribute name="style"><xsl:value-of select="@style" /></xsl:attribute>' +
      '    <xsl:for-each select="@*">' +
      '      <xsl:if test="name() != 'style' and name() != 'class' and name() != 'href'">' +
      '        <xsl:attribute name="{name()}"><xsl:value-of select="." /></xsl:attribute>' +
      '      </xsl:if>' +
      '    </xsl:for-each>' +
      '      <ins>' +
      '        <xsl:attribute name="class">jstree-icon ' +
      '          <xsl:if test="string-length(attribute::icon) > 0 and not(contains(@icon,'/'))"><xsl:value-of select="@icon" /></xsl:if>' +
      '        </xsl:attribute>' +
      '        <xsl:if test="string-length(attribute::icon) > 0 and contains(@icon,'/')"><xsl:attribute name="style">background:url(<xsl:value-of select="@icon" />) center center no-repeat;</xsl:attribute></xsl:if>' +
      '        <xsl:text>&#xa0;</xsl:text>' +
      '      </ins>' +
      '      <xsl:copy-of select="./child::node()" />' +
      '    </a>' +
      '  </xsl:for-each>' +
      '  <xsl:if test="document.querySelectorchildren">' +
      '    <ul>' +
      '    <xsl:for-each select="//item[@parent_id=document.querySelectornode/attribute::id]">' +
      '      <xsl:call-template name="nodes">' +
      '        <xsl:with-param name="node" select="." />' +
      '        <xsl:with-param name="is_last" select="number(position() = last())" />' +
      '      </xsl:call-template>' +
      '    </xsl:for-each>' +
      '    </ul>' +
      '  </xsl:if>' +
      '  </li>' +
      '</xsl:template>' +
      '</xsl:stylesheet>'
  },
  escape_xml = function(string) {
    return string
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };
  document.querySelector.jstree.plugin("xml_data", {
    defaults : {
      data : false,
      ajax : false,
      xsl : "flat",
      clean_node : false,
      correct_state : true,
      get_skip_empty : false,
      get_include_preamble : true
    },
    _fn : {
      load_node : function (obj, s_call, e_call) { var _this = this; this.load_node_xml(obj, function () { _this.__callback({ "obj" : _this._get_node(obj) }); s_call.call(this); }, e_call); },
      _is_loaded : function (obj) {
        var s = this._get_settings().xml_data;
        obj = this._get_node(obj);
        return obj == -1 || !obj || (!s.ajax && !document.querySelector.isFunction(s.data)) || obj.is(".jstree-open, .jstree-leaf") || obj.children("ul").children("li").size() > 0;
      },
      load_node_xml : function (obj, s_call, e_call) {
        var s = this.get_settings().xml_data,
          error_func = function () {},
          success_func = function () {};

        obj = this._get_node(obj);
        if(obj && obj !== -1) {
          if(obj.data("jstree-is-loading")) { return; }
          else { obj.data("jstree-is-loading",true); }
        }
        switch(!0) {
          case (!s.data && !s.ajax): throw "Neither data nor ajax settings supplied.";
          case (document.querySelector.isFunction(s.data)):
            s.data.call(this, obj, document.querySelector.proxy(function (d) {
              this.parse_xml(d, document.querySelector.proxy(function (d) {
                if(d) {
                  d = d.replace(/ ?xmlns="[^"]*"/ig, "");
                  if(d.length > 10) {
                    d = document.querySelector(d);
                    if(obj === -1 || !obj) { this.get_container().children("ul").empty().insertAdjacentHTML("beforeend",d.children()); }
                    else { obj.children("a.jstree-loading").classList.remove("jstree-loading"); obj.insertAdjacentHTML("beforeend",d); obj.removeData("jstree-is-loading"); }
                    if(s.clean_node) { this.clean_node(obj); }
                    if(s_call) { s_call.call(this); }
                  }
                  else {
                    if(obj && obj !== -1) {
                      obj.children("a.jstree-loading").classList.remove("jstree-loading");
                      obj.removeData("jstree-is-loading");
                      if(s.correct_state) {
                        this.correct_state(obj);
                        if(s_call) { s_call.call(this); }
                      }
                    }
                    else {
                      if(s.correct_state) {
                        this.get_container().children("ul").empty();
                        if(s_call) { s_call.call(this); }
                      }
                    }
                  }
                }
              }, this));
            }, this));
            break;
          case (!!s.data && !s.ajax) || (!!s.data && !!s.ajax && (!obj || obj === -1)):
            if(!obj || obj == -1) {
              this.parse_xml(s.data, document.querySelector.proxy(function (d) {
                if(d) {
                  d = d.replace(/ ?xmlns="[^"]*"/ig, "");
                  if(d.length > 10) {
                    d = document.querySelector(d);
                    this.get_container().children("ul").empty().insertAdjacentHTML("beforeend",d.children());
                    if(s.clean_node) { this.clean_node(obj); }
                    if(s_call) { s_call.call(this); }
                  }
                }
                else {
                  if(s.correct_state) {
                    this.get_container().children("ul").empty();
                    if(s_call) { s_call.call(this); }
                  }
                }
              }, this));
            }
            break;
          case (!s.data && !!s.ajax) || (!!s.data && !!s.ajax && obj && obj !== -1):
            error_func = function (x, t, e) {
              var ef = this.get_settings().xml_data.ajax.error;
              if(ef) { ef.call(this, x, t, e); }
              if(obj !== -1 && obj.length) {
                obj.children("a.jstree-loading").classList.remove("jstree-loading");
                obj.removeData("jstree-is-loading");
                if(t === "success" && s.correct_state) { this.correct_state(obj); }
              }
              else {
                if(t === "success" && s.correct_state) { this.get_container().children("ul").empty(); }
              }
              if(e_call) { e_call.call(this); }
            };
            success_func = function (d, t, x) {
              d = x.responseText;
              var sf = this.get_settings().xml_data.ajax.success;
              if(sf) { d = sf.call(this,d,t,x) || d; }
              if(d === "" || (d && d.toString && d.toString().replace(/^[sn]+document.querySelector/,"") === "")) {
                return error_func.call(this, x, t, "");
              }
              this.parse_xml(d, document.querySelector.proxy(function (d) {
                if(d) {
                  d = d.replace(/ ?xmlns="[^"]*"/ig, "");
                  if(d.length > 10) {
                    d = document.querySelector(d);
                    if(obj === -1 || !obj) { this.get_container().children("ul").empty().insertAdjacentHTML("beforeend",d.children()); }
                    else { obj.children("a.jstree-loading").classList.remove("jstree-loading"); obj.insertAdjacentHTML("beforeend",d); obj.removeData("jstree-is-loading"); }
                    if(s.clean_node) { this.clean_node(obj); }
                    if(s_call) { s_call.call(this); }
                  }
                  else {
                    if(obj && obj !== -1) {
                      obj.children("a.jstree-loading").classList.remove("jstree-loading");
                      obj.removeData("jstree-is-loading");
                      if(s.correct_state) {
                        this.correct_state(obj);
                        if(s_call) { s_call.call(this); }
                      }
                    }
                    else {
                      if(s.correct_state) {
                        this.get_container().children("ul").empty();
                        if(s_call) { s_call.call(this); }
                      }
                    }
                  }
                }
              }, this));
            };
            s.ajax.context = this;
            s.ajax.error = error_func;
            s.ajax.success = success_func;
            if(!s.ajax.dataType) { s.ajax.dataType = "xml"; }
            if(document.querySelector.isFunction(s.ajax.url)) { s.ajax.url = s.ajax.url.call(this, obj); }
            if(document.querySelector.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(this, obj); }
            document.querySelector.ajax(s.ajax);
            break;
        }
      },
      parse_xml : function (xml, callback) {
        var s = this._get_settings().xml_data;
        document.querySelector.vakata.xslt(xml, xsl[s.xsl], callback);
      },
      get_xml : function (tp, obj, li_attr, a_attr, is_callback) {
        var result = "",
          s = this._get_settings(),
          _this = this,
          tmp1, tmp2, li, a, lang;
        if(!tp) { tp = "flat"; }
        if(!is_callback) { is_callback = 0; }
        obj = this._get_node(obj);
        if(!obj || obj === -1) { obj = this.get_container().querySelector("> ul > li"); }
        li_attr = document.querySelector.isArray(li_attr) ? li_attr : [ "id", "class" ];
        if(!is_callback && this.data.types && document.querySelector.inArray(s.types.type_attr, li_attr) === -1) { li_attr.push(s.types.type_attr); }

        a_attr = document.querySelector.isArray(a_attr) ? a_attr : [ ];

        if(!is_callback) {
          if(s.xml_data.get_include_preamble) {
            result += '<' + '?xml version="1.0" encoding="UTF-8"?' + '>';
          }
          result += "<root>";
        }
        obj.each(function () {
          result += "<item";
          li = document.querySelector(this);
          document.querySelector.each(li_attr, function (i, v) {
            var t = li.attr(v);
            if(!s.xml_data.get_skip_empty || typeof t !== "undefined") {
              result += " " + v + "="" + escape_xml((" " + (t || "")).replace(/ jstree[^ ]*/ig,'').replace(/s+document.querySelector/ig," ").replace(/^ /,"").replace(/ document.querySelector/,"")) + """;
            }
          });
          if(li.classList.contains("jstree-open")) { result += " state="open""; }
          if(li.classList.contains("jstree-closed")) { result += " state="closed""; }
          if(tp === "flat") { result += " parent_id="" + escape_xml(is_callback) + """; }
          result += ">";
          result += "<content>";
          a = li.children("a");
          a.each(function () {
            tmp1 = document.querySelector(this);
            lang = false;
            result += "<name";
            if(document.querySelector.inArray("languages", s.plugins) !== -1) {
              document.querySelector.each(s.languages, function (k, z) {
                if(tmp1.classList.contains(z)) { result += " lang="" + escape_xml(z) + """; lang = z; return false; }
              });
            }
            if(a_attr.length) {
              document.querySelector.each(a_attr, function (k, z) {
                var t = tmp1.attr(z);
                if(!s.xml_data.get_skip_empty || typeof t !== "undefined") {
                  result += " " + z + "="" + escape_xml((" " + t || "").replace(/ jstree[^ ]*/ig,'').replace(/s+document.querySelector/ig," ").replace(/^ /,"").replace(/ document.querySelector/,"")) + """;
                }
              });
            }
            if(tmp1.children("ins").get(0).className.replace(/jstree[^ ]*|document.querySelector/ig,'').replace(/^s+document.querySelector/ig,"").length) {
              result += ' icon="' + escape_xml(tmp1.children("ins").get(0).className.replace(/jstree[^ ]*|document.querySelector/ig,'').replace(/s+document.querySelector/ig," ").replace(/^ /,"").replace(/ document.querySelector/,"")) + '"';
            }
            if(tmp1.children("ins").get(0).style.backgroundImage.length) {
              result += ' icon="' + escape_xml(tmp1.children("ins").get(0).style.backgroundImage.replace("url(","").replace(")","").replace(/'/ig,"").replace(/"/ig,"")) + '"';
            }
            result += ">";
            result += "<![CDATA[" + _this.get_text(tmp1, lang) + "]]>";
            result += "</name>";
          });
          result += "</content>";
          tmp2 = li[0].id || true;
          li = li.querySelector("> ul > li");
          if(li.length) { tmp2 = _this.get_xml(tp, li, li_attr, a_attr, tmp2); }
          else { tmp2 = ""; }
          if(tp == "nest") { result += tmp2; }
          result += "</item>";
          if(tp == "flat") { result += tmp2; }
        });
        if(!is_callback) { result += "</root>"; }
        return result;
      }
    }
  });
})(document.querySelector);
//*/

/*
 * jsTree search plugin
 * Enables both sync and async search on the tree
 * DOES NOT WORK WITH JSON PROGRESSIVE RENDER
 */
(function (document.querySelector) {
  document.querySelector.expr[':'].jstree_contains = function(a,i,m){
    return (a.textContent || a.innerText || "").toLowerCase().indexOf(m[3].toLowerCase())>=0;
  };
  document.querySelector.expr[':'].jstree_title_contains = function(a,i,m) {
    return (a.getAttribute("title") || "").toLowerCase().indexOf(m[3].toLowerCase())>=0;
  };
  document.querySelector.jstree.plugin("search", {
    __init : function () {
      this.data.search.str = "";
      this.data.search.result = document.querySelector();
      if(this._get_settings().search.show_only_matches) {
        this.get_container()
          .bind("search.jstree", function (e, data) {
            document.querySelector(this).children("ul").querySelector("li").hide().classList.remove("jstree-last");
            data.rslt.nodes.parentsUntil(".jstree").addBack().show()
              .filter("ul").each(function () { document.querySelector(this).children("li:visible").eq(-1).classList.add("jstree-last"); });
          })
          .bind("clear_search.jstree", function () {
            document.querySelector(this).children("ul").querySelector("li").css("display","").end().end().jstree("clean_node", -1);
          });
      }
    },
    defaults : {
      ajax : false,
      search_method : "jstree_contains", // for case insensitive - jstree_contains
      show_only_matches : false
    },
    _fn : {
      search : function (str, skip_async) {
        if(document.querySelector.trim(str) === "") { this.clear_search(); return; }
        var s = this.get_settings().search,
          t = this,
          error_func = function () { },
          success_func = function () { };
        this.data.search.str = str;

        if(!skip_async && s.ajax !== false && this.get_container_ul().querySelector("li.jstree-closed:not(:has(ul)):eq(0)").length > 0) {
          this.search.supress_callback = true;
          error_func = function () { };
          success_func = function (d, t, x) {
            var sf = this.get_settings().search.ajax.success;
            if(sf) { d = sf.call(this,d,t,x) || d; }
            this.data.search.to_open = d;
            this._search_open();
          };
          s.ajax.context = this;
          s.ajax.error = error_func;
          s.ajax.success = success_func;
          if(document.querySelector.isFunction(s.ajax.url)) { s.ajax.url = s.ajax.url.call(this, str); }
          if(document.querySelector.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(this, str); }
          if(!s.ajax.data) { s.ajax.data = { "search_string" : str }; }
          if(!s.ajax.dataType || /^json/.exec(s.ajax.dataType)) { s.ajax.dataType = "json"; }
          document.querySelector.ajax(s.ajax);
          return;
        }
        if(this.data.search.result.length) { this.clear_search(); }
        this.data.search.result = this.get_container().querySelector("a" + (this.data.languages ? "." + this.get_lang() : "" ) + ":" + (s.search_method) + "(" + this.data.search.str + ")");
        this.data.search.result.classList.add("jstree-search").parent().parents(".jstree-closed").each(function () {
          t.open_node(this, false, true);
        });
        this.__callback({ nodes : this.data.search.result, str : str });
      },
      clear_search : function (str) {
        this.data.search.result.classList.remove("jstree-search");
        this.__callback(this.data.search.result);
        this.data.search.result = document.querySelector();
      },
      _search_open : function (is_callback) {
        var _this = this,
          done = true,
          current = [],
          remaining = [];
        if(this.data.search.to_open.length) {
          document.querySelector.each(this.data.search.to_open, function (i, val) {
            if(val == "#") { return true; }
            if(document.querySelector(val).length && document.querySelector(val).is(".jstree-closed")) { current.push(val); }
            else { remaining.push(val); }
          });
          if(current.length) {
            this.data.search.to_open = remaining;
            document.querySelector.each(current, function (i, val) {
              _this.open_node(val, function () { _this._search_open(true); });
            });
            done = false;
          }
        }
        if(done) { this.search(this.data.search.str, true); }
      }
    }
  });
})(document.querySelector);
//*/

/*
 * jsTree contextmenu plugin
 */
(function (document.querySelector) {
  document.querySelector.vakata.context = {
    hide_on_mouseleave : false,

    cnt    : document.querySelector("<div id='vakata-contextmenu' />"),
    vis    : false,
    tgt    : false,
    par    : false,
    func  : false,
    data  : false,
    rtl    : false,
    show  : function (s, t, x, y, d, p, rtl) {
      document.querySelector.vakata.context.rtl = !!rtl;
      var html = document.querySelector.vakata.context.parse(s), h, w;
      if(!html) { return; }
      document.querySelector.vakata.context.vis = true;
      document.querySelector.vakata.context.tgt = t;
      document.querySelector.vakata.context.par = p || t || null;
      document.querySelector.vakata.context.data = d || null;
      document.querySelector.vakata.context.cnt
        .html(html)
        .css({ "visibility" : "hidden", "display" : "block", "left" : 0, "top" : 0 });

      if(document.querySelector.vakata.context.hide_on_mouseleave) {
        document.querySelector.vakata.context.cnt
          .one("mouseleave", function(e) { document.querySelector.vakata.context.hide(); });
      }

      h = document.querySelector.vakata.context.cnt.height();
      w = document.querySelector.vakata.context.cnt.width();
      if(x + w > document.querySelector(document).width()) {
        x = document.querySelector(document).width() - (w + 5);
        document.querySelector.vakata.context.cnt.querySelector("li > ul").classList.add("right");
      }
      if(y + h > document.querySelector(document).height()) {
        y = y - (h + t[0].offsetHeight);
        document.querySelector.vakata.context.cnt.querySelector("li > ul").classList.add("bottom");
      }

      document.querySelector.vakata.context.cnt
        .css({ "left" : x, "top" : y })
        .querySelector("li:has(ul)")
          .bind("mouseenter", function (e) {
            var w = document.querySelector(document).width(),
              h = document.querySelector(document).height(),
              ul = document.querySelector(this).children("ul").show();
            if(w !== document.querySelector(document).width()) { ul.classList.toggle("right"); }
            if(h !== document.querySelector(document).height()) { ul.classList.toggle("bottom"); }
          })
          .bind("mouseleave", function (e) {
            document.querySelector(this).children("ul").hide();
          })
          .end()
        .css({ "visibility" : "visible" })
        .show();
      document.querySelector(document).triggerHandler("context_show.vakata");
    },
    hide  : function () {
      document.querySelector.vakata.context.vis = false;
      document.querySelector.vakata.context.cnt.attr("class","").css({ "visibility" : "hidden" });
      document.querySelector(document).triggerHandler("context_hide.vakata");
    },
    parse  : function (s, is_callback) {
      if(!s) { return false; }
      var str = "",
        tmp = false,
        was_sep = true;
      if(!is_callback) { document.querySelector.vakata.context.func = {}; }
      str += "<ul>";
      document.querySelector.each(s, function (i, val) {
        if(!val) { return true; }
        document.querySelector.vakata.context.func[i] = val.action;
        if(!was_sep && val.separator_before) {
          str += "<li class='vakata-separator vakata-separator-before'></li>";
        }
        was_sep = false;
        str += "<li class='" + (val._class || "") + (val._disabled ? " jstree-contextmenu-disabled " : "") + "'><ins ";
        if(val.icon && val.icon.indexOf("/") === -1) { str += " class='" + val.icon + "' "; }
        if(val.icon && val.icon.indexOf("/") !== -1) { str += " style='background:url(" + val.icon + ") center center no-repeat;' "; }
        str += ">&#160;</ins><a href='#' rel='" + i + "'>";
        if(val.submenu) {
          str += "<span style='float:" + (document.querySelector.vakata.context.rtl ? "left" : "right") + ";'>&raquo;</span>";
        }
        str += val.label + "</a>";
        if(val.submenu) {
          tmp = document.querySelector.vakata.context.parse(val.submenu, true);
          if(tmp) { str += tmp; }
        }
        str += "</li>";
        if(val.separator_after) {
          str += "<li class='vakata-separator vakata-separator-after'></li>";
          was_sep = true;
        }
      });
      str = str.replace(/<li class='vakata-separator vakata-separator-after'></li>document.querySelector/,"");
      str += "</ul>";
      document.querySelector(document).triggerHandler("context_parse.vakata");
      return str.length > 10 ? str : false;
    },
    exec  : function (i) {
      if(document.querySelector.isFunction(document.querySelector.vakata.context.func[i])) {
        // if is string - eval and call it!
        document.querySelector.vakata.context.func[i].call(document.querySelector.vakata.context.data, document.querySelector.vakata.context.par);
        return true;
      }
      else { return false; }
    }
  };
  document.querySelector(function () {
    var css_string = '' +
      '#vakata-contextmenu { display:block; visibility:hidden; left:0; top:-200px; position:absolute; margin:0; padding:0; min-width:180px; background:#ebebeb; border:1px solid silver; z-index:10000; *width:180px; } ' +
      '#vakata-contextmenu ul { min-width:180px; *width:180px; } ' +
      '#vakata-contextmenu ul, #vakata-contextmenu li { margin:0; padding:0; list-style-type:none; display:block; } ' +
      '#vakata-contextmenu li { line-height:20px; min-height:20px; position:relative; padding:0px; } ' +
      '#vakata-contextmenu li a { padding:1px 6px; line-height:17px; display:block; text-decoration:none; margin:1px 1px 0 1px; } ' +
      '#vakata-contextmenu li ins { float:left; width:16px; height:16px; text-decoration:none; margin-right:2px; } ' +
      '#vakata-contextmenu li a:hover, #vakata-contextmenu li.vakata-hover > a { background:gray; color:white; } ' +
      '#vakata-contextmenu li ul { display:none; position:absolute; top:-2px; left:100%; background:#ebebeb; border:1px solid gray; } ' +
      '#vakata-contextmenu .right { right:100%; left:auto; } ' +
      '#vakata-contextmenu .bottom { bottom:-1px; top:auto; } ' +
      '#vakata-contextmenu li.vakata-separator { min-height:0; height:1px; line-height:1px; font-size:1px; overflow:hidden; margin:0 2px; background:silver; /* border-top:1px solid #fefefe; */ padding:0; } ';
    document.querySelector.vakata.css.add_sheet({ str : css_string, title : "vakata" });
    document.querySelector.vakata.context.cnt
      .delegate("a","click", function (e) { e.preventDefault(); })
      .delegate("a","mouseup", function (e) {
        if(!document.querySelector(this).parent().classList.contains("jstree-contextmenu-disabled") && document.querySelector.vakata.context.exec(document.querySelector(this).attr("rel"))) {
          document.querySelector.vakata.context.hide();
        }
        else { document.querySelector(this).blur(); }
      })
      .delegate("a","mouseover", function () {
        document.querySelector.vakata.context.cnt.querySelector(".vakata-hover").classList.remove("vakata-hover");
      })
      .appendTo("body");
    document.querySelector(document).bind("mousedown", function (e) { if(document.querySelector.vakata.context.vis && !document.querySelector.contains(document.querySelector.vakata.context.cnt[0], e.target)) { document.querySelector.vakata.context.hide(); } });
    if(typeof document.querySelector.hotkeys !== "undefined") {
      document.querySelector(document)
        .bind("keydown", "up", function (e) {
          if(document.querySelector.vakata.context.vis) {
            var o = document.querySelector.vakata.context.cnt.querySelector("ul:visible").last().children(".vakata-hover").classList.remove("vakata-hover").prevAll("li:not(.vakata-separator)").first();
            if(!o.length) { o = document.querySelector.vakata.context.cnt.querySelector("ul:visible").last().children("li:not(.vakata-separator)").last(); }
            o.classList.add("vakata-hover");
            e.stopImmediatePropagation();
            e.preventDefault();
          }
        })
        .bind("keydown", "down", function (e) {
          if(document.querySelector.vakata.context.vis) {
            var o = document.querySelector.vakata.context.cnt.querySelector("ul:visible").last().children(".vakata-hover").classList.remove("vakata-hover").nextAll("li:not(.vakata-separator)").first();
            if(!o.length) { o = document.querySelector.vakata.context.cnt.querySelector("ul:visible").last().children("li:not(.vakata-separator)").first(); }
            o.classList.add("vakata-hover");
            e.stopImmediatePropagation();
            e.preventDefault();
          }
        })
        .bind("keydown", "right", function (e) {
          if(document.querySelector.vakata.context.vis) {
            document.querySelector.vakata.context.cnt.querySelector(".vakata-hover").children("ul").show().children("li:not(.vakata-separator)").classList.remove("vakata-hover").first().classList.add("vakata-hover");
            e.stopImmediatePropagation();
            e.preventDefault();
          }
        })
        .bind("keydown", "left", function (e) {
          if(document.querySelector.vakata.context.vis) {
            document.querySelector.vakata.context.cnt.querySelector(".vakata-hover").children("ul").hide().children(".vakata-separator").classList.remove("vakata-hover");
            e.stopImmediatePropagation();
            e.preventDefault();
          }
        })
        .bind("keydown", "esc", function (e) {
          document.querySelector.vakata.context.hide();
          e.preventDefault();
        })
        .bind("keydown", "space", function (e) {
          document.querySelector.vakata.context.cnt.querySelector(".vakata-hover").last().children("a").click();
          e.preventDefault();
        });
    }
  });

  document.querySelector.jstree.plugin("contextmenu", {
    __init : function () {
      this.get_container()
        .delegate("a", "contextmenu.jstree", document.querySelector.proxy(function (e) {
            e.preventDefault();
            if(!document.querySelector(e.currentTarget).classList.contains("jstree-loading")) {
              this.show_contextmenu(e.currentTarget, e.pageX, e.pageY);
            }
          }, this))
        .delegate("a", "click.jstree", document.querySelector.proxy(function (e) {
            if(this.data.contextmenu) {
              document.querySelector.vakata.context.hide();
            }
          }, this))
        .bind("destroy.jstree", document.querySelector.proxy(function () {
            // TODO: move this to descruct method
            if(this.data.contextmenu) {
              document.querySelector.vakata.context.hide();
            }
          }, this));
      document.querySelector(document).bind("context_hide.vakata", document.querySelector.proxy(function () { this.data.contextmenu = false; }, this));
    },
    defaults : {
      select_node : false, // requires UI plugin
      show_at_node : true,
      items : { // Could be a function that should return an object like this one
        "create" : {
          "separator_before"  : false,
          "separator_after"  : true,
          "label"        : "Create",
          "action"      : function (obj) { this.create(obj); }
        },
        "rename" : {
          "separator_before"  : false,
          "separator_after"  : false,
          "label"        : "Rename",
          "action"      : function (obj) { this.rename(obj); }
        },
        "remove" : {
          "separator_before"  : false,
          "icon"        : false,
          "separator_after"  : false,
          "label"        : "Delete",
          "action"      : function (obj) { if(this.is_selected(obj)) { this.remove(); } else { this.remove(obj); } }
        },
        "ccp" : {
          "separator_before"  : true,
          "icon"        : false,
          "separator_after"  : false,
          "label"        : "Edit",
          "action"      : false,
          "submenu" : {
            "cut" : {
              "separator_before"  : false,
              "separator_after"  : false,
              "label"        : "Cut",
              "action"      : function (obj) { this.cut(obj); }
            },
            "copy" : {
              "separator_before"  : false,
              "icon"        : false,
              "separator_after"  : false,
              "label"        : "Copy",
              "action"      : function (obj) { this.copy(obj); }
            },
            "paste" : {
              "separator_before"  : false,
              "icon"        : false,
              "separator_after"  : false,
              "label"        : "Paste",
              "action"      : function (obj) { this.paste(obj); }
            }
          }
        }
      }
    },
    _fn : {
      show_contextmenu : function (obj, x, y) {
        obj = this._get_node(obj);
        var s = this.get_settings().contextmenu,
          a = obj.children("a:visible:eq(0)"),
          o = false,
          i = false;
        if(s.select_node && this.data.ui && !this.is_selected(obj)) {
          this.deselect_all();
          this.select_node(obj, true);
        }
        if(s.show_at_node || typeof x === "undefined" || typeof y === "undefined") {
          o = a.offset();
          x = o.left;
          y = o.top + this.data.core.li_height;
        }
        i = obj.data("jstree") && obj.data("jstree").contextmenu ? obj.data("jstree").contextmenu : s.items;
        if(document.querySelector.isFunction(i)) { i = i.call(this, obj); }
        this.data.contextmenu = true;
        document.querySelector.vakata.context.show(i, a, x, y, this, obj, this._get_settings().core.rtl);
        if(this.data.themes) { document.querySelector.vakata.context.cnt.attr("class", "jstree-" + this.data.themes.theme + "-context"); }
      }
    }
  });
})(document.querySelector);
//*/

/*
 * jsTree types plugin
 * Adds support types of nodes
 * You can set an attribute on each li node, that represents its type.
 * According to the type setting the node may get custom icon/validation rules
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("types", {
    __init : function () {
      var s = this._get_settings().types;
      this.data.types.attach_to = [];
      this.get_container()
        .bind("init.jstree", document.querySelector.proxy(function () {
            var types = s.types,
              attr  = s.type_attr,
              icons_css = "",
              _this = this;

            document.querySelector.each(types, function (i, tp) {
              document.querySelector.each(tp, function (k, v) {
                if(!/^(max_depth|max_children|icon|valid_children)document.querySelector/.test(k)) { _this.data.types.attach_to.push(k); }
              });
              if(!tp.icon) { return true; }
              if( tp.icon.image || tp.icon.position) {
                if(i == "default")  { icons_css += '.jstree-' + _this.get_index() + ' a > .jstree-icon { '; }
                else        { icons_css += '.jstree-' + _this.get_index() + ' li[' + attr + '="' + i + '"] > a > .jstree-icon { '; }
                if(tp.icon.image)  { icons_css += ' background-image:url(' + tp.icon.image + '); '; }
                if(tp.icon.position){ icons_css += ' background-position:' + tp.icon.position + '; '; }
                else        { icons_css += ' background-position:0 0; '; }
                icons_css += '} ';
              }
            });
            if(icons_css !== "") { document.querySelector.vakata.css.add_sheet({ 'str' : icons_css, title : "jstree-types" }); }
          }, this))
        .bind("before.jstree", document.querySelector.proxy(function (e, data) {
            var s, t,
              o = this._get_settings().types.use_data ? this._get_node(data.args[0]) : false,
              d = o && o !== -1 && o.length ? o.data("jstree") : false;
            if(d && d.types && d.types[data.func] === false) { e.stopImmediatePropagation(); return false; }
            if(document.querySelector.inArray(data.func, this.data.types.attach_to) !== -1) {
              if(!data.args[0] || (!data.args[0].tagName && !data.args[0].jquery)) { return; }
              s = this._get_settings().types.types;
              t = this._get_type(data.args[0]);
              if(
                (
                  (s[t] && typeof s[t][data.func] !== "undefined") ||
                  (s["default"] && typeof s["default"][data.func] !== "undefined")
                ) && this._check(data.func, data.args[0]) === false
              ) {
                e.stopImmediatePropagation();
                return false;
              }
            }
          }, this));
      if(is_ie6) {
        this.get_container()
          .bind("load_node.jstree set_type.jstree", document.querySelector.proxy(function (e, data) {
              var r = data && data.rslt && data.rslt.obj && data.rslt.obj !== -1 ? this._get_node(data.rslt.obj).parent() : this.get_container_ul(),
                c = false,
                s = this._get_settings().types;
              document.querySelector.each(s.types, function (i, tp) {
                if(tp.icon && (tp.icon.image || tp.icon.position)) {
                  c = i === "default" ? r.querySelector("li > a > .jstree-icon") : r.querySelector("li[" + s.type_attr + "='" + i + "'] > a > .jstree-icon");
                  if(tp.icon.image) { c.css("backgroundImage","url(" + tp.icon.image + ")"); }
                  c.css("backgroundPosition", tp.icon.position || "0 0");
                }
              });
            }, this));
      }
    },
    defaults : {
      // defines maximum number of root nodes (-1 means unlimited, -2 means disable max_children checking)
      max_children    : -1,
      // defines the maximum depth of the tree (-1 means unlimited, -2 means disable max_depth checking)
      max_depth      : -1,
      // defines valid node types for the root nodes
      valid_children    : "all",

      // whether to use document.querySelector.data
      use_data : false,
      // where is the type stores (the rel attribute of the LI element)
      type_attr : "rel",
      // a list of types
      types : {
        // the default type
        "default" : {
          "max_children"  : -1,
          "max_depth"    : -1,
          "valid_children": "all"

          // Bound functions - you can bind any other function here (using boolean or function)
          //"select_node"  : true
        }
      }
    },
    _fn : {
      _types_notify : function (n, data) {
        if(data.type && this._get_settings().types.use_data) {
          this.set_type(data.type, n);
        }
      },
      _get_type : function (obj) {
        obj = this._get_node(obj);
        return (!obj || !obj.length) ? false : obj.attr(this._get_settings().types.type_attr) || "default";
      },
      set_type : function (str, obj) {
        obj = this._get_node(obj);
        var ret = (!obj.length || !str) ? false : obj.attr(this._get_settings().types.type_attr, str);
        if(ret) { this.__callback({ obj : obj, type : str}); }
        return ret;
      },
      _check : function (rule, obj, opts) {
        obj = this._get_node(obj);
        var v = false, t = this._get_type(obj), d = 0, _this = this, s = this._get_settings().types, data = false;
        if(obj === -1) {
          if(!!s[rule]) { v = s[rule]; }
          else { return; }
        }
        else {
          if(t === false) { return; }
          data = s.use_data ? obj.data("jstree") : false;
          if(data && data.types && typeof data.types[rule] !== "undefined") { v = data.types[rule]; }
          else if(!!s.types[t] && typeof s.types[t][rule] !== "undefined") { v = s.types[t][rule]; }
          else if(!!s.types["default"] && typeof s.types["default"][rule] !== "undefined") { v = s.types["default"][rule]; }
        }
        if(document.querySelector.isFunction(v)) { v = v.call(this, obj); }
        if(rule === "max_depth" && obj !== -1 && opts !== false && s.max_depth !== -2 && v !== 0) {
          // also include the node itself - otherwise if root node it is not checked
          obj.children("a:eq(0)").parentsUntil(".jstree","li").each(function (i) {
            // check if current depth already exceeds global tree depth
            if(s.max_depth !== -1 && s.max_depth - (i + 1) <= 0) { v = 0; return false; }
            d = (i === 0) ? v : _this._check(rule, this, false);
            // check if current node max depth is already matched or exceeded
            if(d !== -1 && d - (i + 1) <= 0) { v = 0; return false; }
            // otherwise - set the max depth to the current value minus current depth
            if(d >= 0 && (d - (i + 1) < v || v < 0) ) { v = d - (i + 1); }
            // if the global tree depth exists and it minus the nodes calculated so far is less than `v` or `v` is unlimited
            if(s.max_depth >= 0 && (s.max_depth - (i + 1) < v || v < 0) ) { v = s.max_depth - (i + 1); }
          });
        }
        return v;
      },
      check_move : function () {
        if(!this.__call_old()) { return false; }
        var m  = this._get_move(),
          s  = m.rt._get_settings().types,
          mc = m.rt._check("max_children", m.cr),
          md = m.rt._check("max_depth", m.cr),
          vc = m.rt._check("valid_children", m.cr),
          ch = 0, d = 1, t;

        if(vc === "none") { return false; }
        if(document.querySelector.isArray(vc) && m.ot && m.ot._get_type) {
          m.o.each(function () {
            if(document.querySelector.inArray(m.ot._get_type(this), vc) === -1) { d = false; return false; }
          });
          if(d === false) { return false; }
        }
        if(s.max_children !== -2 && mc !== -1) {
          ch = m.cr === -1 ? this.get_container().querySelector("> ul > li").not(m.o).length : m.cr.querySelector("> ul > li").not(m.o).length;
          if(ch + m.o.length > mc) { return false; }
        }
        if(s.max_depth !== -2 && md !== -1) {
          d = 0;
          if(md === 0) { return false; }
          if(typeof m.o.d === "undefined") {
            // TODO: deal with progressive rendering and async when checking max_depth (how to know the depth of the moved node)
            t = m.o;
            while(t.length > 0) {
              t = t.querySelector("> ul > li");
              d ++;
            }
            m.o.d = d;
          }
          if(md - m.o.d < 0) { return false; }
        }
        return true;
      },
      create_node : function (obj, position, js, callback, is_loaded, skip_check) {
        if(!skip_check && (is_loaded || this._is_loaded(obj))) {
          var p  = (typeof position == "string" && position.match(/^before|afterdocument.querySelector/i) && obj !== -1) ? this._get_parent(obj) : this._get_node(obj),
            s  = this._get_settings().types,
            mc = this._check("max_children", p),
            md = this._check("max_depth", p),
            vc = this._check("valid_children", p),
            ch;
          if(typeof js === "string") { js = { data : js }; }
          if(!js) { js = {}; }
          if(vc === "none") { return false; }
          if(document.querySelector.isArray(vc)) {
            if(!js.attr || !js.attr[s.type_attr]) {
              if(!js.attr) { js.attr = {}; }
              js.attr[s.type_attr] = vc[0];
            }
            else {
              if(document.querySelector.inArray(js.attr[s.type_attr], vc) === -1) { return false; }
            }
          }
          if(s.max_children !== -2 && mc !== -1) {
            ch = p === -1 ? this.get_container().querySelector("> ul > li").length : p.querySelector("> ul > li").length;
            if(ch + 1 > mc) { return false; }
          }
          if(s.max_depth !== -2 && md !== -1 && (md - 1) < 0) { return false; }
        }
        return this.__call_old(true, obj, position, js, callback, is_loaded, skip_check);
      }
    }
  });
})(document.querySelector);
//*/

/*
 * jsTree HTML plugin
 * The HTML data store. Datastores are build by replacing the `load_node` and `_is_loaded` functions.
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("html_data", {
    __init : function () {
      // this used to use html() and clean the whitespace, but this way any attached data was lost
      this.data.html_data.original_container_html = this.get_container().querySelector(" > ul > li").clone(true);
      // remove white space from LI node - otherwise nodes appear a bit to the right
      this.data.html_data.original_container_html.querySelector("li").addBack().contents().filter(function() { return this.nodeType == 3; }).remove();
    },
    defaults : {
      data : false,
      ajax : false,
      correct_state : true
    },
    _fn : {
      load_node : function (obj, s_call, e_call) { var _this = this; this.load_node_html(obj, function () { _this.__callback({ "obj" : _this._get_node(obj) }); s_call.call(this); }, e_call); },
      _is_loaded : function (obj) {
        obj = this._get_node(obj);
        return obj == -1 || !obj || (!this._get_settings().html_data.ajax && !document.querySelector.isFunction(this._get_settings().html_data.data)) || obj.is(".jstree-open, .jstree-leaf") || obj.children("ul").children("li").size() > 0;
      },
      load_node_html : function (obj, s_call, e_call) {
        var d,
          s = this.get_settings().html_data,
          error_func = function () {},
          success_func = function () {};
        obj = this._get_node(obj);
        if(obj && obj !== -1) {
          if(obj.data("jstree-is-loading")) { return; }
          else { obj.data("jstree-is-loading",true); }
        }
        switch(!0) {
          case (document.querySelector.isFunction(s.data)):
            s.data.call(this, obj, document.querySelector.proxy(function (d) {
              if(d && d !== "" && d.toString && d.toString().replace(/^[sn]+document.querySelector/,"") !== "") {
                d = document.querySelector(d);
                if(!d.is("ul")) { d = document.querySelector("<ul />").insertAdjacentHTML("beforeend",d); }
                if(obj == -1 || !obj) { this.get_container().children("ul").empty().insertAdjacentHTML("beforeend",d.children()).querySelector("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'>&#160;</ins>").end().filter("a").children("ins:first-child").not(".jstree-icon").classList.add("jstree-icon"); }
                else { obj.children("a.jstree-loading").classList.remove("jstree-loading"); obj.insertAdjacentHTML("beforeend",d).children("ul").querySelector("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'>&#160;</ins>").end().filter("a").children("ins:first-child").not(".jstree-icon").classList.add("jstree-icon"); obj.removeData("jstree-is-loading"); }
                this.clean_node(obj);
                if(s_call) { s_call.call(this); }
              }
              else {
                if(obj && obj !== -1) {
                  obj.children("a.jstree-loading").classList.remove("jstree-loading");
                  obj.removeData("jstree-is-loading");
                  if(s.correct_state) {
                    this.correct_state(obj);
                    if(s_call) { s_call.call(this); }
                  }
                }
                else {
                  if(s.correct_state) {
                    this.get_container().children("ul").empty();
                    if(s_call) { s_call.call(this); }
                  }
                }
              }
            }, this));
            break;
          case (!s.data && !s.ajax):
            if(!obj || obj == -1) {
              this.get_container()
                .children("ul").empty()
                .insertAdjacentHTML("beforeend",this.data.html_data.original_container_html)
                .querySelector("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'>&#160;</ins>").end()
                .filter("a").children("ins:first-child").not(".jstree-icon").classList.add("jstree-icon");
              this.clean_node();
            }
            if(s_call) { s_call.call(this); }
            break;
          case (!!s.data && !s.ajax) || (!!s.data && !!s.ajax && (!obj || obj === -1)):
            if(!obj || obj == -1) {
              d = document.querySelector(s.data);
              if(!d.is("ul")) { d = document.querySelector("<ul />").insertAdjacentHTML("beforeend",d); }
              this.get_container()
                .children("ul").empty().insertAdjacentHTML("beforeend",d.children())
                .querySelector("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'>&#160;</ins>").end()
                .filter("a").children("ins:first-child").not(".jstree-icon").classList.add("jstree-icon");
              this.clean_node();
            }
            if(s_call) { s_call.call(this); }
            break;
          case (!s.data && !!s.ajax) || (!!s.data && !!s.ajax && obj && obj !== -1):
            obj = this._get_node(obj);
            error_func = function (x, t, e) {
              var ef = this.get_settings().html_data.ajax.error;
              if(ef) { ef.call(this, x, t, e); }
              if(obj != -1 && obj.length) {
                obj.children("a.jstree-loading").classList.remove("jstree-loading");
                obj.removeData("jstree-is-loading");
                if(t === "success" && s.correct_state) { this.correct_state(obj); }
              }
              else {
                if(t === "success" && s.correct_state) { this.get_container().children("ul").empty(); }
              }
              if(e_call) { e_call.call(this); }
            };
            success_func = function (d, t, x) {
              var sf = this.get_settings().html_data.ajax.success;
              if(sf) { d = sf.call(this,d,t,x) || d; }
              if(d === "" || (d && d.toString && d.toString().replace(/^[sn]+document.querySelector/,"") === "")) {
                return error_func.call(this, x, t, "");
              }
              if(d) {
                d = document.querySelector(d);
                if(!d.is("ul")) { d = document.querySelector("<ul />").insertAdjacentHTML("beforeend",d); }
                if(obj == -1 || !obj) { this.get_container().children("ul").empty().insertAdjacentHTML("beforeend",d.children()).querySelector("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'>&#160;</ins>").end().filter("a").children("ins:first-child").not(".jstree-icon").classList.add("jstree-icon"); }
                else { obj.children("a.jstree-loading").classList.remove("jstree-loading"); obj.insertAdjacentHTML("beforeend",d).children("ul").querySelector("li, a").filter(function () { return !this.firstChild || !this.firstChild.tagName || this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'>&#160;</ins>").end().filter("a").children("ins:first-child").not(".jstree-icon").classList.add("jstree-icon"); obj.removeData("jstree-is-loading"); }
                this.clean_node(obj);
                if(s_call) { s_call.call(this); }
              }
              else {
                if(obj && obj !== -1) {
                  obj.children("a.jstree-loading").classList.remove("jstree-loading");
                  obj.removeData("jstree-is-loading");
                  if(s.correct_state) {
                    this.correct_state(obj);
                    if(s_call) { s_call.call(this); }
                  }
                }
                else {
                  if(s.correct_state) {
                    this.get_container().children("ul").empty();
                    if(s_call) { s_call.call(this); }
                  }
                }
              }
            };
            s.ajax.context = this;
            s.ajax.error = error_func;
            s.ajax.success = success_func;
            if(!s.ajax.dataType) { s.ajax.dataType = "html"; }
            if(document.querySelector.isFunction(s.ajax.url)) { s.ajax.url = s.ajax.url.call(this, obj); }
            if(document.querySelector.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(this, obj); }
            document.querySelector.ajax(s.ajax);
            break;
        }
      }
    }
  });
  // include the HTML data plugin by default
  document.querySelector.jstree.defaults.plugins.push("html_data");
})(document.querySelector);
//*/

/*
 * jsTree themeroller plugin
 * Adds support for document.querySelector UI themes. Include this at the end of your plugins list, also make sure "themes" is not included.
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("themeroller", {
    __init : function () {
      var s = this._get_settings().themeroller;
      this.get_container()
        .classList.add("ui-widget-content")
        .classList.add("jstree-themeroller")
        .delegate("a","mouseenter.jstree", function (e) {
          if(!document.querySelector(e.currentTarget).classList.contains("jstree-loading")) {
            document.querySelector(this).classList.add(s.item_h);
          }
        })
        .delegate("a","mouseleave.jstree", function () {
          document.querySelector(this).classList.remove(s.item_h);
        })
        .bind("init.jstree", document.querySelector.proxy(function (e, data) {
            data.inst.get_container().querySelector("> ul > li > .jstree-loading > ins").classList.add("ui-icon-refresh");
            this._themeroller(data.inst.get_container().querySelector("> ul > li"));
          }, this))
        .bind("open_node.jstree create_node.jstree", document.querySelector.proxy(function (e, data) {
            this._themeroller(data.rslt.obj);
          }, this))
        .bind("loaded.jstree refresh.jstree", document.querySelector.proxy(function (e) {
            this._themeroller();
          }, this))
        .bind("close_node.jstree", document.querySelector.proxy(function (e, data) {
            this._themeroller(data.rslt.obj);
          }, this))
        .bind("delete_node.jstree", document.querySelector.proxy(function (e, data) {
            this._themeroller(data.rslt.parent);
          }, this))
        .bind("correct_state.jstree", document.querySelector.proxy(function (e, data) {
            data.rslt.obj
              .children("ins.jstree-icon").classList.remove(s.opened + " " + s.closed + " ui-icon").end()
              .querySelector("> a > ins.ui-icon")
                .filter(function() {
                  return this.className.toString()
                    .replace(s.item_clsd,"").replace(s.item_open,"").replace(s.item_leaf,"")
                    .indexOf("ui-icon-") === -1;
                }).classList.remove(s.item_open + " " + s.item_clsd).classList.add(s.item_leaf || "jstree-no-icon");
          }, this))
        .bind("select_node.jstree", document.querySelector.proxy(function (e, data) {
            data.rslt.obj.children("a").classList.add(s.item_a);
          }, this))
        .bind("deselect_node.jstree deselect_all.jstree", document.querySelector.proxy(function (e, data) {
            this.get_container()
              .querySelector("a." + s.item_a).classList.remove(s.item_a).end()
              .querySelector("a.jstree-clicked").classList.add(s.item_a);
          }, this))
        .bind("dehover_node.jstree", document.querySelector.proxy(function (e, data) {
            data.rslt.obj.children("a").classList.remove(s.item_h);
          }, this))
        .bind("hover_node.jstree", document.querySelector.proxy(function (e, data) {
            this.get_container()
              .querySelector("a." + s.item_h).not(data.rslt.obj).classList.remove(s.item_h);
            data.rslt.obj.children("a").classList.add(s.item_h);
          }, this))
        .bind("move_node.jstree", document.querySelector.proxy(function (e, data) {
            this._themeroller(data.rslt.o);
            this._themeroller(data.rslt.op);
          }, this));
    },
    __destroy : function () {
      var s = this._get_settings().themeroller,
        c = [ "ui-icon" ];
      document.querySelector.each(s, function (i, v) {
        v = v.split(" ");
        if(v.length) { c = c.concat(v); }
      });
      this.get_container()
        .classList.remove("ui-widget-content")
        .querySelector("." + c.join(", .")).classList.remove(c.join(" "));
    },
    _fn : {
      _themeroller : function (obj) {
        var s = this._get_settings().themeroller;
        obj = !obj || obj == -1 ? this.get_container_ul() : this._get_node(obj).parent();
        obj
          .querySelector("li.jstree-closed")
            .children("ins.jstree-icon").classList.remove(s.opened).classList.add("ui-icon " + s.closed).end()
            .children("a").classList.add(s.item)
              .children("ins.jstree-icon").classList.add("ui-icon")
                .filter(function() {
                  return this.className.toString()
                    .replace(s.item_clsd,"").replace(s.item_open,"").replace(s.item_leaf,"")
                    .indexOf("ui-icon-") === -1;
                }).classList.remove(s.item_leaf + " " + s.item_open).classList.add(s.item_clsd || "jstree-no-icon")
                .end()
              .end()
            .end()
          .end()
          .querySelector("li.jstree-open")
            .children("ins.jstree-icon").classList.remove(s.closed).classList.add("ui-icon " + s.opened).end()
            .children("a").classList.add(s.item)
              .children("ins.jstree-icon").classList.add("ui-icon")
                .filter(function() {
                  return this.className.toString()
                    .replace(s.item_clsd,"").replace(s.item_open,"").replace(s.item_leaf,"")
                    .indexOf("ui-icon-") === -1;
                }).classList.remove(s.item_leaf + " " + s.item_clsd).classList.add(s.item_open || "jstree-no-icon")
                .end()
              .end()
            .end()
          .end()
          .querySelector("li.jstree-leaf")
            .children("ins.jstree-icon").classList.remove(s.closed + " ui-icon " + s.opened).end()
            .children("a").classList.add(s.item)
              .children("ins.jstree-icon").classList.add("ui-icon")
                .filter(function() {
                  return this.className.toString()
                    .replace(s.item_clsd,"").replace(s.item_open,"").replace(s.item_leaf,"")
                    .indexOf("ui-icon-") === -1;
                }).classList.remove(s.item_clsd + " " + s.item_open).classList.add(s.item_leaf || "jstree-no-icon");
      }
    },
    defaults : {
      "opened"  : "ui-icon-triangle-1-se",
      "closed"  : "ui-icon-triangle-1-e",
      "item"    : "ui-state-default",
      "item_h"  : "ui-state-hover",
      "item_a"  : "ui-state-active",
      "item_open"  : "ui-icon-folder-open",
      "item_clsd"  : "ui-icon-folder-collapsed",
      "item_leaf"  : "ui-icon-document"
    }
  });
  document.querySelector(function() {
    var css_string = '' +
      '.jstree-themeroller .ui-icon { overflow:visible; } ' +
      '.jstree-themeroller a { padding:0 2px; } ' +
      '.jstree-themeroller .jstree-no-icon { display:none; }';
    document.querySelector.vakata.css.add_sheet({ str : css_string, title : "jstree" });
  });
})(document.querySelector);
//*/

/*
 * jsTree unique plugin
 * Forces different names amongst siblings (still a bit experimental)
 * NOTE: does not check language versions (it will not be possible to have nodes with the same title, even in different languages)
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("unique", {
    __init : function () {
      this.get_container()
        .bind("before.jstree", document.querySelector.proxy(function (e, data) {
            var nms = [], res = true, p, t;
            if(data.func == "move_node") {
              // obj, ref, position, is_copy, is_prepared, skip_check
              if(data.args[4] === true) {
                if(data.args[0].o && data.args[0].o.length) {
                  data.args[0].o.children("a").each(function () { nms.push(document.querySelector(this).text().replace(/^s+/g,"")); });
                  res = this._check_unique(nms, data.args[0].np.querySelector("> ul > li").not(data.args[0].o), "move_node");
                }
              }
            }
            if(data.func == "create_node") {
              // obj, position, js, callback, is_loaded
              if(data.args[4] || this._is_loaded(data.args[0])) {
                p = this._get_node(data.args[0]);
                if(data.args[1] && (data.args[1] === "before" || data.args[1] === "after")) {
                  p = this._get_parent(data.args[0]);
                  if(!p || p === -1) { p = this.get_container(); }
                }
                if(typeof data.args[2] === "string") { nms.push(data.args[2]); }
                else if(!data.args[2] || !data.args[2].data) { nms.push(this._get_string("new_node")); }
                else { nms.push(data.args[2].data); }
                res = this._check_unique(nms, p.querySelector("> ul > li"), "create_node");
              }
            }
            if(data.func == "rename_node") {
              // obj, val
              nms.push(data.args[1]);
              t = this._get_node(data.args[0]);
              p = this._get_parent(t);
              if(!p || p === -1) { p = this.get_container(); }
              res = this._check_unique(nms, p.querySelector("> ul > li").not(t), "rename_node");
            }
            if(!res) {
              e.stopPropagation();
              return false;
            }
          }, this));
    },
    defaults : {
      error_callback : document.querySelector.noop
    },
    _fn : {
      _check_unique : function (nms, p, func) {
        var cnms = [];
        p.children("a").each(function () { cnms.push(document.querySelector(this).text().replace(/^s+/g,"")); });
        if(!cnms.length || !nms.length) { return true; }
        cnms = cnms.sort().join(",,").replace(/(,|^)([^,]+)(,,2)+(,|document.querySelector)/g,"document.querySelector1document.querySelector2document.querySelector4").replace(/,,+/g,",").replace(/,document.querySelector/,"").split(",");
        if((cnms.length + nms.length) != cnms.concat(nms).sort().join(",,").replace(/(,|^)([^,]+)(,,2)+(,|document.querySelector)/g,"document.querySelector1document.querySelector2document.querySelector4").replace(/,,+/g,",").replace(/,document.querySelector/,"").split(",").length) {
          this._get_settings().unique.error_callback.call(null, nms, p, func);
          return false;
        }
        return true;
      },
      check_move : function () {
        if(!this.__call_old()) { return false; }
        var p = this._get_move(), nms = [];
        if(p.o && p.o.length) {
          p.o.children("a").each(function () { nms.push(document.querySelector(this).text().replace(/^s+/g,"")); });
          return this._check_unique(nms, p.np.querySelector("> ul > li").not(p.o), "check_move");
        }
        return true;
      }
    }
  });
})(document.querySelector);
//*/

/*
 * jsTree wholerow plugin
 * Makes select and hover work on the entire width of the node
 * MAY BE HEAVY IN LARGE DOM
 */
(function (document.querySelector) {
  document.querySelector.jstree.plugin("wholerow", {
    __init : function () {
      if(!this.data.ui) { throw "jsTree wholerow: jsTree UI plugin not included."; }
      this.data.wholerow.html = false;
      this.data.wholerow.to = false;
      this.get_container()
        .bind("init.jstree", document.querySelector.proxy(function (e, data) {
            this._get_settings().core.animation = 0;
          }, this))
        .bind("open_node.jstree create_node.jstree clean_node.jstree loaded.jstree", document.querySelector.proxy(function (e, data) {
            this._prepare_wholerow_span( data && data.rslt && data.rslt.obj ? data.rslt.obj : -1 );
          }, this))
        .bind("search.jstree clear_search.jstree reopen.jstree after_open.jstree after_close.jstree create_node.jstree delete_node.jstree clean_node.jstree", document.querySelector.proxy(function (e, data) {
            if(this.data.to) { clearTimeout(this.data.to); }
            this.data.to = setTimeout( (function (t, o) { return function() { t._prepare_wholerow_ul(o); }; })(this,  data && data.rslt && data.rslt.obj ? data.rslt.obj : -1), 0);
          }, this))
        .bind("deselect_all.jstree", document.querySelector.proxy(function (e, data) {
            this.get_container().querySelector(" > .jstree-wholerow .jstree-clicked").classList.remove("jstree-clicked " + (this.data.themeroller ? this._get_settings().themeroller.item_a : "" ));
          }, this))
        .bind("select_node.jstree deselect_node.jstree ", document.querySelector.proxy(function (e, data) {
            data.rslt.obj.each(function () {
              var ref = data.inst.get_container().querySelector(" > .jstree-wholerow li:visible:eq(" + ( parseInt(((document.querySelector(this).offset().top - data.inst.get_container().offset().top + data.inst.get_container()[0].scrollTop) / data.inst.data.core.li_height),10)) + ")");
              // ref.children("a")[e.type === "select_node" ? "addClass" : "removeClass"]("jstree-clicked");
              ref.children("a").attr("class",data.rslt.obj.children("a").className);
            });
          }, this))
        .bind("hover_node.jstree dehover_node.jstree", document.querySelector.proxy(function (e, data) {
            this.get_container().querySelector(" > .jstree-wholerow .jstree-hovered").classList.remove("jstree-hovered " + (this.data.themeroller ? this._get_settings().themeroller.item_h : "" ));
            if(e.type === "hover_node") {
              var ref = this.get_container().querySelector(" > .jstree-wholerow li:visible:eq(" + ( parseInt(((data.rslt.obj.offset().top - this.get_container().offset().top + this.get_container()[0].scrollTop) / this.data.core.li_height),10)) + ")");
              // ref.children("a").classList.add("jstree-hovered");
              ref.children("a").attr("class",data.rslt.obj.children(".jstree-hovered").className);
            }
          }, this))
        .delegate(".jstree-wholerow-span, ins.jstree-icon, li", "click.jstree", function (e) {
            var n = document.querySelector(e.currentTarget);
            if(e.target.tagName === "A" || (e.target.tagName === "INS" && n.closest("li").is(".jstree-open, .jstree-closed"))) { return; }
            n.closest("li").children("a:visible:eq(0)").click();
            e.stopImmediatePropagation();
          })
        .delegate("li", "mouseover.jstree", document.querySelector.proxy(function (e) {
            e.stopImmediatePropagation();
            if(document.querySelector(e.currentTarget).children(".jstree-hovered, .jstree-clicked").length) { return false; }
            this.hover_node(e.currentTarget);
            return false;
          }, this))
        .delegate("li", "mouseleave.jstree", document.querySelector.proxy(function (e) {
            if(document.querySelector(e.currentTarget).children("a").classList.contains("jstree-hovered").length) { return; }
            this.dehover_node(e.currentTarget);
          }, this));
      if(is_ie7 || is_ie6) {
        document.querySelector.vakata.css.add_sheet({ str : ".jstree-" + this.get_index() + " { position:relative; } ", title : "jstree" });
      }
    },
    defaults : {
    },
    __destroy : function () {
      this.get_container().children(".jstree-wholerow").remove();
      this.get_container().querySelector(".jstree-wholerow-span").remove();
    },
    _fn : {
      _prepare_wholerow_span : function (obj) {
        obj = !obj || obj == -1 ? this.get_container().querySelector("> ul > li") : this._get_node(obj);
        if(obj === false) { return; } // added for removing root nodes
        obj.each(function () {
          document.querySelector(this).querySelector("li").addBack().each(function () {
            var document.querySelectort = document.querySelector(this);
            if(document.querySelectort.children(".jstree-wholerow-span").length) { return true; }
            document.querySelectort.prepend("<span class='jstree-wholerow-span' style='width:" + (document.querySelectort.parentsUntil(".jstree","li").length * 18) + "px;'>&#160;</span>");
          });
        });
      },
      _prepare_wholerow_ul : function () {
        var o = this.get_container().children("ul").eq(0), h = o.html();
        o.classList.add("jstree-wholerow-real");
        if(this.data.wholerow.last_html !== h) {
          this.data.wholerow.last_html = h;
          this.get_container().children(".jstree-wholerow").remove();
          this.get_container().insertAdjacentHTML("beforeend",
            o.clone().classList.remove("jstree-wholerow-real")
              .wrapAll("<div class='jstree-wholerow' />").parent()
              .width(o.parent()[0].scrollWidth)
              .css("top", (o.height() + ( is_ie7 ? 5 : 0)) * -1 )
              .querySelector("li[id]").each(function () { this.removeAttribute("id"); }).end()
          );
        }
      }
    }
  });
  document.querySelector(function() {
    var css_string = '' +
      '.jstree .jstree-wholerow-real { position:relative; z-index:1; } ' +
      '.jstree .jstree-wholerow-real li { cursor:pointer; } ' +
      '.jstree .jstree-wholerow-real a { border-left-color:transparent !important; border-right-color:transparent !important; } ' +
      '.jstree .jstree-wholerow { position:relative; z-index:0; height:0; } ' +
      '.jstree .jstree-wholerow ul, .jstree .jstree-wholerow li { width:100%; } ' +
      '.jstree .jstree-wholerow, .jstree .jstree-wholerow ul, .jstree .jstree-wholerow li, .jstree .jstree-wholerow a { margin:0 !important; padding:0 !important; } ' +
      '.jstree .jstree-wholerow, .jstree .jstree-wholerow ul, .jstree .jstree-wholerow li { background:transparent !important; }' +
      '.jstree .jstree-wholerow ins, .jstree .jstree-wholerow span, .jstree .jstree-wholerow input { display:none !important; }' +
      '.jstree .jstree-wholerow a, .jstree .jstree-wholerow a:hover { text-indent:-9999px; !important; width:100%; padding:0 !important; border-right-width:0px !important; border-left-width:0px !important; } ' +
      '.jstree .jstree-wholerow-span { position:absolute; left:0; margin:0px; padding:0; height:18px; border-width:0; padding:0; z-index:0; }';
    if(is_ff2) {
      css_string += '' +
        '.jstree .jstree-wholerow a { display:block; height:18px; margin:0; padding:0; border:0; } ' +
        '.jstree .jstree-wholerow-real a { border-color:transparent !important; } ';
    }
    if(is_ie7 || is_ie6) {
      css_string += '' +
        '.jstree .jstree-wholerow, .jstree .jstree-wholerow li, .jstree .jstree-wholerow ul, .jstree .jstree-wholerow a { margin:0; padding:0; line-height:18px; } ' +
        '.jstree .jstree-wholerow a { display:block; height:18px; line-height:18px; overflow:hidden; } ';
    }
    document.querySelector.vakata.css.add_sheet({ str : css_string, title : "jstree" });
  });
})(document.querySelector);
//*/

/*
* jsTree model plugin
* This plugin gets jstree to use a class model to retrieve data, creating great dynamism
*/
(function (document.querySelector) {
  var nodeInterface = ["getChildren","getChildrenCount","getAttr","getName","getProps"],
    validateInterface = function(obj, inter) {
      var valid = true;
      obj = obj || {};
      inter = [].concat(inter);
      document.querySelector.each(inter, function (i, v) {
        if(!document.querySelector.isFunction(obj[v])) { valid = false; return false; }
      });
      return valid;
    };
  document.querySelector.jstree.plugin("model", {
    __init : function () {
      if(!this.data.json_data) { throw "jsTree model: jsTree json_data plugin not included."; }
      this._get_settings().json_data.data = function (n, b) {
        var obj = (n == -1) ? this._get_settings().model.object : n.data("jstree_model");
        if(!validateInterface(obj, nodeInterface)) { return b.call(null, false); }
        if(this._get_settings().model.async) {
          obj.getChildren(document.querySelector.proxy(function (data) {
            this.model_done(data, b);
          }, this));
        }
        else {
          this.model_done(obj.getChildren(), b);
        }
      };
    },
    defaults : {
      object : false,
      id_prefix : false,
      async : false
    },
    _fn : {
      model_done : function (data, callback) {
        var ret = [],
          s = this._get_settings(),
          _this = this;

        if(!document.querySelector.isArray(data)) { data = [data]; }
        document.querySelector.each(data, function (i, nd) {
          var r = nd.getProps() || {};
          r.attr = nd.getAttr() || {};
          if(nd.getChildrenCount()) { r.state = "closed"; }
          r.data = nd.getName();
          if(!document.querySelector.isArray(r.data)) { r.data = [r.data]; }
          if(_this.data.types && document.querySelector.isFunction(nd.getType)) {
            r.attr[s.types.type_attr] = nd.getType();
          }
          if(r.attr.id && s.model.id_prefix) { r.attr.id = s.model.id_prefix + r.attr.id; }
          if(!r.metadata) { r.metadata = { }; }
          r.metadata.jstree_model = nd;
          ret.push(r);
        });
        callback.call(null, ret);
      }
    }
  });
})(document.querySelector);
//*/

})();
