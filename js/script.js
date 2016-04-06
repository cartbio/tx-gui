/* Lab upload form
 *
 * (c) Cartesian Bio
 * steve@cartesian.bio
 *
 * Allows lab technicians to securely upload data files
 *
 */

$(document).ready(init_upload);

function init_upload() {
  // Event watchers
  $(document).ajaxError(on_ajax_fail);
  $(document).on('user_login', display_logged_in);
  $(document).on('user_logout', display_logged_out);

  // do when value changes
  $('.btn-file :file').change(on_select_file);
  $('input#lab_id').change(function() { $('#lab_id').removeClass('has-error');});

  // do when clicked
  $('#fileupload').submit(do_upload);
  $('.patient .patient-status button').click(mock_status);
  set_mock_status(1);
  inline_svg();
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
		Metadata: {'LabID' : lab_id, 'email' : user_info.email},
		ACL: "bucket-owner-full-control",
		ServerSideEncryption: "aws:kms"};

  var s3 = get_s3(id_token);
  var row = make_row(lab_id, file.name);
  s3.upload(params, function(error, data){show_s3_upload_result(row, error, data);});
}

function get_s3(id_token){
  var credentials = { RoleArn: 'arn:aws:iam::025206924291:role/CartesianPartnersUploadFiles_Role',
		      WebIdentityToken: id_token
		      };
  AWS.config.credentials = new AWS.WebIdentityCredentials(credentials);
  AWS.config.region = 'us-east-1';
  return new AWS.S3({"signatureVersion":"v4"});
}

function show_s3_upload_result(row, error, data) {
  if (error) {
    console.log('ERROR', error, data);
    row.find('td.status').text('ERROR ' + error).addClass('warning');
  } else {
    console.log('SUCCESS', error, data);
    row.find('td.status').text('Upload complete: OK').addClass('success');
  }
  reset_form();
}

function on_upload_done(row, data, textStatus, result){
  var status = result.status;
  var is_error = false;
  if (status != 204){
    console.log('ERROR', data, textStatus, result);
    row.find('td.status').text('ERROR').addClass('warning');
  } else {
    console.log('SUCCESS', data, textStatus, result);
    row.find('td.status').text('Upload complete: OK').addClass('success');
  }
  reset_form();
}

function mock_status(event){
  var val = parseInt($(this).text());
  set_mock_status(val);
}

function set_mock_status(val){
  $('.step-descriptions div').hide();
  $('.step-descriptions div.step'+val).css('display','block');
  for (var i=1; i<=5; i++){
    var li = $('.progress-indicator li.step'+i);
    if (val >= i){
      li.addClass('completed');
    } else {
      li.removeClass('completed');
    }
  }
  return false;
}


/* -------------------  */

// This turns the href="file.svg" references into inline svg elements,
// which allows jquery selectors (like color) to work on them.

function inline_svg(){
  var target = $('img.svg').length;
  var i = 0;
  var count = function () { i += 1; return i; };
  $('img.svg').each(function(){
		      var $img = $(this);
		      var imgID = $img.attr('id');
		      var imgClass = $img.attr('class');
		      var imgURL = $img.attr('src');

		      $.get(imgURL, function(data) {
			      // Get the SVG tag, ignore the rest
			      var $svg = $(data).find('svg');
			      // Add replaced image's ID to the new SVG
			      if(typeof imgID !== 'undefined') {
				$svg = $svg.attr('id', imgID);
			      }
			      // Add replaced image's classes to the new SVG
			      if(typeof imgClass !== 'undefined') {
				$svg = $svg.attr('class', imgClass+' replaced-svg');
			      }
			      // Remove any invalid XML tags as per http://validator.w3.org
			      $svg = $svg.removeAttr('xmlns:a');
			      // Replace image with new SVG
			      $img.hide();
			      $img.replaceWith($svg);
			    }, 'xml');
		    });
}
