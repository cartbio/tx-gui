/*
 * (c) Cartesian Bio
 * steve@cartesian.bio
 *
 */

$(document).ready(init_status);

function init_status() {
  $('.patient .patient-status button').click(mock_status);
  set_mock_status(1);
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

