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

  this.ac = new window.AudioContext();
  this.sampleRate = this.ac.sampleRate;
  this.leftChannel = [];
  this.rightChannel = [];
  this.isRecording = false;
  this.recordingLength = 0;
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

Chat.prototype.sendVoice = function () {
  var self = this;
  var mergeBuffers = function (channelBuffer, recordingLength) {
    var result = new Float32Array(recordingLength);
    var offset = 0;
    for (var i = 0, len = channelBuffer.length; i < len; ++i) {
      var buffer = channelBuffer[i];
      result.set(buffer, offset);
      offset += buffer.length;
    }
    return result;
  };
  var interLeave = function (leftChannel, rightChannel) {
    var len = leftChannel.length + rightChannel.length;
    var result = new Float32Array(len);
    var inputIndex = 0;
    for (var i = 0; i < len; ++inputIndex) {
      result[i++] = leftChannel[inputIndex];
      result[i++] = rightChannel[inputIndex];
    }
    return result;
  };
  var writeUTFBytes = function (view, offset, string) {
    for (var i = 0, len = string.length; i < len; ++i) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  var sendBlob = function () {
    if (!self.isRecording) {
      return;
    }
    var leftBuffer = mergeBuffers(self.leftChannel, self.recordingLength);
    var rightBuffer = mergeBuffers(self.rightChannel, self.recordingLength);
    var interleaved = interLeave(leftBuffer, rightBuffer);
    var len = interleaved.length;
    var index = 44;
    var buffer = new ArrayBuffer(index + len * 2);
    var view = new DataView(buffer);
    // RIFF标志
    writeUTFBytes(view, 0, 'RIFF');
    // 文件长度
    view.setUint32(4, index + len * 2, true);
    // WAVE标志
    writeUTFBytes(view, 8, 'WAVE');
    // fmt标志
    writeUTFBytes(view, 12, 'fmt');
    // 过渡字节， 一般为0x10（16）
    view.setUint32(16, 16, true);
    // 格式类别（PCH）
    view.setUint16(20, 1, true);
    // 通道数
    view.setUint16(22, 2, true);
    // 采样率
    view.setUint32(24, self.sampleRate, true);
    // 波形音频数据传送速率：通道数＊每样本的数据位数／8
    view.setUint32(28, self.sampleRate * 4, true);
    // 数据块调整数：通道数＊每样本的数据数（16）／8
    view.setUint16(32, 4, true);
    // 每样本的数据位数
    view.setUint16(34, 16, true);
    // 数据标记符：data
    writeUTFBytes(view, 36, 'data');
    // 语音数据长度
    view.setUint32(40, len * 2, true);
    for (var i = 0; i < len; ++i) {
      view.setInt16(index, interleaved[i] * 0x7FFF, true);
      index += 2;
    }
    var blob = new Blob([view], { type: 'audio/wav' });
    var newMsg = {
      from: self.username,
      type: 'voice',
      message: blob,
      to: userList.value
    };
    self.socket.emit('message', newMsg);
    self.isRecording = false;
    self.leftChannel = [];
    self.rightChannel = [];
    self.recordingLength = 0;
  };
  sendBlob();
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
  this.msgObj.appendChild(sysMsgDOM);
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

Chat.prototype.init = function (username) {
  var self = this;
  this.username = username;
  this.scrollToBottom();
  this.socket = io.connect('127.0.0.1:3000');
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
      case 'voice':
        var blob = new Blob([obj.message]);
        var url = window.URL.createObjectURL(blob);
        obj.message = '<audio class="voice" controls="true" autoplay src="' + url + '">对不起,无法播放语音</audio>';
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
    self.msgObj.appendChild(msgDOM);
    self.scrollToBottom();
  });

  if (navigator.getUserMedia) {
    var bufferSize = 2048;
    var recorder = this.ac.createScriptProcessor(bufferSize, 2, 2);
    var constraints = {
      audio: true,
      video: false
    };
    var successCallback = function (stream) {
      var source = self.ac.createMediaStreamSource(stream);
      var biquadFilter = self.ac.createBiquadFilter();
      recorder.onaudioprocess = function (e) {
        if (!self.isRecording) {
          return;
        }
        var left = e.inputBuffer.getChannelData(0);
        var right = e.inputBuffer.getChannelData(1);
        self.leftChannel.push(new Float32Array(left));
        self.rightChannel.push(new Float32Array(right));
        self.recordingLength += bufferSize;
      };
      source.connect(biquadFilter);
      biquadFilter.connect(recorder);
      recorder.connect(self.ac.destination);
    };
    var errorCallback = function (err) {
      console.log('audio error: ' + err);
      document.getElementById('sendVoice').style.display = 'none';
    };
    navigator.getUserMedia({ audio: true, video: false }, successCallback, errorCallback);
  }
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
  window.AudioContext = window.AudioContext ||
              window.webkitAudioContext ||
              window.mozAudioContext ||
              window.msAudioContext ;
  window.URL = window.URL || window.webkitURL;
  navigator.getUserMedia = navigator.getUserMedia ||
              navigator.webkitGetUserMedia ||
              navigator.mozGetUserMedia ||
              navigator.msGetUserMedia ;
  if (!window.AudioContext || !navigator.getUserMedia || !window.URL) {
    document.getElementById('sendVoice').style.display = 'none';
  }

  var chat = new Chat();
  var username = getCookie('user');
  var sendMessageBtn = document.getElementById('sendMessage');
  var sendImageBtn = document.getElementById('sendImage');
  var sendVoiceBtn = document.getElementById('sendVoice');
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
  };
  sendVoiceBtn.onmousedown = function () {
    chat.isRecording = true;
  };
  sendVoiceBtn.onmouseup = function () {
    chat.sendVoice();
  };
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
