/*
 * @version   : 1.0.0 - Bridge.NET
 * @author    : Object.NET, Inc. http://www.bridge.net/
 * @date      : 2014-06-01
 * @copyright : Copyright (c) 2008-2014, Object.NET, Inc. (http://www.object.net/). All rights reserved.
 * @license   : See license.txt and https://github.com/bridgedotnet/Bridge.NET/blob/master/LICENSE.
 */


// @source resources/Core.js

Bridge = {
    emptyFn: function () { },

    ns: function (ns, scope) {
        var nsParts = ns.split('.');

        if (!scope) {
            scope = window;
        }

        for (i = 0; i < nsParts.length; i++) {
            if (typeof scope[nsParts[i]] == 'undefined') {
                scope[nsParts[i]] = {};
            }

            scope = scope[nsParts[i]];
        }

        return scope;
    },

    on: function (event, elem, fn) {
        function listenHandler(e) {
            var ret = fn.apply(this, arguments);
            if (ret === false) {
                e.stopPropagation();
                e.preventDefault();
            }
            return(ret);
        }

        function attachHandler() {            
            var ret = fn.call(elem, window.event);   
            if (ret === false) {
                window.event.returnValue = false;
                window.event.cancelBubble = true;
            }
            return(ret);
        }

        if (elem.addEventListener) {
            elem.addEventListener(event, listenHandler, false);
        }
        else {
            elem.attachEvent("on" + event, attachHandler);
        }
    },

    getHashCode : function (value) {
        if (Bridge.isEmpty(value, true)) {
            throw new Bridge.InvalidOperationException('HashCode cannot be calculated for empty value');
        }

        if (Bridge.isFunction(value.getHashCode)) {
            return value.getHashCode();
        }

        if (Bridge.isBoolean(value)) {
            return obj ? 1 : 0;
        }

        if (Bridge.isDate(value)) {
            return value.valueOf() & 0xFFFFFFFF;
        }

        if (Bridge.isNumber(value)) {            
            value = value.toExponential();
            return parseInt(value.substr(0, value.indexOf('e')).replace('.', ''), 10) & 0xFFFFFFFF;
        }        

        if (Bridge.isString(value)) {
            var hash = 0,
                i;
            for (i = 0; i < value.length; i++) {
                hash = (((hash << 5) - hash) + value.charCodeAt(i)) & 0xFFFFFFFF;
            }
            return hash;
        }
        
        return value.$$hashCode || (value.$$hashCode = (Math.random() * 0x100000000) | 0);
    },

    getDefaultValue : function (type) {
        if (Bridge.isFunction(type.getDefaultValue)) {
            return type.getDefaultValue();
        }
        else if (type === Boolean) {
            return false;
        }
        else if (type === Date) {
            return new Date(0);
        }
        else if (type === Number) {
            return 0;
        }
        return null;
    },

    getTypeName: function (type) {
        return type.$$name || (type.toString().match(/^\s*function\s*([^\s(]+)/) || [])[1] || "Object";
    },

    is : function (obj, type) {
	  if (typeof type == "string") {
        type = Bridge.unroll(type);
	  }

	  if (obj == null) {
		  return false;
	  }

	  if (Bridge.isFunction(type.$is)) {
	      return type.$is(obj);
	  }

	  if (Bridge.isFunction(type.instanceOf)) {
	    return type.instanceOf(obj);
	  }

	  if ((obj.constructor == type) || (obj instanceof type)) {
		  return true;
	  }

	  if (Bridge.isArray(obj) && type == Bridge.IEnumerable) {
	    return true;
	  }

	  if (!type.$$inheritors) {
	    return false;
	  }

	  var inheritors = type.$$inheritors;	  

	  for (var i = 0; i < inheritors.length; i++) {
	    if (Bridge.is(obj, inheritors[i])) {
		    return true;
		  }
	  }

	  return false;
	},
	
	as : function (obj, type) {
	  return Bridge.is(obj, type) ? obj : null;
	},
	
	cast : function(obj, type) {
	  var result = Bridge.as(obj, type);

	  if (result == null) {
	      throw new Bridge.InvalidCastException('Unable to cast type ' + Bridge.getTypeName(obj.constructor) + ' to type ' + Bridge.getTypeName(type));
	  }

	  return result;
	},
	
	apply : function (obj, values) {
	  var names = Bridge.getPropertyNames(values, false);

	  for (var i = 0; i < names.length; i++) {
	    var name = names[i];

	    if (typeof obj[name] == "function" && typeof values[name] != "function") {
	      obj[name](values[name]);
	    }
	    else {
	      obj[name] = values[name];
	    }
	  }

	  return obj;
	},

	merge: function (to, from) {
	    var object,
            key,
			i,
            value,
            toValue,
			fn;

	    if (Bridge.isArray(from) && Bridge.isFunction(to.add || to.push)) {
	        fn = Bridge.isArray(to) ? to.push : to.add;

	        for (i = 0; i < from.length; i++) {
	            fn.apply(to, from[i]);
	        }
	    }
	    else {
	        for (key in from) {
	            value = from[key];

	            if (typeof to[key] == "function" && typeof value != "function") {
	                if (key.match(/^\s*get[A-Z]/)) {
	                    Bridge.merge(to[key](), value);
	                }
	                else {
	                    to[key](value);
	                }
	            }
	            else if (value && value.constructor === Object) {
	                toValue = to[key];
	                Bridge.merge(toValue, value);
	            }
	            else {
	                to[key] = value;
	            }
	        }
	    }

	    return to;
	},

	getEnumerator: function (obj) {
	    if (obj && obj.getEnumerator) {
	      return obj.getEnumerator();
	    }

	    if ((Object.prototype.toString.call(obj) === '[object Array]') ||
            (obj && Bridge.isDefined(obj.length))) {
	      return new Bridge.ArrayEnumerator(obj);
	    }
	    
	    throw new Bridge.InvalidOperationException('Cannot create enumerator');
	},

	getPropertyNames : function(obj, includeFunctions) {
	    var names = [],
	        name;

	    for (name in obj) {
	      if (includeFunctions || typeof obj[name] !== 'function') {
	        names.push(name);
	      }
	    }

	    return names;
	},

	isDefined: function (value, noNull) {
	    return typeof value !== 'undefined' && (noNull ? value != null : true);
	},

	isEmpty: function (value, allowEmpty) {
	    return (value == null) || (!allowEmpty ? value === '' : false) || ((!allowEmpty && Bridge.isArray(value)) ? value.length === 0 : false);
	},

	toArray: function (ienumerable) {
	    var i,
	        item,
            len,
	        result = [];

	    if (Bridge.isArray(ienumerable)) {
	      for (i = 0, len = ienumerable.length; i < len; ++i) {
	        result.push(ienumerable[i]);
	      }
	    }
	    else {
	      i = Bridge.getEnumerator(ienumerable);

	      while (i.moveNext()) {
	        item = i.getCurrent();
	        result.push(item);
	      }
	    }	    

	    return result;
	},

  isArray: function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  },

  isFunction: function (obj) {
      return typeof (obj) === 'function';
  },

  isDate: function (obj) {
    return Object.prototype.toString.call(obj) === '[object Date]';
  },

  isNull: function (value) {
    return (value === null) || (value === undefined);
  },

  isBoolean: function (value) {
      return typeof value === 'boolean';
  },

  isNumber: function (value) {
      return typeof value === 'number' && isFinite(value);
  },

  isString: function (value) {
      return typeof value === 'string';
  },

  unroll: function (value) {
    var d = value.split("."),
        o = window[d[0]],
        i;

    for (var i = 1; i < d.length; i++) {
      if (!o) {
        return null;
      }

      o = o[d[i]];
    }

    return o;
  },

  equals: function (a, b) {
    if (a && Bridge.isFunction(a.equals)) {
      return a.equals(b);
    }
    else if (Bridge.isDate(a) && Bridge.isDate(b)) {
      return a.valueOf() === b.valueOf();
    }        
    else if (Bridge.isNull(a) && Bridge.isNull(b)) {
      return true;
    }
        
    return a === b;
  },

  fn: {
    call: function (obj, fnName){
      var args = Array.prototype.slice.call(arguments, 2);

      return obj[fnName].apply(obj, args);
    },

    bind: function (obj, method, args, appendArgs) {
        if (method && method.$method == method && method.$scope == obj) {
            return method;
        }

        var fn = null;
        if (arguments.length === 2) {
            fn = function () {
                return method.apply(obj, arguments)
            };
        }
        else {
            fn = function () {
                var callArgs = args || arguments;

                if (appendArgs === true) {
                    callArgs = Array.prototype.slice.call(arguments, 0);
                    callArgs = callArgs.concat(args);
                }
                else if (typeof appendArgs == 'number') {
                    callArgs = Array.prototype.slice.call(arguments, 0);

                    if (appendArgs === 0) {
                        callArgs.unshift.apply(callArgs, args);
                    }
                    else if (appendArgs < callArgs.length) {
                        callArgs.splice.apply(callArgs, [appendArgs, 0].concat(args));
                    }
                    else {
                        callArgs.push.apply(callArgs, args);
                    }
                }

                return method.apply(obj, callArgs);
            };
        }

        fn.$method = method;
        fn.$scope = obj;

        return fn;
    },

    bindScope: function (obj, method) {
      var fn = function () {
        var callArgs = Array.prototype.slice.call(arguments, 0);

        callArgs.unshift.apply(callArgs, [obj]);

        return method.apply(obj, callArgs);
      };

      fn.$method = method;
      fn.$scope = obj;

      return fn;
    },

    $build: function (handlers) {
      var fn = function () {
        var list = arguments.callee.$invocationList,
            result,
            i,
            handler;

        for (i = 0; i < list.length; i++) {
          handler = list[i];
          result = handler.apply(null, arguments);
        }

        return result;
      };

      fn.$invocationList = handlers ? Array.prototype.slice.call(handlers, 0) : [];

      if (fn.$invocationList.length == 0) {
          return null;
      }

      return fn;
    },

    combine: function (fn1, fn2) {
      if (!fn1 || !fn2) {                
        return fn1 || fn2;
      }

      var list1 = fn1.$invocationList ? fn1.$invocationList : [fn1],
          list2 = fn2.$invocationList ? fn2.$invocationList : [fn2];

      return Bridge.fn.$build(list1.concat(list2));
    },

    remove: function (fn1, fn2) {
      if (!fn1 || !fn2) {
        return fn1 || null;
      }

      var list1 = fn1.$invocationList ? fn1.$invocationList : [fn1],
          list2 = fn2.$invocationList ? fn2.$invocationList : [fn2],
          result = [],
          exclude,
          i, j;
            
      for (i = list1.length - 1; i >= 0; i--) {
        exclude = false;

        for (j = 0; j < list2.length; j++) {
            if (list1[i] === list2[j] || 
                (list1[i].$method === list2[j].$method && list1[i].$scope === list2[j].$scope)) {
            exclude = true;
            break;
          }
        }

        if (!exclude) {
          result.push(list1[i]);
        }
      }

      result.reverse();

      return Bridge.fn.$build(result);
    }
  }
};

