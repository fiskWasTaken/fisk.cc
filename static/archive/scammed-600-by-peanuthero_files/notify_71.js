var Notify = {	
	md: window.markdownit("zero", {
		linkify : true
	}),
	
	
	mdStanley: window.markdownit("default", {
		linkify : true,
		html: true
	}),


	socket: null,
	
	
	alerts: 0,
	
	
	notifyIcon: null,
	
	
	notifyIconMobile: null,
	
	
	notifyContainer: null,
	
	
	notifyList: null,
	
	
	notifyOpen: false,
	
	
	loadedNotifications: false,
	
	
	reachedNew: false,
	
	
	notify_settings: [],
	
	
	swRegistration: null,
	
	
	isSubscribed: false,
	
	
	subscription: null,
	
	
	messageCounts: {},
	
	
	quickConvoOpened: false,
	
	
	inboxConvosLoaded: 0,
	
	
	convoPartiesLoaded: [],
	
	
	vapidKeys: {
		publicKey: 'BGuC9zWGjbfoDOQF2XYomJlqDvQJYZXacZZ7591sGpiP62bH_AFbx_Zi29soE16ri1vm7EZFINOmsq2yNsQnVXU'
	},
	
	
	init: function() {
		Notify.notifyIcon = $("#notify_number_notify");
		Notify.notifyIconMobile = $("#notify_number_alerts");
		Notify.notifyContainer = $("#notify-container");
		Notify.notifyList = $("#notify-notifications-container");
		
		Notify.draggable('notify-container');
		
		$(document).ready(function() {
			try {
				if(io) {}
				
			} catch(err) {
				// Notify.networkStatusDisconnected();
			}

		});
		
		Notify.alerts = notify_count;
		
		if(Notify.alerts > 0) {
			if(!Notify.notifyIcon.hasClass('notify-num-displayed')) {
				Notify.notifyIcon.addClass('notify-num-displayed');
			}
			
			if(!Notify.notifyIconMobile.hasClass('notify-num-displayed')) {
				Notify.notifyIconMobile.addClass('notify-num-displayed');
			}
		}
		
		Notify.md.enable([ 'linkify', 'emphasis', 'strikethrough' ]);
		
		if(nodeID && nodeID != "disabled") {
			try {
				Notify.socket = io.connect(socket_url_base + ':2096', {transports: ['websocket'], upgrade: false, timestampRequests: true});
				
				// Notify.socket.on('disconnect', Notify.socketDisconnected);
				
				Notify.socket.on('authApproved', function(data) {
					console.log("Authorization Granted. Welcome, " + data);
					
					Notify.socket.on('featureAdded', function(data) {
						switch(data) {
							case "notify":
								Notify.startNotify();
								break;
							case "convo":
								Notify.startGlobalConvo();
								break;
							default:
								break;
						}
					});
					
					Notify.socket.emit('addFeature', 'notify');
					
					if(!window.location.href.includes('convo.php')) {
						Notify.socket.emit('addFeature', 'convo');
					} else {
						$("#convoGlobalContainer").hide();
					}
					
					
				});
				
				Notify.socket.on('debug', function(data) {
					console.log(data);
				});
				
				Notify.socket.emit('uid_check', [
					socket_uid,
					nodeID
				]);
			} catch(err) {
				
			}
		}
		
	},
	
	
	urlB64ToUint8Array: function(base64String) {
		const padding = '='.repeat((4 - base64String.length % 4) % 4);
		const base64 = (base64String + padding)
			.replace(/\-/g, '+')
			.replace(/_/g, '/');

		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		
		return outputArray;
	},
	
	
	startPush: function() {		
		if('serviceWorker' in navigator && 'PushManager' in window) {
			// console.log('Service Worker and Push is supported');

			navigator.serviceWorker.register('/sw.js')
			.then(function(swReg) {
				// console.log('Service Worker is registered', swReg);

				Notify.swRegistration = swReg;
				
				Notify.swRegistration.pushManager.getSubscription()
				.then(function(subscription) {
					Notify.isSubscribed = !(subscription === null);

					// updateSubscriptionOnServer(subscription);

					if(Notify.isSubscribed) {
						$("#pushSettingButton").text("Disable Push Notifications");
					} else {
						Notify.pushSubscribeUser();
					}
				});
			})
			.catch(function(error) {
				console.error('Service Worker Error', error);
			});
		} else {
			console.warn('Push messaging is not supported');
		}
		
	},
	
	
	pushSubscribeUser: function() {
		const applicationServerKey = Notify.urlB64ToUint8Array(Notify.vapidKeys.publicKey);
		Notify.swRegistration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: applicationServerKey
		})
		.then(function(subscription) {
			// updateSubscriptionOnServer(subscription);
			Notify.socket.emit('pushSubscribeUser', subscription);
			Notify.isSubscribed = true;
		})
		.catch(function(err) {
			console.log('Failed to subscribe the user: ', err);
		});
	},
	
	
	pushUnsubscribeUser: function() {		
		Notify.swRegistration.pushManager.getSubscription()
		.then(function(subscription) {
			if(subscription) {
				Notify.socket.emit('pushUnsubscribeUser', subscription);
				
				return subscription.unsubscribe();
			}
		})
		.catch(function(error) {
			console.log('Error unsubscribing', error);
		})
		.then(function() {			
			Notify.isSubscribed = false;
		});
	},
	
	
	sanitizeHTML: function(message) {
		if(typeof message !== 'string') {
			return "";
		}
		
		try {
			message = message.replace(/</g, '&lt;');
			message = message.replace(/>/g, '&gt;');
			message = message.replace(/"/g, '&quot;');
		} catch(e) {
			return "";
		}
		
		return message;
	},
	
	cleanMessage: function(message) {
		message = Notify.sanitizeHTML(message);
		message = Notify.md.renderInline(message).replace(/&amp;/g, '&').replace(/<a href/g, '<a target="_blank" href').replace(/(?:\r\n|\r|\n)/g, '<br>');
		
		return message;
	},
	
	
	forceInt: function(val) {
		val = parseInt(val, 10);
		
		if(Number.isNaN(val)) {
			val = 0;
		}
		
		return val;
	},
	
	
	getTime: function() {
		return Math.floor(Date.now() / 1000);
	},
	
	
	niceTime: function(timestamp=0) {
		timestamp = Notify.forceInt(timestamp);
		
		if(timestamp <= 0) {
			timestamp = Notify.getTime();
		}
		
		timestamp = timestamp - (timestamp % 60);
		timestamp = timestamp * 1000;
		
		let d = new Date(timestamp);
		
		// return d.toLocaleDateString().replace(/\//g, '-') + ", " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
		return d.toDateString() + ", " + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
	},
	
	
	quickConvoClose: function() {
		let quickGrouping = $('.quick-convo-grouping');
		
		if(quickGrouping.length == 0) {
			return;
		}
		
		quickGrouping.children(':not(.quick-convo-inbox)').hide();
		quickGrouping.children('.quick-convo-inbox').css('display', 'inline-block');
	},
	
	
	quickConvoOpenChat: function(partyID=0) {
		let quickGrouping = $('.quick-convo-grouping');
		let party_id = Util.forceInt(partyID);
		
		if(quickGrouping.length == 0) {
			return;
		}
		
		let chosen = quickGrouping.children('.quick-convo-' + party_id);
		
		if(chosen.length == 0) {
			return;
		}
		
		if(!Notify.convoPartiesLoaded.includes(partyID)) {
			Notify.convoPartiesLoaded.push(partyID);
			Notify.socket.emit('convo_loadmessages', { party: partyID, mid: 0, position: 'new' });
		}
		
		quickGrouping.children(':not(.quick-convo-' + party_id + ')').hide();
		quickGrouping.children('.quick-convo-' + party_id).css('display', 'inline-block');
		
		Notify.quickConvoMarkRead(party_id);
	},
	
	
	toggleQuickConvo: function() {		
		let quickConvo = $('#convoGlobalContainer');
		
		if(quickConvo.length == 0) {
			return;
		}
		
		if(!Notify.quickConvoOpened) {
			Notify.quickConvoOpened = true;
			
			// Notify.socket.emit('quickconvo_loadunread', true);
			Notify.socket.emit('load_more_inbox', Notify.inboxConvosLoaded);
		}
		
		if(quickConvo.attr('data-isopen') == "yes") {
			// quickConvo.animate({right: "-346px"}, 150);
			$('body').removeClass('gc-body-fixed');
			quickConvo.removeClass('gc-opened');
			quickConvo.attr('data-isopen', "no");
		} else {
			// quickConvo.animate({right: "-43px"}, 150);
			$('body').addClass('gc-body-fixed');
			quickConvo.addClass('gc-opened');
			quickConvo.attr('data-isopen', "yes");
			
			Notify.processQuickConvoGeneralClick();
		}
	},
	
	
	processQuickConvoGeneralClick: function() {
		let quickGrouping = $('.quick-convo-grouping');
		
		if(quickGrouping.length == 0) {
			return;
		}
		
		let found = quickGrouping.children(':visible');
		
		if(found.length == 0) {
			return;
		}
		
		if(found.hasClass('quick-convo-inbox')) {
			return;
		}
		
		let party_id = Util.forceInt(found.attr('data-partyid'));
		
		if(party_id <= 0) {
			return;
		}
		
		Notify.quickConvoMarkRead(party_id);
	},
	
	
	sendQuickConvoMessage: function(quickInbox, force_party_id=0) {
		let party_id = Util.forceInt(quickInbox.attr('data-partyid'));
		if(Util.forceInt(force_party_id) > 0) {
			party_id = Util.forceInt(force_party_id);
			quickInbox = $(`.quick-convo-${party_id}`);
		}
		
		if(party_id <= 0) {
			return;
		}
		
		let textarea = quickInbox.find('.message-textarea');
		
		if(!textarea.length) {
			return;
		}
		
		let message = textarea.val().trim();	
		
		textarea.val("");
		
		if(message.length == 0) {
			return;
		}			
		
		Notify.socket.emit('convo_newmessage', {partyID: party_id, message: message});
	},
	
	
	quickConvoMarkRead: function(partyID) {
		let party_id = Util.forceInt(partyID);
		
		if(party_id <= 0) {
			return;
		}
		
		if(Notify.messageCounts.hasOwnProperty(party_id) == false) {
			return;
		}
		
		let quickConvo = $('#convoGlobalContainer');
		
		if(quickConvo.length == 0) {
			return;
		}
		
		let quickGrouping = quickConvo.find('.quick-convo-grouping');
		
		if(quickGrouping.length == 0) {
			return;
		}
		
		Notify.messageCounts[party_id] = 0;
		
		quickGrouping.find('.quick-convo-inbox-' + party_id).find('.notify-num-displayed').text('0').removeClass('notify-num-displayed');
		
		let quickNum = quickConvo.find('.notify-num-global');
		let quickNumDesktop = $('.convo-icon-desktop');
		
		let quickConvoCount = 0;
		
		Object.values(Notify.messageCounts).forEach(function(num) {
			quickConvoCount += num;
		});
		
		quickNum.text(quickConvoCount);
		quickNumDesktop.find('span').text(`(${quickConvoCount})`);
		
		if(quickConvoCount > 0) {
			quickNum.addClass('notify-num-displayed');
		} else if(quickConvoCount == 0) {
			if(quickNum.hasClass('notify-num-displayed')) {
				quickNum.removeClass('notify-num-displayed');
			}
			
			if(quickNumDesktop.hasClass('alerts--new')) {
				quickNumDesktop.removeClass('alerts--new');
			}
		}
		
		Notify.socket.emit("mark_read", party_id);
	},
	
	
	startGlobalConvo: function() {
		if(window.location.href.includes('convo.php')) {
			return;
		}
		
		let quickConvo = $('#convoGlobalContainer');
		let quickConvoInbox = $('#convoGlobalContainer').find('.quick-convo-inbox');
		
		Notify.socket.on('quickconvo_receiveinitial', function(data) {
			$('.quick-convo-grouping > div:not(.quick-convo-inbox)').remove();
			$('.quick-convo-messages > div:not(.quick-convo-inbox-topmessage)').remove();
			
			Object.values(data.messages).forEach(function(message) {
				Notify.processIncomingQuickConvo({
					dateline: message.dateline,
					uid: message.from_uid,
					mid: message.mid,
					message: message.message,
					party_id: message.party_id,
					users: data.users,
					party: message.party_data,
					extra: data.extra,
					noSound: true
				}, quickConvo, quickConvoInbox);
			});
		});
		
		Notify.socket.on('convo_loaded_more_inbox_noneleft', function(data) {
			$('#loadMoreInbox').replaceWith('<em style="margin: 20px 0px; display: inline-block;">No more convos!</em>');
		});
		
		Notify.socket.on('convo_loaded_more_inbox', function(all_data) {
			if(all_data.length) {
				quickConvoInbox.find('.quick-convo-inbox-topmessage').hide();
			}
			
			quickConvoInbox.find('.quick-convo-inbox-loading').hide();
			
			Object.values(all_data.messages).forEach(function(data) {
				// let uid = Util.forceInt(data.from_uid);
				let self_uid = Util.forceInt(socket_uid);
				let party_id = Util.forceInt(data.party_id);
				let mid = Util.forceInt(data.mid);
				let dateline = Util.forceInt(data.dateline);
				let new_rand_id = "";
				
				data.users = all_data.users;
				
				// convo_party_list.push(data.party_id);
				
				let currentQuickConvos = Util.forceInt(quickConvo.find('.quick-convo-container').length);
			
			
				let username_list = "";
				let formatted_username_list = "";
				let formatted_username_list_unlinked = "";
				let other_user_count = 0;
				
				let party_split = data.party_data.party.split(",");
				party_split[0] = Notify.forceInt(party_split[0]);
				party_split[1] = Notify.forceInt(party_split[1]);
				
				let uid = party_split[0] == socket_uid ? party_split[1] : party_split[0];
				
				Object.values(data.party_data.party.split(',')).forEach(function(temp_uid) {
					if(temp_uid == self_uid) {
						return;
					}
					
					if(data.users.hasOwnProperty(temp_uid) == false) {
						return;
					}
					
					let user = data.users[temp_uid];
					
					other_user_count++;
					
					if(username_list.length > 0) {
						username_list = username_list + ", ";
						formatted_username_list = formatted_username_list + ", ";
						formatted_username_list_unlinked = formatted_username_list_unlinked + ", ";
					}
					
					let display_group = user.displaygroup;
					if(user.displaygroup == 0) {
						display_group = user.usergroup;
					}
					
					username_list = username_list + Notify.sanitizeHTML(user.username);
					formatted_username_list = `${formatted_username_list}<a href="member.php?action=profile&uid=${temp_uid}" target="_blank"><strong class="group${display_group}">${Notify.sanitizeHTML(user.username)}</strong></a>`;
					formatted_username_list_unlinked = `${formatted_username_list_unlinked}<strong class="group${display_group}">${Notify.sanitizeHTML(user.username)}</strong>`;
				});
			
			
				
				let new_avatar = "images/default_avatar.png";
				let new_username = "Guest";
				let new_username_format = "<strong>Guest</strong>";
				let new_username_format_unlinked = "<strong>Guest</strong>";
				let new_group = 0;
				
				if(data.users.hasOwnProperty(uid)) {
					if(data.users[uid].avatar.includes("uploads/avatars") || data.users[uid].avatar.includes("images/avatars")) {
						new_avatar = data.users[uid].avatar;
					}
					
					new_username = Notify.sanitizeHTML(data.users[uid].username);
					
					let display_group = data.users[uid].displaygroup;
					if(data.users[uid].displaygroup == 0) {
						display_group = data.users[uid].usergroup;
					}
					new_username_format = '<a href="member.php?action=profile&uid=' + uid + '" target="_blank"><strong class="group' + display_group + '">' + Notify.sanitizeHTML(data.users[uid].username) + '</strong></a>';
					new_username_format_unlinked = '<strong class="group' + display_group + '">' + Notify.sanitizeHTML(data.users[uid].username) + '</strong>';
					
					if(data.users[uid].displaygroup > 0) {
						new_group = data.users[uid].displaygroup;
					} else {
						new_group = data.users[uid].usergroup;
					}
				}
				
				let new_username_from = new_username;
				let new_username_format_from = new_username_format;
				let new_username_format_unlinked_from = new_username_format_unlinked;
				
				new_avatar = `<img src="${socket_url_base}/${new_avatar}" width="36" height="36" alt="" style="border-radius: 100%;">`;
				
				if(other_user_count > 1) {
					new_username = username_list;
					new_username_format = formatted_username_list;
					new_username_format_unlinked = formatted_username_list_unlinked;
					new_avatar = `<div style="display: inline-block; width: 36px; text-align: center; border-radius: 100%; height: 36px; font-size: 26px; background-color: #${data.party_data.color}; color: white; text-shadow: 1px 1px 2px #000000c7; margin-top: -1px;" title="${username_list}"><span>${other_user_count}</span></div>`
				}
				
				
				
				
				let quickGrouping = quickConvo.find('.quick-convo-grouping');
			
				let setAsFocus = false;
				if(quickGrouping.children().length == 1) {
					quickGrouping.children().first().hide();
					setAsFocus = true;
				}
				
					new_rand_id = [...Array(10)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
				
								
				let pcard = `
					<div class="hum-options-container" style=" display: none; z-index: 3;position: absolute;width: 91%;background-color: rgb(35, 35, 35);top: 53px;box-shadow: rgba(12, 12, 12, 0.52) 0px 0px 5px 3px, rgba(12, 12, 12, 0.75) 0px 0px 3px 1px;border: 1px solid rgb(15, 15, 15);text-align: left;">
						<div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 9px solid #232323; display: inline-block; position: absolute; top: -9px; left: 11px;"></div>
						<a class="hum-options-choice" href="${socket_url_base}/convo.php?id=${party_id}" style="height: 50px; display: flex; cursor: pointer;">
							<i class="fa fa-comments fa-lg" aria-hidden="true" style=" flex: 0 0 50px; text-align: left; color: #e2e2e2; position: relative; top: 11px; left: 13px; "></i>
							<span style="color: #d6d6d6;font-weight: 500;text-shadow: 0px 1px 1px #00000075;font-size: 16px;flex: 1 0 20px;padding-top: 7px;">
								<div>Open Convo</div>
								<div style=" font-size: 12px; font-weight: initial; color: gray; ">Open this convo in a new page.</div>
							</span>
						</a>
						<a class="hum-options-choice" href="${socket_url_base}/marketcp.php?action=profile&uid=${uid}" style="height: 50px; display: flex; cursor: pointer;">
							<i class="fa fa-shopping-basket fa-lg" aria-hidden="true" style="flex: 0 0 50px; text-align: left; color: #e2e2e2; position: relative; top: 11px; left: 13px;"></i>
							<span style="color: #d6d6d6;font-weight: 500;text-shadow: 0px 1px 1px #00000075;font-size: 16px;flex: 1 0 20px;padding-top: 7px;">
								<div>Market Profile</div>
								<div style="font-size: 12px; font-weight: initial; color: gray;">View this member's market profile.</div>
							</span>
						</a>
						<a class="hum-options-choice" href="${socket_url_base}/search.php?action=finduserthreads&uid=${uid}" style="height: 50px; display: flex; cursor: pointer;">
							<i class="fa fa-search fa-lg" aria-hidden="true" style=" flex: 0 0 50px; text-align: left; color: #e2e2e2; position: relative; top: 11px; left: 13px; "></i>
							<span style="color: #d6d6d6;font-weight: 500;text-shadow: 0px 1px 1px #00000075;font-size: 16px;flex: 1 0 20px;padding-top: 7px;">
								<div>Threads</div>
								<div style=" font-size: 12px; font-weight: initial; color: gray; ">View list of this member's threads.</div>
							</span>
						</a>
					</div>
				`;
				
				quickGrouping.append(`
	<div class="quick-convo-container quick-convo-${party_id}" data-partyid="${party_id}" style="display: none;width: 300px;height: 350px;background-color: rgb(21, 21, 21);vertical-align: bottom; border-bottom: 1px solid rgb(46, 46, 46); border-left: 1px solid rgb(46, 46, 46); border-top: 1px solid rgb(46, 46, 46); box-shadow: black 0px 0px 2px 1px;"><div style="height: 100%; display: flex; flex-direction: column; text-align: left;"><div style="border-bottom: 1px solid #0b0b0b; flex: 0 0 43px;">
			<div style="height: 36px;padding: 3px;border-bottom: 1px solid #2e2e2e;background-color: #232323;">
				<div style="display: flex;align-items: center;">
					<div style="flex: 0 0 36px;">
						<div data-pcard="${new_rand_id}" id="message-convo-pcard-trigger-${new_rand_id}" class="message-convo-pcard-trigger message-convo-pcard-trigger-new" style="display: inline-block; width: 36px; height: 36px; text-align: center; z-index: 3;"><a href="javascript:void(0);">${new_avatar}</a></div>
						${pcard}
					</div>
					<div style="flex: 1 0 auto; margin-left: 10px; position: relative; bottom: 2px;">${new_username_format}</div>
					<a href="convo.php?id=${party_id}" style="margin-left: 10px;line-height: 40px;flex: 0 0 25px;position: relative;top: -2px;color: #dadada;text-shadow: 1px 1px 1px black, 1px 1px 3px #000000c4;" data-tooltip="Open Convo" data-tooltip-left=""><i class="fa fa-comments fa-lg" aria-hidden="true"></i></a>
					<a href="javascript:void(0);" style="margin-left: 10px;line-height: 40px;flex: 0 0 25px;position: relative;top: -2px;color: #dadada;text-shadow: 1px 1px 1px black, 1px 1px 3px #000000c4;" data-tooltip="Close" data-tooltip-left="" onclick="Notify.quickConvoClose(${party_id});"><i class="fa fa-times-circle fa-lg" aria-hidden="true"></i></a>
				</div>
			</div>
		</div>
		<div class="gc-bubbles-container" style="flex: 1 0 auto;text-align: left;border-left: 1px solid #0b0b0b;padding-top: 3px;"><div class="quick-convo-messages" style="height: 255px; overflow-x: hidden; overflow-y: auto;">
				
			</div>
		</div>
		<div style="display: flex;justify-content: center;align-items: center;padding-bottom: 3px;border-left: 1px solid #0b0b0b;">
			<input type="text" autocomplete="off" class="message-textarea" name="comment" placeholder="Send a message..." style="vertical-align: top;flex: 1 0 auto;margin-left: 3px;width: initial;background-color: #333333 !important;border: 1px solid #0c0c0c !important;box-shadow: inset 1px 1px 2px 0px #111111; padding: 6px 4px 6px 14px !important;">
			<input type="submit" class="button pro-adv-3d-button message-submit" name="submit_button" value="Send" tabindex="1" accesskey="s" style="vertical-align: top;flex: 0 0 50px;max-width: 50px;padding: 7px 10px !important;background-color: #2a2a2a;">
		</div>
	</div>
	</div>
				`);
				
				quickInbox = quickConvo.find('.quick-convo-' + party_id);
			
				if(setAsFocus && false) {
					// quickInbox.css('display', 'inline-block');
				} else {
					quickConvoInbox.css('display', 'inline-block');
				}
				
				quickInbox.find(".message-textarea").keydown(function(e) {
					if(e.keyCode === 13) {
						e.preventDefault();
						Notify.sendQuickConvoMessage(quickInbox, party_id);
					}
				});
				
				quickInbox.find('.message-submit').on('click', function(e) {
					e.preventDefault();
					Notify.sendQuickConvoMessage(quickInbox, party_id);
				});
				
				$('#message-convo-pcard-trigger-' + new_rand_id).on('click', function() {
					let trigger = $(this);
					let box = trigger.parent().find('.hum-options-container');
					
					box.toggle();
					
					// if(box.hasClass('message-convo-pcard-container-active')) {
						// box.removeClass('message-convo-pcard-container-active');
						// box.hide();
					// } else {
						// box.addClass('message-convo-pcard-container-active');
						// box.show();
					// }
				});
				
				// quickConvoInbox.find('.quick-convo-inbox-topmessage').hide();
				
				quickConvoInbox.find('.quick-convo-messages').prepend(`
	<div class="notify-notice-container notify-notice-container-read quick-convo-inbox-${party_id}" data-partyid="${party_id}" style="text-align: left; position: relative;">
	<div style=" position: absolute; top: 0px; right: 0px; "><span class="notify-num" style="display: none; left: initial;top: 4px;position: relative;right: 7px;">0</span></div>
	<div class="notify-notice-avatar-container">
		<div class="notify-notice-avatar" title="${new_username}"><a href="member.php?action=profile&uid=${uid}">${new_avatar}</a></div>
	</div>
	<a href="javascript:void(0);" style="display: block; width: 100%;" onclick="Notify.quickConvoOpenChat(${party_id});">
		<div class="notify-notice-details-container">
			<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}" style="color: #aaa;">${Util.getRelativeTime(dateline)}</span></span></div>
			<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">${new_username_format_unlinked_from}: ${Notify.sanitizeHTML(data.message)}</span></div>
		</div>
	</a>
	</div>				
				`);
				
				Notify.inboxConvosLoaded++;
			});
		});
					
		Notify.socket.on('convo_receivemessage', function(data) {
			Notify.processIncomingQuickConvo(data, quickConvo, quickConvoInbox);
		});
	},
	
	
	openLink(link) {
		window.location.href = link;
	},
	
	
	processIncomingQuickConvo: function(data, quickConvo, quickConvoInbox) {
		let uid = Util.forceInt(data.uid);
		let self_uid = Util.forceInt(socket_uid);
		let party_id = Util.forceInt(data.party_id);
		let mid = Util.forceInt(data.mid);
		let dateline = Util.forceInt(data.dateline);
		let readtime = Util.forceInt(data.readtime);
		let new_rand_id = "";
		
		let quickInbox = quickConvo.find('.quick-convo-' + party_id);
		
		if(Util.forceInt(quickInbox.length) == 0) {
			if(self_uid == uid) {
				return;
			}
			
			let currentQuickConvos = Util.forceInt(quickConvo.find('.quick-convo-container').length);
			
			
			let username_list = "";
			let formatted_username_list = "";
			let formatted_username_list_unlinked = "";
			let other_user_count = 0;
			
			Object.values(data.party.party.split(',')).forEach(function(temp_uid) {
				if(temp_uid == self_uid) {
					return;
				}
				
				if(data.users.hasOwnProperty(temp_uid) == false) {
					return;
				}
				
				let user = data.users[temp_uid];
				
				other_user_count++;
				
				if(username_list.length > 0) {
					username_list = username_list + ", ";
					formatted_username_list = formatted_username_list + ", ";
					formatted_username_list_unlinked = formatted_username_list_unlinked + ", ";
				}
				
				let display_group = user.displaygroup;
				if(user.displaygroup == 0) {
					display_group = user.usergroup;
				}
				
				username_list = username_list + Notify.sanitizeHTML(user.username);
				formatted_username_list = `${formatted_username_list}<a href="member.php?action=profile&uid=${temp_uid}" target="_blank"><strong class="group${display_group}">${Notify.sanitizeHTML(user.username)}</strong></a>`;
				formatted_username_list_unlinked = `${formatted_username_list_unlinked}<strong class="group${display_group}">${Notify.sanitizeHTML(user.username)}</strong>`;
			});
		
			
			
			let new_avatar = "images/default_avatar.png";
			let new_username = "Guest";
			let new_username_format = "<strong>Guest</strong>";
			let new_username_format_unlinked = "<strong>Guest</strong>";
			let new_group = 0;
			if(data.users.hasOwnProperty(uid)) {
				if(data.users[uid].avatar.includes("uploads/avatars") || data.users[uid].avatar.includes("images/avatars")) {
					new_avatar = data.users[uid].avatar;
				}
				
				new_username = Notify.sanitizeHTML(data.users[uid].username);
				
				let display_group = data.users[uid].displaygroup;
				if(data.users[uid].displaygroup == 0) {
					display_group = data.users[uid].usergroup;
				}
				new_username_format = '<a href="member.php?action=profile&uid=' + uid + '" target="_blank"><strong class="group' + display_group + '">' + Notify.sanitizeHTML(data.users[uid].username) + '</strong></a>';
				new_username_format_unlinked = '<strong class="group' + display_group + '">' + Notify.sanitizeHTML(data.users[uid].username) + '</strong>';
				
				if(data.users[uid].displaygroup > 0) {
					new_group = data.users[uid].displaygroup;
				} else {
					new_group = data.users[uid].usergroup;
				}
			}
			
			let new_username_from = new_username;
			let new_username_format_from = new_username_format;
			let new_username_format_unlinked_from = new_username_format_unlinked;
			
			new_avatar = `<img src="${socket_url_base}/${new_avatar}" width="36" height="36" alt="" style="border-radius: 100%;">`;
			
			if(other_user_count > 1) {
				new_username = username_list;
				new_username_format = formatted_username_list;
				new_username_format_unlinked = formatted_username_list_unlinked;
				new_avatar = `<div style="display: inline-block; width: 36px; text-align: center; border-radius: 100%; height: 36px; font-size: 26px; background-color: #${data.party.color}; color: white; text-shadow: 1px 1px 2px #000000c7; margin-top: -1px;" title="${username_list}"><span>${other_user_count}</span></div>`
			}
			
			let quickGrouping = quickConvo.find('.quick-convo-grouping');
			
			let setAsFocus = false;
			if(quickGrouping.children().length == 1) {
				quickGrouping.children().first().hide();
				setAsFocus = true;
			}
			
			new_rand_id = [...Array(10)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
				
								
			let pcard = `
				<div class="hum-options-container" style=" display: none; z-index: 3;position: absolute;width: 91%;background-color: rgb(35, 35, 35);top: 53px;box-shadow: rgba(12, 12, 12, 0.52) 0px 0px 5px 3px, rgba(12, 12, 12, 0.75) 0px 0px 3px 1px;border: 1px solid rgb(15, 15, 15);text-align: left;">
					<div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 9px solid #232323; display: inline-block; position: absolute; top: -9px; left: 11px;"></div>
					<a class="hum-options-choice" href="${socket_url_base}/convo.php?id=${party_id}" style="height: 50px; display: flex; cursor: pointer;">
						<i class="fa fa-comments fa-lg" aria-hidden="true" style=" flex: 0 0 50px; text-align: left; color: #e2e2e2; position: relative; top: 11px; left: 13px; "></i>
						<span style="color: #d6d6d6;font-weight: 500;text-shadow: 0px 1px 1px #00000075;font-size: 16px;flex: 1 0 20px;padding-top: 7px;">
							<div>Open Convo</div>
							<div style=" font-size: 12px; font-weight: initial; color: gray; ">Open this convo in a new page.</div>
						</span>
					</a>
					<a class="hum-options-choice" href="${socket_url_base}/marketcp.php?action=profile&uid=${uid}" style="height: 50px; display: flex; cursor: pointer;">
						<i class="fa fa-shopping-basket fa-lg" aria-hidden="true" style="flex: 0 0 50px; text-align: left; color: #e2e2e2; position: relative; top: 11px; left: 13px;"></i>
						<span style="color: #d6d6d6;font-weight: 500;text-shadow: 0px 1px 1px #00000075;font-size: 16px;flex: 1 0 20px;padding-top: 7px;">
							<div>Market Profile</div>
							<div style="font-size: 12px; font-weight: initial; color: gray;">View this member's market profile.</div>
						</span>
					</a>
					<a class="hum-options-choice" href="${socket_url_base}/search.php?action=finduserthreads&uid=${uid}" style="height: 50px; display: flex; cursor: pointer;">
						<i class="fa fa-search fa-lg" aria-hidden="true" style=" flex: 0 0 50px; text-align: left; color: #e2e2e2; position: relative; top: 11px; left: 13px; "></i>
						<span style="color: #d6d6d6;font-weight: 500;text-shadow: 0px 1px 1px #00000075;font-size: 16px;flex: 1 0 20px;padding-top: 7px;">
							<div>Threads</div>
							<div style=" font-size: 12px; font-weight: initial; color: gray; ">View list of this member's threads.</div>
						</span>
					</a>
				</div>
			`;
			
			quickGrouping.append(`
<div class="quick-convo-container quick-convo-${party_id}" data-partyid="${party_id}" style="display: none;width: 300px;height: 350px;background-color: rgb(21, 21, 21);vertical-align: bottom; border-bottom: 1px solid rgb(46, 46, 46); border-left: 1px solid rgb(46, 46, 46); border-top: 1px solid rgb(46, 46, 46); box-shadow: black 0px 0px 2px 1px;"><div style="height: 100%; display: flex; flex-direction: column; text-align: left;"><div style="border-bottom: 1px solid #0b0b0b; flex: 0 0 43px;">
		<div style="height: 36px;padding: 3px;border-bottom: 1px solid #2e2e2e;background-color: #232323;">
			<div style="display: flex;align-items: center;">
				<div style="flex: 0 0 36px;">
					<div data-pcard="${new_rand_id}" id="message-convo-pcard-trigger-${new_rand_id}" class="message-convo-pcard-trigger message-convo-pcard-trigger-new" style="display: inline-block; width: 36px; height: 36px; text-align: center; z-index: 3;"><a href="javascript:void(0);">${new_avatar}</a></div>
					${pcard}
				</div>
				<div style="flex: 1 0 auto; margin-left: 10px; position: relative; bottom: 2px;">${new_username_format}</div>
				<a href="convo.php?id=${party_id}" style="margin-left: 10px;line-height: 40px;flex: 0 0 25px;position: relative;top: -2px;color: #dadada;text-shadow: 1px 1px 1px black, 1px 1px 3px #000000c4;" data-tooltip="Open Convo" data-tooltip-left=""><i class="fa fa-comments fa-lg" aria-hidden="true"></i></a>
				<a href="javascript:void(0);" style="margin-left: 10px;line-height: 40px;flex: 0 0 25px;position: relative;top: -2px;color: #dadada;text-shadow: 1px 1px 1px black, 1px 1px 3px #000000c4;" data-tooltip="Close" data-tooltip-left="" onclick="Notify.quickConvoClose(${party_id});"><i class="fa fa-times-circle fa-lg" aria-hidden="true"></i></a>
			</div>
		</div>
	</div>
	<div class="gc-bubbles-container" style="flex: 1 0 auto;text-align: left;border-left: 1px solid #0b0b0b;padding-top: 3px;"><div class="quick-convo-messages" style="height: 255px; overflow-x: hidden; overflow-y: auto;">
			
		</div>
	</div>
	<div style="display: flex;justify-content: center;align-items: center;padding-bottom: 3px;border-left: 1px solid #0b0b0b;">
		<input type="text" autocomplete="off" class="message-textarea" name="comment" placeholder="Send a message..." style="vertical-align: top;flex: 1 0 auto;margin-left: 3px;width: initial;background-color: #333333 !important;border: 1px solid #0c0c0c !important;box-shadow: inset 1px 1px 2px 0px #111111; padding: 6px 4px 6px 14px !important;">
		<input type="submit" class="button pro-adv-3d-button message-submit" name="submit_button" value="Send" tabindex="1" accesskey="s" style="vertical-align: top;flex: 0 0 50px;max-width: 50px;padding: 7px 10px !important;background-color: #2a2a2a;">
	</div>
</div>
</div>
			`);
							
			quickInbox = quickConvo.find('.quick-convo-' + party_id);
			
			if(setAsFocus) {
				// quickInbox.css('display', 'inline-block');
			}
			
			quickInbox.find(".message-textarea").keydown(function(e) {
				if(e.keyCode === 13) {
					e.preventDefault();
					Notify.sendQuickConvoMessage(quickInbox);
				}
			});
			
			quickInbox.find('.message-submit').on('click', function(e) {
				e.preventDefault();
				Notify.sendQuickConvoMessage(quickInbox);
			});
			
			$('#message-convo-pcard-trigger-' + new_rand_id).on('click', function() {
				let trigger = $(this);
				let box = trigger.parent().find('.hum-options-container');
				
				box.toggle();
				
				// if(box.hasClass('message-convo-pcard-container-active')) {
					// box.removeClass('message-convo-pcard-container-active');
					// box.hide();
				// } else {
					// box.addClass('message-convo-pcard-container-active');
					// box.show();
				// }
			});
			
			quickConvoInbox.find('.quick-convo-inbox-topmessage').hide();
			
			quickConvoInbox.find('.quick-convo-messages').prepend(`
<div class="notify-notice-container notify-notice-container-read quick-convo-inbox-${party_id}" data-partyid="${party_id}" style="text-align: left; position: relative;">
<div style=" position: absolute; top: 0px; right: 0px; "><span class="notify-num notify-num-displayed" style="display: none; left: initial;top: 4px;position: relative;right: 7px;">0</span></div>
<div class="notify-notice-avatar-container">
	<div class="notify-notice-avatar" title="${new_username}"><a href="member.php?action=profile&uid=${uid}">${new_avatar}</a></div>
</div>
<a href="javascript:void(0);" style="display: block; width: 100%;" onclick="Notify.quickConvoOpenChat(${party_id});">
	<div class="notify-notice-details-container">
		<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}" style="color: #aaa;">${Util.getRelativeTime(dateline)}</span></span></div>
		<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">${new_username_format_unlinked_from}: ${Notify.sanitizeHTML(data.message)}</span></div>
	</div>
</a>
</div>				
			`);
			
			Notify.inboxConvosLoaded++;
		}
		
		
		
		if(uid == self_uid) {
			quickInbox.find('.quick-convo-messages').append(`
<div class="message-convo-right float_right" data-uid="${uid}" style="margin: initial !important; margin-bottom: 2px !important; clear: both;">
<div style="vertical-align: middle;margin-left: 3px;display: inline-block;text-align: left;">
	<div><div data-mid="${mid}" data-convotooltip="${Notify.niceTime(dateline)}" class="message-bubble message-bubble-${mid}" style="display: inline-block; border-radius: 18px; background-color: rgb(78, 78, 78); padding: 7px 14px; margin-bottom: 2px; font-size: 16px; ; word-break: break-word; margin: initial !important;"><span>${Notify.cleanMessage(data.message)}</span></div></div>
</div>
</div>
			`);
		} else {
			quickInbox.find('.quick-convo-messages').append(`
<div class="message-convo-left" data-uid="${uid}" style="margin: initial !important; margin-bottom: 2px !important; clear: both;">
<div style="vertical-align: middle;margin-left: 3px;display: inline-block;text-align: left;">
	<div><div data-mid="${mid}" data-convotooltip="${Notify.niceTime(dateline)}" class="message-bubble message-bubble-${mid}" style="display: inline-block; border-radius: 18px; background-color: #212121; padding: 7px 14px; margin-bottom: 2px; font-size: 16px; ; word-break: break-word; margin: initial !important;"><span>${Notify.cleanMessage(data.message)}</span></div></div>
</div>
</div>
			`);
		
			if(Notify.messageCounts.hasOwnProperty(party_id) == false) {
				Notify.messageCounts[party_id] = 0;
			}
			
			if(readtime <= 0) {
				Notify.messageCounts[party_id]++;
			
				let quickNum = quickConvo.find('.notify-num-global');
				let quickNumDesktop = $('.convo-icon-desktop');
			
				let quickConvoCount = 0;
			
				Object.values(Notify.messageCounts).forEach(function(num) {
					quickConvoCount += num;
				});
				
				quickNum.text(quickConvoCount);
				
				quickConvoInbox.find('.quick-convo-inbox-' + party_id).find('.notify-num').text(Notify.messageCounts[party_id]).addClass('notify-num-displayed');
				
				if(!quickNum.hasClass('notify-num-displayed')) {
					quickNum.addClass('notify-num-displayed');
				}
				
				quickNumDesktop.find('span').text(`(${quickConvoCount})`);
				quickNumDesktop.addClass('alerts--new');			
			}
		}
		
		quickInbox.find('.quick-convo-messages')[0].scrollTop = quickInbox.find('.quick-convo-messages')[0].scrollHeight;
	},
	
	
	startNotify: function() {		
		Notify.startPush();
		
		Notify.socket.on('notify_loaded', function(data) {
			Notify.notify_settings = data.notify_settings;
			if(data.notify_settings.length) {
				Notify.notify_settings = data.notify_settings.split(",");
			} else {
				Notify.notify_settings = [];
			}
			
			Notify.notify_settings = Notify.notify_settings.map(Notify.forceInt);
			
			if(Array.isArray(data.notices)) {
				data.notices = data.notices.reverse();
				
				Notify.notifyList.empty();
				
				for(const notice of data.notices) {
					if(notice.status == 0 && !Notify.reachedNew) {
						Notify.reachedNew = true;
						Notify.notifyList.prepend('<div class="notify-header"><span class="notify-header-heading">Viewed</span></div>');
					}
					
					notice.noalert = true;
					Notify.incomingNotice(notice);
				}
				
				if(!Notify.reachedNew) {
					Notify.notifyList.prepend('<div class="notify-header"><span class="notify-header-heading">Viewed</span></div>');
				}
			}
		});
		
		if(Notify.notifyOpen) {
			Notify.loadedNotifications = true;
			Notify.socket.emit('notify_load', true);
		}
		
		Notify.socket.on('notify_notice', Notify.incomingNotice);
		
		Notify.socket.on('quick_love_user_result', function(data) {
			if(data.status == true) {
				$.jGrowl('Successfully quick loved this member.', {theme:'jgrowl_success'});
			} else {
				$.jGrowl(`There was an error quick loving this member: ${data.message}`, {theme:'jgrowl_error'});
			}
		});
	},
	
	
	incomingNotice: function(data) {
		if(Notify.notify_settings.includes(Notify.forceInt(data.type))) {
			return;
		}
		
		if(!data.hasOwnProperty('noalert')) {			
			Notify.alerts++;
			Notify.notifyIcon.text(Notify.alerts);
			Notify.notifyIconMobile.text(Notify.alerts);
		
		
			if(!Notify.notifyIcon.hasClass('notify-num-displayed')) {
				Notify.notifyIcon.addClass('notify-num-displayed');
			}
			
			if(!Notify.notifyIconMobile.hasClass('notify-num-displayed')) {
				Notify.notifyIconMobile.addClass('notify-num-displayed');
			}
		}
		
		switch(Notify.forceInt(data.type)) {
			case 1:
				Notify.buildNoticeThread(data);
				break;
			case 2:
				Notify.buildNoticePost(data);
				break;
			case 3:
				Notify.buildNoticeReputation(data);
				break;
			case 4:
				Notify.buildNoticeBestResponse(data);
				break;
			case 5:
				Notify.buildNoticePrivateMessage(data);
				break;
			case 6:
				Notify.buildNoticeContractNew(data);
				break;
			case 7:
				Notify.buildNoticeContractAccepted(data);
				break;
			case 8:
				Notify.buildNoticeContractComplete(data);
				break;
			case 9:
				Notify.buildNoticeAward(data);
				break;
			case 10:
				Notify.buildNoticeContractDispute(data);
				break;
			case 11:
				Notify.buildNoticeContractCancelRequest(data);
				break;
			case 12:
				Notify.buildNoticeContractCancelled(data);
				break;
			case 13:
				Notify.buildNoticeContractNewEscrow(data);
				break;
			case 14:
				Notify.buildNoticeQuoted(data);
				break;
			case 15:
				Notify.buildNoticeMentioned(data);
				break;
			case 16:
				Notify.buildNoticeDNP(data);
				break;
			case 17:
				Notify.buildMassNotice(data);
				break;
			case 18:
				Notify.buildNoticeQuickLove(data);
				break;
			case 19:
				Notify.buildNoticeDNPWaiting(data);
				break;
			case 20:
				Notify.buildNoticeHackumanDestroyed(data);
				break;
			case 21:
				Notify.buildNoticeReminder(data);
				break;
			case 22:
				Notify.buildNoticeHackumanFoundEgg(data);
				break;
			case 23:
				Notify.buildNoticeHackumanEggExpireSoon(data);
				break;
			case 24:
				Notify.buildNoticeHackumanLowHealth(data);
				break;
			case 25:
				Notify.buildNoticeBuddyRequest(data);
				break;
			case 26:
				Notify.buildNoticeBlogPosted(data);
				break;
			case 27:
				Notify.buildNoticeAttachmentUnlock(data);
				break;
		}
		
		// console.log(data);
	},
	
	
	processIconClick: function() {
		let body_ele = $("body");
		let header_ele = $("#header");
		
		if(!Notify.loadedNotifications) {
			Notify.loadedNotifications = true;
			Notify.socket.emit('notify_load', true);
		}
		
		if(Notify.notifyIcon.hasClass('notify-num-displayed') || Notify.notifyIconMobile.hasClass('notify-num-displayed')) {
			if(Notify.notifyIcon.hasClass('notify-num-displayed')) {
				Notify.notifyIcon.removeClass('notify-num-displayed');
			}
			
			if(Notify.notifyIconMobile.hasClass('notify-num-displayed')) {
				Notify.notifyIconMobile.removeClass('notify-num-displayed');
			}
			
			if(Notify.alerts > 0) {
				Notify.socket.emit('notify_marksoftread', true);
			}
		}
		
		if(Notify.notifyOpen) {
			Notify.notifyOpen = false;
			
			Notify.notifyContainer.hide();			
			if(body_ele.hasClass("notify-body-fixed")) {
				body_ele.removeClass("notify-body-fixed");
			}
			
			if(header_ele.hasClass("header-notify-force-display")) {
				header_ele.removeClass("header-notify-force-display");
			}
		} else {
			Notify.notifyOpen = true;
			
			Notify.notifyContainer.show();
			
			body_ele.addClass("notify-body-fixed");
			header_ele.addClass("header-notify-force-display");
		}
		
		Notify.alerts = 0;
	},
	
	
	getDisplayGroup: function(usergroup, displaygroup) {
		usergroup = Notify.forceInt(usergroup);
		displaygroup = Notify.forceInt(displaygroup);
		
		if(displaygroup > 0) {
			return displaygroup;
		} else {
			return usergroup
		}
	},
	
	
	processNoticeClick: function(link) {
		window.location = link;
	},
	
	
	handleMultipleUsers: function(data) {
		if(!data.hasOwnProperty('extra') || !data.extra.hasOwnProperty('extra_action_users') || !data.extra.extra_action_users.length) {
			return `<strong class="group${Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup)}">${Notify.sanitizeHTML(data.action_username)}</strong>`;
		}
		
		data.extra.extra_action_users.unshift(data.action_user);
		
		let return_username = "";
		data.extra.extra_action_users.forEach((user, i, arr) => {
			if(i > 0 && arr.length > 2) {
				return_username += ", ";
			}
			
			if(i+1 == arr.length) {
				return_username += `${arr.length == 2 ? " " : ""}and `;
			}
			
			return_username += `<strong class="group${Notify.getDisplayGroup(user.usergroup, user.displaygroup)}">${Notify.sanitizeHTML(user.username)}</strong>`;
		});
		
		return return_username;
	},
	
	
	buildNoticeThread: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let subject = Notify.sanitizeHTML(data.extra.subject);
		let forumname = Notify.sanitizeHTML(data.extra.forumname);
		let fid = Notify.forceInt(data.extra.fid);
		let tid = Notify.forceInt(data.link_id);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/showthread.php?tid=${tid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span class="" style="display: block; overflow: hidden;"><strong style="color: #ddd;">${subject}</strong></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> posted a thread in <strong>${forumname}</strong>.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticePost: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let username_list = Notify.handleMultipleUsers(data);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let subject = Notify.sanitizeHTML(data.extra.subject);
		let forumname = Notify.sanitizeHTML(data.extra.forumname);
		let fid = Notify.forceInt(data.extra.fid);
		let pid = Notify.forceInt(data.extra.pid);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		
		if(num_count > 1) {
			let are_is = "is";
			let reply_replies = "reply";
			
			if(other_count > 1) {
				are_is = "are";
				reply_replies = "replies";
			}
			
			// others_message = ` There ${are_is} ${other_count} more ${reply_replies} after this post.`;
			others_message = ` There are more replies after this post.`;
		}
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/showthread.php?pid=${pid}#pid${pid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-reply" aria-hidden="true" style="text-shadow: none;color: #a14edc;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">${username_list} replied to <strong style="color: #ddd;">${subject}</strong>.${others_message}</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeReputation: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let self_uid = Notify.forceInt(socket_uid);
		let rep_amount = Notify.forceInt(data.extra.reputation);
		let rep_class = "";
		let rep_plus = "";
		
		if(rep_amount > 0) {
			rep_class = "positive";
			rep_plus = "+";
		} else if(rep_amount < 0) {
			rep_class = "negative";
		} else {
			rep_class = "neutral";
			rep_plus = "+";
		}
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/reputation.php?uid=${self_uid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-star" aria-hidden="true" style="text-shadow: none;color: #cdd40a;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> gave you a <strong class="reputation_${rep_class}">${rep_plus}${rep_amount}</strong> popularity rating.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeBestResponse: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let dateline = Notify.forceInt(data.dateline);
		let subject = Notify.sanitizeHTML(data.extra.subject);
		let extra_container_class = "";
		let self_uid = Notify.forceInt(socket_uid);
		let pid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="Hack Forums"><img src="https://hackforums.net/images/avatars/Oldskool/OldskoolHF33.png?dateline=1557720831" width="36" height="36" alt=""></div>
				</div>
				<a href="${socket_url_base}/showthread.php?pid=${pid}#pid${pid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-bullseye" aria-hidden="true" style="text-shadow: none;color: #a14edc;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">Your post in <strong style="color: #ddd;">${subject}</strong> was marked as a Best Response.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticePrivateMessage: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let dateline = Notify.forceInt(data.dateline);
		let subject = Notify.sanitizeHTML(data.extra.subject);
		let extra_container_class = "";
		let self_uid = Notify.forceInt(socket_uid);
		let pmid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/private.php?action=read&pmid=${pmid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="far fa-paper-plane" aria-hidden="true" style="text-shadow: none;color: #8bc34a;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> sent you a private message titled <strong style="color: #ddd;">${subject}</strong>.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},

	buildNoticeAward: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let name = Notify.sanitizeHTML(data.extra.award);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let awid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/myawards.php" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fas fa-paw-claws" aria-hidden="true" style="text-shadow: none;color: #4fc2e0;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">You found a <img src="${socket_url_base}/uploads/awards/${awid}.png" /> <strong style="color: #ddd;">${name}</strong>!</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},	
	
	buildNoticeContractNew: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let self_uid = Notify.forceInt(socket_uid);
		let cid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/contracts.php?action=view&cid=${cid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-shopping-basket" aria-hidden="true" style="text-shadow: none;color: #d09b1b;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> has initiated a contract with you.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeContractAccepted: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let self_uid = Notify.forceInt(socket_uid);
		let cid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/contracts.php?action=view&cid=${cid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-shopping-basket" aria-hidden="true" style="text-shadow: none;color: #d09b1b;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> has accepted your contract.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeContractComplete: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let self_uid = Notify.forceInt(socket_uid);
		let cid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/contracts.php?action=view&cid=${cid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-shopping-basket" aria-hidden="true" style="text-shadow: none;color: #d09b1b;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">Your contract with <strong class="group${group}">${username}</strong> has been completed. Please leave a B-Rating.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeContractDispute: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let self_uid = Notify.forceInt(socket_uid);
		let cid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/contracts.php?action=view&cid=${cid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-shopping-basket" aria-hidden="true" style="text-shadow: none;color: #d09b1b;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> has disputed your contract.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeContractCancelRequest: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let self_uid = Notify.forceInt(socket_uid);
		let cid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/contracts.php?action=view&cid=${cid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-shopping-basket" aria-hidden="true" style="text-shadow: none;color: #d09b1b;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> would like to cancel their contract with you. Click here to review the contract.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeContractCancelled: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let self_uid = Notify.forceInt(socket_uid);
		let cid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/contracts.php?action=view&cid=${cid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-shopping-basket" aria-hidden="true" style="text-shadow: none;color: #d09b1b;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">Your contract with <strong class="group${group}">${username}</strong> has been cancelled.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeContractNewEscrow: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let self_uid = Notify.forceInt(socket_uid);
		let cid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/contracts.php?action=view&cid=${cid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-shopping-basket" aria-hidden="true" style="text-shadow: none;color: #d09b1b;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> has accepted a contract with you as the middleman/escrow. Please approve or deny this request.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeQuoted: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let subject = Notify.sanitizeHTML(data.extra.subject);
		let forumname = Notify.sanitizeHTML(data.extra.forumname);
		let fid = Notify.forceInt(data.extra.fid);
		let pid = Notify.forceInt(data.extra.pid);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		
		if(num_count > 1) {
			let are_is = "is";
			let reply_replies = "reply";
			
			if(other_count > 1) {
				are_is = "are";
				reply_replies = "replies";
			}
			
			// others_message = ` There ${are_is} ${other_count} more ${reply_replies} after this post.`;
			others_message = ` There are more quotes after this post.`;
		}
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/showthread.php?pid=${pid}#pid${pid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-quote-right" aria-hidden="true" style="text-shadow: none;color: #a14edc;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> quoted you in <strong style="color: #ddd;">${subject}</strong>.${others_message}</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeMentioned: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let subject = Notify.sanitizeHTML(data.extra.subject);
		let forumname = Notify.sanitizeHTML(data.extra.forumname);
		let fid = Notify.forceInt(data.extra.fid);
		let pid = Notify.forceInt(data.extra.pid);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		
		if(num_count > 1) {
			let are_is = "is";
			let reply_replies = "reply";
			
			if(other_count > 1) {
				are_is = "are";
				reply_replies = "replies";
			}
			
			// others_message = ` There ${are_is} ${other_count} more ${reply_replies} after this post.`;
			others_message = ` There are more quotes after this post.`;
		}
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/showthread.php?pid=${pid}#pid${pid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-at" aria-hidden="true" style="text-shadow: none;color: #a14edc;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> mentioned you in <strong style="color: #ddd;">${subject}</strong>.${others_message}</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeDNP: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		// let subject = Notify.sanitizeHTML(data.extra.subject);
		// let forumname = Notify.sanitizeHTML(data.extra.forumname);
		// let fid = Notify.forceInt(data.extra.fid);
		// let pid = Notify.forceInt(data.extra.pid);
		let invite_id = Notify.forceInt(data.link_id);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let wager = Notify.forceInt(data.extra.wager);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/devnullports.php?invite_id=${invite_id}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-sitemap" aria-hidden="true" style="text-shadow: none;color: #14af48;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> has invited you to play <strong style="color: #eee;">/Dev/Null: Ports</strong> for ${wager} Bytes. Click here to play.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildMassNotice: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		// let subject = Notify.sanitizeHTML(data.extra.subject);
		// let forumname = Notify.sanitizeHTML(data.extra.forumname);
		// let fid = Notify.forceInt(data.extra.fid);
		// let pid = Notify.forceInt(data.extra.pid);
		// let invite_id = Notify.forceInt(data.link_id);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let message = Notify.sanitizeHTML(data.extra.message);
		let link = data.extra.link;
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${link}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">${message}</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeQuickLove: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let username_list = Notify.handleMultipleUsers(data);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let subject = Notify.sanitizeHTML(data.extra.subject);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let pid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/showthread.php?pid=${pid}#pid${pid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa quick-love-heart fa-heart" aria-hidden="true" style="text-shadow: none;color: #e04fe0;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">${username_list} quick loved your post in <strong style="color: #ddd;">${subject}</strong>.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeDNPWaiting: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let invite_id = Notify.forceInt(data.link_id);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let wager = Notify.forceInt(data.extra.wager);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/devnullports.php?invite_id=${invite_id}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-sitemap" aria-hidden="true" style="text-shadow: none;color: #14af48;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> is waiting to play <strong style="color: #eee;">/Dev/Null: Ports</strong> for ${wager} Bytes. Click here to play.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeHackumanDestroyed: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let name = Notify.sanitizeHTML(data.extra.name);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/hackuman.php" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fas fa-paw-claws" aria-hidden="true" style="text-shadow: none;color: #4fc2e0;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">Your Hack&#250;man <strong style="color: #ddd;">${name}</strong> was killed by <strong class="group${group}">${username}</strong>.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeReminder: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let subject = Notify.sanitizeHTML(data.extra.subject);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let tid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/showthread.php?tid=${tid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="far fa-clock" aria-hidden="true" style="text-shadow: none;color: #99b6c3;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">Thread Reminder: <strong style="color: #ddd;">${subject}</strong>.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeHackumanFoundEgg: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let name = Notify.sanitizeHTML(data.extra.award);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let awid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/hackuman.php" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fas fa-paw-claws" aria-hidden="true" style="text-shadow: none;color: #4fc2e0;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">You found a <img src="${socket_url_base}/uploads/awards/${awid}.png" /> <strong style="color: #ddd;">${name}</strong>!</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeHackumanEggExpireSoon: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let name = Notify.sanitizeHTML(data.extra.award);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let awid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/hackuman.php" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fas fa-paw-claws" aria-hidden="true" style="text-shadow: none;color: #4fc2e0;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">Your <img src="${socket_url_base}/uploads/awards/${awid}.png" /> <strong style="color: #ddd;">${name}</strong> egg expires in 24 hours. Put it in the incubator to save it.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeHackumanLowHealth: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let name = Notify.sanitizeHTML(data.extra.name);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let awid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/hackuman.php?action=battle&name=${encodeURI(username)}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fas fa-paw-claws" aria-hidden="true" style="text-shadow: none;color: #4fc2e0;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;">Your Hack&#250;man <strong>${name}</strong> is under attack by <strong class="group${group}">${username}</strong>!</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeBuddyRequest: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let name = Notify.sanitizeHTML(data.extra.name);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let brid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let scriptTag = "";
		let controlsOptions = "";
		
		if(data.extra.buddyStatus == "pending") {
			scriptTag = `<script>				
					$('#br_deny_${brid}').on('click', () => {	
						$.ajax({
							type: "POST",
							url: "usercp.php?ajax=1",
							data: {
								action: "declinerequest",
								id: ${brid},
								my_post_key: my_post_key
							},
							dataType: "json",
							success: function(data) {						
								if(typeof data == 'object') {
									if(data.hasOwnProperty("errors")) {
										$.each(data.errors, function(i, message) {
											$.jGrowl('Error:  ' + message, { theme: 'jgrowl_error' });
										});
									} else if(data.hasOwnProperty("success")) {
										$.jGrowl('Comrade request has been denied.', { theme: 'jgrowl_success' });
										
										$('#br_controls_${brid}').html('<div><em>Request has been denied or expired.</em></div>');
									}
								}
							},
							error: function() {
								$.jGrowl('Unknown Error', { theme: 'jgrowl_error' });
							}
						});
					});
					
					$('#br_accept_${brid}').on('click', () => {
						$.ajax({
							type: "POST",
							url: "usercp.php?ajax=1",
							data: {
								action: "acceptrequest",
								id: ${brid},
								my_post_key: my_post_key
							},
							dataType: "json",
							success: function(data) {						
								if(typeof data == 'object') {
									if(data.hasOwnProperty("errors")) {
										$.each(data.errors, function(i, message) {
											$.jGrowl('Error:  ' + message, { theme: 'jgrowl_error' });
										});
									} else if(data.hasOwnProperty("success")) {
										$.jGrowl('Comrade request has been accepted.', { theme: 'jgrowl_success' });
										
										$('#br_controls_${brid}').html('<div><em>Request has been accepted.</em></div>');
									}
								}
							},
							error: function() {
								$.jGrowl('Unknown Error', { theme: 'jgrowl_error' });
							}
						});
					});
				</script>`;
				
			controlsOptions = `<div>
					<div id="br_deny_${brid}" class="pro-adv-3d-button" style="display: flex; padding: 5px 10px !important;background-color: #4c4c4c;align-items: center;border-radius: 4px;" unselectable="on" onselectstart="return false;" onmousedown="return false;">
						<i class="fas fa-times"></i>
						<span style="margin-left: 8px; font-weight: 500;">Deny</span>
					</div>
				</div>
				<div style="margin-left: 4px;">
					<div id="br_accept_${brid}" class="pro-adv-3d-button" style="display: flex;padding: 5px 10px !important;background-color: #4c4c4c;align-items: center;border-radius: 4px;" unselectable="on" onselectstart="return false;" onmousedown="return false;">
						<i class="fas fa-check"></i>
						<span style="margin-left: 8px; font-weight: 500;">Accept</span>
					</div>
				</div>`;
		} else if(data.extra.buddyStatus == "denied") {
			controlsOptions = "<div><em>Request has been denied or expired.</em></div>";
		} else {
			controlsOptions = "<div><em>Request has been accepted.</em></div>";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<div>
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="far fa-user-friends" aria-hidden="true" style="text-shadow: none;color: #4ab8c3;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> sent you a comrade request.</span></div>
						<div id="br_controls_${brid}" style="display: flex; margin-top: 6px; color: #eee;">
							${controlsOptions}
						</div>
					</div>
				</div>
				${scriptTag}
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeBlogPosted: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let subject = Notify.sanitizeHTML(data.extra.subject);
		let bid = Notify.forceInt(data.link_id);
		let url = Notify.sanitizeHTML(data.extra.url);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${socket_url_base}/${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/blog/${url}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span class="" style="display: block; overflow: hidden;"><strong style="color: #ddd;">${subject}</strong></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> created a new blog.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	buildNoticeAttachmentUnlock: function(data) {
		let username = Notify.sanitizeHTML(data.action_username);
		let uid = Notify.forceInt(data.action_uid);
		let avatar = Notify.sanitizeHTML(data.action_user.avatar);
		let group = Notify.getDisplayGroup(data.action_user.usergroup, data.action_user.displaygroup);
		let subject = Notify.sanitizeHTML(data.extra.subject);
		let dateline = Notify.forceInt(data.dateline);
		let extra_container_class = "";
		let num_count = Notify.forceInt(data.num_count);
		let other_count = num_count - 1;
		let others_message = "";
		let pid = Notify.forceInt(data.link_id);
		
		if(data.status > 0) {
			extra_container_class = "notify-notice-container-read";
		}
		
		if(!avatar.length) {
			avatar = "https://hackforums.net/images/mobale/default_avatar.png";
		}
		
		let template = `
			<div class="notify-notice-container ${extra_container_class}">
				<div class="notify-notice-avatar-container">
					<div class="notify-notice-avatar" title="${username}"><a href="${socket_url_base}/member.php?action=profile&uid=${uid}"><img src="${avatar}" width="36" height="36" alt=""></a></div>
				</div>
				<a href="${socket_url_base}/showthread.php?pid=${pid}#pid${pid}" style="display: block; width: 100%;">
					<div class="notify-notice-details-container">
						<div style="margin-top: -2px;"><span class="tinytext" style="color: #888;"><i class="fa fa-paperclip" aria-hidden="true" style="text-shadow: none;color: gray;margin-right: 6px;"></i><span class="smart-time" data-timestamp="${dateline}" title="${Notify.niceTime(dateline)}">${Util.getRelativeTime(dateline)}</span></span></div>
						<div style="margin-top: 2px;"><span style="display: block; overflow: hidden; color: #ababab;"><strong class="group${group}">${username}</strong> unlocked your attachment <strong style="color: #ddd;">${subject}</strong>.</span></div>
					</div>
				</a>
			</div>`;
			
		Notify.notifyList.prepend(template);
	},
	
	
	draggable: function(id) {
		let ele = document.getElementById(id);
		
		if(ele === null) {
			return;
		}
		
		let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
		
		document.getElementById("notify-dragger").onmousedown = dragMouseDown;
		
		function dragMouseDown(e) {
			e = e || window.event;
			e.preventDefault();
			// get the mouse cursor position at startup:
			pos3 = e.clientX;
			pos4 = e.clientY;
			document.onmouseup = closeDragElement;
			// call a function whenever the cursor moves:
			document.onmousemove = elementDrag;
		}

		function elementDrag(e) {
			e = e || window.event;
			e.preventDefault();
			// calculate the new cursor position:
			pos1 = pos3 - e.clientX;
			pos2 = pos4 - e.clientY;
			pos3 = e.clientX;
			pos4 = e.clientY;
			// set the element's new position:
			ele.style.top = (ele.offsetTop - pos2) + "px";
			ele.style.left = (ele.offsetLeft - pos1) + "px";
		}

		function closeDragElement() {
			// stop moving when mouse button is released:
			document.onmouseup = null;
			document.onmousemove = null;
		}
	},
	
	
	subscribeForumModal: function(fid) {
		let new_rand_id = [...Array(10)].map(i=>(~~(Math.random()*36)).toString(36)).join('');
		
		let new_element = `<div class="modal" id="" style="display: none;">
			<div style="overflow-y: auto;max-height: 400px;background-color: #333;padding: 10px; text-align: center;">
				<form method="post" action="xmlhttp.php" id="form_${new_rand_id}">
					<input type="hidden" name="action" value="addsubscription">
					<input type="hidden" name="type" value="forum">
					<input type="hidden" name="my_post_key" value="${my_post_key}">
					<input type="hidden" name="fid" value="${fid}">
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
						post_body = 'action=removesubscription&type=forum&my_post_key=${my_post_key}&fid=${fid}';
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
								} else if(data.data.includes('selected forum has been added')) {
									$.jGrowl('Successfully set a subscription for this forum.', { theme: 'jgrowl_success' });
									$('.forum-sub-icon-add').addClass('forum-sub-icon-remove').removeClass('forum-sub-icon-add');
								} else if(data.data.includes('selected forum has been removed')) {
									$.jGrowl('Successfully removed your subscription to this forum.', { theme: 'jgrowl_success' });
									$('.forum-sub-icon-remove').addClass('forum-sub-icon-add').removeClass('forum-sub-icon-remove');
								} else {
									$.jGrowl('There was an error updating this forum subscription. Please try again.', { theme: 'jgrowl_error' });
								}
							}
						},
						error: function() {
							$.jGrowl('There was an error updating this forum subscription. Please reload the page and try again.', { theme: 'jgrowl_error' });
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
	
	
	userQuickLove(_event, _uid) {
		_uid = Util.forceInt(_uid);
		
		if(_uid <= 0) {
			$.jGrowl('Invalid user selected to Quick Love.', {theme:'jgrowl_error'});
			return;
		}
		
		Notify.socket.emit('quick_love_user', {
			uid: _uid
		});
	}
	

	
};

Notify.init();