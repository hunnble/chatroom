var redis = require('redis');

var USERS_SET_NAME = 'chatusers';
var port = 6379;
var host = '127.0.0.1';

var redisClient = redis.createClient(port, host);

redisClient.on('error', function (err) {
  console.log('redis error: ' + err);
});

var userModel = {
  addUser: function (username, callback) {
    redisClient.sadd(USERS_SET_NAME, username, function (err) {
      if (err) {
        callback(err);
      } else {
        callback();
      }
    });
  },
  isMember: function (username, callback) {
    redisClient.sismember(USERS_SET_NAME, username, function (err, res) {
      if (err) {
        callback(err);
      } else {
        callback(null, res);
      }
    });
  },
  getUser: function (username, callback) {
    this.isMember(username, function (err, res) {
      if (err) {
        callback(err);
      } else {
        callback(null, username);
      }
    });
  },
  getAllUsers: function (callback) {
    redisClient.smembers(USERS_SET_NAME, function (err, users) {
      if (err || !users) {
        callback(err);
      } else {
        callback(null, users);
      }
    });
  },
  removeUser: function (username, callback) {
    redisClient.srem(USERS_SET_NAME, username, function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  }
};

module.exports = userModel;
