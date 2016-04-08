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

var CURRENT_ROLE_COOKIE = 'current_role';
var CURRENT_ROLE = 'none';
var CURRENT_ROLE_DEFAULT = true;

// On page load, see if we have a login session persisted in a cookie
$(document).ready(function(){
		    var cookie = Cookies.get(CURRENT_ROLE_COOKIE);
		    if (typeof cookie != 'undefined'){
		      CURRENT_ROLE = cookie;
		      CURRENT_ROLE_DEFAULT = false;
		    }
		    check_login();
		    $(document).on('user_login', update_navbar);
	            $(document).on('user_logout', update_navbar);
		  });


var APP_ID = "{{ site.google_api_key }}";
var ACCESS_TOKEN_COOKIE = 'g_access_token';
var ID_TOKEN_COOKIE = 'g_id_token';
var TOKEN_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=';
var ROLES = {
	 'physician' : {name: 'Physician', href: '/physician/signup'},
	 'patient' :  {name: 'Patient', href: '/patient/signup'},
	 'lab' :  {name: 'Lab', href: '/lab'},
	 'expert' :  {name: 'Expert', href:'/expert/queue'},
	 'admin' :  {name: 'Admin', href: '/admin/accounts'},
  	 'none' :  {name: 'Unauthorized', href: '/'}
        };

