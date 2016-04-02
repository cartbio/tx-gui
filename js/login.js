---
---
/* Google login library
 *
 *  * (c) Cartesian Bio
 * steve@cartesian.bio
 *
 * Manages login tokens and the CSS in the login/logout buttons in the navbar.
 *
 * This library sends Javascript events so form elements can be login-aware.
 * $.trigger('user_login') - after login button is clicked and login is successful (passes auth2 as argument)
 * $.trigger('user_logout') - after logout button is clicked
 *
 * This library stores captured data
 *   $(document).data('AUTH2') - after login is successful
 *   $(document).data('ID_TOKEN_INFO') - after page reload with valid tokens (persisted as cookies)
 *
 * The <SCRIPT> that loads Google's login library is in /_includes/head.html
 * This script calls on_google_load() upon loading.
 *
 * The navbar HTML with login and logout <DIV>s is in /_includes/nav.html
 *
 * Dependencies:
 *   https://apis.google.com/js/platform.js - google web signin
 *   js.cookie.js - cookie library
 *   jQuery
 */

// On page load, see if we have a login session persisted in a cookie
$(document).ready(check_login);

var APP_ID = "{{ site.google_api_key }}";
var ACCESS_TOKEN_COOKIE = 'g_access_token';
var ID_TOKEN_COOKIE = 'g_id_token';
var TOKEN_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=';

function on_google_load() {
  gapi.load('auth2', function () {
	               var auth2 = gapi.auth2.init({
		         client_id: APP_ID,
		         access_type: 'offline',
		         scope: 'email',
		         fetch_basic_profile: true
		       });
		       $(document).on('user_login', update_navbar);
	               $(document).on('user_logout', update_navbar);
		       enable_google_button(auth2);
		     });
};

function enable_google_button (auth2){
  auth2.attachClickHandler('login_button', {}, function(user) {on_login_success(auth2, user);}, on_login_failure);
  $('nav .logout_button').click(function(e){
			   on_click_logout(auth2);
			   return false;});
}

function on_click_logout(auth2){
  $(document).removeData('AUTH2');
  $(document).removeData('ID_TOKEN_INFO');
  Cookies.remove(ACCESS_TOKEN_COOKIE);
  Cookies.remove(ID_TOKEN_COOKIE);
  auth2.signOut().then(function(){ $(document).trigger('user_logout');});
}

// after user clicks login button and logs in
function on_login_success(auth2, user) {
  $(document).data('AUTH2', auth2);
  var id_token = user.getAuthResponse().id_token;
  var access_token = user.getAuthResponse().access_token;
  remember_tokens(access_token, id_token);  // persist tokens in session cookies
  $(document).trigger('user_login', auth2);
}

// after user clicks login button and fails to log in
function on_login_failure(error) {
  console.log('login error=', error);
}

// ---------------------------------------------
// Update navbar css

// handles $.on('user_login') and $.on('user_logout) events
function update_navbar(event, auth2){
  if (event.type == 'user_login'){
    navbar_display_user();
  } else {
    navbar_display_nouser();
  }
}

function navbar_display_user(){
  var info = get_user_info();
  $('nav .user_email').text(info.email).css('display', 'inline');
  $('nav .login').hide();
  $('nav .logout_button').css('display', 'inline');
  // display_user_picture(info.image_url);  // hidden for now, css is broken
}

function navbar_display_nouser(){
  $('nav .user_email').text('').css('display', 'none');
  $('nav .login').css('display', 'inline');
  $('nav .logout_button').hide();
  $('nav .mugshot').hide();
}

function display_user_picture(url){
  if (typeof url != 'undefined'){
    $('nav .mugshot').css('background-image', 'url('+url+')')
    .css('display', 'inline-block');
  }
}

// -------------------------------------------------------
// Persist Google id_token as a cookie. Update navbar if token is valid.

// Call check_login() when page loads. Callback updates navbar.
function check_login(){
  check_id_token(
    // callback to invoke upon success
    function (id_token, data){
      // Token (read from cookie) is valid. Save it in $(document).data()
      $(document).data('ID_TOKEN_INFO', data);
      var info = get_user_info();
      if (info != null){
	navbar_display_user();
      }
      $(document).trigger('user_login');
    });
}

// onSuccess(id_token, data) is a callback fcn to call when token is validated successfully
//
function check_id_token(onSuccess){
  var id_token = Cookies.get(ID_TOKEN_COOKIE);
  if (typeof id_token == 'undefined' || id_token == 'undefined'){
    return false;
  }
  $.get(TOKEN_URL+id_token).done(function(data){onSuccess(id_token, data);});
}

function remember_tokens(access_token, id_token){
  var now = new Date();
  var minutes = 60; // cookie expires in one hour
  var future = new Date(now.getTime() + minutes*60000);
  Cookies.remove(ACCESS_TOKEN_COOKIE);
  Cookies.remove(ID_TOKEN_COOKIE);
  Cookies.set(ACCESS_TOKEN_COOKIE, access_token, { expires: future });
  Cookies.set(ID_TOKEN_COOKIE, id_token, { expires: future });
}

// If user is logged in (either via auth2 or a token) return map
// else return null
function get_user_info(){
  var auth2 = $(document).data('AUTH2');
  var token_info = $(document).data('ID_TOKEN_INFO');
  if (typeof token_info != 'undefined'){
    return { name: token_info.name,
	     email: token_info.email,
	     image_url: token_info.picture,
	     id_token: Cookies.get(ID_TOKEN_COOKIE),
	     access__token: Cookies.get(ACCESS_TOKEN_COOKIE)
	   };
  } else if (typeof auth2 != 'undefined' &&
	     typeof auth2.isSignedIn != 'undefined' &&
	     auth2.isSignedIn.get()) {
    var user = auth2.currentUser.get();
    return { name: user.getBasicProfile().getName(),
	     email: user.getBasicProfile().getEmail(),
	     image_url: user.getBasicProfile().getImageUrl(),
	     id_token: user.getAuthResponse().id_token,
	     access_token: user.getAuthResponse().access_token
	   };
  } else {
    return null;
  }
}
