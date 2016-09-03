window.onload = function () {
  var username = document.getElementById('username');
  var submitBtn = document.getElementById('sendUsername');

  submitBtn.onclick = function (e) {
    if (username.value === '') {
      username.placeholder = '用户名不能为空';
      preventDefault(e);
    }
  }
};
