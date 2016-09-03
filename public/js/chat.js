var documentBody = document.compatMode === 'CSS1Compat' ?
                                          document.documentElement :
                                          document.body ;

var Chat = function () {
  this.msgDOM = document.getElementById('msgs');
  this.roomsDOM = document.getElementById('rooms');
  this.sendMessageBtn = document.getElementById('sendMessage');
  this.sendImageBtn = document.getElementById('sendImage');
  this.getRoomsBtn = document.getElementById('getRooms');
  this.logoutBtn = document.getElementById('logout');
  this.inputDOM = document.getElementById('input');
  this.screenHeight = window.innerHeight ?
                      window.innerHeight :
                      documentBody.clientHeight ;
  this.username = '';
  this.socket = '';
  this.maxMsgLen = 140;
};

Chat.prototype.scrollToBottom = function () {
  window.scrollTo(0, this.msgDOM.clientHeight);
};

Chat.prototype.logout = function () {
  delCookie('user');
  this.socket.disconnect();
  location.reload();
};

Chat.prototype.sendMessage = function () {
  var input = document.getElementById('input');
  var userList = document.getElementById('userList');
  var message = input.value;

  if (/[^\n]/.test(message) === false) {
    return false;
  }
  var newMsg = {
    from: this.username,
    type: 'text',
    message: message,
    to: userList.value
  };
  this.socket.emit('message', newMsg);
  input.value = '';
};

Chat.prototype.sendImage = function (file) {
  var self = this;
  var userList = document.getElementById('userList');
  var reader = new FileReader();

  if (!file || !reader || !/image\/\w+/.test(file.type)) {
    return false;
  }
  reader.readAsDataURL(file);
  reader.onload = function (e) {
    var newMsg = {
      from: self.username,
      type: 'image',
      message: e.target.result,
      to: userList.value
    };
    self.socket.emit('message', newMsg);
  };
};

Chat.prototype.updateSysMsg = function (obj, action) {
  var onlineCountDOM = document.getElementById('onlineCount');
  var onlineUsers = obj.onlineUsers;
  var user = obj.user;
  var separator = '';
  var sysMsgDOM = document.createElement('div');

  onlineCountDOM.innerHTML = onlineUsers.length;
  sysMsgDOM.innerHTML = user.from + (action === 'login' ? '加入' : '退出') + '聊天室';
  sysMsgDOM.className = 'message-system';
  this.msgDOM.appendChild(sysMsgDOM);
  this.scrollToBottom();
};

Chat.prototype.renderUserList = function (onlineUsers) {
  var userList = document.getElementById('userList');
  var fragment = document.createDocumentFragment();

  userList.innerHTML = '<option value="all">所有人</option>';
  for(var i = 0; i < onlineUsers.length; ++i) {
    if (onlineUsers[i] === this.username) {
      continue;
    }
    var option = document.createElement('option');
    option.value = onlineUsers[i];
    option.innerHTML = onlineUsers[i];
    fragment.appendChild(option);
  }
  userList.appendChild(fragment);
};

Chat.prototype.getRooms = function () {
  this.socket.emit('getRooms', {
    from: this.username
  });
};

Chat.prototype.changeRoom = function (roomName) {
  this.socket.emit('changeRoom', {
    from: this.username,
    roomName: roomName
  });
  this.roomsDOM.style.display = 'none';
};

Chat.prototype.init = function (username) {
  var self = this;

  this.username = username;
  this.scrollToBottom();
  this.socket = io.connect('127.0.0.1:8080');

  this.sendMessageBtn.onclick = function () {
    self.sendMessage();
  };
  this.sendImageBtn.onchange = function () {
    var file = this.files[0];
    self.sendImage(file);
    this.value = '';
  };
  this.getRoomsBtn.onclick = function () {
    self.getRooms();
  };
  this.logoutBtn.onclick = function () {
    self.logout();
  };
  this.inputDOM.oninput = function (e) {
    var len = e.target.value.length;
    if (len > self.maxMsgLen) {
      e.target.value = e.target.value.substr(0, self.maxMsgLen);
      return false;
    }
  };
  window.onkeydown = function (e) {
    if (e.ctrlKey && e.keyCode === 13 && document.activeElement === self.inputDOM) {
      e.preventDefault();
      self.sendMessage();
    }
  };
  window.onclick = function (e) {
    switch (e.target.className) {
      case 'room':
        self.changeRoom(e.target.innerHTML);
        break;
      case 'createRoomBtn':
        var roomNameDOM = document.getElementsByName('newRoomName')[0];
        var roomName = roomNameDOM.value;
        if (!roomName) {
          roomNameDOM.placehloder = '请输入房间名';
        } else {
          self.changeRoom(roomName);
          self.msgDOM.innerHTML = '';
        }
        break;
      case 'hideRoomBtn':
        self.roomsDOM.style.display = 'none';
      default:
        break;
    }
  }

  this.socket.emit('login', {
    from: this.username
  });
  this.socket.on('login', function (obj) {
    self.updateSysMsg(obj, 'login');
    self.renderUserList(obj.onlineUsers);
  });
  this.socket.on('logout', function (obj) {
    self.updateSysMsg(obj, 'logout');
    self.renderUserList(obj.onlineUsers);
  });
  this.socket.on('message', function (obj) {
    var isSelf = obj.from === self.username;
    var msgDOM = document.createElement('div');

    switch (obj.type) {
      case 'image':
        var src = obj.message;
        obj.message = '<a href="' + src + '" target="_blank"><img class="message-image" src="' + src + '" alt="" /></a>'
        break;
      default:
        break;
    }
    if (isSelf) {
      msgDOM.className = 'message-user';
      msgDOM.innerHTML = '<span class="msg">' + obj.message + '</span><span class="speaker">' + obj.from + '</span>';
    } else {
      msgDOM.className = 'message-others';
      msgDOM.innerHTML = '<span class="speaker">' + obj.from + '</span><span class="msg">' + obj.message + '</span>';
    }
    self.msgDOM.appendChild(msgDOM);
    self.scrollToBottom();
  });
  this.socket.on('rooms', function (rooms) {
    var roomsList = document.getElementById('roomsList');
    var fragment = document.createDocumentFragment();
    for(var key in rooms) {
      var room = document.createElement('div');
      room.className = 'room';
      room.innerHTML = rooms[key];
      fragment.appendChild(room);
    }
    roomsList.innerHTML = '';
    roomsList.appendChild(fragment);
    self.roomsDOM.style.display = 'block';
  });
};

window.onload = function () {
  var chat = new Chat();
  var username = getCookie('user');

  if (!username) {
    console.log('加载失败，请刷新重试。');
    return false;
  }
  chat.init(username);
};
