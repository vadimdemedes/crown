'use strict';

/**
 * Dependencies
 */

var MemoryStore = require('crown-memory-store');
var Promise = require('pinkie-promise');
var format = require('util').format;
var crc32 = require('buffer-crc32');


/**
 * Expose `crown`
 */

module.exports = Crown;


/**
 * Roll out features gradually
 */

function Crown (options) {
  if (!(this instanceof Crown)) return new Crown(options);

  if (!options) {
    options = {};
  }

  this.idAttribute = options.idAttribute || 'id';
  this.store = options.store || new MemoryStore();
  this.groups = [];
}


/**
 * Get raw feature object
 *
 * @param {String} name
 * @return {Promise}
 * @api public
 */

Crown.prototype.get = function (name) {
  return this.store.get(name)
    .catch(function () {
      var message = format('Feature `%s` does not exist', name);

      return Promise.reject(message);
    });
};


/**
 * Add group of users
 *
 * @param {String} name
 * @param {Function} validator - function that validates user's access to group
 * @api public
 */

Crown.prototype.group = function (name, validator) {
  this.groups.push({
    name: name,
    validate: validator
  });
};


/**
 * Enable feature for all users
 *
 * @param {String} name
 * @return {Promise}
 * @api public
 */

Crown.prototype.enable = function (name) {
  return this.enablePercentage(name, 100);
};


/**
 * Disable feature for all users
 *
 * @param {String} name
 * @return {Promise}
 * @api public
 */

Crown.prototype.disable = function (name) {
  return this.store.destroy(name);
};


/**
 * Enable feature for a percentage of users
 *
 * @param {String} name
 * @param {Number} percentage
 * @api public
 */

Crown.prototype.enablePercentage = function (name, percentage) {
  return this.store.set(name, {
    percentage: percentage
  });
};


/**
 * Enable feature for a specific group
 *
 * @param {String}
 * @param {String|Array} groups
 * @return {Promise}
 * @api public
 */

Crown.prototype.enableGroups = function (name, groups) {
  if (!Array.isArray(groups)) {
    groups = [groups];
  }

  var store = this.store;

  return store.get(name)
    .catch(function () {
      // initialize a new feature
      // if it does not exist
      return {};
    })
    .then(function (feature) {
      if (!feature.groups) {
        feature.groups = [];
      }

      // merge group names
      feature.groups.push.apply(feature.groups, groups);

      return store.set(name, feature);
    });
};


/**
 * Alias for enableGroups()
 */

Crown.prototype.enableGroup = function () {
  return this.enableGroups.apply(this, arguments);
};


/**
 * Disable feature for groups
 *
 * @param {String} name
 * @param {Array|String} groups
 * @return {Promise}
 * @api public
 */

Crown.prototype.disableGroups = function (name, groups) {
  if (!Array.isArray(groups)) {
    groups = [groups];
  }

  var store = this.store;

  return this.get(name)
    .then(function (feature) {
      if (!feature.groups) {
        return;
      }

      groups.forEach(function (group) {
        var index = feature.groups.indexOf(group);

        if (index >= 0) {
          feature.groups.splice(index, 1);
        }
      });

      return store.set(name, feature);
    });
};


/**
 * Alias for disableGroups()
 */

Crown.prototype.disableGroup = function () {
  return this.disableGroups.apply(this, arguments);
};


/**
 * Enable feature for specific users
 *
 * @param {String} name
 * @param {Mixed|Array} users
 * @return {Promise}
 * @api public
 */

Crown.prototype.enableUsers = function (name, users) {
  if (!Array.isArray(users)) {
    users = [users];
  }

  // extract ids from each array item
  // include only truthy values in a result
  users = users.map(this._extractId, this).filter(truthy);

  var store = this.store;

  return store.get(name)
    .catch(function () {
      // initialize a new feature
      // when it does not exist
      return {};
    })
    .then(function (feature) {
      if (!feature.users) {
        feature.users = [];
      }

      // merge user ids
      feature.users.push.apply(feature.users, users);

      return store.set(name, feature);
    });
};


/**
 * Alias for enableUsers()
 */

Crown.prototype.enableUser = function () {
  return this.enableUsers.apply(this, arguments);
};


/**
 * Disable feature for users
 *
 * @param {String} name
 * @param {Array|Mixed} users
 * @return {Promise}
 * @api public
 */

Crown.prototype.disableUsers = function (name, users) {
  if (!Array.isArray(users)) {
    users = [users];
  }

  // extract ids from each array item
  // include only truthy values in a result
  users = users.map(this._extractId, this).filter(truthy);

  var store = this.store;

  return this.get(name)
    .then(function (feature) {
      if (!feature.users) {
        return;
      }

      users.forEach(function (id) {
        var index = feature.users.indexOf(id);

        if (index >= 0) {
          feature.users.splice(index, 1);
        }
      });

      return store.set(name, feature);
    });
};


/**
 * Alias for disableUsers()
 */

Crown.prototype.disableUser = function () {
  return this.disableUsers.apply(this, arguments);
};


/**
 * Check if a feature is enabled
 *
 * @param {String} name
 * @param {Mixed} user (optional)
 * @return {Promise}
 * @api public
 */

Crown.prototype.isEnabled = function (name, user) {
  var id = this._extractId(user);

  var self = this;

  return this.store.get(name)
    .then(function (feature) {
      // if feature has groups
      var hasGroups = feature.groups && feature.groups.length > 0;

      if (user && hasGroups) {
        // validate that this user
        // belongs to at least one group
        var groups = self.groups.filter(function (group) {
          return group.validate(user);
        });

        // extract group names
        var groupNames = groups.map(function (group) {
          return group.name;
        });

        // check if feature includes any of user's groups
        if (has(feature.groups, groupNames)) {
          return true;
        }
      }

      // if feature has users
      var hasUsers = feature.users && feature.users.length > 0;

      if (user && hasUsers) {
        // check if feature includes this user's id
        if (has(feature.users, [id])) {
          return true;
        }
      }

      // if feature has percentage
      var hasPercentage = Number.isInteger(feature.percentage);

      if (hasPercentage) {
        // calculate if this user belongs to an enabled sector
        // CRC32(user_id + feature_name) % 100 < percentage
        return crc32.unsigned(id + name) % 100 < feature.percentage;
      }

      return false;
    })
    .catch(function () {
      return false;
    });
};


/**
 * Extract id from argument
 *
 * @param {Mixed} user
 * @return {Mixed}
 * @api private
 */

Crown.prototype._extractId = function (user) {
  var id = '';

  if (typeof user === 'object') {
    // if `user` object has get() method
    // use it to get the value
    id = user.get ? user.get(this.idAttribute) : user[this.idAttribute];
  }

  if (typeof user === 'string' || typeof user === 'number') {
    id = user.toString();
  }

  return id;
};


/**
 * Helpers
 */

// used for .filter() to eliminate falthy values
function truthy (item) {
  return !!item;
}

// check if `arr` has any of `items` array values
function has (arr, items) {
  var result = false;

  items.forEach(function (item) {
    if (arr.indexOf(item) >= 0) {
      result = true;
    }
  });

  return result;
}
