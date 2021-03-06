/*
 * Lab upload form
 *
 * (c) Cartesian Bio
 * steve@cartesian.bio
 *
 * Allows lab technicians to securely upload data files
 *
 */

$(document).ready(init_upload);

MIME_TYPES = { 'cel': 'application/cel',
	       'data': 'application/data'
};

function init_upload() {
  // Event watchers
  //$(document).ajaxError(on_ajax_fail);
  $(document).on('user_login', display_logged_in);
  $(document).on('user_logout', display_logged_out);

  // do when value changes
  $('.btn-file :file').change(on_select_file);
  $('input#lab_id').change(function() { $('#lab_id').removeClass('has-error');});

  // do when clicked
  $('#fileupload').submit(do_upload);
}

function on_ajax_fail(event, request, settings){
  console.log('on_ajax_fail', "event=", event, "req=", request, "settings=", settings);
}


// ----------- login/logout events -------------

function display_logged_in(){
  var info = get_user_info();
  $('input#user').val(info.name);
  $('input#id_token').val(info.id_token);
  $('input#access_token').val(info.access_token);
  update_upload_button();
}

function display_logged_out(){
  $('input#user').val('');
  update_upload_button();
  window.location.href = '/';
}

function update_upload_button(){
  if ($('.btn-file :file').length == 0){
    return;
  }
  var is_logged_in = (get_user_info() != null);
  var files = $('.btn-file :file').get(0).files;
  var is_enabled = (files.length > 0 && is_logged_in);

  if (is_enabled){
    $('button.start').removeAttr('disabled');
  } else {
    $('button.start').attr('disabled', true);
  }
  if (is_logged_in){
    $('p.upload_warn').hide();
  } else {
    $('p.upload_warn').show();
  }
}

//----------- File selection ----------------

function on_select_file(){
  var input = $(this),
      filename = $(this).parents('.input-group').find(':text'),
      numFiles = input.get(0).files ? input.get(0).files.length : 1,
      label = input.val().replace(/\\/g, '/').replace(/.*\//, ''),
      log = numFiles > 1 ? numFiles + ' files selected' : label;
  $('#fileupload #key').val(label);
  $('span.prompt').text('File:');
  if( filename.length ) {
    filename.val(log);
  }
  update_upload_button();
}

function validate_form(){
  var labid = $('input#lab_id').val();
  if (labid == '' || labid[0].toUpperCase() != 'L') {
    // console.log('Lab ID is missing or invalid');
    $('input#lab_id').val('L1234');
    //$('#lab_id').addClass('has-error');
    return true;  // TEMPORARILY REMOVED
  }
  var file = $('#fileupload input#file').val();
  if (file == ''){
    console.log('File is missing or invalid');
    $('#file').addClass('has-error');
    return false;
  }
  return true;
}


// ---------- rendering the form  -------------

// Status is "uploading.." with a spinner. When upload is complete, row will be updated.
function make_row(lab_id, filename){
  if ($('table.history th').length == 0) {
    var hrow = $('<tr/>').append($('<th/>').text('Lab ID'),
				 $('<th/>').text('File'),
				 $('<th/>').text('Status'));
    $('table.history').append(hrow);
  }
  var elt1 = $('<td/>').text(lab_id);
  var elt2 = $('<td/>').text(filename);
  var stat = $('<td/>').addClass('status').append($('<i/>').addClass('fa fa-refresh fa-spin spinner'),
						  'Uploading&hellip; ');
  var row = $('<tr/>').append(elt1, elt2, stat);
  $('table.history').append(row);
  return row;
}

function reset_form(){
  $('#fileupload #filename').val('');
  $('.btn-file :file').val('');
  $('#fileupload .prompt').html('Choose file&hellip;');
  $('button.start').attr('disabled', true);
}


//-------- AWS --------

function do_upload(event){
  event.preventDefault();
  if (!validate_form()){
    return;
  }
  var user_info = get_user_info();
  if (typeof user_info == 'undefined' || user_info == null){
    console.log('ERROR: not logged in (no user_info)');
    show_s3_upload_result(make_row('', ''), 'Login session expired: please login again', '');
    update_navbar(null,null);
    return;
  }
  var id_token = user_info.id_token;
  if (typeof id_token == 'undefined'){
    console.log('ERROR: not logged in (no id_token for ' + user_info.email + ')');
    return;
  }
  var lab_id =  $('#fileupload input#lab_id').val().toUpperCase();
  var file = $('#fileupload input#file')[0].files[0];
  var operation = 'putObject';
  var params = {Bucket: 'cartesian-upload',
		Key: user_info.email + '/' + lab_id + '/' + file.name,
		ContentType: file.type,
		Body: file,
		Metadata: {'LabID' : lab_id,
			   'email' : user_info.email,
			   'user_id' : user_info.user_id},
		ACL: "bucket-owner-full-control",
		ServerSideEncryption: "aws:kms"};
  var mime_type = get_mime_type(file.name);
  if (mime_type != null){
    params['ContentType'] = mime_type;
  }

  var s3 = get_s3(id_token);
  var row = make_row(lab_id, file.name);
  s3.upload(params, function(error, data){show_s3_upload_result(row, error, data);});
}


// returns pathname extension (e.g. 'txt')
function get_extension(path){
  var re = /(?:\.([^.]+))?$/;
  return re.exec(path)[1];
}

// looks up value in MIME_TYPES
// returns null if extension is not known
function get_mime_type(path){
  var ext = get_extension(path).toLowerCase();
  if (ext in MIME_TYPES){
    return MIME_TYPES[ext];
  }
  return null;
}

// gets the S3 uploader
function get_s3(id_token){
  var credentials = { RoleArn: 'arn:aws:iam::025206924291:role/CartesianPartnersUploadFiles_Role',
		      WebIdentityToken: id_token
		      };
  AWS.config.credentials = new AWS.WebIdentityCredentials(credentials);
  AWS.config.region = 'us-east-1';
  AWS.config.credentials.refresh();
  return new AWS.S3({"signatureVersion":"v4"});
}

function show_s3_upload_result(row, error, data) {
  if (error) {
    row.find('td.status').text('ERROR ' + error).addClass('warning');
  } else {
    row.find('td.status').text('Upload complete: OK').addClass('success');
  }
  reset_form();
}



