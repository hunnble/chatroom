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

function preventDefault (e) {
  if (e.preventDefault) {
    preventDefault = function (e) {
      e.preventDefault();
    };
  } else {
    preventDefault = function (e) {
      e.returnValue = false;
    };
  }
  return preventDefault(e);
}