// @source resources/Core.js

Bridge.nullable = {
    hasValue: function (obj) {
        return (obj !== null) && (obj !== undefined);
    },

    getValue: function (obj) {
        if (!Bridge.nullable.hasValue(obj)) {
            throw new Brdige.InvalidOperationException("Nullable instance doesn't have a value.");
        }
        return obj;
    },

    getValueOrDefault: function (obj, defValue) {
        return Bridge.nullable.hasValue(obj) ? obj : defValue;
    }
};

Bridge.hasValue = Bridge.nullable.hasValue;

// @source resources/Class.js



// Inspired by base2 and Prototype
(function () {
    var initializing = false,
          fnTest = /xyz/.test(function () { xyz; }) ? /\bbase\b/ : /.*/;

    // The base Class implementation (does nothing)
    Bridge.Class = function () { };
    Bridge.Class.cache = {};
    Bridge.Class.initCtor = function () {
        if (this.$multipleCtors && arguments.length > 0 && typeof arguments[0] == 'string' && Bridge.isFunction(this[arguments[0]])) {
            this[arguments[0]].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (this.$ctorDetector) {
            this.$ctorDetector.apply(this, arguments);
        }
        else if (this.$init) {
            this.$init.apply(this, arguments);
        }
    };

    // Create a new Class that inherits from this class
    Bridge.Class.extend = function (className, prop) {
        var extend = prop.$extend,
            statics = prop.$statics,
            base = extend ? extend[0].prototype : this.prototype,
            prototype,
            nameParts,
            scope = prop.$scope || window,
            i,
            name;

        delete prop.$extend;
        delete prop.$statics;

        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        prototype = extend ? new extend[0]() : new Object();
        initializing = false;

        if (!prop.$multipleCtors && !prop.$init) {
            prop.$init = extend ? function () {
                this.base();
            } : function () { };
        }

        if (!prop.$multipleCtors && !prop.$init) {
            prop.$init = extend ? function () {
                this.base();
            } : function () { };
        }

        if (!prop.$initMembers) {
            prop.$initMembers = extend ? function () {
                this.base.apply(this, arguments);
            } : function () { };
        }

        prop.$$initCtor = Bridge.Class.initCtor;

        // Copy the properties over onto the new prototype
        for (name in prop) {
            // Check if we're overwriting an existing function
            prototype[name] = typeof prop[name] == 'function' &&
              typeof base[name] == 'function' && fnTest.test(prop[name]) ?
              (function (name, fn) {
                  return function () {
                      var tmp = this.base;

                      // Add a new .base() method that is the same method
                      // but on the super-class
                      this.base = base[name];

                      // The method only need to be bound temporarily, so we
                      // remove it when we're done executing
                      var ret = fn.apply(this, arguments);

                      this.base = tmp;

                      return ret;
                  };
              })(name, prop[name]) :
              prop[name];
        }

        prototype.$$name = className;

        // The dummy class constructor
        function Class() {
            if (!(this instanceof Class)) {
                var args = Array.prototype.slice.call(arguments, 0),
                    object = Object.create(Class.prototype),
                    result = Class.apply(object, args);

                return typeof result === 'object' ? result : object;
            }

            // All construction is actually done in the init method
            if (!initializing) {
                if (this.$initMembers) {
                    this.$initMembers.apply(this, arguments);
                }                

                this.$$initCtor.apply(this, arguments);
            }
        }

        // Populate our constructed prototype object
        Class.prototype = prototype;

        // Enforce the constructor to be what we expect
        Class.prototype.constructor = Class;

        Class.$$name = className;

        if (statics) {
            for (name in statics) {
                Class[name] = statics[name];
            }
        }

        scope = Bridge.Class.set(scope, className, Class);

        if (!extend) {
            extend = [Object];
        }

        Class.$$extend = extend;

        for (i = 0; i < extend.length; i++) {
            scope = extend[i];

            if (!scope.$$inheritors) {
                scope.$$inheritors = [];
            }

            scope.$$inheritors.push(Class);
        }

        if (Class.$init) {
            Class.$init.call(Class);
        }

        return Class;
    };

    Bridge.Class.set = function (scope, className, cls) {
        var nameParts = className.split('.');

        for (i = 0; i < (nameParts.length - 1) ; i++) {
            if (typeof scope[nameParts[i]] == 'undefined') {
                scope[nameParts[i]] = {};
            }

            scope = scope[nameParts[i]];
        }

        scope[nameParts[nameParts.length - 1]] = cls;

        return scope;
    };

    Bridge.Class.genericName = function () {
        var name = arguments[0];
        for (var i = 1; i < arguments.length; i++) {
            name += '$' + Bridge.getTypeName(arguments[i]);
        }
        return name;
    };

    Bridge.Class.generic = function (className, scope, fn) {
        if (!fn) {
            fn = scope;
            scope = window;
        }

        Bridge.Class.set(scope, className, fn);
        return fn;
    };
})();

// @source resources/Task.js

Bridge.Class.extend('Bridge.Exception', {
    $init: function (message, innerException) {
        this.message = message;
        this.innerException = innerException;
        this.errorStack = new Error();
        this.data = new Bridge.Dictionary$2(Object, Object)();
    },

    getMessage: function () {
        return this.message;
    },

    getInnerException: function () {
        return this.innerException;
    },

    getStackTrace: function () {
        return this.errorStack.stack;
    },

    getData: function () {
        return this.data;
    },

    $statics: {
        create: function (error) {
            if (Bridge.is(error, Bridge.Exception)) {
                return error;
            }

            if (error instanceof TypeError) {                
                return new Bridge.NullReferenceException(error.message, new Bridge.ErrorException(error));
            }
            else if (error instanceof RangeError) {
                return new Bridge.ArgumentOutOfRangeException(null, error.message, new Bridge.ErrorException(error));
            }
            else if (error instanceof Error) {
                return new Bridge.ErrorException(o);
            }
            else {
                return new Bridge.Exception(error ? error.toString() : null);
            }
        }
    }
});

Bridge.Class.extend('Bridge.ErrorException', {
    $extend: [Bridge.Exception],

    $init: function (error) {
        this.base(error.message);
        this.errorStack = error;
        this.error = error;
    },

    getError: function () {
        return this.error;
    }
});

Bridge.Class.extend('Bridge.ArgumentException', {
    $extend: [Bridge.Exception],

    $init: function (message, paramName, innerException) {
        this.base(message || "Value does not fall within the expected range.", innerException);
        this.paramName = paramName;
    },

    getParamName: function () {
        return this.paramName;
    }
});

Bridge.Class.extend('Bridge.ArgumentNullException', {
    $extend: [Bridge.ArgumentException],

    $init: function (paramName, message, innerException) {
        if (!message) {
            message = 'Value cannot be null.';
            if (paramName) {
                message += '\nParameter name: ' + paramName;
            }
        }

        this.base(message, paramName, innerException);
    }
});

Bridge.Class.extend('Bridge.ArgumentOutOfRangeException', {
    $extend: [Bridge.ArgumentException],

    $init: function (paramName, message, innerException, actualValue) {
        if (!message) {
            message = 'Value is out of range.';
            if (paramName) {
                message += '\nParameter name: ' + paramName;
            }
        }

        this.base(message, paramName, innerException);

        this.actualValue = actualValue;
    },

    getActualValue: function () {
        return this.actualValue;
    }
});

Bridge.Class.extend('Bridge.KeyNotFoundException', {
    $extend: [Bridge.Exception],

    $init: function (message, innerException) {
        this.base(message || "Key not found.", innerException);
    }
});

Bridge.Class.extend('Bridge.DivideByZeroException', {
    $extend: [Bridge.Exception],

    $init: function (message, innerException) {
        this.base(message || "Division by 0.", innerException);
    }
});

Bridge.Class.extend('Bridge.FormatException', {
    $extend: [Bridge.Exception],

    $init: function (message, innerException) {
        this.base(message || "Invalid format.", innerException);
    }
});

Bridge.Class.extend('Bridge.InvalidCastException', {
    $extend: [Bridge.Exception],

    $init: function (message, innerException) {
        this.base(message || "The cast is not valid.", innerException);
    }
});

Bridge.Class.extend('Bridge.InvalidOperationException', {
    $extend: [Bridge.Exception],

    $init: function (message, innerException) {
        this.base(message || "Operation is not valid due to the current state of the object.", innerException);
    }
});

Bridge.Class.extend('Bridge.NotImplementedException', {
    $extend: [Bridge.Exception],

    $init: function (message, innerException) {
        this.base(message || "The method or operation is not implemented.", innerException);
    }
});

Bridge.Class.extend('Bridge.NotSupportedException', {
    $extend: [Bridge.Exception],

    $init: function (message, innerException) {
        this.base(message || "Specified method is not supported.", innerException);
    }
});

Bridge.Class.extend('Bridge.NullReferenceException', {
    $extend: [Bridge.Exception],

    $init: function (message, innerException) {
        this.base(message || "Object is null.", innerException);
    }
});

// @source resources/Browser.js

(function () {
  var check = function (regex) {
    return regex.test(navigator.userAgent);
  },

  isStrict = document.compatMode == 'CSS1Compat',

  version = function (is, regex) {
    var m;

    return (is && (m = regex.exec(navigator.userAgent))) ? parseFloat(m[1]) : 0;
  },

  docMode = document.documentMode,
  isOpera = check(/opera/),
  isOpera10_5 = isOpera && check(/version\/10\.5/),
  isChrome = check(/\bchrome\b/),
  isWebKit = check(/webkit/),
  isSafari = !isChrome && check(/safari/),
  isSafari2 = isSafari && check(/applewebkit\/4/),
  isSafari3 = isSafari && check(/version\/3/),
  isSafari4 = isSafari && check(/version\/4/),
  isSafari5_0 = isSafari && check(/version\/5\.0/),
  isSafari5 = isSafari && check(/version\/5/),
  isIE = !isOpera && (check(/msie/) || check(/trident/)),
  isIE7 = isIE && ((check(/msie 7/) && docMode != 8 && docMode != 9 && docMode != 10) || docMode == 7),
  isIE8 = isIE && ((check(/msie 8/) && docMode != 7 && docMode != 9 && docMode != 10) || docMode == 8),
  isIE9 = isIE && ((check(/msie 9/) && docMode != 7 && docMode != 8 && docMode != 10) || docMode == 9),
  isIE10 = isIE && ((check(/msie 10/) && docMode != 7 && docMode != 8 && docMode != 9) || docMode == 10),
  isIE11 = isIE && ((check(/trident\/7\.0/) && docMode != 7 && docMode != 8 && docMode != 9 && docMode != 10) || docMode == 11),
  isIE6 = isIE && check(/msie 6/),
  isGecko = !isWebKit && !isIE && check(/gecko/),
  isGecko3 = isGecko && check(/rv:1\.9/),
  isGecko4 = isGecko && check(/rv:2\.0/),
  isGecko5 = isGecko && check(/rv:5\./),
  isGecko10 = isGecko && check(/rv:10\./),
  isFF3_0 = isGecko3 && check(/rv:1\.9\.0/),
  isFF3_5 = isGecko3 && check(/rv:1\.9\.1/),
  isFF3_6 = isGecko3 && check(/rv:1\.9\.2/),
  isWindows = check(/windows|win32/),
  isMac = check(/macintosh|mac os x/),
  isLinux = check(/linux/),
  scrollbarSize = null,
  chromeVersion = version(true, /\bchrome\/(\d+\.\d+)/),
  firefoxVersion = version(true, /\bfirefox\/(\d+\.\d+)/),
  ieVersion = version(isIE, /msie (\d+\.\d+)/),
  operaVersion = version(isOpera, /version\/(\d+\.\d+)/),
  safariVersion = version(isSafari, /version\/(\d+\.\d+)/),
  webKitVersion = version(isWebKit, /webkit\/(\d+\.\d+)/),
  isSecure = /^https/i.test(window.location.protocol),
  isiPhone = /iPhone/i.test(navigator.platform),
  isiPod = /iPod/i.test(navigator.platform),
  isiPad = /iPad/i.test(navigator.userAgent),
  isBlackberry = /Blackberry/i.test(navigator.userAgent),
  isAndroid = /Android/i.test(navigator.userAgent),
  isDesktop = isMac || isWindows || (isLinux && !isAndroid),
  isTablet = isiPad,
  isPhone = !isDesktop && !isTablet;

  Bridge.Browser = {
    isStrict: isStrict,
    isIEQuirks: isIE && (!isStrict && (isIE6 || isIE7 || isIE8 || isIE9)),
    isOpera: isOpera,
    isOpera10_5: isOpera10_5,
    isWebKit: isWebKit,
    isChrome: isChrome,
    isSafari: isSafari,
    isSafari3: isSafari3,
    isSafari4: isSafari4,
    isSafari5: isSafari5,
    isSafari5_0: isSafari5_0,
    isSafari2: isSafari2,
    isIE: isIE,
    isIE6: isIE6,
    isIE7: isIE7,
    isIE7m: isIE6 || isIE7,
    isIE7p: isIE && !isIE6,
    isIE8: isIE8,
    isIE8m: isIE6 || isIE7 || isIE8,
    isIE8p: isIE && !(isIE6 || isIE7),
    isIE9: isIE9,
    isIE9m: isIE6 || isIE7 || isIE8 || isIE9,
    isIE9p: isIE && !(isIE6 || isIE7 || isIE8),
    isIE10: isIE10,
    isIE10m: isIE6 || isIE7 || isIE8 || isIE9 || isIE10,
    isIE10p: isIE && !(isIE6 || isIE7 || isIE8 || isIE9),
    isIE11: isIE11,
    isIE11m: isIE6 || isIE7 || isIE8 || isIE9 || isIE10 || isIE11,
    isIE11p: isIE && !(isIE6 || isIE7 || isIE8 || isIE9 || isIE10),
    isGecko: isGecko,
    isGecko3: isGecko3,
    isGecko4: isGecko4,
    isGecko5: isGecko5,
    isGecko10: isGecko10,
    isFF3_0: isFF3_0,
    isFF3_5: isFF3_5,
    isFF3_6: isFF3_6,
    isFF4: 4 <= firefoxVersion && firefoxVersion < 5,
    isFF5: 5 <= firefoxVersion && firefoxVersion < 6,
    isFF10: 10 <= firefoxVersion && firefoxVersion < 11,
    isLinux: isLinux,
    isWindows: isWindows,
    isMac: isMac,
    chromeVersion: chromeVersion,
    firefoxVersion: firefoxVersion,
    ieVersion: ieVersion,
    operaVersion: operaVersion,
    safariVersion: safariVersion,
    webKitVersion: webKitVersion,
    isSecure: isSecure,
    isiPhone: isiPhone,
    isiPod: isiPod,
    isiPad: isiPad,
    isBlackberry: isBlackberry,
    isAndroid: isAndroid,
    isDesktop: isDesktop,
    isTablet: isTablet,
    isPhone: isPhone,
    iOS: isiPhone || isiPad || isiPod,
    standalone: !!window.navigator.standalone
  };
})();
Bridge.Class.extend('Bridge.IEnumerable', {});
Bridge.Class.extend('Bridge.IEnumerator', {});
Bridge.Class.extend('Bridge.IEqualityComparer', {});
Bridge.Class.extend('Bridge.ICollection', {
    $extend: [Bridge.IEnumerable]
});

Bridge.Class.generic('Bridge.IEnumerator$1', function (T) {
    var $$name = Bridge.Class.genericName('Bridge.IEnumerator$1', T);
    return Bridge.Class.cache[$$name] || (Bridge.Class.cache[$$name] = Bridge.Class.extend($$name, {
        $extend: [Bridge.IEnumerator]
    }));
});

Bridge.Class.generic('Bridge.IEnumerable$1', function (T) {
    var $$name = Bridge.Class.genericName('Bridge.IEnumerable$1', T);
    return Bridge.Class.cache[$$name] || (Bridge.Class.cache[$$name] = Bridge.Class.extend($$name, {
        $extend: [Bridge.IEnumerable]
    }));
});

Bridge.Class.generic('Bridge.ICollection$1', function (T) {
    var $$name = Bridge.Class.genericName('Bridge.ICollection$1', T);
    return Bridge.Class.cache[$$name] || (Bridge.Class.cache[$$name] = Bridge.Class.extend($$name, {
        $extend: [Bridge.IEnumerable$1(T)]
    }));
});

Bridge.Class.generic('Bridge.IEqualityComparer$1', function (T) {
    var $$name = Bridge.Class.genericName('Bridge.IEqualityComparer$1', T);
    return Bridge.Class.cache[$$name] || (Bridge.Class.cache[$$name] = Bridge.Class.extend($$name, {
        $extend: [Bridge.IEqualityComparer]
    }));
});

Bridge.Class.generic('Bridge.IDictionary$2', function (TKey, TValue) {
    var $$name = Bridge.Class.genericName('Bridge.IDictionary$2', TKey, TValue);
    return Bridge.Class.cache[$$name] || (Bridge.Class.cache[$$name] = Bridge.Class.extend($$name, {
        $extend: [Bridge.IEnumerable$1(Bridge.KeyValuePair$2(TKey, TValue))],
    }));
});

Bridge.Class.extend("Bridge.CustomEnumerator", {
    $extend: [Bridge.IEnumerator],

    $init: function (moveNext, getCurrent, reset, dispose, scope) {
        this.$moveNext = moveNext;
        this.$getCurrent = getCurrent;
        this.$dispose = dispose;
        this.$reset = reset;
        this.scope = scope;
    },

    moveNext: function () {
        try {
            return this.$moveNext.call(this.scope);
        }
        catch (ex) {
            this.dispose.call(this.scope);
            throw ex;
        }
    },

    getCurrent: function () {
        return this.$getCurrent.call(this.scope);
    },

    reset: function () {
        if (this.$reset) {
            this.$reset.call(this.scope);
        }
    },

    dispose: function () {
        if (this.$dispose)
            this.$dispose.call(this.scope);
    }
});

Bridge.Class.extend('Bridge.ArrayEnumerator', {
    $init: function (array) {
        this.array = array;
        this.reset();
    },

    moveNext: function () {
        this.index++;
        return this.index < this.array.length;
    },

    getCurrent: function () {
        return this.array[this.index];
    },

    reset: function () {
        this.index = -1;
    }
});
Bridge.Class.generic('Bridge.EqualityComparer$1', function (T) {
    var $$name = Bridge.Class.genericName('Bridge.EqualityComparer$1', T);
    return Bridge.Class.cache[$$name] || (Bridge.Class.cache[$$name] = Bridge.Class.extend($$name, {
        $extend: [Bridge.IEqualityComparer$1(T)],

        equals: function (x, y) {
            if (!Bridge.isDefined(x, true)) {
                return !Bridge.isDefined(y, true);
            }
            else {
                return Bridge.isDefined(y, true) ? Bridge.equals(x, y) : false;
            }
        },

        getHashCode: function (obj) {
            return Bridge.isDefined(obj, true) ? Bridge.getHashCode(obj) : 0;
        }
    }));
});

Bridge.EqualityComparer$1.default = new Bridge.EqualityComparer$1(Object)();
Bridge.Class.generic('Bridge.KeyValuePair$2', function (TKey, TValue) {
    var $$name = Bridge.Class.genericName('Bridge.KeyValuePair$2', TKey, TValue);
    return Bridge.Class.cache[$$name] || (Bridge.Class.cache[$$name] = Bridge.Class.extend($$name, {
        $init: function (key, value) {
            this.key = key;
            this.value = value;
        }
    }));
});

Bridge.Class.generic('Bridge.Dictionary$2', function (TKey, TValue) {
    var $$name = Bridge.Class.genericName('Bridge.Dictionary$2', TKey, TValue);
    return Bridge.Class.cache[$$name] || (Bridge.Class.cache[$$name] = Bridge.Class.extend($$name, {
        $extend: [Bridge.IDictionary$2(TKey, TValue)],

        $init: function (obj, comparer) {
            this.comparer = comparer || Bridge.EqualityComparer$1.default;
            this.clear();

            if (Bridge.is(obj, Bridge.Dictionary$2(TKey, TValue))) {
                var e = Bridge.getEnumerator(obj),
                    c;

                while (e.moveNext()) {
                    c = e.getCurrent();
                    this.add(c.key, c.value);
                }
            }
            else if (Object.prototype.toString.call(obj) === '[object Object]') {
                var names = Bridge.getPropertyNames(obj),
                    name;
                for (var i = 0; i < names.length; i++) {
                    name = names[i];
                    this.add(name, obj[name]);
                }
            }  
        },

        getKeys: function () {
            return new Bridge.DictionaryCollection$1(TKey)(this, true);
        },

        getValues: function () {
            return new Bridge.DictionaryCollection$1(TKey)(this, false);
        },

        clear: function () {
            this.entries = {};
            this.count = 0;
        },

        findEntry : function (key) {
            var hash = this.comparer.getHashCode(key),
                entries,
                i;

            if (Bridge.isDefined(this.entries[hash])) {
                entries = this.entries[hash];
                for (i = 0; i < entries.length; i++) {
                    if (this.comparer.equals(entries[i].key, key)) {
                        return entries[i];
                    }
                }
            }
        },

        containsKey: function (key) {
            return !!this.findEntry(key);
        },

        containsValue: function (value) {
            var e, i;

            for (e in this.entries) {
                if (this.entries.hasOwnProperty(e)) {
                    var entries = this.entries[e];
                    for (i = 0; i < entries.length; i++) {
                        if (this.comparer.equals(entries[i].value, value)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        },

        get: function (key) {
            var entry = this.findEntry(key);

            if (!entry) {
                throw new Bridge.KeyNotFoundException('Key ' + key + ' does not exist.');
            }

            return entry.value;
        },

        set: function (key, value, add) {
            var entry = this.findEntry(key),
                hash;

            if (entry) {
                if (add) {
                    throw new Bridge.ArgumentException('Key ' + key + ' already exists.');
                }

                entry.value = value;
                return;
            }

            hash = this.comparer.getHashCode(key);
            entry = new Bridge.KeyValuePair$2(TKey, TValue)(key, value);

            if (this.entries[hash]) {
                this.entries[hash].push(entry);
            }
            else {
                this.entries[hash] = [entry];
            }            

            this.count++;
        },

        add: function (key, value) {
            this.set(key, value, true);
        },

        remove: function (key) {
            var hash = this.comparer.getHashCode(key),
                entries,
                i;

            if (!this.entries[hash]) {
                return false;
            }

            entries = this.entries[hash];
            for (i = 0; i < entries.length; i++) {
                if (this.comparer.equals(entries[i].key, key)) {
                    entries.splice(i, 1);
                    if (entries.length == 0) {
                        delete this.entries[hash];
                    }
                    this.count--;
                    return true;
                }
            }

            return false;
        },

        getCount: function () {
            return this.count;
        },

        getComparer: function () {
            return this.comparer;
        },

        tryGetValue: function (key, value) {
            var entry = this.findEntry(key);
            value.v = entry ? entry.value : Bridge.getDefaultValue(TValue);
            return !!entry;
        },

        getCustomEnumerator: function (fn) {
            var hashes = Bridge.getPropertyNames(this.entries),
                hashIndex = -1,
                keyIndex;

            return new Bridge.CustomEnumerator(function () {
                if (hashIndex < 0 || keyIndex >= (this.entries[hashes[hashIndex]].length - 1)) {
                    keyIndex = -1;
                    hashIndex++;
                }
                if (hashIndex >= hashes.length) {
                    return false;
                }
                    
                keyIndex++;
                return true;
            }, function () {
                return fn(this.entries[hashes[hashIndex]][keyIndex]);
            }, function () {
                hashIndex = -1;
            }, null, this);
        },

        getEnumerator: function () {
            return new Bridge.DictionaryEnumerator(this.entries);
        }
    }));
});

Bridge.Class.generic('Bridge.DictionaryCollection$1', function (T) {
    var $$name = Bridge.Class.genericName('Bridge.DictionaryCollection$1', T);
    return Bridge.Class.cache[$$name] || (Bridge.Class.cache[$$name] = Bridge.Class.extend($$name, {
        $extend: [Bridge.ICollection$1(T)],

        $init: function (dictionary, keys) {
            this.dictionary = dictionary;
            this.keys = keys;
        },

        getCount: function () {
            return this.dictionary.getCount();
        },

        getEnumerator: function () {
            return this.dictionary.getCustomEnumerator(this.keys ? function (e) {
                return e.key;
            } : function (e) {
                return e.value;
            });
        },

        contains: function (value) {
            return this.keys ? this.dictionary.containsKey(value) : this.dictionary.containsValue(value);
        },

        add: function (v) {
            throw new Bridge.NotSupportedException();
        },
        
        clear: function () {
            throw new Bridge.NotSupportedException();
        },

        remove: function () {
            throw new Bridge.NotSupportedException();
        }
    }));
});
Bridge.Class.generic('Bridge.List$1', function (T) {
    var $$name = Bridge.Class.genericName('Bridge.List$1', T);
    return Bridge.Class.cache[$$name] || (Bridge.Class.cache[$$name] = Bridge.Class.extend($$name, {
        $extend: [Bridge.ICollection$1(T), Bridge.ICollection],
        $init: function (obj) {
            if (Object.prototype.toString.call(obj) === '[object Array]') {
                this.items = obj;
            }
            else if (Bridge.is(obj, Bridge.IEnumerable)) {
                this.items = Bridge.toArray(obj);
            }
            else {
                this.items = [];
            }
        },

        checkIndex: function (index) {
            if (index < 0 || index > (this.items.length - 1)) {
                throw new Bridge.ArgumentOutOfRangeException('Index out of range');
            }
        },

        getCount: function () {
            return this.items.length;
        },

        get: function (index) {
            this.checkIndex(index);

            return this.items[index];
        },

        set: function (index, value) {
            this.checkIndex(index);
            this.items[index] = value;
        },

        add: function (value) {
            this.items.push(value);
        },

        addRange: function (items) {
            var array = Bridge.toArray(items),
                i,
                len;

            for (i = 0, len = array.length; i < len; ++i) {
                this.items.push(array[i]);
            }
        },

        clear: function () {
            this.items = [];
        },

        indexOf: function (item, startIndex) {
            var i;

            if (!Bridge.isDefined(startIndex)) {
                startIndex = 0;
            }

            if (startIndex != 0) {
                this.checkIndex(index);
            }

            for (i = startIndex; i < this.items.length; i++) {
                if (item === this.items[i]) {
                    return i;
                }
            }

            return -1;
        },

        contains: function (item) {
            return this.indexOf(item) > -1;
        },

        getEnumerator: function () {
            return new Bridge.ArrayEnumerator(this.items);
        },

        getRange: function (index, count) {
            if (!Bridge.isDefined(index)) {
                index = 0;
            }

            if (!Bridge.isDefined(count)) {
                count = this.items.length;
            }

            if (index != 0) {
                this.checkIndex(index);
            }

            this.checkIndex(index + count - 1);

            var result = [],
                i;

            for (i = index; i < count; i++) {
                result.push(this.items[i]);
            }

            return result;
        },

        insert: function (index, item) {
            if (index != 0) {
                this.checkIndex(index);
            }


            if (Bridge.isArray(item)) {
                for (var i = 0; i < item.length; i++) {
                    this.insert(index++, item[i]);
                }
            }
            else {
                this.items.splice(index, 0, item);
            }
        },

        join: function (delimeter) {
            return this.items.join(delimeter);
        },

        lastIndexOf: function (item, fromIndex) {
            if (!Bridge.isDefined(fromIndex)) {
                fromIndex = this.items.length - 1;
            }

            if (fromIndex != 0) {
                this.checkIndex(fromIndex);
            }

            for (var i = fromIndex; i >= 0; i--) {
                if (item === this.items[i]) {
                    return i;
                }
            }

            return -1;
        },

        remove: function (item) {
            var index = this.indexOf(item);

            this.checkIndex(index);
            this.items.splice(index, 1);
        },

        removeAt: function (index) {
            this.checkIndex(index);
            this.items.splice(index, 1);
        },

        removeRange: function (index, count) {
            this.checkIndex(index);
            this.items.splice(index, count);
        },

        reverse: function () {
            this.items.reverse();
        },

        slice: function (start, end) {
            this.items.slice(start, end);
        },

        sort: function (comparison) {
            this.items.sort(comparison);
        },

        splice: function (start, count, items) {
            this.items.splice(start, count, items);
        },

        unshift: function () {
            this.items.unshift();
        },

        toArray: function () {
            return Bridge.toArray(this);
        }
    }));
});


// @source resources/Task.js

Bridge.Class.extend('Bridge.Task', {
    $init: function (action, state) {
        this.action = action;
        this.state = state;
        this.error = null;
        this.status = Bridge.TaskStatus.created;
        this.callbacks = [];
        this.result = null;
    },

    $statics: {
        delay : function (delay, state) {
            var task = new Bridge.Task();
            setTimeout(function () {
                task.setResult(state);
            }, delay);
            return task;
        },

        fromResult : function (result) {
            var task = new Bridge.Task();
            t.status = Bridge.TaskStatus.ranToCompletion;
            t.result = result;
            return t;
        },

        run : function (fn) {
            var task = new Bridge.Task();
            setTimeout(function() {
                try {
                    task.setResult(fn());
                }
                catch (e) {
                    task.setError(e);
                }
            }, 0);
            return task;
        },

        whenAll : function (tasks) {
            var task = new Bridge.Task(),
                result,
                executing = tasks.length, 
                cancelled = false, 
                errors = [],
                i;

            if (!Bridge.isArray(tasks)) {
                tasks = Array.prototype.slice.call(arguments, 0);
            }

            if (tasks.length === 0) {
                task.setResult([]);
                return task;
            }

            result = new Array(tasks.length);
            for (i = 0; i < tasks.length; i++) {                
                tasks[i].$index = i;
                tasks[i].continueWith(function (t) {
                    switch (t.status) {
                        case Bridge.TaskStatus.ranToCompletion:
                            result[t.$index] = t.getResult();
                            break;
                        case Bridge.TaskStatus.canceled:
                            cancelled = true;
                            break;
                        case Bridge.TaskStatus.faulted:
                            errors.push(t.error);                                
                            break;
                        default:
                            throw new Bridge.InvalidOperationException('Invalid task status: ' + t.status);
                    }

                    executing--;
                    if (!executing) {
                        if (errors.length > 0) {
                            task.setError(errors);
                        }
                        else if (cancelled) {
                            task.setCanceled();
                        }
                        else {
                            task.setResult(result);
                        }
                    }
                });
            }

            return task;
        },

        whenAny : function (tasks) {
            if (!Bridge.isArray(tasks)) {
                tasks = Array.prototype.slice.call(arguments, 0);
            }

            if (!tasks.length) {
                throw new Bridge.ArgumentException('At least one task is required');
            }

            var task = new Bridge.Task(),
                i;
            for (i = 0; i < tasks.length; i++) {
                tasks[i].continueWith(function(t) {
                    switch (t.status) {
                        case Bridge.TaskStatus.ranToCompletion:
                            task.complete(t);
                            break;
                        case Bridge.TaskStatus.canceled:
                            task.cancel();
                            break;
                        case Bridge.TaskStatus.faulted:
                            task.fail(t.error);
                            break;
                        default:
                            throw new Bridge.InvalidOperationException('Invalid task status: ' + t.status);
                    }
                });
            }

            return task;
        },

        fromCallback : function (target, method) {
            var task = new Bridge.Task(),
                args = Array.prototype.slice.call(arguments, 2),
                callback;

            callback = function (value) {
                task.setResult(value);
            };
	
            args.push(callback);

            target[method].apply(target, args);
            return task;
        },

        fromCallbackResult: function (target, method, resultHandler) {
            var task = new Bridge.Task(),
                args = Array.prototype.slice.call(arguments, 3),
                callback;

            callback = function (value) {
                task.setResult(value);
            };

            resultHandler(args, callback);

            target[method].apply(target, args);
            return task;
        },

        fromCallbackOptions: function (target, method, name) {
            var task = new Bridge.Task(),
                args = Array.prototype.slice.call(arguments, 3),
                callback;

            callback = function (value) {
                task.setResult(value);
            };

            args[0] = args[0] || {};
            args[0][name] = callback;

            target[method].apply(target, args);
            return task;
        },

        fromPromise : function (promise, handler) {
            var task = new Bridge.Task();

            if (!promise.then) {
                promise = promise.promise();
            }

            promise.then(function() {
                task.setResult(handler ? handler.apply(null, arguments) : arguments);
            }, function() {
                task.setError(new Error(Array.prototype.slice.call(arguments, 0)));
            });

            return task;
        }
    },

    continueWith: function (continuationAction) {
        var task = new Bridge.Task(),
            me = this,
            fn = function() {
                try {
                    task.setResult(continuationAction(me));
                }
                catch (e) {
                    task.setError(e);
                }
            };

        if (this.isCompleted()) {
            setTimeout(fn, 0);
        }
        else {
            this.callbacks.push(fn);
        }

        return task;
    },

    start: function () {
        if (this.status !== Bridge.TaskStatus.created) {
            throw new Error('Task was already started.');
        }

        var me = this;
        this.status = Bridge.TaskStatus.running;
        setTimeout(function() {
            try {
                var result = me.action(me.state);
                delete me.action;
                delete me.state;
                me.complete(result);
            }
            catch (e) {
                me.fail(e);
            }
        }, 0);
    },

    runCallbacks: function () {
        for (var i = 0; i < this.callbacks.length; i++) {
            this.callbacks[i](this);
        }
        delete this.callbacks;
    },

    complete: function (result) {
        if (this.isCompleted()) {
            return false;
        }
        this.result = result;
        this.status = Bridge.TaskStatus.ranToCompletion;
        this.runCallbacks();
        return true;
    },

    fail: function (error) {
        if (this.isCompleted()) {
            return false;
        }
        this.error = error;
        this.status = Bridge.TaskStatus.faulted;
        this.runCallbacks();
        return true;
    },

    cancel: function () {
        if (this.isCompleted()) {
            return false;
        }
        this.status = Bridge.TaskStatus.canceled;
        this.runCallbacks();
        return true;
    },

    isCanceled: function () {
        return this.status === Bridge.TaskStatus.canceled;
    },

    isCompleted: function () {
        return this.status == Bridge.TaskStatus.ranToCompletion || this.status == Bridge.TaskStatus.canceled || this.status == Bridge.TaskStatus.faulted;
    },

    isFaulted: function () {
        return this.status === Bridge.TaskStatus.faulted;
    },

    getResult: function () {
        switch (this.status) {
            case Bridge.TaskStatus.ranToCompletion:
                return this.result;
            case Bridge.TaskStatus.canceled:
                throw new Error('Task was cancelled.');
            case Bridge.TaskStatus.faulted:
                throw this.error;
            default:
                throw new Error('Task is not yet completed.');
        }
    },

    setCanceled: function () {
        if (!this.cancel()) {
            throw new Error('Task was already completed.');
        }
    },

    setResult: function (result) {
        if (!this.complete(result)) {
            throw new Error('Task was already completed.');
        }
    },

    setError: function (error) {
        if (!this.fail(error)) {
            throw new Error('Task was already completed.');
        }
    },
                                        
    dispose: function () {
    },

    getAwaiter: function () {
        return this;
    }
});

Bridge.Class.extend('Bridge.TaskStatus', {
    $statics: {
        created: 0,
        waitingForActivation: 1,
        waitingToRun: 2,
        running: 3,
        waitingForChildrenToComplete: 4,
        ranToCompletion: 5,
        canceled: 6,
        faulted: 7
    }
});
Bridge.Validation = {
    isNull: function (value) {
        return !Bridge.isDefined(value, true);
    },

    isEmpty: function (value) {
        return value == null || value.length === 0 || Bridge.is(value, Bridge.ICollection) ? value.getCount() == 0 : false;
    },

    isNotEmptyOrWhitespace: function (value) {
        return Bridge.isDefined(value, true) && !(/^$|\s+/.test(value));
    },

    isNotNull: function (value) {
        return Bridge.isDefined(value, true);
    },

    isNotEmpty: function (value) {
        return !Bridge.Validation.isEmpty(value);
    },

    email : function (value) {
        var re = /^(")?(?:[^\."])(?:(?:[\.])?(?:[\w\-!#$%&'*+/=?^_`{|}~]))*\1@(\w[\-\w]*\.){1,5}([A-Za-z]){2,6}$/;
        return re.test(value);
    },

    url: function (value) {
        var re = /(((^https?)|(^ftp)):\/\/((([\-\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\\/+@&#;`~=%!]*)(\.\w{2,})?)*)|(localhost|LOCALHOST))\/?)/i;
        return re.test(value);
    },

    alpha: function (value) {
        var re = /^[a-zA-Z_]+$/;
        return re.test(value);
    },

    alphaNum: function (value) {
        var re = /^[a-zA-Z_]+$/;
        return re.test(value);
    },

    creditCard: function (value, type) {
        var re,
            checksum,
            i,
            digit;

        if (type == "Visa") {
            // Visa: length 16, prefix 4, dashes optional.
            re = /^4\d{3}-?\d{4}-?\d{4}-?\d{4}$/;
        } else if (type == "MasterCard") {
            // Mastercard: length 16, prefix 51-55, dashes optional.
            re = /^5[1-5]\d{2}-?\d{4}-?\d{4}-?\d{4}$/;
        } else if (type == "Discover") {
            // Discover: length 16, prefix 6011, dashes optional.
            re = /^6011-?\d{4}-?\d{4}-?\d{4}$/;
        } else if (type == "AmericanExpress") {
            // American Express: length 15, prefix 34 or 37.
            re = /^3[4,7]\d{13}$/;
        } else if (type == "DinersClub") {
            // Diners: length 14, prefix 30, 36, or 38.
            re = /^3[0,6,8]\d{12}$/;
        }
        else {
            // Basing min and max length on
            // http://developer.ean.com/general_info/Valid_Credit_Card_Types
            if (!value || value.length < 13 || value.length > 19) {
                return false;
            }

            re = /[^0-9 \-]+/;
        }

        if (!re.test(value)) {
            return false;
        }
        // Remove all dashes for the checksum checks to eliminate negative numbers
        value = value.split("-").join("");
        // Checksum ("Mod 10")
        // Add even digits in even length strings or odd digits in odd length strings.
        checksum = 0;
        for (i = (2 - (value.length % 2)) ; i <= value.length; i += 2) {
            checksum += parseInt(ccnum.charAt(i - 1));
        }
        // Analyze odd digits in even length strings or even digits in odd length strings.
        for (i = (value.length % 2) + 1; i < value.length; i += 2) {
            digit = parseInt(value.charAt(i - 1)) * 2;
            if (digit < 10) {
                checksum += digit;
            } else {
                checksum += (digit - 9);
            }
        }

        return (checksum % 10) == 0;
    }
};
Bridge.Class.extend('Bridge.Attribute', {
});
Bridge.Class.extend('Bridge.INotifyPropertyChanged', {});
Bridge.Class.extend('Bridge.PropertyChangedEventArgs', {
    $init: function (propertyName) {
        this.propertyName = propertyName;
    }
});
Bridge.Class.extend('Bridge.Aspects.AspectAttribute', {
    $extend: [Bridge.Attribute]
});

Bridge.Class.extend('Bridge.Aspects.MulticastAspectAttribute', {
    $extend: [Bridge.Aspects.AspectAttribute]
});
Bridge.Class.extend('Bridge.Aspects.AbstractMethodAspectAttribute', {
    $extend: [Bridge.Aspects.MulticastAspectAttribute],

    $$setAspect: Bridge.emptyFn,

    init: function (methodName, scope) {
        this.methodName = methodName;
        this.scope = scope;
        this.targetMethod = this.scope[this.methodName];

        if (!this.runTimeValidate(methodName, scope)) {
            return;
        }

        this.scope.$$aspects = this.scope.$$aspects || {};
        if (!this.scope.$$aspects[this.$$name]) {
            this.scope.$$aspects[this.$$name] = [];
        }
        this.scope.$$aspects[this.$$name].push(this);        

        this.$$setAspect();
    },

    remove: function () {
        var i,
            aspects = this.scope.$$aspects[this.$$name];

        this.scope[this.methodName] = this.targetMethod;

        for (i = aspects.length - 1; i >= 0; i--) {
            if (aspects[i] === this) {
                aspects.splice(i, 1);
                return;
            }
        }
    },

    runTimeValidate: function () {
        return true;
    }
});

Bridge.Class.extend('Bridge.Aspects.MethodAspectAttribute', {
    $extend: [Bridge.Aspects.AbstractMethodAspectAttribute],

    onEntry: Bridge.emptyFn,
    onExit: Bridge.emptyFn,
    onSuccess: Bridge.emptyFn,
    onException: Bridge.emptyFn,    

    $$setAspect: function () {
        var me = this,
            fn = function () {
                var methodArgs = {
                        arguments: arguments,
                        methodName: me.methodName,
                        scope: me.scope,
                        exception: null,
                        flow: 0
                    },                    
                    catchException;

                me.onEntry(methodArgs);

                if (methodArgs.flow == 3) {
                    return methodArgs.returnValue;
                }

                try {
                    methodArgs.returnValue = me.targetMethod.apply(me.scope, methodArgs.arguments);

                    if (methodArgs.flow == 3) {
                        return methodArgs.returnValue;
                    }

                    me.onSuccess(methodArgs);
                }
                catch (e) {
                    methodArgs.exception = Bridge.Exception.create(e);                    

                    catchException = me.$$exceptionTypes.length == 0;
                    if (me.$$exceptionTypes.length > 0) {
                        for (var i = 0; i < me.$$exceptionTypes.length; i++) {
                            if (Bridge.is(methodArgs.exception, me.$$exceptionTypes[i])) {
                                catchException = true;
                                break;
                            }
                        }
                    }

                    if (catchException) {
                        me.onException(methodArgs);
                    }                    

                    if (methodArgs.flow == 3) {
                        return methodArgs.returnValue;
                    }

                    if (methodArgs.flow == 2 && methodArgs.flow == 0) {
                        throw e;
                    }
                }
                finally {
                    me.onExit(methodArgs);
                }

                return methodArgs.returnValue;
            };

        this.$$exceptionTypes = this.getExceptionsTypes(this.methodName, this.scope) || [];
        this.scope[this.methodName] = fn;
    },    

    getExceptionsTypes: function () {
        return [];
    }    
});

Bridge.Class.extend('Bridge.Aspects.BufferedMethodAttribute', {
    $extend: [Bridge.Aspects.AbstractMethodAspectAttribute],

    $init: function (buffer) {
        this.buffer = buffer;
    },

    $$setAspect: function () {
        var me = this,
            timeoutId,
            fn = function () {
                var args = Array.prototype.slice.call(arguments, 0);

                if (timeoutId) {
                    clearTimeout(timeoutId);
                }

                timeoutId = setTimeout(function () {
                    me.targetMethod.apply(me.scope, args);
                }, me.buffer);
            };

        this.scope[this.methodName] = fn;
    }
});

Bridge.Class.extend('Bridge.Aspects.BarrierMethodAttribute', {
    $extend: [Bridge.Aspects.AbstractMethodAspectAttribute],

    $init: function (count) {
        this.count = count;
    },

    $$setAspect: function () {
        var me = this,
            fn = function () {
                if (!--me.count) {
                    me.targetMethod.apply(me.scope, arguments);
                }
            };

        this.scope[this.methodName] = fn;
    }
});

Bridge.Class.extend('Bridge.Aspects.DelayedMethodAttribute', {
    $extend: [Bridge.Aspects.AbstractMethodAspectAttribute],

    $init: function (delay) {
        this.delay = delay;
    },

    $$setAspect: function () {
        var me = this,
            fn = function () {
                var args = Array.prototype.slice.call(arguments);

                setTimeout(function () {
                    me.targetMethod.apply(me.scope, args);
                }, me.delay);
            };

        this.scope[this.methodName] = fn;
    }
});

Bridge.Class.extend('Bridge.Aspects.ThrottledMethodAttribute', {
    $extend: [Bridge.Aspects.AbstractMethodAspectAttribute],

    $init: function (interval) {
        this.interval = interval;
    },

    $$setAspect: function () {
        var me = this,
            lastCallTime = 0,
            elapsed,
            lastArgs,
            timer,
            execute = function () {
                me.targetMethod.apply(me.scope, lastArgs);
                lastCallTime = +new Date();
                timer = null;
            };

        this.scope[this.methodName] =  function () {
            elapsed = +new Date() - lastCallTime;
            lastArgs = arguments;
            if (elapsed >= me.interval) {
                clearTimeout(timer);
                execute();
            }
            else if (!timer) {
                timer = setTimeout(execute, me.interval - elapsed);
            }
        };        
    }
});
Bridge.Class.extend('Bridge.Aspects.PropertyAspectAttribute', {
    $extend: [Bridge.Aspects.MulticastAspectAttribute],

    onGetValue: Bridge.emptyFn,
    onSetValue: Bridge.emptyFn,
    onSuccess: Bridge.emptyFn,
    onException: Bridge.emptyFn,

    init: function (propertyName, scope) {
        this.propertyName = propertyName;
        this.scope = scope;
        this.getter = this.scope["get" + this.propertyName];
        this.setter = this.scope["set" + this.propertyName];

        if (!this.runTimeValidate(propertyName, scope)) {
            return;
        }

        this.scope.$$aspects = this.scope.$$aspects || {};
        if (!this.scope.$$aspects[this.$$name]) {
            this.scope.$$aspects[this.$$name] = [];
        }
        this.scope.$$aspects[this.$$name].push(this);
        this.$$exceptionTypes = this.getExceptionsTypes(propertyName, scope) || [];

        this.$$setAspect();
    },

    $$setAspect: function () {
        var fn = function (me, isGetter) {
                return function (value) {
                    var methodArgs = {
                            value: value,
                            propertyName: me.propertyName,
                            scope: me.scope,
                            exception: null,
                            flow: 0,
                            isGetter : isGetter
                        },                    
                        catchException;

                    if (isGetter) {
                        me.onGetValue(methodArgs);
                    }
                    else {
                        me.onSetValue(methodArgs);
                    }

                    if (methodArgs.flow == 3) {
                        return isGetter ? methodArgs.value : undefined;
                    }

                    try {
                        if (isGetter) {
                            methodArgs.value = me.getter.call(me.scope);
                        }
                        else {
                            me.setter.call(me.scope, methodArgs.value);
                        }

                        if (methodArgs.flow == 3) {
                            return isGetter ? methodArgs.value : undefined;
                        }

                        me.onSuccess(methodArgs);                        
                    }
                    catch (e) {
                        methodArgs.exception = Bridge.Exception.create(e);                    

                        catchException = me.$$exceptionTypes.length == 0;
                        if (me.$$exceptionTypes.length > 0) {
                            for (var i = 0; i < me.$$exceptionTypes.length; i++) {
                                if (Bridge.is(methodArgs.exception, me.$$exceptionTypes[i])) {
                                    catchException = true;
                                    break;
                                }
                            }
                        }

                        if (catchException) {
                            me.onException(methodArgs);
                        }                    

                        if (methodArgs.flow == 3) {
                            return isGetter ? methodArgs.value : undefined;
                        }

                        if (methodArgs.flow == 2 && methodArgs.flow == 0) {
                            throw e;
                        }
                    }

                    return isGetter ? methodArgs.value : undefined;
                }
            };

        this.$$initAccessors(fn);
    },

    $$initAccessors: function (fn) {
        if (this.getter) {
            this.scope["get" + this.propertyName] = fn(this, true);
        }

        if (this.setter) {
            this.scope["set" + this.propertyName] = fn(this, false);
        }
    },

    remove: function () {
        var i,
            aspects = this.scope.$$aspects[this.$$name];

        this.scope[this.propertyName] = this.getter;
        this.scope[this.propertyName] = this.setter;
        
        for (i = aspects.length - 1; i >= 0; i--) {
            if (aspects[i] === this) {
                aspects.splice(i, 1);
                return;
            }
        }
    },

    getExceptionsTypes: function () {
        return [];
    },

    runTimeValidate: function () {
        return true;
    }
});
Bridge.Class.extend('Bridge.Aspects.TypeAspectAttribute', {
    $extend: [Bridge.Aspects.MulticastAspectAttribute],

    onInstance: Bridge.emptyFn,
    onAfterInstance: Bridge.emptyFn,

    init: function (instance, arguments) {
        this.instance = instance;
        this.typeName = instance.$$name;
        this.arguments = arguments;

        if (!this.runTimeValidate(instance)) {
            return;
        }

        this.instance.$$aspects = this.instance.$$aspects || {};
        if (!this.instance.$$aspects[this.$$name]) {
            this.instance.$$aspects[this.$$name] = [];
        }
        this.instance.$$aspects[this.$$name].push(this);
        this.$$setAspect();
    },

    $$setAspect: function () {
        var me = this;
        this.$$targetInitCtor = this.instance.$$initCtor;
        this.instance.$$initCtor = function () {
            var args = {
                instance: me.instance,
                typeName: me.typeName,
                arguments: arguments
            };

            me.onInstance(args);

            me.$$targetInitCtor.apply(me.instance, args.arguments)

            me.onAfterInstance(args);
        };
    },

    runTimeValidate: function () {
        return true;
    }
});
Bridge.Class.extend('Bridge.Aspects.NotifyPropertyChangedAttribute', {
    $extend: [Bridge.Aspects.MulticastAspectAttribute],

    $statics: {
        globalSuspendCounter: 0,

        resumeEvents: function (instance) {
            if (Bridge.isDefined(instance, true)) {
                var a = instance.$$aspects;
                if (a && Bridge.isDefined(a.$$notifyPropertySuspendCounter)) {
                    a.$$notifyPropertySuspendCounter--;
                }
            }
            else {
                this.globalSuspendCounter--;
            }
        },

        suspendEvents: function (instance) {
            if (Bridge.isDefined(instance, true)) {
                var a = instance.$$aspects;
                if (a && Bridge.isDefined(a.$$notifyPropertySuspendCounter)) {
                    a.$$notifyPropertySuspendCounter++;
                }
            }
            else {
                this.globalSuspendCounter++;
            }
        },

        raiseEvents: function (instance) {
            if (instance && instance.$$aspects) {
                var i,
                    aspects = instance.$$aspects[this.$$name];

                for (i = 0; i < aspects.length; i++) {
                    aspects[i].raiseEvent();
                }
            }
        }
    },

    $initMembers: function () {
        this.raiseOnChange = true;
    },

    init: function (propertyName, scope) {        
        this.propertyName = propertyName;
        this.scope = scope;
        this.getter = this.scope["get" + this.propertyName];
        this.setter = this.scope["set" + this.propertyName];

        if (!this.runTimeValidate(propertyName, scope)) {
            return;
        }

        this.scope.$$aspects = this.scope.$$aspects || {};
        if (!this.scope.$$aspects[this.$$name]) {
            this.scope.$$aspects[this.$$name] = [];
        }
        this.scope.$$aspects[this.$$name].push(this);

        if (!Bridge.isDefined(this.scope.$$aspects.$$notifyPropertySuspendCounter)) {
            this.scope.$$aspects.$$notifyPropertySuspendCounter = 0;
        }

        this.$$setAspect();
    },

    $$setAspect: function () {        
        if (this.setter) {
            var me = this;
            this.scope["set" + this.propertyName] = function (value) {
                var args = {
                    value: value,
                    propertyName: me.propertyName,
                    scope: me.scope,
                    flow: 0,
                    force: false
                };

                if (me.raiseOnChange) {
                    args.lastValue = me.getter();
                }

                me.setter.call(me.scope, args.value);
                me.onSetValue(args);                
            };
        }
    },

    beforeEvent: Bridge.emptyFn,

    onSetValue: function (args) {
        this.beforeEvent(args);

        if (args.flow === 3) {
            return;
        }

        if (args.flow !== 1) {
            if (Bridge.Aspects.NotifyPropertyChangedAttribute.globalSuspendCounter) {
                return;
            }
            
            if (this.scope.$$aspects.$$notifyPropertySuspendCounter) {
                return;
            }
        }

        var raise = true;
        if (this.raiseOnChange) {
            raise = args.value !== args.lastValue;
        }
        
        if (raise) {
            if (this.scope.onPropertyChanged) {
                this.scope.onPropertyChanged(args.propertyName);
            }
            else if (this.scope.propertyChanged) {
                this.scope.propertyChanged(this.scope, { propertyName: args.propertyName });
            }
        }
    },

    raiseEvent: function () {
        var args = {
            propertyName: this.propertyName,
            scope: this.scope,
            flow: 0,
            force: true,
            value: null
        };
        
        this.beforeEvent(args);

        if (args.flow === 3) {
            return;
        }

        if (this.scope.onPropertyChanged) {
            this.scope.onPropertyChanged(args.propertyName);
        }
        else if (this.scope.propertyChanged) {
            this.scope.propertyChanged(this.scope, { propertyName: args.propertyName });
        }
    },

    runTimeValidate: function () {
        return true;
    }
});
Bridge.Class.extend('Bridge.Aspects.ParameterAspectAttribute', {
    $extend: [Bridge.Aspects.MulticastAspectAttribute],

    init: function (argName, argIndex, argType, methodName, scope) {
        this.parameterName = argName;
        this.parameterIndex = argIndex;
        this.parameterType = argType;
        this.methodName = methodName;
        this.scope = scope;
        this.targetMethod = this.scope[this.methodName];

        if (!this.runTimeValidate(argName, argIndex, argType, methodName, scope)) {
            return;
        }

        this.scope.$$aspects = this.scope.$$aspects || {};
        if (!this.scope.$$aspects[this.$$name]) {
            this.scope.$$aspects[this.$$name] = [];
        }
        this.scope.$$aspects[this.$$name].push(this);

        this.$$setAspect();
    },

    remove: function () {
        var i,
            aspects = this.scope.$$aspects[this.$$name];

        this.scope[this.methodName] = this.targetMethod;

        for (i = aspects.length - 1; i >= 0; i--) {
            if (aspects[i] === this) {
                aspects.splice(i, 1);
                return;
            }
        }
    },

    runTimeValidate: function () {
        return true;
    },

    parameterValidate: Bridge.emptyFn,

    $$setAspect: function () {
        var me = this,
            fn = function () {
                var args = Array.prototype.slice.call(arguments, 0),
                    valArg = {
                        parameterIndex: me.parameterIndex,
                        parameterType: me.parameterType,
                        parameterName: me.parameterName,
                        parameter: args[me.parameterIndex],
                        methodName: me.methodName,
                        scope: me.scope
                    };

                me.parameterValidate(valArg);
                args[me.parameter] = valArg.parameter;
                return me.targetMethod.apply(me.scope, args);
            };

        this.scope[this.methodName] = fn;
    }
});

Bridge.Class.extend('Bridge.Aspects.ParameterContractAspectAttribute', {
    $extend: [Bridge.Aspects.ParameterAspectAttribute],

    parameterValidate: function (arg) {
        if (this.validate(arg) === false) {
            throw this.createException(arg);
        }
    },

    createException: function (arg) {
        return new Bridge.ArgumentException(this.message, arg.parameterName);
    },

    validate: Bridge.emptyFn
});

Bridge.Class.extend('Bridge.Aspects.CreditCardAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    $init: function (type) {
        this.type = type;
    },

    validate: function (arg) {
        return Bridge.Validation.isNull(arg.parameter) || Bridge.Validation.creditCard(arg.parameter, this.type);
    }
});

Bridge.Class.extend('Bridge.Aspects.EmailAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    validate: function (arg) {
        return Bridge.Validation.isNull(arg.parameter) || Bridge.Validation.email(arg.parameter);
    }
});

Bridge.Class.extend('Bridge.Aspects.UrlAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    validate: function (arg) {
        return Bridge.Validation.isNull(arg.parameter) || Bridge.Validation.url(arg.parameter);
    }
});

Bridge.Class.extend('Bridge.Aspects.GreaterThanAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    $init: function (min, strict) {
        this.min = min;
        this.strict = strict;
    },

    createException: function (arg) {
        return new Bridge.ArgumentOutOfRangeException(arg.parameterName, this.message, null, arg.parameter);
    },

    validate: function (arg) {
        return this.strict !== false ? arg.parameter > this.min : arg.parameter >= this.min;
    }
});

Bridge.Class.extend('Bridge.Aspects.LessThanAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    $init: function (max, strict) {
        this.max = max;
        this.strict = strict;
    },

    createException: function (arg) {
        return new Bridge.ArgumentOutOfRangeException(arg.parameterName, this.message, null, arg.parameter);
    },

    validate: function (arg) {
        return this.strict !== false ? arg.parameter < this.max : arg.parameter <= this.max;
    }
});

Bridge.Class.extend('Bridge.Aspects.NotEmptyAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    createException: function (arg) {
        return new Bridge.ArgumentNullException(arg.parameterName, this.message);
    },

    validate: function (arg) {
        return Bridge.Validation.isNotEmpty(arg.parameter);
    }
});

