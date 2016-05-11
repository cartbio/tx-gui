$(document).ready(setup_profile);

var PROFILE_ROLES = { admin: 'Cartesian admin',
		      lab: 'Lab tech'
		    };

function setup_profile(){
  $(document).on('user_login', profile_logged_in);
  $(document).on('user_logout', profile_logged_out);
  $('.role-button').click(toggle_active);
}

function toggle_active(event){
  $(event.target).toggleClass('active').blur();
  return false;
}

function profile_logged_in(){
  var info = get_user_info();
  var my_roles = $(document).data('roles');
  if (info){
    $('#name').val(info.name).prop('readonly', true);
    $('#email').val(info.email).prop('readonly', true);
  }
  $(my_roles).each(function(i, role){
    if (role == 'new_user'){
      return;
    } else if (role == 'physician' || role == 'patient'){
      $('button.'+role).addClass("active");
      return;
    }
    var p_role = PROFILE_ROLES[role];
    var btn = $('<button/>').addClass("btn btn-default role-button active")
		       .text(p_role).prop('readonly', true).click(function(){return false;});
    $('.role-buttons').append(btn);
  });
}

function profile_logged_out(){
    window.location.href = '/';
}
