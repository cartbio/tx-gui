// See:
// http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/browser-configuring-wif.html
// http://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_oidc_user-id.html

var ANONYMOUS = false;
var APP_ID = '772140540805-5iim4e7thijd0r8dl68omgq4gs93lckh.apps.googleusercontent.com';

//-------- AWS --------

var _onGoogleLoad = function () {
  gapi.load('auth2', function () {
	               var auth2 = gapi.auth2.init({
			 client_id: APP_ID,
			 scope: 'email',
			 fetch_basic_profile: true
			});
		       enableGoogleButton(auth2);
		     });
};

// displays decoded properties in console
function decode_id_token(id_token){
  var TOKEN_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=';
  $.get(TOKEN_URL+id_token).done(function(data){
				   console.log('ID token decoded:', data);
  			          $('body').append($('<p/><p/>'))
				           .append($('<tt/>').text('decoded id_token= '+ JSON.stringify(data)));
				   if (data.aud == APP_ID){
				     console.log('VALIDATION success: APP_ID matches');
				   } else {
				     console.log('VALIDATION ERROR: APP_ID mismatch', data.aud, APP_ID);
				   }
				 });
}

function enableGoogleButton (auth2){
  auth2.attachClickHandler('login', {}, function(user) {onLoginSuccess(auth2, user);}, onLoginFailure);
}


// after user clicks login button and logs in
function onLoginSuccess(auth2, user) {
  console.log('google login successfully');
  var id_token = user.getAuthResponse().id_token;
  var access_token = user.getAuthResponse().access_token;
  decode_id_token(id_token);
  if (ANONYMOUS){
    show_s3_list(null);     // call anonymously
  } else {
    show_s3_list(id_token); // call with Google credentials
  }
}

// after user clicks login button and fails to log in
function onLoginFailure(error) {
  console.log('login error=', error);
}

//-------- AWS --------

// if ID_TOKEN is null, invoke anonymously
function show_s3_list(id_token){
  var operation = 'listObjects';
  var params = {Bucket: 'cartesian-upload'};
  if (id_token != null){
    console.log('id_token length=', id_token.length);
    console.log('id_token=', id_token);

    $('body').append('<p/><p/>', $('<tt/>').text('id_token length=' +  (id_token.length).toString()),
		                 $('<br/>'),
                                 $('<tt/>').text('id_token= '+id_token));
    var credentials = { RoleArn: 'arn:aws:iam::025206924291:role/CartesianPartnersUploadFiles_Role',
			WebIdentityToken: id_token
		      };
    AWS.config.credentials = new AWS.WebIdentityCredentials(credentials);
    AWS.config.region = 'us-east-1';
    AWS.config.logger = 'console';
    //console.log('aws.config', AWS.config);
  }
  var s3 = new AWS.S3({"signatureVersion":"v4"});
  if (id_token == null){
    s3.makeUnauthenticatedRequest(operation, params, show_s3_result);
  } else {
    s3.makeRequest(operation, params, show_s3_result);
  }
}

function show_s3_result(error, data) {
  if (error) {
    console.log('ERROR', error); // an error occurred
  } else {
    console.log('SUCCESS', data); // request succeeded
  }
}
