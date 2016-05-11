/*
 * (c) Cartesian Bio
 * steve@cartesian.bio
 *
 */

$(document).ready(init_script);

function init_script() {
  $('.patient .patient-status button').click(mock_status);
  set_mock_status(1);
  inline_svg();
}

function on_ajax_fail(event, request, settings){
  console.log('on_ajax_fail', "event=", event, "req=", request, "settings=", settings);
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



/*
 * This turns the href="file.svg" references into inline svg elements,
 * which allows jquery selectors (like color) to work on them.
 */

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

function getParameterByName(name) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