function on_google_load() {
  gapi.load('auth2', function () {
	               var auth2 = gapi.auth2.init({
		         client_id: APP_ID,
		         access_type: 'offline',
		         scope: 'email',
		         fetch_basic_profile: true
		       });
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
  Cookies.remove(CURRENT_ROLE_COOKIE);
  auth2.signOut().then(function(){ $(document).trigger('user_logout');});
}

// after user clicks login button and logs in
function on_login_success(auth2, user) {
  $(document).data('AUTH2', auth2);
  var id_token = user.getAuthResponse().id_token;
  var access_token = user.getAuthResponse().access_token;
  var user_email = user.getBasicProfile().getEmail();
  remember_tokens(access_token, id_token);  // persist tokens in session cookies
  check_role(user_email, auth2);
}

// after user clicks login button and fails to log in
function on_login_failure(error) {
  console.log('LOGIN on_login_failure:', error);
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
  $('nav .dropdown').show();
  $('nav .user_email').text(info.email).css('display', 'inline');
  $('nav .login').hide();
  $('nav .logout_button').css('display', 'inline');
  display_user_picture(info.image_url);
  navbar_display_roles();
}

function navbar_display_nouser(){
  $('nav .dropdown').hide();
  $('nav .user_email').text('').css('display', 'none');
  $('nav .login').css('display', 'inline');
  $('nav .logout_button').hide();
  $('nav .mugshot').hide();
  navbar_hide_roles();
}

function display_user_picture(url){
  if (typeof url != 'undefined'){
    $('nav .mugshot').css('background-image', 'url('+url+')')
    .css('display', 'inline-block');
  }
}

function navbar_display_roles(){
  var roles = $(document).data('roles');
  if (typeof roles != 'undefined' && (roles.length > 1 || roles.indexOf('admin') != -1)){
    $('nav .session .dropdown .caret').css('display', 'inline-block').show();
    $('nav .session .dropdown button.dropdown-toggle').prop("disabled",false);
    $('nav #dropdownRoles:contains(' + CURRENT_ROLE + ')');
  } else {
    navbar_hide_roles();
  }
}

function navbar_hide_roles(){
  $('nav .session .dropdown .caret').hide();
  $('nav .session .dropdown button.dropdown-toggle').prop("disabled",true);
}

// -----
// Roles

function is_valid_role(role){
  var roles = Object.keys(ROLES);
  return roles.indexOf(role) != -1;
}

// visible_roles is a list of keys, e.g. ['expert', 'patient']
function init_roles_menu(current_role, visible_roles){
  $('#dropdownRoles li.role').remove();
  if (!is_valid_role(current_role)){
    console.log('ERROR: unknown role', role);
    set_role('none');
    return;
  }
  $.each(visible_roles, function(i, role){
	   if (!is_valid_role(role)){
	     console.log('ERROR: unknown role', role);
	     return;
	   }
	   var attrs = ROLES[role];
	   var anchor = $('<a/>').attr('href', attrs.href).text(attrs.name);
	   var li = $('<li/>').attr('value', role).addClass('role').append(anchor);
	   if (current_role == role){
	     li.addClass('active');
	   }
	   $('#dropdownRoles').append(li);
	   });
  $('#dropdownRoles li.role').click(dropdown_role_handler);
}

// Enables visibility of nav bar items which have the current role
function assume_role(role){
  $('nav ul.navbar-nav li').removeClass('enabled');
  var info = get_user_info();
  if (info != null){
    $('.role-'+role).addClass('enabled');
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
      check_role(info.email);
    });
}

// Given a user, initialize the roles menu.
// Called asynchronously, refreshes the GUI when done (by triggering the user_login event)
// optional auth2
//  auth2 provided when logging into Google
//  auth2 undefined when loading id_token from cookie
function check_role(user_email, auth2){
  $.get('/mock-api/accounts.json', function(data){handle_check_role(user_email, auth2, data);});
}

function handle_check_role(user_email, auth2, data){
  var account = lookup_user(user_email, data);
  var roles = ['none'];
  if (typeof account == 'undefined' || typeof CURRENT_ROLE == 'undefined'){
    CURRENT_ROLE = 'none';
  } else {
    roles = account.roles;
  }
  $(document).data('roles', roles);
  if (roles.length == 0){
    // Not enabled for any roles
    set_role('none');
  } else if (CURRENT_ROLE == 'none' && CURRENT_ROLE_DEFAULT){
    // Login with new role
    set_role(roles[0]);
  } else if (roles.indexOf(CURRENT_ROLE) == -1 && roles.indexOf('admin') == -1) {
    // No longer eligible for saved role
    set_role(roles[0]);
  } else {
    set_role(CURRENT_ROLE);
  }
  if (roles.indexOf('admin') != -1){
    // expand menu to include all possible roles
    roles = Object.keys(ROLES);
  }
  init_roles_menu(CURRENT_ROLE, roles);
  $(document).trigger('user_login', auth2);
}

function dropdown_role_handler(event){
  var role = $(this).attr('value');
  set_role(role);
}

// not used
function get_path(){
  var path = window.location.href.toString().split(window.location.host)[1];
  if (path.slice(-1) == '/'){
    path = path.slice(0, -1);
  }
  return path;
}

function set_role(role){
  if (!is_valid_role(role)){
    console.log('ERROR: unknown role', role);
    set_role('none');
    return;
  }
  CURRENT_ROLE = role;
  Cookies.set(CURRENT_ROLE_COOKIE, role);
  var account = ROLES[role];
  var target = account.href;
  if (target.slice(-1) == '/'){
    target = target.slice(0, -1);
  }
  page_check(role);
  $('#dropdownRoles li.role').removeClass('active');
  $('#dropdownRoles li.role[value=' + role + ']').addClass('active');
  assume_role(role);
}

function page_check(role){
  var roles = $('.not_logged_in').attr('ok').split(' ');
  if (roles.indexOf(role) == -1 &&   // user isn't whitelisted, and
      roles.indexOf('all') == -1 &&  // page isn't public, and
      role != 'admin'){              // user isn't an admin
    window.location.href = ROLES[role].href;
  } else {
    $('.not_logged_in').hide();
    $('.logged_in').show();
  }
}

function lookup_user(user_email, accounts){
  for (var i in accounts){
    var account = accounts[i];
    if (account.email == user_email){
      return account;
    }
  }
}

// onSuccess(id_token, data) is a callback fcn to call when token is validated successfully
//
function check_id_token(onSuccess){
  var id_token = Cookies.get(ID_TOKEN_COOKIE);
  if (typeof id_token == 'undefined' || id_token == 'undefined'){
    page_check('none');
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
