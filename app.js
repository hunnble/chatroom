var express = require('express');
var async = require('async');
var ejs = require('ejs');
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var http = require('http');
var socketio = require('socket.io');
var xss = require('xss');
var user = require('./model/user.js');

var app = express();
var port = 8080;
var server = http.createServer(app);
var io = socketio(server);

app.set('port', process.env.PORT || port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('.html', ejs.__express);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  if (!req.cookies.user) {
    res.redirect('/login');
  } else {
    res.render('index.html');
  }
});

app.get('/login', function (req, res) {
  res.render('login.html');
});

app.post('/login', function (req, res) {
  user.isMember(req.body.username, function (err, isMember) {
    if (err) {
      return console.log(err);
    }
    if (isMember) {
      res.redirect('/login');
    } else {
      user.addUser(req.body.username, function (err) {
        if (err) {
          return console.log(err);
        }
        res.cookie('user', req.body.username, { maxAge: 1000 * 60 * 60 * 24 * 10 });
        res.redirect('/');
      });
    }
  });
});

io.on('connection', function (socket) {
  socket.join('all');
  socket.leave(socket.id);
  socket.on('login', function (obj) {
    socket.name = obj.from;
    async.waterfall([
      function (cb) {
        user.getAllUsers('', function (err, users) {
          cb(err, users);
        });
      }
    ], function (err, users) {
      if (err) {
        return console.log(err);
      }
      io.emit('login', {
        onlineUsers: users,
        user: obj
      });
      console.log(obj.from + '进入了聊天室');
    });
  });
  socket.on('disconnect', function () {
    async.waterfall([
      function (cb) {
        user.removeUser(socket.name, function (err, username) {
          cb(err, { from: username });
        });
      },
      function (obj, cb) {
        user.getAllUsers('', function (err, users) {
          cb(err, obj, users);
        })
      }
    ], function (err, obj, users) {
      if (err) {
        return console.log(err);
      }
      io.emit('logout', {
        onlineUsers: users,
        user: obj
      });
      console.log(obj.from + '离开了聊天室');
    });
  });
  socket.on('message', function (obj) {
    user.getRoomName(obj.from, function (err, roomName) {
      if (err) {
        return console.log(err);
      }
      if (obj.type === 'text') {
        obj.message = xss(obj.message.replace('\n', '<br />'));
      }
      if (obj.to === 'all') {
        console.log(roomName);
        io.in(roomName).emit('message', obj);
        console.log(obj.from + ' 发言了');
      } else {
        var sockets = io.sockets.sockets;
        for(var key in sockets) {
          if (sockets[key].name === obj.to || sockets[key].name === obj.from) {
            sockets[key].emit('message', obj);
            console.log(obj.from + ' 对 ' + obj.to + ' 发送私密消息');
          }
        }
      }
    });
  });
  socket.on('getRooms', function (obj) {
    var rooms = {};
    var sockets = io.sockets.sockets;
    for(var key in sockets) {
      rooms = Object.assign(rooms, sockets[key].rooms);
      if (sockets[key].name === obj.from) {
        var targetSocket = sockets[key];
      }
    }
    targetSocket.emit('rooms', rooms);
  });
  socket.on('changeRoom', function (obj) {
    var sockets = io.sockets.sockets;
    for(var key in sockets) {
      if (sockets[key].name === obj.from) {
        var targetSocket = sockets[key];
        async.waterfall([
          function (cb) {
            var oldRoom = user.getRoomName(targetSocket.name, function (err, roomName) {
              cb(err, roomName);
            });
          },
          function (roomName, cb) {
            if (roomName === obj.roomName) {
              roomName = '';
              cb(null);
            } else {
              user.changeRoom(targetSocket.name, obj.roomName, function (err) {
                socket.join(obj.roomName);
                socket.leave(roomName);
                cb(err);
              });
            }
          },
        ], function (err) {
          if (err) {
            console.log(err);
          }
        });
        break;
      }
    }
  });
});

server.listen(app.get('port'), function () {
  console.log('listening on port:' + port);
});
