---
---
// see
// http://stackoverflow.com/questions/31144874/gapi-is-not-defined-google-sign-in-issue-with-gapi-auth2-init

var _auth2;
var KEY = "{{ site.google_api_key }}";
var TOKEN_COOKIE = 'Google_ID_token';
var TOKEN_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=';
//               https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=

var _onGoogleLoad = function () {
  gapi.load('auth2', function () {
	               _auth2 = gapi.auth2.init({
			 client_id: KEY,
			 access_type: 'offline',
			 scope: 'email',
			 fetch_basic_profile: true
			});
		       var user = getUser(_auth2);
		       var token = user.getAuthResponse().id_token;
		       _enableGoogleButton(_auth2);
		     });
};

function _enableGoogleButton (auth2){
  auth2.attachClickHandler('login_button', {}, function(user) {onLoginSuccess(auth2, user);}, onLoginFailure);
  $('nav .logout').click(function(){
			   logout(auth2);
			   return false;});
}

// after user clicks login button and logs in
function onLoginSuccess(auth2, user) {
  update_display(auth2);
  var id_token = user.getAuthResponse().id_token;
  var access_token = user.getAuthResponse().access_token;
  console.log(access_token);
  remember_id_token(id_token);
  $(document).trigger('user_login', auth2);
}

// after user clicks login button and fails to log in
function onLoginFailure(error) {
  console.log('login error=', error);
}

function login(auth2){
  auth2.signIn();
}

function logout(auth2){
  auth2.signOut().then(function(){
			 update_display(auth2);
			 $(document).trigger('user_logout', auth2);
			 });
  Cookies.remove(TOKEN_COOKIE);
}

function getUser(auth2){
  return auth2.currentUser.get();
}

function isSignedIn(auth2){
  return auth2.isSignedIn.get();
}

// Update navbar css

function update_display(auth2){
  if (isSignedIn(auth2)){
    var user = getUser(auth2);
    var email = user.getBasicProfile().getEmail();
    display_user(email);
  } else {
    display_nouser();
  }
}

function display_user(email){
  $('nav .user_email').text(email).css('display', 'inline');
  $('nav .login').hide();
  $('nav .logout').css('display', 'inline');
}

function display_nouser(){
  $('nav .user_email').text('').css('display', 'none');
  $('nav .login').css('display', 'inline');
  $('nav .logout').hide();
}

// Persist ID token as a cookie

function remember_id_token(id_token){
  var now = new Date();
  var minutes = 60; // cookie expires in one hour
  var future = new Date(now.getTime() + minutes*60000);
  Cookies.remove(TOKEN_COOKIE);
  Cookies.set(TOKEN_COOKIE, id_token, { expires: future });
}

// onSuccess is a fcn to call when token is validated successfully
function check_id_token(onSuccess){
  var id_token = Cookies.get(TOKEN_COOKIE);
  if (typeof id_token == 'undefined' || id_token == 'undefined'){
    return false;
  }
  $.get(TOKEN_URL+id_token).done(function(data){onSuccess(id_token, data);});
}

