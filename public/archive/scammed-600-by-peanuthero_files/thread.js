var Thread = {
	quickLoveInProgress: false,
	
	init: function()
	{
		$(document).ready(function(){
			Thread.quickEdit();
			Thread.initQuickReply();
			Thread.initMultiQuote();

			// Set spinner image
			$('#quickreply_spinner img').attr('src', spinner_image);
		});
	},

	initMultiQuote: function()
	{
		var quoted = Cookie.get('multiquote');
		if(quoted)
		{
			var post_ids = quoted.split("|");

			$.each(post_ids, function(key, value) {
				var mquote_a = $("#multiquote_"+value).closest('a');
				if(mquote_a.length)
				{
					mquote_a.removeClass('postbit_multiquote').addClass('postbit_multiquote_on');
				}
			});

			var mquote_quick = $('#quickreply_multiquote');
			if(mquote_quick.length)
			{
				mquote_quick.show();
			}
		}
		return true;
	},

	multiQuote: function(pid)
	{
		var new_post_ids = new Array();
		var quoted = Cookie.get("multiquote");
		var is_new = true;
		if(quoted)
		{
			var post_ids = quoted.split("|");

			$.each(post_ids, function(key, post_id) {
				if(post_id != pid && post_id != '')
				{
					new_post_ids[new_post_ids.length] = post_id;
				}
				else if(post_id == pid)
				{
					is_new = false;
				}
			});
		}

		var mquote_a = $("#multiquote_"+pid).closest('a')
		if(is_new == true)
		{
			new_post_ids[new_post_ids.length] = pid;
			mquote_a.removeClass('postbit_multiquote').addClass('postbit_multiquote_on');
		}
		else
		{
			mquote_a.removeClass('postbit_multiquote_on').addClass('postbit_multiquote');
		}

		var mquote_quick = $('#quickreply_multiquote');
		if(mquote_quick.length)
		{
			if(new_post_ids.length)
			{
				mquote_quick.show();
			}
			else
			{
				mquote_quick.hide();
			}
		}
		Cookie.set("multiquote", new_post_ids.join("|"));
	},

	loadMultiQuoted: function()
	{
		if(use_xmlhttprequest == 1)
		{
			// Spinner!
			var mquote_spinner = $('#quickreply_spinner');
			mquote_spinner.show();

			$.ajax(
			{
				url: 'xmlhttp.php?action=get_multiquoted&load_all=1',
				type: 'get',
				complete: function (request, status)
				{
					Thread.multiQuotedLoaded(request, status);

					// Get rid of spinner
					mquote_spinner.hide();
				}
			});

			return false;
		}
		else
		{
			return true;
		}
	},

	multiQuotedLoaded: function(request)
	{
		var json = $.parseJSON(request.responseText);
		if(typeof json == 'object')
		{
			if(json.hasOwnProperty("errors"))
			{
				$.each(json.errors, function(i, message)
				{
					$.jGrowl(lang.post_fetch_error + ' ' + message, {theme:'jgrowl_error'});
				});
				return false;
			}
		}

		if(typeof $('textarea').sceditor != 'undefined')
		{
			$('textarea').sceditor('instance').insert(json.message);
		}
		else
		{
			var id = $('#message');
			if(id.value)
			{
				id.value += "\n";
			}
			id.val(id.val() + json.message);
		}

		Thread.clearMultiQuoted();
		$('#quickreply_multiquote').hide();
		$('#quoted_ids').val('all');

		$('#message').focus();
	},

	clearMultiQuoted: function()
	{
		$('#quickreply_multiquote').hide();
		var quoted = Cookie.get("multiquote");
		if(quoted)
		{
			var post_ids = quoted.split("|");

			$.each(post_ids, function(key, post_id) {
				var mquote_a = $("#multiquote_"+post_id).closest('a');
				if(mquote_a.length)
				{
					mquote_a.removeClass('postbit_multiquote_on').addClass('postbit_multiquote');
				}
			});
		}
		Cookie.unset('multiquote');
	},

	quickEdit: function(el)
	{
		if(typeof el === 'undefined' || !el.length) el = '.post_body';

		$(el).each(function()
		{
			// Take pid out of the id attribute
			id = $(this).attr('id');
			pid = id.replace( /[^\d.]/g, '');

			$('#pid_' + pid).editable("xmlhttp.php?action=edit_post&do=update_post&pid=" + pid + '&my_post_key=' + my_post_key,
			{
				indicator: spinner,
				loadurl: "xmlhttp.php?action=edit_post&do=get_post&pid=" + pid,
				type: "textarea",
				rows: 12,
				submit: lang.save_changes,
				cancel: lang.cancel_edit,
				event: "edit" + pid, // Triggered by the event "edit_[pid]",
				onblur: "ignore",
				dataType: "json",
				submitdata: function (values, settings)
				{
					id = $(this).attr('id');
					pid = id.replace( /[^\d.]/g, '');
					$("#quickedit_" + pid + "_editreason_original").val($("#quickedit_" + pid + "_editreason").val());
					return {
						editreason: $("#quickedit_" + pid + "_editreason").val()
					}
				},
				callback: function(values, settings)
				{
					id = $(this).attr('id');
					pid = id.replace( /[^\d.]/g, '');

					var json = $.parseJSON(values);
					if(typeof json == 'object')
					{
						if(json.hasOwnProperty("errors"))
						{
							$(".jGrowl").jGrowl("close");

							$.each(json.errors, function(i, message)
							{
								$.jGrowl(lang.quick_edit_update_error + ' ' + message, {theme:'jgrowl_error'});
							});
							$(this).html($('#pid_' + pid + '_temp').html());
						}
						else if(json.hasOwnProperty("moderation_post"))
						{
							$(".jGrowl").jGrowl("close");

							$(this).html(json.message);

							// No more posts on this page? (testing for "1" as the last post would be removed here)
							if($('.post').length == 1)
							{
								alert(json.moderation_post);
								window.location = json.url;
							}
							else
							{
								$.jGrowl(json.moderation_post, {theme:'jgrowl_success'});
								$('#post_' + pid).slideToggle();
							}
						}
						else if(json.hasOwnProperty("moderation_thread"))
						{
							$(".jGrowl").jGrowl("close");

							$(this).html(json.message);

							alert(json.moderation_thread);

							// Redirect user to forum
							window.location = json.url;
						}
						else
						{
							// Change html content
							$(this).html(json.message);
							$('#edited_by_' + pid).html(json.editedmsg);
						}
					}
					else
					{
						// Change html content
						$(this).html(json.message);
						$('#edited_by_' + pid).html(json.editedmsg);
					}
					$('#pid_' + pid + '_temp').remove();
				}
			});
        });

		$('.quick_edit_button').each(function()
		{
			$(this).on("click", function(e)
			{
				e.preventDefault();

				// Take pid out of the id attribute
				id = $(this).attr('id');
				pid = id.replace( /[^\d.]/g, '');

				// Create a copy of the post
				if($('#pid_' + pid + '_temp').length == 0)
				{
					$('#pid_' + pid).clone().attr('id','pid_' + pid + '_temp').appendTo("body").hide();
				}

				// Trigger the edit event
				$('#pid_' + pid).trigger("edit" + pid);

				// Edit Reason
				$('#pid_' + pid + ' textarea').attr('id', 'quickedit_' + pid);
				if(allowEditReason == 1 && $('#quickedit_' + pid + '_editreason').length == 0)
				{
					edit_el = $('#editreason_' + pid + '_original').clone().attr('id','editreason_' + pid);
					edit_el.children('#quickedit_' + pid + '_editreason_original').attr('id','quickedit_' + pid + '_editreason');
					edit_el.insertAfter('#quickedit_' + pid).show();
				}
			});
        });

		return false;
	},

	initQuickReply: function()
	{
		if($('#quick_reply_form').length && use_xmlhttprequest == 1)
		{
			// Bind closing event to our popup menu
			$('#quick_reply_submit').bind('click', function(e) {
				if(Thread.gravedig) {
					if(!confirm('WARNING: Your reply is in an old thread. Are you sure you want to post?')) {
						e.stopPropagation();
						e.preventDefault();
						return;
					}
				}
				
				return Thread.quickReply(e);
			});
		}
	},

	quickReply: function(e)
	{
		e.stopPropagation();

		if(this.quick_replying)
		{
			return false;
		}

		this.quick_replying = 1;
		var post_body = $('#quick_reply_form').serialize();

		// Spinner!
		var qreply_spinner = $('#quickreply_spinner');
		qreply_spinner.show();

		$.ajax(
		{
			url: 'newreply.php?ajax=1',
			type: 'post',
			data: post_body,
			dataType: 'html',
        	complete: function (request, status)
        	{
		  		Thread.quickReplyDone(request, status);

				// Get rid of spinner
				qreply_spinner.hide();
          	}
		});

		return false;
	},

	quickReplyDone: function(request, status)
	{
		this.quick_replying = 0;

		var json = $.parseJSON(request.responseText);
		if(typeof json == 'object')
		{
			if(json.hasOwnProperty("errors"))
			{
				$(".jGrowl").jGrowl("close");

				$.each(json.errors, function(i, message)
				{
					$.jGrowl(lang.quick_reply_post_error + ' ' + message, {theme:'jgrowl_error'});
				});
				$('#quickreply_spinner').hide();
			}
		}

		if($('#captcha_trow').length)
		{
			cap = json.data.match(/^<captcha>([0-9a-zA-Z]+)(\|([0-9a-zA-Z]+)|)<\/captcha>/);
			if(cap)
			{
				json.data = json.data.replace(/^<captcha>(.*)<\/captcha>/, '');

				if(cap[1] == "reload")
				{
					Recaptcha.reload();
				}
				else if($("#captcha_img").length)
				{
					if(cap[1])
					{
						imghash = cap[1];
						$('#imagehash').val(imghash);
						if(cap[3])
						{
							$('#imagestring').attr('type', 'hidden').val(cap[3]);
							// hide the captcha
							$('#captcha_trow').hide();
						}
						else
						{
							$('#captcha_img').attr('src', "captcha.php?action=regimage&imagehash="+imghash);
							$('#imagestring').attr('type', 'text').val('');
							$('#captcha_trow').show();
						}
					}
				}
			}
		}

		if(json.hasOwnProperty("errors"))
			return false;

		if(json.data.match(/id="post_([0-9]+)"/))
		{
			var pid = json.data.match(/id="post_([0-9]+)"/)[1];
			var post = document.createElement("div");

			$('#posts').append(json.data);

			if (typeof inlineModeration != "undefined") // Guests don't have this object defined
				$("#inlinemod_" + pid).on('change', inlineModeration.checkItem);

			Thread.quickEdit("#pid_" + pid);

			// Eval javascript
			$(json.data).filter("script").each(function(e) {
				eval($(this).text());
			});

			$('#quick_reply_form')[0].reset();

			var lastpid = $('#lastpid');
			if(lastpid.length)
			{
				lastpid.val(pid);
			}
		}
		else
		{
			// Eval javascript
			$(json.data).filter("script").each(function(e) {
				eval($(this).text());
			});
		}

		$(".jGrowl").jGrowl("close");
	},

	showIgnoredPost: function(pid)
	{
		$('#ignored_post_'+pid).slideToggle("slow");
		$('#post_'+pid).slideToggle("slow");
	},

	showDeletedPost: function(pid)
	{
		$('#deleted_post_'+pid).slideToggle("slow");
		$('#post_'+pid).slideToggle("slow");
	},

	deletePost: function(pid)
	{
		$.prompt(quickdelete_confirm, {
			buttons:[
					{title: yes_confirm, value: true},
					{title: no_confirm, value: false}
			],
			submit: function(e,v,m,f){
				if(v == true)
				{
					$.ajax(
					{
						url: 'editpost.php?ajax=1&action=deletepost&delete=1&my_post_key='+my_post_key+'&pid='+pid,
						type: 'post',
						complete: function (request, status)
						{
							var json = $.parseJSON(request.responseText);
							if(json.hasOwnProperty("errors"))
							{
								$.each(json.errors, function(i, message)
								{
									$.jGrowl(lang.quick_delete_error + ' ' + message, {theme:'jgrowl_error'});
								});
							}
							else if(json.hasOwnProperty("data"))
							{
								// Soft deleted
								if(json.data == 1)
								{
									// Change CSS class of div 'post_[pid]'
									$("#post_"+pid).addClass("unapproved_post deleted_post");

									$("#quick_delete_" + pid).hide();
									$("#quick_restore_" + pid).show();

									$.jGrowl(lang.quick_delete_success, {theme:'jgrowl_success'});
								}
								else if(json.data == 2)
								{
									// Actually deleted
									$('#post_'+pid).slideToggle("slow");

									$.jGrowl(lang.quick_delete_success, {theme:'jgrowl_success'});
								} else if(json.data == 3)
								{
									// deleted thread --> redirect

									if(!json.hasOwnProperty("url"))
									{
										$.jGrowl(lang.unknown_error, {theme:'jgrowl_error'});
									}

									// set timeout for redirect
									window.setTimeout(function()
									{
 										window.location = json.url;
									}, 3000);

									// print success message
									$.jGrowl(lang.quick_delete_thread_success, {theme:'jgrowl_success'});
								}
							}
							else
							{
								$.jGrowl(lang.unknown_error, {theme:'jgrowl_error'});
							}
						}
					});
				}
			}
		});

		return false;
	},


	restorePost: function(pid)
	{
		$.prompt(quickrestore_confirm, {
			buttons:[
					{title: yes_confirm, value: true},
					{title: no_confirm, value: false}
			],
			submit: function(e,v,m,f){
				if(v == true)
				{
					$.ajax(
					{
						url: 'editpost.php?ajax=1&action=restorepost&restore=1&my_post_key='+my_post_key+'&pid='+pid,
						type: 'post',
						complete: function (request, status)
						{
							var json = $.parseJSON(request.responseText);
							if(json.hasOwnProperty("errors"))
							{
								$.each(json.errors, function(i, message)
								{
									$.jGrowl(lang.quick_restore_error + ' ' + message, {theme:'jgrowl_error'});
								});
							}
							else if(json.hasOwnProperty("data"))
							{
								// Change CSS class of div 'post_[pid]'
								$("#post_"+pid).removeClass("unapproved_post deleted_post");

								$("#quick_delete_" + pid).show();
								$("#quick_restore_" + pid).hide();

								$.jGrowl(lang.quick_restore_success, {theme:'jgrowl_success'});
							}
							else
							{
								$.jGrowl(lang.unknown_error, {theme:'jgrowl_error'});
							}
						}
					});
				}
			}
		});

		return false;
	},

	viewNotes: function(tid)
	{
		MyBB.popupWindow("/moderation.php?action=viewthreadnotes&tid="+tid+"&modal=1");
	},
	
	// HF CUSTOM CODE START 
	
	sendPost: function(pid)
	{
		var data = {
			my_post_key: my_post_key,
			subject: "Sharing a Post",
			options: {
				signature: 1,
				disablesmilies: 0,
				savecopy: 0,
				readreceipt: 1
			},
			action: "do_send",
			pmid: 0,
			message: "[url=https://hackforums.net/showthread.php?pid=" + pid + "#pid" + pid + "]" + $("h1").html() + "[/url]",
			to: $('#username').val()
		};
		
		$('#share-send-pm-spinner').remove();
		$('#share-send-pm').parent().after('<div id="share-send-pm-spinner" class="lds-dual-ring" style="position: absolute; right: 35px; bottom: 25px; display: inline-block;"></div>');
		
		$.ajax({
			url: '/private.php',
			type: "POST",
			data: data,
			timeout: 10000,
			error: function(data) {
				$('#share-send-pm-spinner').removeClass('lds-dual-ring').css('bottom', '30px').css('right', '30px').text("Error!");
			},
			success: function(data){
				var share_message = "Sent!";
				
				if($(data).find('div.error').length) {
					share_message = "Error!";
				}
				
				$('#share-send-pm-spinner').removeClass('lds-dual-ring').css('bottom', '30px').css('right', '30px').text(share_message);
			}
		});
	},
	
	toggleShare: function(pid, post_number)
	{		
		var post_link = 'a#pid' + pid;
		
		var new_element = `<div class="modal" id="share_box_${pid}" style="display: none;">
			<div style="overflow-y: auto; max-height: 400px;">
				<table border="0" cellspacing="0" cellpadding="5" class="tborder">
					<thead>
						<tr>
							<th class="thead">
								<strong>Share this post</strong>
								<div class="float_right"><strong>#${post_number}</strong></div>
							</th>
						</tr>
					</thead>
					<tr>
						<td class="trow1" style="padding: 20px">
							<div class="social-media-buttons">
								<span><i class="far fa-link" aria-hidden="true"  onclick="Thread.copyLink(${pid})"></i></span>
								<span><i class="fab fa-facebook-square" aria-hidden="true" onclick="Thread.shareFacebook(${pid})"></i></span>
								<span><i class="fab fa-twitter-square" aria-hidden="true" onclick="Thread.shareTwitter(${pid})"></i></span>
								<span><i class="fab fa-reddit-square" aria-hidden="true" onclick="Thread.shareReddit(${pid})"></i></span>
							</div>
							<div class="social-copy-group">
								<div>
									<div class="social-media-hidden-message" style="display: none;"><span>Copied!</span></div>
								</div>
								<div class="social-copy-link">
									<div class="social-media-copy-type"><strong>Link:</strong></div>
									<div class="social-media-copy-input"><input type="text" class="textbox" name="share_post_${pid}" value="" onfocus="this.select()" /><div class="share-tooltip"><a href="javascript:void(0);" class="social-media-copy-button" onclick="Thread.copyLink(${pid})"><span class="tooltiptext">Copy URL</span>COPY</a></div></div>
								</div>
								<div class="social-copy-link">
									<div class="social-media-copy-type"><strong>Cite:</strong></div>
									<div class="social-media-copy-input"><input type="text" class="textbox" name="share_cite_${pid}" value="CITE_URL_HERE" onfocus="this.select()" /><div class="share-tooltip"><a href="javascript:void(0);" class="social-media-copy-button" onclick="Thread.copyCite(${pid})"><span class="tooltiptext">Copy MyCode</span>COPY</a></div></div>
								</div>
							</div>
							<div style="margin-top: 20px;">
								<strong>PM share to:</strong>
								<input type="text" class="textbox" name="username" id="username" style="" value="" />
								<div class="share-tooltip"><a href="javascript:void(0);" id="share-send-pm" class="social-media-copy-button" onclick="Thread.sendPost(${pid})"><span class="tooltiptext">Send Post via PM</span>SEND</a></div>
							</div>
							<link rel="stylesheet" href="https://hackforums.net/jscripts/select2/select2.css?ver=1806">
							<script type="text/javascript" src="https://hackforums.net/jscripts/select2/select2.min.js#ver=1806"></script>
							<script type="text/javascript">
							<!--
							if(use_xmlhttprequest == "1")
							{
								MyBB.select2();
								$("#username").select2({
									placeholder: "Search for a user",
									minimumInputLength: 3,
									maximumSelectionSize: 3,
									multiple: false,
									ajax: { // instead of writing the function to execute the request we use Select2's convenient helper
										url: "xmlhttp.php?action=get_users",
										dataType: 'json',
										data: function (term, page) {
											return {
												query: term, // search term
											};
										},
										results: function (data, page) { // parse the results into the format expected by Select2.
											// since we are using custom formatting functions we do not need to alter remote JSON data
											return {results: data};
										}
									},
									initSelection: function(element, callback) {
										var value = $(element).val();
										if (value !== "") {
											callback({
												id: value,
												text: value
											});
										}
									},
								  // Allow the user entered text to be selected as well
								  createSearchChoice:function(term, data) {
										if ( $(data).filter( function() {
											return this.text.localeCompare(term)===0;
										}).length===0) {
											return {id:term, text:term};
										}
									},
								});

								 $('[for=username]').click(function(){
									$("#username").select2('open');
									return false;
								});
							}
							// -->
							</script>
						</td>
					</tr>
				</table>
			</div>
		</div>`;
		
		$(new_element).appendTo('body').modal({ fadeDuration: 0, zIndex: (typeof modal_zindex !== 'undefined' ? modal_zindex : 9999) });
		
		var post_data = $("#post_url_" + pid );

		var title = post_data.attr('title');
		var link = post_data.attr('href');
		
		var cite_val = "[url=" + link + "][b]" + title + "[/b][/url]";
		
		$("input[name='share_post_" + pid + "']").val(link);
		$("input[name='share_cite_" + pid + "']").val(cite_val);
	},
	
	copyLink: function(pid)
	{
		$("input[name='share_post_" + pid + "']").select();
		document.execCommand("copy");
		
		$('.social-media-hidden-message').css('display', 'inline-block');
	},
	
	copyCite: function(pid)
	{
		$("input[name='share_cite_" + pid + "']").select();
		document.execCommand("copy");
		
		$('.social-media-hidden-message').css('display', 'inline-block');
	},
	
	openShareLink: function(link)
	{
		var top = window.screen.height - 450;
		top = top > 0 ? top/2 : 0;
				
		var left = window.screen.width - 400;
		left = left > 0 ? left/2 : 0;
		
		newwindow=window.open(link, "Share Post", 'height=450,width=400,top=' + top + ',left=' + left);
		if(window.focus) {
			newwindow.focus();
		}
	},
	
	shareFacebook: function(pid)
	{
		var post_data = $("#post_url_" + pid );
		var link = post_data.attr('href');
		
		var social_url = 'https://www.facebook.com/sharer.php?u=';
		
		Thread.openShareLink(social_url + link);
	},
	
	shareTwitter: function(pid)
	{
		var post_data = $("#post_url_" + pid );
		var link = encodeURIComponent(post_data.attr('href'));
		var title_text = post_data.attr('title');
		
		var social_url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(title_text.replace(/#/g, '')) + '%20' + link + ' via @HackForumsNet&original_referer=' + link;
		
		Thread.openShareLink(social_url);
	},
	
	shareReddit: function(pid)
	{
		var post_data = $("#post_url_" + pid );
		var link = post_data.attr('href');
		
		var social_url = 'https://www.reddit.com/submit?url=';
		
		Thread.openShareLink(social_url + link);
	},
	
	quickLoveClick: function(pid)
	{
		// console.log(Thread.quickLoveInProgress);
		// Thread.quickLoveInProgress = true;
		// console.log(Thread.quickLoveInProgress);
		
		if(!Thread.quickLoveInProgress) {
			Thread.quickLoveAjax(pid);
		} else {
			$.jGrowl('Please wait for current quick love to finish.', {theme:'jgrowl_error'});
		}
	},
	
	quickLoveAjax: function(pid)
	{
		Thread.quickLoveInProgress = true;
		
		var data = {
			my_post_key: my_post_key,
			action: "do_quicklove",
			pid: pid
		};
		
		$.ajax({
			url: '/xmlhttp.php',
			type: "POST",
			data: data,
			dataType: 'json',
			timeout: 10000,
			success: function(json, status){				
				if(typeof json == 'object') {
					if(json.hasOwnProperty("errors")) {
						$.each(json.errors, function(i, message) {
							$.jGrowl('An error has occured: ' + message, {theme:'jgrowl_error'});
						});
						
						return false;
					}
					
					$.jGrowl('Successfully Quick Loved this post.', {theme:'jgrowl_success'});
				}
			},
			error: function(request, status) {
				$.jGrowl('Sorry but there was an error. Please try again later.', {theme:'jgrowl_error'});
			},
			complete: function(request, status) {
				Thread.quickLoveInProgress = false;
			}
		});
	},
	
	setReminder: function(tid) {	
		tid = Util.forceInt(tid);
	
		if(tid <= 0) {
			$.jGrowl('There was an error. Please reload the page and try again.', { theme: 'jgrowl_error' });
			return;
		}
		
		$.ajaxSetup({
			cache: true
		});

		let new_rand_id = [...Array(10)].map(i=>(~~(Math.random()*36)).toString(36)).join('');

		$("head").append('<link rel="stylesheet" href="https://hackforums.net/fonts/flatpickr.css">');

		let new_element = `<div class="modal" id="" style="display: none;">
			
			
			<div style="overflow-y: auto;max-height: 400px;background-color: #333;padding: 10px; text-align: center;">
				<form method="post" action="xmlhttp.php" id="form_${new_rand_id}">
					<div><span style="font-size: 18px; color: #e2e2e2; font-weight: bold; letter-spacing: 0.5px;">Remind me about this thread on...</span></div>	
					<div style="margin-top: 10px;">
						<input id="flatpickr_${new_rand_id}" class="textbox flatpickr" type="text" placeholder="Select Date.." onchange="" required>
					</div>
					<div style="margin-top: 10px;">
						<input type="submit" class="button" name="Set Reminder">
					</div>
				</form>
			</div>
			<script>
			let flatp = false;
			let running_reminder_ajax = false;
			$.getScript('https://hackforums.net/jscripts/flatpickr.js')
			.done(function() {
				let setIntervalID = setInterval(function() {
					try {
						let maxDate = new Date();
						maxDate.setFullYear(maxDate.getFullYear() + 1)
						
						if(flatp = flatpickr('#flatpickr_${new_rand_id}', {minDate: "today", defaultDate: new Date(), maxDate: maxDate, altInput: true, altFormat: "F j, Y", dateFormat: "Y-m-d"})) {
							clearInterval(setIntervalID);
							
							flatp.config.onChange.push(() => {
								
							});
						}
					} catch(err) {
	
					}
				}, 300);
			});
			
			$("#form_${new_rand_id}").submit(function(e) {
				e.preventDefault();
				
				let tid = ${tid};
				
				let [year, month, day] = flatp.formatDate(flatp.selectedDates[0], "Z").split("T")[0].split("-");
				
				let data = {
					action: "do_set_reminder",
					year: year,
					month: month,
					day: day,
					tid: tid,
					my_post_key: my_post_key
				}

				$.ajax({
					type: "POST",
					url: "xmlhttp.php?ajax=1",
					data: data,
					dataType: "json",
					success: function(data) {						
						if(typeof data == 'object') {
							if(data.hasOwnProperty("errors")) {
								$.each(data.errors, function(i, message) {
									$.jGrowl('Error:  ' + message, { theme: 'jgrowl_error' });
								});
							} else if(data.hasOwnProperty("success")) {
								$.jGrowl('Successfully set a reminder for this thread.', { theme: 'jgrowl_success' });
							}
						}
					},
					error: function() {
						$.jGrowl('There was an error setting this reminder. Please reload the page and try again.', { theme: 'jgrowl_error' });
					},
					complete: function() {
						$.modal.close();
					}
				});
			});
			</script>
		</div>`;
		
		$(new_element).appendTo('body').modal({ fadeDuration: 150, zIndex: (typeof modal_zindex !== 'undefined' ? modal_zindex : 9999) });
		
	},
	
	subscribeModal: function(tid) {
		let new_rand_id = [...Array(10)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
		
		let new_element = `<div class="modal" id="" style="display: none;">
			<div style="overflow-y: auto;max-height: 400px;background-color: #333;padding: 10px; text-align: center;">
				<form method="post" action="xmlhttp.php" id="form_${new_rand_id}">
					<input type="hidden" name="action" value="do_addsubscription">
					<input type="hidden" name="my_post_key" value="${my_post_key}">
					<input type="hidden" name="tid" value="${tid}">
					<div><span style="font-size: 18px; color: #e2e2e2; font-weight: bold; letter-spacing: 0.5px;">Subscription Method:</span></div>	
					<div style="margin-top: 10px; display: flex; flex-direction: column; text-align: left; font-weight: 500;">
						<label for="notification_remove" class="subscribeLabel subscribeLabelSelected">
							<span>Remove Subscription</span>
							<span><input type="radio" name="notification" id="notification_remove" value="-1"></span>
						</label>
					
						<label for="notification_none" class="subscribeLabel subscribeLabelSelected">
							<span>On-site / Push Notifications</span>
							<span><input type="radio" name="notification" id="notification_none" value="0"></span>
						</label>
						
						<label for="notification_email" class="subscribeLabel subscribeLabelSelected">
							<span>Email Notifications</span>
							<span><input type="radio" name="notification" id="notification_email" value="1"></span>
						</label>
						
						<label for="notification_pm" class="subscribeLabel subscribeLabelSelected">
							<span>Private Message Notifications</span>
							<span><input type="radio" name="notification" id="notification_pm" value="2"></span>
						</label>		
					</div>
					<div style="margin-top: 10px;">
						<input type="submit" class="button" name="submit" value="Update Subscription">
					</div>
				</form>
			</div>
			<script>
				$("#form_${new_rand_id}").submit(function(e) {
					e.preventDefault();

					let post_body = $('#form_${new_rand_id}').serialize();
					let is_removal = false;
					
					if(document.getElementById('notification_remove').checked) {
						is_removal = true;
						post_body = 'action=removesubscription&my_post_key=${my_post_key}&tid=${tid}';
					}

					$.ajax({
						type: "POST",
						url: "usercp2.php?ajax=1",
						data: post_body,
						dataType: "json",
						success: function(data) {						
							if(typeof data == 'object') {
								if(data.hasOwnProperty("errors")) {
									$.each(data.errors, function(i, message) {
										$.jGrowl('Error:  ' + message, { theme: 'jgrowl_error' });
									});
								} else if(data.data.includes('selected thread has been added')) {
									$.jGrowl('Successfully set a subscription for this thread.', { theme: 'jgrowl_success' });
								} else if(data.data.includes('selected thread has been removed')) {
									$.jGrowl('Successfully removed your subscription to this thread.', { theme: 'jgrowl_success' });
								} else {
									$.jGrowl('There was an error updating this thread subscription. Please try again.', { theme: 'jgrowl_error' });
								}
							}
						},
						error: function() {
							$.jGrowl('There was an error updating this subscription. Please reload the page and try again.', { theme: 'jgrowl_error' });
						},
						complete: function() {
							$.modal.close();
						}
					});
				});
			</script>
		</div>`;
		
		$(new_element).appendTo('body').modal({ fadeDuration: 150, zIndex: (typeof modal_zindex !== 'undefined' ? modal_zindex : 9999) });
	}
	// HF CUSTOM CODE END 
};

Thread.init();