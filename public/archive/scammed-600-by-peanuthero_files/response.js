function toggleNav() {
	if($("#mySidenav").hasClass("sidenav_open")) {
		closeNav();
	} else {
		openNav();
	}
}

function openNav() {
	$("#mySidenav").addClass("sidenav_open");
    document.getElementById("mySidenav").style.width = "250px";
	var temp_scroll = (window.scrollY * -1) + "px";
	$('#container').css('position', 'fixed');
	$('#container').css('top', temp_scroll);
}

function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
	$('#container').css('position', 'static');
	var temp_scroll = $('#container').css('top').split('px')[0];
	window.scrollTo(0, (temp_scroll * -1));
	if($("#mySidenav").hasClass("sidenav_open")) {
		$("#mySidenav").removeClass("sidenav_open")
	}
}
	
	
$(document).ready(function(e) {
	if(typeof ddtabcontent !== 'undefined') {
		var myflowers=new ddtabcontent("menutabs");
		myflowers.setpersist(true);
		myflowers.init();
	};
	
	e(".dropdown-toggle").click(function () {
		var t = e(this).parents(".button-dropdown").children(".dropdown-menu").is(":hidden");
		e(".button-dropdown .dropdown-menu").hide();
		e(".button-dropdown .dropdown-toggle").removeClass("active");
		if(t) {
			e(this).parents(".button-dropdown").children(".dropdown-menu").toggle().parents(".button-dropdown").children(".dropdown-toggle").addClass("active")
		}
    });
	
    e(document).bind("click", function (t) {
        var n = e(t.target);
        if (!n.parents().hasClass("button-dropdown")) e(".button-dropdown .dropdown-menu").hide();
    });
	
    e(document).bind("click", function (t) {
        var n = e(t.target);
        if (!n.parents().hasClass("button-dropdown")) e(".button-dropdown .dropdown-toggle").removeClass("active");
    });
	
	
	// $($('ul.panel_links > li').get().reverse()).each(function() {
		// if($(this).hasClass('alerts') == false) {
			// var temp_el = $($(this).html());
			// temp_el.find('i').css('width', '25px');
			// temp_el.append("<span style=\"margin-left: 12px;\">" + temp_el.data('tag') + "</span>");
			// $('#mySidenav').prepend(temp_el);
		// }
	// });
	
	// if(is_guest_account) {
		// $('#panel_popular_link_button').hide();
	// } else {
		// $($('ul.user_links > li').get().reverse()).each(function() {
			// if($(this).hasClass('alerts') == false) {
				// var temp_el = $($(this).html());
				// temp_el.find('i').css('width', '25px');
				// temp_el.append("<span style=\"margin-left: 12px;\">" + temp_el.data('tag') + "</span>");
				// $('#panel_popular_link').prepend(temp_el);
			// }
		// });
	// }
	
	$('.mobile_side_nav').find('tbody').each(function() {
		var check_for_tcat = $(this).find('td.tcat');
		if(check_for_tcat.length) {
			var temp_text = check_for_tcat.find('strong').html();
			var temp_fa = "";
			
			switch(temp_text.toLowerCase()) {
				case "messenger":
					temp_fa = "fa-envelope";
					break;
				case "alerts":
					temp_fa = "fa-bell";
					break;
				case "your profile":
					temp_fa = "fa-user-circle";
					break;
				case "miscellaneous":
					temp_fa = "fa-briefcase";
					break;
				default:
					temp_fa = "";
					break;
			}
			
			$('#mySidenav').append('<button class="accordion"><div style="display: inline-block; width: 50%;"><span class="accordion-icon"><i class="fa ' + temp_fa + '" aria-hidden="true"></i></span>' + temp_text + '</div><div style="display: inline-block; padding-left: 80px; vertical-align: middle;"><i class="fa fa-angle-down"></i></div></button>');
		} else {
			var check_for_trow = $(this).find('td[class^="trow"]');
			var check_for_thead = $(this).find('td.thead');
			if(check_for_trow.length && !check_for_thead.length) {
					var new_panel_links = '<div class="panel">';
					check_for_trow.each(function() {
						var temp_link = $(this).find('a');
						new_panel_links += '<a href="' + temp_link.attr('href') + '">' + temp_link.html() + '</a>';
					});
				
					new_panel_links += '</div>';
					$('#mySidenav').append(new_panel_links);
			}
		}
	});
	
	$('#mySidenav').append('<span class="panel_spacer"></span>');
	
	$('.accordion').click(function(e) {
		var i_arrow = $(this).find('i.fa-angle-down, i.fa-angle-up');
		
		if(i_arrow.hasClass('fa-angle-down')) {
			i_arrow.addClass('fa-angle-up');
			i_arrow.removeClass('fa-angle-down')
			$(this).addClass('theme-color-background');
		} else {
			i_arrow.addClass('fa-angle-down');
			i_arrow.removeClass('fa-angle-up')
			$(this).removeClass('theme-color-background');
		}
		$(this).next().slideToggle();
	});
});