Bridge.Class.extend('Bridge.Aspects.NotNullAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    createException: function (arg) {
        return new Bridge.ArgumentNullException(arg.parameterName, this.message);
    },

    validate: function (arg) {
        return Bridge.Validation.isNotNull(arg.parameter);
    }
});

Bridge.Class.extend('Bridge.Aspects.PositiveAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    createException: function (arg) {
        return new Bridge.ArgumentOutOfRangeException(arg.parameterName, this.message, null, arg.parameter);
    },

    validate: function (arg) {
        return arg.parameter >= 0;
    }
});

Bridge.Class.extend('Bridge.Aspects.NegativeAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    createException: function (arg) {
        return new Bridge.ArgumentOutOfRangeException(arg.parameterName, this.message, null, arg.parameter);
    },

    validate: function (arg) {
        return arg.parameter < 0;
    }
});

Bridge.Class.extend('Bridge.Aspects.RangeAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    $init: function (min, max, strict) {
        this.min = min;
        this.max = max;
        this.strict = strict;
    },

    createException: function (arg) {
        return new Bridge.ArgumentOutOfRangeException(arg.parameterName, this.message, null, arg.parameter);
    },

    validate: function (arg) {
        if (this.strict === false) {
            return arg.parameter <= this.max && arg.parameter >= this.min;
        }
        return arg.parameter < this.max && arg.parameter > this.min;
    }
});

