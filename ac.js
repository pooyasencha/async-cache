module.exports = AsyncCache;

var LRU = require('lru-cache');

function AsyncCache(opt) {
  if (!opt || typeof opt !== 'object')
    throw new Error('options must be an object');

  if (!opt.load && !opt.inPlace)
    throw new Error('load function is required');

  if (!(this instanceof AsyncCache))
    return new AsyncCache(opt);

  this._opt = opt;
  this._cache = new LRU(opt);
  this._load = opt.load;
  this._loading = {};
  this._allowStale = opt.stale;
}

Object.defineProperty(AsyncCache.prototype, 'itemCount', {
  get: function() {
    return this._cache.itemCount;
  },
  enumerable: true,
  configurable: true
});

AsyncCache.prototype.get = function(key, cb, load) {
  if (this._loading[key])
    return this._loading[key].push(cb);

  var has = this._cache.has(key);
  var cached = this._cache.get(key);
  if (has && void 0 !== cached)
    return process.nextTick(function() {
      cb(null, cached);
    });

  if (void 0 !== cached && this._allowStale && !has)
    process.nextTick(function() {
      cb(null, cached);
    });
  else
    this._loading[key] = [ cb ];

  load = load || this._load;
  load(key, function(er, res) {
    if (!er)
      this._cache.set(key, res);

    var cbs = this._loading[key];
    if (!cbs)
      return;
    delete this._loading[key];

    cbs.forEach(function (cb) {
      cb(er, res);
    });
  }.bind(this));
};

AsyncCache.prototype.set = function(key, val) {
  return this._cache.set(key, val);
};

AsyncCache.prototype.reset = function() {
  return this._cache.reset();
};

AsyncCache.prototype.has = function(key) {
  return this._cache.get(key);
};

AsyncCache.prototype.del = function(key) {
  return this._cache.del(key);
};
