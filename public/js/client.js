var documentBody = document.compatMode === 'CSS1Compat' ?
                                          document.documentElement :
                                          document.body ;

var Chat = function () {
  this.msgObj = document.getElementById('msgs');
  this.screenHeight = window.innerHeight ?
                      window.innerHeight :
                      documentBody.clientHeight ;
  this.username = '';
  this.socket = '';

};

Chat.prototype.scrollToBottom = function () {
  window.scrollTo(0, this.msgObj.clientHeight);
};

Chat.prototype.logout = function () {
  delCookie('user');
  this.socket.disconnect();
  location.reload();
};

Chat.prototype.sendMessage = function () {
  var input = document.getElementById('input');
  var message = input.value;
  if (message === '') {
    return false;
  }
  var newMsg = {
    username: this.username,
    message: message
  }
  this.socket.emit('message', newMsg);
  input.value = '';
};

Chat.prototype.sendImage = function (file) {
  var self = this;
  var reader = new FileReader();
  if (!file || !reader || !/image\/\w+/.test(file.type)) {
    return false;
  }
  reader.readAsDataURL(file);
  reader.onload = function (e) {
    var newMsg = {
      username: self.username,
      isImage: true,
      message: '<a href="' + e.target.result + '" target="_blank"><img class="message-image" src="' + e.target.result + '" alt="" /></a>'
    };
    self.socket.emit('message', newMsg);
  };
};

Chat.prototype.updateSysMsg = function (obj, action) {
  var onlineCountDOM = document.getElementById('onlineCount');
  var onlineUsers = obj.onlineUsers;
  var onlineCount = obj.onlineCount;
  var user = obj.user;
  var users = '';
  var separator = '';
  for (var key in onlineUsers) {
    if (onlineUsers.hasOwnProperty(key)) {
      users += separator + onlineUsers[key];
      separator = '、';
    }
  }
  onlineCountDOM.innerHTML = onlineCount;
  var sysMsgDOM = document.createElement('div');
  sysMsgDOM.innerHTML = user.username + (action === 'login' ? '加入' : '退出') + '聊天室';
  sysMsgDOM.className = 'message-system';
  this.msgObj.appendChild(sysMsgDOM);
  this.scrollToBottom();
};

Chat.prototype.init = function (username) {
  var self = this;
  this.username = username;
  // this.msgObj.style.minHeight = this.screenHeight + this.msgObj.clientHeight + 'px';
  this.scrollToBottom();
  this.socket = io.connect('127.0.0.1:3000');
  this.socket.emit('login', {
    username: this.username
  });
  this.socket.on('login', function (obj) {
    self.updateSysMsg(obj, 'login');
  });
  this.socket.on('logout', function (obj) {
    self.updateSysMsg(obj, 'logout');
  });
  this.socket.on('message', function (obj) {
    var isSelf = obj.username === self.username;
    var msgDOM = document.createElement('div');
    if (isSelf) {
      msgDOM.className = 'message-user';
      msgDOM.innerHTML = '<span class="msg">' + obj.message + '</span><span class="speaker">' + obj.username + '</span>';
    } else {
      msgDOM.className = 'message-others';
      msgDOM.innerHTML = '<span class="speaker">' + obj.username + '</span><span class="msg">' + obj.message + '</span>';
    }
    self.msgObj.appendChild(msgDOM);
    self.scrollToBottom();
  });
};

function getCookie(name) {
  var reg = new RegExp('(^| )' + name + '=([^;]*)(;|$)');
  var result = document.cookie.match(reg);
  if (result) {
    return unescape(result[2]);
  }
  return null;
}

function delCookie (name) {
  var targetCookie = getCookie(name);
  var exp = new Date();
  exp.setTime(exp.getTime() - 1);
  if (targetCookie !== null) {
    document.cookie = name + '=' + targetCookie + ';expires=' + exp.toGMTString();
  }
}

window.onload = function () {
  var chat = new Chat();
  var username = getCookie('user');
  var sendMessageBtn = document.getElementById('sendMessage');
  var sendImageBtn = document.getElementById('sendImage');
  var logoutBtn = document.getElementById('logout');
  var input = document.getElementById('input');

  if (!username) {
    console.log('加载失败，请刷新重试。');
    return false;
  }
  chat.init(username);

  sendMessageBtn.onclick = function () {
    chat.sendMessage();
  };
  sendImageBtn.onchange = function () {
    var file = this.files[0];
    chat.sendImage(file);
    this.value = '';
  }
  logoutBtn.onclick = function () {
    chat.logout();
  };
  input.oninput = function (e) {
    var len = e.target.value.length;
    if (len > 140) {
      e.target.value = e.target.value.substr(0, 140);
      return false;
    }
  };
  window.onkeydown = function (e) {
    if (e.ctrlKey && e.keyCode === 13 && document.activeElement === input) {
      e.preventDefault();
      chat.sendMessage();
    }
  };

};
