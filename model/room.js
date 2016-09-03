var redis = require('redis');
var ROOMS_SET_NAME = require('../config.js').ROOMS_SET_NAME;
var config = require('../config.js');
var port = config.redisPort;
var host = config.redisHost;
var redisClient = redis.createClient(port, host);

redisClient.on('error', function (err) {
  console.log('redis error: ' + err);
});

var roomModel = {
  createRoom: function (roomName, callback) {
    redisClient.sadd(ROOMS_SET_NAME, roomName, function (err) {
      if (err) {
        callback(err);
      } else {
        callback();
      }
    });
  },
  isMember: function (roomName, callback) {
    redisClient.sismember(ROOMS_SET_NAME, roomName, function (err, res) {
      if (err) {
        callback(err);
      } else {
        callback(null, res);
      }
    });
  },
  getAllRooms: function (callback) {
    redisClient.smembers(ROOMS_SET_NAME, function (err, rooms) {
      if (err || !rooms) {
        callback(err);
      } else {
        callback(null, rooms);
      }
    });
  },
  removeRoom: function (roomName, callback) {
    redisClient.srem(ROOMS_SET_NAME, roomName, function (err) {
      if (err) {
        callback(err);
      } else {
        callback(null);
      }
    });
  }
};

module.exports = roomModel;
