
$(document).ready(function(){
		    load_accounts();
		    load_account();
		  });


function load_accounts(){
  if ($('.container.accounts').length == 0){
    return;
  }
  LOGIN_PROMISE.done(function(){
		   $.ajax({method: 'GET',
			   url: API_URL + '/user/all',
			   statusCode: { 403: fail_ajax },
			   headers: { 'Authorization': 'admin:' + get_id_token() }
			  }).done(on_load_accounts);
		   });
}


function on_load_accounts(data){
  if (typeof data.errorType != 'undefined'){
    $('div.accounts table tr.loading').html('Error: ' + data.errorMessage).addClass('bg-danger');
    return;
  }
  data.sort(function(a,b) {
	      return (a.last_name > b.last_name) ? 1 : ((b.last_name > a.last_name) ? -1 : 0);} );
  $('div.accounts table tr.loading').hide();
  $(data).each(function(i, elt){
		var a = $('<a/>').attr('href', './user?u='+elt.user_id).text(elt.first_name + ' ' + elt.last_name);
		var c1 = $('<td/>').append(a);
		var c2 = $('<td/>').text(elt.email);
	        var c3 = $('<td/>').text(elt.roles);
		var row = $('<tr/>').append(c1, c2, c3);
		$('div.accounts table').append(row);
   });
}

function load_account(){
  if ($('.container.user').length == 0){
    return;
  }
  var user_id = getParameterByName('u');
  LOGIN_PROMISE.done(function(){
		       $.ajax({method: 'GET',
			       url: API_URL + '/user/' + user_id,
			       statusCode: { 403: fail_ajax },
			       headers: { 'Authorization': 'admin:' + get_id_token() }
			      }).done(on_load_account);
		     });
}

function on_load_account(data){
  var user_id = getParameterByName('u');
  $('div.user .loading').hide();
  $('div.deferred').show();
  $('h1').text(data.first_name + ' ' + data.last_name);
  $('#first_name').val(data.first_name);
  $('#last_name').val(data.last_name);
  $('#email').val(data.email);
  $('#user_id').val(user_id);
  $('#created').val(new Date(data.created));
  var last_seen = data.last_seen;
  if (typeof last_seen == 'undefined'){
    var last_seen_str = 'Never logged in';
  } else {
    var last_seen_str = new Date(last_seen);
  }
  $('#last_seen').val(last_seen_str);
  $(data.roles).each(function(i, value){
		       $('input[type=checkbox][value='+value+']').prop('checked', true);
		     });
}

function load_reports(){
  if ($('.container.reports').length == 0){
    return;
  }
  LOGIN_PROMISE.done(function(){
		   $.ajax({method: 'GET',
			   url: API_URL + '/reports/all',
			   statusCode: { 403: fail_ajax },
			   headers: { 'Authorization': 'admin:' + get_id_token() }
			  }).done(on_load_reports);
		   });
}

function on_load_reports(data){
  if (typeof data.errorType != 'undefined'){
    $('div.reports table tr.loading').html('Error: ' + data.errorMessage).addClass('bg-danger');
    return;
  }
  data.sort(function(a,b) {
	      var a_sort = a.created;
	      var b_sort = b.created;
	      return (a_sort > b_sort) ? 1 : ((b_sort > a_sort) ? -1 : 0);} );
  $('div.reports table tr.loading').hide();
  $(data).each(function(i, elt){
		var a = $('<a/>').attr('href', './report/'+elt.report_id).text(elt.report_id);
		var c1 = $('<td/>').text(new Date(elt.created));
		var c2 = $('<td/>').append(a);
	        var c3 = $('<td/>').text(elt.status);
		var row = $('<tr/>').append(c1, c2, c3);
		$('div.reports table').append(row);
   });
}
