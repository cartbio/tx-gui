// see http://www.abeautifulsite.net/whipping-file-inputs-into-shape-with-bootstrap-3/

$(document).ready( init_upload);
$(document).on('change', '.btn-file :file', on_select_file);
$(document).ajaxError(on_fail_ae);
$(document).on('user_login', null, change_login);
$(document).on('user_logout', null, change_login);
$(document).on('user_select_file', null, change_login);




function change_login(event, auth2){
  var type = event.type;
  if (type == 'user_login'){
    var user = auth2.currentUser.get();
    var profile = user.getBasicProfile();
    var access_token = user.getAuthResponse().access_token;
    var id_token = user.getAuthResponse().id_token;
    var name = profile.getName();
    var url = profile.getImageUrl();
    display_logged_in(name, url, id_token, access_token);
  } else if (type == 'user_logout'){
    display_logged_out();
  } else if (type == 'user_select_file'){
    // pass
  }
  update_upload_button(auth2.isSignedIn.get());
}
function display_logged_out(){
  $('p.upload_warn').show();
  $('nav .mugshot').hide().css('background-image', '');
  $('input#user').val('');
  $('button.start').attr('disabled', true);
}

function display_logged_in(name, url, id_token, access_token){
  if (false && typeof url != 'undefined'){  // hidden for now
      $('nav .mugshot').css('background-image', 'url('+url+')')
      .css('display', 'inline-block');
  }
  $('p.upload_warn').hide();
  $('input#user').val(name);
  $('input#id_token').val(id_token);
  $('input#access_token').val(access_token);
}

function update_upload_button(is_logged_in){
  var files = $('.btn-file :file').get(0).files;
  if (files.length > 0 && is_logged_in){
    $('button.start').removeAttr('disabled');
  } else {
    $('button.start').attr('disabled', true);
  }
}

function on_select_file(){
  var input = $(this),
      numFiles = input.get(0).files ? input.get(0).files.length : 1,
      label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
  input.trigger('fileselect', [numFiles, label]);
  $('#fileupload #key').val(label);
  $(document).trigger('user_select_file', _auth2);
  $('span.prompt').text('File:');
}

function init_upload() {
  $('.btn-file :file').on('fileselect', show_select_file);
  $('#fileupload').submit(do_upload);
  $('input#lab_id').change(function() {
			     $('#lab_id').removeClass('has-error');
			   });
  check_login();
}

function check_login(){
  check_id_token(on_still_here);
}

function on_still_here(id_token, data){
  var name = data.name;
  var email = data.email;
  var access_token = data.access_token;
  display_logged_in(name, '', id_token, access_token);
  display_user(email);
  update_upload_button(true);
}

function show_select_file(event, numFiles, label) {
  var input = $(this).parents('.input-group').find(':text'),
  log = numFiles > 1 ? numFiles + ' files selected' : label;
  if( input.length ) {
    input.val(log);
  } else {
    if( log ) alert(log);
  }
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

function do_upload(event){
  event.preventDefault();
  if (!validate_form()){
    return;
  }
  var lab_id =  $('#fileupload input#lab_id').val().toUpperCase();
  var filename =  $('#fileupload #filename').val();
  var pathname = lab_id + '/' + filename;
  var url = $('#fileupload select').val();
  var formData = new FormData();
  formData.append('key', pathname);
  formData.append('file', $('#fileupload input#file')[0].files[0], pathname);
  var row = make_row(lab_id, filename);
  $.ajax({url: url,
	  type: 'POST',
	  data: formData,
	  processData: false,  // tell jQuery not to process the data
	  contentType: false   // tell jQuery not to set contentType
	 })
    .fail(function(response, text){ on_fail(row, response, text);})
    .done(function(d, t, r){ on_upload_done(row, d, t, r);});
}

function on_fail_ae(event, request, settings){
  console.log('on_fail_ae', "event=", event, "req=", request, "settings=", settings);
}

function on_fail(row, response, text){
  //console.log('ERROR response=', response, "text=", text);
  row.find('td.status').text('ERROR').addClass('warning');
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