Bridge.Class.extend('Bridge.Aspects.RequiredAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    createException: function (arg) {
        return new Bridge.ArgumentNullException(arg.parameterName, this.message, null);
    },

    validate: function (arg) {
        return Bridge.Validation.isNotEmptyOrWhitespace(arg.parameter);
    }
});

Bridge.Class.extend('Bridge.Aspects.LengthAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    $init: function (max, min) {
        this.max = max;
        this.min = min || 0;
    },

    validate: function (arg) {
        return Bridge.Validation.isNull(arg.parameter) || (arg.parameter.length >= this.min && arg.parameter.length <= this.max);
    }
});

Bridge.Class.extend('Bridge.Aspects.RegularExpressionAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    $init: function (pattern, flags) {
        this.regExp = new RegExp(pattern, flags);
    },

    validate: function (arg) {
        return Bridge.Validation.isNull(arg.parameter) || this.regExp.test(arg.parameter);
    }
});

Bridge.Class.extend('Bridge.Aspects.ValidatorAttribute', {
    $extend: [Bridge.Aspects.ParameterContractAspectAttribute],

    $init: function (fn) {
        this.fn = Bridge.isString(fn) ? eval(fn) : fn;
    },

    validate: function (arg) {
        return this.fn(arg.parameter);
    }
});