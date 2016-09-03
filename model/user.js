var mongoose = require('mongoose');
var config = require('../config.js');
var Schema = mongoose.Schema;
var db = mongoose.createConnection(config.mongoHost, config.mongoName);

db.on('error', function (err) {
    console.log('数据库连接失败: ' + err);
});

var userSchema = new Schema({
  username: { type: String },
  roomId: {
    type: String,
    default: 'all'
  }
});

userSchema.statics.getUser = function (username, callback) {
  this.findOne({ 'username': username }, function (err, result) {
    if (err) {
      callback(err);
    } else {
      callback(null, result.username);
    }
  });
};
userSchema.statics.getAllUsers = function (roomId, callback) {
  var op = {};
  if (roomId) {
    op.roomId = roomId;
  }
  this.find(op, function (err, result) {
    if (err) {
      callback(err);
    } else {
      result = result.map(function (user) {
        return user.username;
      });
      callback(null, result);
    }
  });
};
userSchema.statics.addUser = function (username, callback) {
  this.create({
    'username': username
  }, function (err) {
    if (err) {
      callback(err);
    } else {
      callback(null);
    }
  });
};
userSchema.statics.removeUser = function (username, callback) {
  this.remove({
    'username': username
  }, function (err) {
    if (err) {
      callback(err);
    } else {
      callback(null, username);
    }
  });
};
userSchema.statics.getRoomName = function (username, callback) {
  this.findOne({
    'username': username
  }, function (err, result) {
    if (err) {
      callback(err);
    } else {
      callback(null, result.roomId);
    }
  });
}
userSchema.statics.changeRoom = function (username, roomId, callback) {
  this.update({
    'username': username
  }, {
    'roomId': roomId
  }, function (err) {
    if (err) {
      callback(err);
    } else {
      callback(null);
    }
  });
};
userSchema.statics.leaveRoom = function (callback) {
  this.statics.changeRoom('', callback);
};
userSchema.statics.isMember = function (username, callback) {
  this.find({
    'username': username
  }, function (err, result) {
    if (err) {
      callback(err);
    } else {
      var exist = !!result[0];
      callback(null, exist);
    }
  });
};

module.exports = db.model('chatUser', userSchema);
