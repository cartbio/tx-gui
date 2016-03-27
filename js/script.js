// see http://www.abeautifulsite.net/whipping-file-inputs-into-shape-with-bootstrap-3/

$(document).ready( init_upload);
$(document).on('change', '.btn-file :file', on_select_file);

function on_select_file(){
  var input = $(this),
      numFiles = input.get(0).files ? input.get(0).files.length : 1,
      label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
  input.trigger('fileselect', [numFiles, label]);
  $('#fileupload #key').val(label);
  $('button.start').removeClass('disabled');
  $('span.prompt').text('File:');
}

function init_upload() {
  $('.btn-file :file').on('fileselect', show_select_file);
  $('#fileupload').submit(do_upload);
  $('input#lab_id').change(function() {
			     $('#lab_id').removeClass('has-error');
			   });
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
    console.log('Lab ID is missing or invalid');
    $('#lab_id').addClass('has-error');
  return false;
  }
  var file = $('#fileupload input#file').val();
  if (file == ''){
    console.log('File is missing or invalid');
    $('#file').addClass('has-error');
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
  var url = $('#fileupload').attr('action');
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
    .done(function(d, t, r){ on_upload_done(row, d, t, r);});
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
  var stat = $('<td/>').addClass('status').append($('<img/>').attr('src', '/img/spinner.gif')
						             .addClass('spinner'),
						  'Uploading&hellip; ');
  var row = $('<tr/>').append(elt1, elt2, stat);
  $('table.history').append(row);
  return row;
}

function reset_form(){
  $('#fileupload #filename').val('');
  $('#fileupload .prompt').html('Choose file&hellip;');
  $('button.start').addClass('disabled');
}
