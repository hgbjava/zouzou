var AV = require('leanengine');
var UserDynamicData = AV.Object.extend('UserDynamicData');
var SpeedDate = AV.Object.extend('SpeedDate');
var User = AV.Object.extend('_User');
var Evaluation = AV.Object.extend('Evaluation');
var UserScore = AV.Object.extend('UserScore');
var SpeedDateRoute = AV.Object.extend('SpeedDateRoute');
var Friend = AV.Object.extend('Friend');
var FeedbackType = AV.Object.extend('Feedback_type');
var Feedback = AV.Object.extend('Feedback');
var ReportType = AV.Object.extend('Report_Type');
var Report = AV.Object.extend('Report');

AV.Cloud.define('report', function(request, response){
	var userId = request.params.userId;
	var code = request.params.code;
	var reportedUserId = request.params.reportedUserId;
	if(!userId || userId==='' || !reportedUserId || reportedUserId==='' || !code || code === ''){
		response.error({"code":500, "result":"参数不能为空"});
	}else{
		var report = new Report();
		report.set('userId', userId);
		report.set('reportedUserId', reportedUserId);
		report.set('code', code);

		var reportQuery = new AV.Query(Report);
		reportQuery.equalTo('userId', userId);
		reportQuery.equalTo('reportedUserId', reportedUserId);
		reportQuery.find().then(function(results){
			if(results.length == 0){
				//需要扣减分数
				var userDynamicQuery = AV.Query(UserDynamicData);
				var user = new User();
				user.id = reportedUserId;
				userDynamicQuery.equalTo('userId', user);
				response.success(userDynamicQuery);
				userDynamicQuery.find().then(function(results){
					response.success("dynamic" + results);
					if(results.length > 0){
						var userDynamicData = results[0];
						var reportedScore = userDynamicData.get('reportedScore');
						if(reportedScore > 0){
							reportedScore=reportedScore -1;
							userDynamicData.set('reportedScore', reportedScore);
							userDynamicData.save();
						}
						return response.success({"code":200, "result":userDynamicData.get("location")});
					}else{
						response.error({"code":500, "result":"dynamicData不存在(setep=2), userId=" + userId});
					}
				},
				function(error){
					response.error({"code":500, result:"被举报人不存在"});
				});
			}

			report.save();
			response.success({"code":200, "result":"举报成功"});
		},
		function(error){
			response.error({"code":500, "result":"举报失败"});
		});
	}
});

/**
 * 投诉类型列表
*/
AV.Cloud.define('reportTypeList', function(request, response){
	var reportTypeQuery = new AV.Query(ReportType);
	reportTypeQuery.find().then(function(results){
		return response.success({"code":200, "results":results});
	},
	function(error){
		return response.error({"code":500, "result":"查询举报类型列表异常."});
	});
});

/**
 * 反馈类型列表
*/
AV.Cloud.define('feedbackTypeList', function(request, response){
	var feedbackTypeQuery = new AV.Query(FeedbackType);
	feedbackTypeQuery.find().then(function(results){
		return response.success({"code":200, "results":results});
	},
	function(error){
		return response.error({"code":500, "result":"查询反馈类型列表异常."});
	});
});

/**
 * 新增反馈
*/
AV.Cloud.define('addFeedback', function(request, response){
	var userId = request.params.userId;
	var type = request.params.type;
	var mobilePhone = request.params.mobilePhone;
	var img = request.params.imgfile;
	var content = request.params.content;
	var feedback = new Feedback();

	var user = new User();
	user.id = userId;
	feedback.set('user', user);
	feedback.set('type', type);
	feedback.set('img', img);
	feedback.set('content', content);

	feedback.save().then(function(feedback){
		response.success({"code":200, "result":"新增反馈成功"});
	},
	function(error){
		response.error({"code":500,"result":"新增反馈失败"});
	});
});

/**
 * 编辑反馈
*/
AV.Cloud.define('editFeedback', function(request, response){
	var feedbackId = request.params.feedbackId;
	var img = request.params.imgfile;
	var content = request.params.content;

	var feedbackQuery = new AV.Query(Feedback);
	feedbackQuery.get(feedbackId).then(function(feedback){
		feedback.set('content', content);
		feedback.set("img", img);
		feedback.save().then(function(feedback){
			response.success({"code":200, "result":"编辑反馈成功"});
		},
		function(error){
			response.error({"code":500, "result":"编辑反馈失败"});
		});
	},function(error){
		response.error({"code":500, "result":"查询反馈记录异常"});
	});
});


/**
 * 好友进入灰色区域
 * 参数：{"speedDateId":"57ea26282e958a00545256e0","color":"2"}
*/
AV.Cloud.define('friendInActive', function(request, response){
	var friendUserId = request.params.friendUserId;
	var userId = request.params.userId;
	if(!friendUserId || friendUserId==='' || !userId || userId===''){
		response.error({"code":500, "result":"参数不能为空"});
	}else{
		var friendQuery = new AV.Query(Friend);
		friendQuery.equalTo('userId', userId);
		friendQuery.equalTo('friendUserId', friendUserId);
		friendQuery.find().then(function(results){
			if(results.length > 0){
				results[0].set('isActive',false);
				results[0].save();
			}
			return response.success({"code":200, "result":results[0]});
		},
		function(error){
			response.error({"code":500, "result":"不存在好友记录,userId=" + userId + ",friendUserId=" + friendUserId});
		});
	}
});
/**
 * 设置当前走走记录color
 * 参数：{"speedDateId":"57ea26282e958a00545256e0","color":"2"}
*/
AV.Cloud.define('setColor', function(request, response){
	var speedDateId = request.params.speedDateId;
	var color = request.params.color;
	if(!speedDateId || speedDateId==='' || !color || color===''){
		response.error({"code":500, "result":"参数不能为空"});
	}else{
		var speedDateQuery = new AV.Query(SpeedDate);
		speedDateQuery.get(speedDateId).then(function(speedDate){
			if(speedDate){
				speedDate.set('color', color);
				speedDate.save();
				return response.success({"code":200, "result":speedDate});
			}
		},
		function(error){
			response.error({"code":500, "result":"speedDate不存在(setep=1), speedDateId=" + speedDateId});
		});
	}
});

/**
 * 获取用户坐标
 * param: {"userId":"573050921532bc0065092c58"}
 */
AV.Cloud.define('userCoordinate', function(request, response) {
	var userId = request.params.userId;
	if(!userId || userId === ''){
		response.error('参数userId不能为空');
	}else{
		var user = new User();
		user.id = userId;
		var userDynamicQuery = new AV.Query(UserDynamicData);
		userDynamicQuery.equalTo('userId', user);
		userDynamicQuery.find().then(function(results){
			if(results.length >0){
				var userDynamicData = results[0];
				return response.success({"code":200, "result":userDynamicData.get("location")});
			}else{
				response.error({"code":500, "result":"dynamicData不存在(setep=2), userId=" + userId});
			}
		},
		function(error){
			response.error({"code":500, "result":"查询UserDynamic异常(setep=1), userId=" + userId + ", errormsg:" + error.message});
		});
	}
});

/**
 * 获取好友列表
 * param: {"userId":"573050921532bc0065092c58"}
 */
 AV.Cloud.define('friendList', function(request, response) {
 	var userId = request.params.userId;
 	var count = request.params.count;
 	if(!userId || userId===''){
		response.error({"code":500, "result":"参数不能为空"});
	}else{
		if(!count || count <=0){
			count = 3;
		}
		var friendQuery = new AV.Query(Friend);
		friendQuery.equalTo('userId', userId);
		friendQuery.equalTo('isActive',true);
		friendQuery.descending('updatedAt');
		friendQuery.limit(count);
		friendQuery.find().then(function(results){
			return response.success({"code":200, "results":results});
		},
		function(error){
			response.error({"code":500, "result":"查询好友列表异常, userId=" + userId + ", errormsg:" + error.message});
		});
	}
 });
/**
 * 添加好友
 * param: {"userId":"573050921532bc0065092c58","frendUserId":"5718eede71cfe4006dccf237","color":"2"}
 */
AV.Cloud.define('addFriend', function(request, response) {
	var userId = request.params.userId;
	var friendUserId = request.params.friendUserId;
	var color = request.params.color;
	if(!userId || userId==='' || !friendUserId || friendUserId===''){
		response.error({"code":500, "result":"参数不能为空"});
	}else{
		var friendQuery = new AV.Query(Friend);
		friendQuery.equalTo('userId', userId);
		friendQuery.equalTo('friendUserId', friendUserId);
		friendQuery.find().then(function(results){
			var frend = null;
			if(results.length>0){
				/*存在好友记录，修改时间*/
				friend = results[0];
				friend.set('color', color);
				friend.save().then(function(friend){
					response.success({"code":200, "results":friend});
				},
				function(error){
					response.error({"code":500, "result":"更新好友异常, errormsg:" + error.message});
				});
			}else{
				/*不存在则创建记录*/
				friend = new Friend();
				friend.set('userId', userId);
				friend.set('friendUserId', friendUserId);
				friend.set('color', color);
				friend.set('isActive', true);
				friend.save().then(function(friend){
					response.success({"code":200, "results":friend});
				},
				function(error){
					response.error({"code":500, "result":"保存好友异常, errormsg:" + error.message});
				});
			}
		},
		function(error){
			response.error({"code":500, "result":"查询好友记录异常, errormsg:" + error.message});
		});
	}
});

/**
 * 查询用户动态数据
 * param: {"userId":"573050921532bc0065092c58"}
 */
AV.Cloud.define('querySpeedDate', function(request, response) {
	var userId = request.params.userId;
	if(!userId || userId === ''){
		response.error({"code":500, "result":"参数userId不能为空"});
	}else{
		var fromUserQuery = new AV.Query(SpeedDate);
		fromUserQuery.equalTo('fromUser',userId);
		fromUserQuery.containedIn('status',[2,3,4]);
		fromUserQuery.equalTo('fromUserEvaStatus',false);
		fromUserQuery.equalTo('isValid',true);

		var toUserQuery = new AV.Query(SpeedDate);
		toUserQuery.equalTo('toUser',userId);
		toUserQuery.containedIn('status',[2,3,4]);
		toUserQuery.equalTo('toUserEvaStatus',false);
		toUserQuery.equalTo('isValid',true);
		var query = AV.Query.or(fromUserQuery, toUserQuery);
		query.find().then(function(results){
			response.success({"code":200, "results":results[0]});
		},
		function(error){
			response.error({"code":500, "result":"查询用户邀约记录异常(step=1), errormsg:" + error.message});
		});
	}
});

AV.Cloud.define('updatePassword', function(request, response) {
	var phone = request.params.phone;
	var userQuery = new AV.Query(User);
	userQuery.equalTo('mobilePhoneNumber', phone);
	userQuery.find().then(function(results){
		if(results.length > 0){
			var password = request.params.password;
			results[0].set('password', password);
			results[0].save().then(function(user){
				response.success({"result":"密码修改成功"});
			}, 
			function(error){
				response.error({"code":500, "result":"服务端异常"});
			});
		}else{
			response.error({"result":"用户不存在"});
		}
	},
	function(error){
		response.error({"code":500, "result":"服务端异常"});
	});
});

AV.Cloud.define('registe', function(request, response) {
	var username = request.params.username;
	var password = request.params.password;
	var phone = request.params.phone;
	var gender = request.params.gender;
	var userQuery = new AV.Query(User);
	userQuery.equalTo('mobilePhoneNumber', phone);
	userQuery.find().then(function(results){
		if(results.length > 0){
			if(results[0].get('mobilePhoneVerified')==true){
				response.error({"code":500, "result":"手机号码已经注册"});
			}else{
				results[0].destroy().then(function(success){
				    response.success({"code":200});
				}, 
				function(error){
				    response.error({"code":500, "message":"删除失败"});
				});
			}
		}else{
			var newuser = new AV.User();
			newuser.set('username', username);
			newuser.set('password', password);
			newuser.set('mobilePhoneNumber', phone);
			newuser.set('gender', gender);
			newuser.signUp().then(function(loginedUser){
				response.success({"code":200, "result":loginedUser});
			},
			function(error){
				response.error({"code":500, "result":"注册失败"});
			});
		}
	},
	function(error){
		response.error({"code":500, "result":"服务异常"});
	});
});

AV.Cloud.define('createUserDynamicData', function(request, response) {
	var userId = request.params.userId;
	if(!userId || userId === ''){
		response.error({"code":500, "result":"参数userId不为空"});
	}else{
		var user = new User();
		user.id = userId;
		var userDynamicQuery  = new AV.Query(UserDynamicData);
		userDynamicQuery.equalTo('userId',user);
		userDynamicQuery.find().then(function(results){
			var latitude = request.params.latitude;
			var longitude = request.params.longitude;
			var datingStatus = request.params.datingStatus;
			var onlineStatus = request.params.onlineStatus;
			if(results.length > 0){
				//已经存在则返回原有记录
				response.success({"code":200, "result":results[0]});
			}else{
				var userDynamicData = new UserDynamicData();
				userDynamicData.set('userId', user);
				userDynamicData.set('datingStatus', 1);
				userDynamicData.set('onlineStatus', true);
				userDynamicData.save().then(function(userDynamicData){
					response.success({"code":200, "result":userDynamicData})
				},
				function(error){
					response.error({"code":500, "result":"保存用户DynamicData异常"});
				});
			}
		},
		function(error){
			response.error({"code":500, "result":"查询用户DynamicData异常，userId=" + userId});
		});
	}
});


AV.Cloud.define('updateUserDynamicData', function(request, response) {
	var userId = request.params.userId;
	if(!userId || userId === ''){
		response.error({"code":500, "result":"参数userId不为空"});
	}else{
		var userDynamicQuery  = new AV.Query(UserDynamicData);
		var user = new User();
		user.id = userId;
		userDynamicQuery.equalTo('userId',user);
		userDynamicQuery.find().then(function(results){
			if(results.length > 0){
				var latitude = request.params.latitude;
				var longitude = request.params.longitude;
				if(latitude && latitude != '' && longitude && longitude != ''){
					var location = new AV.GeoPoint({"latitude": latitude, "longitude": longitude});
					results[0].set('location',location);
				}
				
				results[0].set('onlineStatus', true);
				results[0].save();
				response.success({"code":200, "result":results[0]});
			}else{
				response.error({"code":500, "result":"用户DynamicData不存在, userId=" + userId});
			}
		},function(error){
			response.error({"code":500, "result":"查询用户DynamicData异常，userId=" + userId});
		});
	}
});

/**
 * 查询用户动态数据
 * param: {"userDynamicDataId":"567e966e00b0adf744f09b09"}
 */
AV.Cloud.define('queryUserDynamicData', function(request, response) {
	var userId = request.params.userId;
	if(!userId || userId === ''){
		response.error({"code":500, "result":"参数userId不为空"});
	}else{
		var user = new User();
		user.id = userId;
		var userDynamicQuery  = new AV.Query(UserDynamicData);
		userDynamicQuery.equalTo('userId',user);
		userDynamicQuery.find().then(function(results){
			if(results.length > 0){
				response.success({'code':200,'result': results[0]});
			}else{
				response.success({'code':200,'result': null});
			}
		}, function(error) {
		  	response.error({"code":500, "result":"查询dynamicData异常,userId=" + userId});
		});
	}
});

/**
 * 定时检测用户在线状态方法
 */
AV.Cloud.define('checkAndUpdateUserOnlineStatus', function(request, response) {
	var userDynamicQuery = new AV.Query(UserDynamicData);
	var time = new Date().getTime() - 20 * 2 * 1000;
	var date = new Date();    
	date.setTime(time);
	userDynamicQuery.lessThan('updatedAt',date);
	userDynamicQuery.find().then(function(results){
		for (var i = 0; i < results.length; i++) {
	        var object = results[i];
	        object.set('onlineStatus', false);
	        object.save();
	    }
		response.success({"code":200,"results":results.length + "个用户在线状态更新"});
	}, function(error){
		response.error({"code":500, "result":"查询用户列表异常(step=1), errormsg:" + error.message});
	});
});

/**
 * 查询当前用户附近人列表
 * param: {"userDynamicDataId":"567e966e00b0adf744f09b09"}
 */
AV.Cloud.define('queryNearlyUsers', function(request, response) {
	var userDynamicDataId = request.params.userDynamicDataId;
	if(!userDynamicDataId || userDynamicDataId === ''){
		response.error({"code":500, "result":"userDynamicDataId不为空"});
	}else{
		var userDynamicQuery  = new AV.Query(UserDynamicData);
		userDynamicQuery.get(userDynamicDataId).then(function(userDynamicData){
			if(userDynamicData){
				var location = userDynamicData.get('location');
				var userListQuery = new AV.Query(UserDynamicData);
				userListQuery.near('location', location);
				userListQuery.notContainedIn('datingStatus',[2,3,4]);
				userListQuery.notContainedIn('objectId',[userDynamicData.id]);
				userListQuery.equalTo('onlineStatus',true);
				userListQuery.limit(10);
				userListQuery.include("userId");
				userListQuery.descending('reportedScore');
				userListQuery.find().then(function(results){
					var userArray = [];
				    var x=0;
				    for(var i=0;i<results.length;i++){
				        var distance = location.kilometersTo(results[i].get("location"));
				        if(results[i].get("userId")){
    				        results[i]=results[i].get("userId");
    				        results[i].add("distance",distance);
    				        userArray[x]=results[i];
    				        x=x+1;
				        }
				    }
				    var finalResult = {'code':200,'results':userArray};
					response.success(finalResult);
				},
				function(error){
					response.error({"code":500, "result":"查询用户列表(step=2), errormsg:" + error.message});
				});
			}else{
				response.error({"code":500, "result":"dynamicData不存在(setep=1), userId=" + userDynamicDataId});
			}
		},
		function(error){
			response.error({"code":500, "result":"查询dynamicData异常(step=1)，userId=" + userId + ", errormsg:" + error.message});
		});
	}
});

/**
 * 喜欢接口
 * param: {"fromUserId":"565eb4fd60b25b0435209c10","toUserId":"567e95ec60b2e1871e04a8ae"}
 */

 AV.Cloud.define('likeSomeone', function(request, response) {
	var fromUserId = request.params.fromUserId;
	var toUserId = request.params.toUserId;
	if(!fromUserId || fromUserId === '' || !toUserId || toUserId === ''){
		response.error("参数不正确，fromUserId=" + fromUserId + ", toUserId=" + fromUserId);
	}else{
		var user = new User();
		user.id = fromUserId;
		var userDynamicQuery  = new AV.Query(UserDynamicData);
		userDynamicQuery.equalTo('userId',user);
		userDynamicQuery.find().then(function(results){
			if(results.length > 0){
				var fromUserDynamic = results[0];
				if(fromUserDynamic.get('datingStatus')>1 && fromUserDynamic.get('datingStatus')<5){
					//当前用户还处于走走中
					return response.success({"code":500, "results":fromUserDynamic});
				}else{
					user.id = toUserId;
				    userDynamicQuery.equalTo('userId',user);
				    userDynamicQuery.find().then(function(results){
						if(results.length > 0){
							var toUserDynamic = results[0];
							//查询对方是否已经存在走走中
							if(toUserDynamic.get('datingStatus')>1 && toUserDynamic.get('datingStatus')<5){
								//用户当前还处于走走中
								return response.success({"code":500, "results":"he/she is in dating."});
							}else{
								var speedDatingQuery = new AV.Query(SpeedDate);
			    				speedDatingQuery.equalTo('fromUser',toUserId);
			    				speedDatingQuery.equalTo('toUser',fromUserId);
			    				speedDatingQuery.equalTo('status',1);
			    				speedDatingQuery.equalTo('isValid',true);
			    				speedDatingQuery.find().then(function(results){
									if(results.length > 0){
		    				    		//存在记录，则修改状态
		    				    		results[0].set('status', 2);
		    				    		results[0].save();
		    				    		fromUserDynamic.set('datingStatus',2);
		    				    		fromUserDynamic.save();
		    				    		toUserDynamic.set("datingStatus", 2);
		    				    		toUserDynamic.save();
		    				    		response.success({"code":200, "results":results[0]});
		    				    	}else{
		    				    		//避免重复创建记录，先查询是否已经有喜欢对方的记录存在
		    				    		speedDatingQuery = new AV.Query(SpeedDate);
		    				    		speedDatingQuery.equalTo('fromUser',fromUserId);
		    							speedDatingQuery.equalTo('toUser',toUserId);
		    							speedDatingQuery.containedIn('status',[1,2,3,4]);
		    							speedDatingQuery.equalTo('isValid',true);
		    							speedDatingQuery.find().then(function(results){
											if(results.length > 0){
											    //返回当前记录
												response.success({"code":200, "results":results[0]});
											}else{
											    //不存在，则创建记录
									    		var speedDate = new SpeedDate();
									    		speedDate.set('fromUser',fromUserId);
									    		speedDate.set('toUser',toUserId);
									    		speedDate.set('fromUserEvaStatus',false);
									    		speedDate.set('toUserEvaStatus',false);
									    		speedDate.set('status',1);
									    		speedDate.set('isValid', true);
									    		speedDate.save().then(function(speedDate){
									    			response.success({"code":200, "results":speedDate});
									    		},
									    		function(error){
													response.error({"code":500, "result":"创建speeddate异常(setep=5) ,message=" + error.message});
									    		});
											}
		    							},
		    							function(error){
		    								response.error({"code":500, "result":"查询speeddate异常(setep=4) ,message=" + error.message});
		    							});
		    				    	}
			    				},
			    				function(error){
									response.error({"code":500, "result":"查询speeddate异常(setep=3) ,message=" + error.message});
			    				});
							}
						}else{
							response.error({"code":500, "result":"dynamicData不存在(setep=2), toUserId=" + toUserId});
						}
				    },
				    function(error){
				    	response.error({"code":500, "result":"查询userDynamic异常(setep=2), toUserId=" + toUserId + " ,message=" + error.message});
				    });
				}
			}else{
				response.error({"code":500, "result":"dynamicData不存在(setep=1), fromUserId=" + fromUserId});
			}
		},
		function(error){
			response.error({"code":500, "result":"查询userDynamic异常(setep=1), fromUserId=" + fromUserId + " ,message=" + error.message});
		});
	}
});

/**
 * 走起接口
 * param example: {"speedDateId":"576a859280dda4005fb59dae"}
 */
AV.Cloud.define('goTogether', function(request, response) {
	var speedDateId = request.params.speedDateId;
	if(!speedDateId || speedDateId === ''){
		response.error('参数speedDateId不能为空');
	}else{
		var speedDateQuery = new AV.Query(SpeedDate);
		speedDateQuery.get(speedDateId).then(function(speedDate){
			if(speedDate){
				speedDate.set('status', 3);
				speedDate.save();
				//修改from用户状态
				var user = new User();
				user.id=speedDate.get('fromUser');
				var userDynamicQuery  = new AV.Query(UserDynamicData);
				userDynamicQuery.equalTo('userId', user);
				userDynamicQuery.find().then(function(results){
					if(results.length >0){
						results[0].set('datingStatus', 3);
						results[0].save().then(function(userDynamicData){
							//修改to用户状态
							user.id=speedDate.get('toUser');
							userDynamicQuery.equalTo('userId', user);
					        userDynamicQuery.find().then(function(results){
					        	if(results.length >0){
	    							results[0].set('datingStatus', 3);
	    							results[0].save().then(function(userDynamicData){
	    								//返回当前快约记录
	    								response.success({"code":200, "results": speedDate});
	    							},
	    							function(error){
	    								response.error({"code":500, "result":"更新dynamicData异常(setep=5), toUser=" + speedDate.get('toUser') + " ,message=" + error.message});
	    							});
	    						}else{
	    							response.error({"code":500, "result":"dynamicData不存在(setep=4), toUser=" + speedDate.get('toUser')});
	    						}
					        },
					        function(error){
					        	response.error({"code":500, "result":"查询dynamicDate异常(setep=4), toUser=" + speedDate.get('toUser') + " ,message=" + error.message});
					        });
						},
						function(error){
							response.error({"code":500, "result":"更新dynamicData异常(setep=3), fromUser=" + speedDate.get('fromUser') + " ,message=" + error.message});
						});
					}else{
						response.error({"code":500, "result":"dynamicData不存在(setep=2), fromUser=" + speedDate.get('fromUser')});
					}
				},
				function(error){
					response.error({"code":500, "result":"查询dynamicDate异常(setep=2), fromUser=" + speedDate.get('fromUser') + " ,message=" + error.message});
				});
			}else{
				response.error({"code":500, "result":"speedDate不存在(setep=1), speedDateId=" + speedDateId});
			}
		},
		function(error){
			response.error({"code":500, "result":"查询speedDate异常(setep=1), speedDateId=" + speedDateId + " ,message=" + error.message});
		});
	}
});

/**
 * 结束走走接口
 * param example: {"speedDateId":"583449c8d20309006168ba00"}
 */
AV.Cloud.define('cancelSpeedDate', function(request, response) {
	var speedDateId = request.params.speedDateId;
	if(!speedDateId || speedDateId === ''){
		response.error({"code":500, "result":"参数不正确, speedDateId=" + speedDateId});
	}else{
		var speedDate = null;
		var speedDateQuery = new AV.Query(SpeedDate);
		speedDateQuery.get(speedDateId).then(function(speedDate){
			if(speedDate){
				speedDate.set('isValid', false);
				speedDate.save();
				//修改from用户状态
				var user = new User();
				user.id=speedDate.get('fromUser');
				var userDynamicQuery  = new AV.Query(UserDynamicData);
				userDynamicQuery.equalTo('userId', user);
				userDynamicQuery.find().then(function(results){
					if(results.length >0){
						results[0].set('datingStatus', 1);
						results[0].save().then(function(userDynamicData){
							//修改to用户状态
							user.id=speedDate.get('toUser');
							userDynamicQuery.equalTo('userId', user);
					        userDynamicQuery.find().then(function(results){
					        	if(results.length >0){
	    							results[0].set('datingStatus', 1);
	    							results[0].save().then(function(userDynamicData){
	    								//返回当前快约记录
	    								response.success({"code":200, "results": speedDate});
	    							},
	    							function(error){
	    								response.error({"code":500, "result":"更新dynamicData异常(setep=5), toUser=" + speedDate.get('toUser') + " ,message=" + error.message});
	    							});
	    						}else{
	    							response.error({"code":500, "result":"dynamicData不存在(setep=4), toUser=" + speedDate.get('toUser')});
	    						}
					        },
					        function(error){
					        	response.error({"code":500, "result":"查询dynamicDate异常(setep=4), toUser=" + speedDate.get('toUser') + " ,message=" + error.message});
					        });
						},
						function(error){
							response.error({"code":500, "result":"更新dynamicData异常(setep=3), fromUser=" + speedDate.get('fromUser') + " ,message=" + error.message});
						});
					}else{
						response.error({"code":500, "result":"dynamicData不存在(setep=2), fromUser=" + speedDate.get('fromUser')});
					}
				},
				function(error){
					response.error({"code":500, "result":"查询dynamicDate异常(setep=2), fromUser=" + speedDate.get('fromUser') + " ,message=" + error.message});
				});
			}else{
				response.error({"code":500, "result":"speedDate不存在(setep=1), speedDateId=" + speedDateId});
			}
		},
		function(error){
			response.error({"code":500, "result":"查询speedDate异常(setep=1), speedDateId=" + speedDateId + " ,message=" + error.message});
		});
	}
});

/**
 * 结束走走接口
 * param example: {"speedDateId":"569a01c400b00ef385062359"}
 */
AV.Cloud.define('endSpeedDate', function(request, response) {
	var speedDateId = request.params.speedDateId;
	if(!speedDateId || speedDateId === ''){
		response.error({"code":500, "result":"参数不正确, speedDateId=" + speedDateId});
	}else{
		var speedDate = null;
		var speedDateQuery = new AV.Query(SpeedDate);
		speedDateQuery.get(speedDateId).then(function(speedDate){
			if(speedDate){
				//当前speeddate已经结束了
				if(speedDate.get('status') >= 4){
					response.success({"code":200, "results": speedDate});
				}else{
					speedDate.set('status', 4);
					speedDate.save();
					//修改from用户状态
					var user = new User();
					user.id=speedDate.get('fromUser');
					var userDynamicQuery  = new AV.Query(UserDynamicData);
					userDynamicQuery.equalTo('userId', user);
					userDynamicQuery.find().then(function(results){
						if(results.length >0){
							results[0].set('datingStatus', 4);
							results[0].save().then(function(userDynamicData){
								//修改to用户状态
								user.id=speedDate.get('toUser');
								userDynamicQuery.equalTo('userId', user);
						        userDynamicQuery.find().then(function(results){
						        	if(results.length >0){
		    							results[0].set('datingStatus', 4);
		    							results[0].save().then(function(userDynamicData){
		    								//返回当前快约记录
		    								response.success({"code":200, "results": speedDate});
		    							},
		    							function(error){
		    								response.error({"code":500, "result":"更新dynamicData异常(setep=5), toUser=" + speedDate.get('toUser') + " ,message=" + error.message});
		    							});
		    						}else{
		    							response.error({"code":500, "result":"dynamicData不存在(setep=4), toUser=" + speedDate.get('toUser')});
		    						}
						        },
						        function(error){
						        	response.error({"code":500, "result":"查询dynamicDate异常(setep=4), toUser=" + speedDate.get('toUser') + " ,message=" + error.message});
						        });
							},
							function(error){
								response.error({"code":500, "result":"更新dynamicData异常(setep=3), fromUser=" + speedDate.get('fromUser') + " ,message=" + error.message});
							});
						}else{
							response.error({"code":500, "result":"dynamicData不存在(setep=2), fromUser=" + speedDate.get('fromUser')});
						}
					},
					function(error){
						response.error({"code":500, "result":"查询dynamicDate异常(setep=2), fromUser=" + speedDate.get('fromUser') + " ,message=" + error.message});
					});
				}
			}else{
				response.error({"code":500, "result":"speedDate不存在(setep=1), speedDateId=" + speedDateId});
			}
		},
		function(error){
			response.error({"code":500, "result":"查询speedDate异常(setep=1), speedDateId=" + speedDateId + " ,message=" + error.message});
		});
	}
});

/**
 * 相互评价
 * param: {"userId":"567e95ec60b2e1871e04a8ae","honesty":4,"talkative":4,"temperament":4,"seductive":4,"speedDateId":"569a01c400b00ef385062359"}
 */
AV.Cloud.define('evaluationEach', function(request, response) {
	var userId = request.params.userId;
	var honesty = request.params.honesty;
	var talkative = request.params.talkative;
	var temperament = request.params.temperament;
	var seductive = request.params.seductive;
	var speedDateId = request.params.speedDateId;
	if(!userId || userId === '' || !speedDateId || speedDateId==='' || !honesty || honesty <0 || honesty > 5 
		|| !temperament || temperament <0 || temperament >5 || !talkative || talkative <0 || talkative >5 || !seductive || seductive < 0 || seductive > 5){
		response.error({"code":500, "result":"参数不正确，userId=" + userId + ",speedDateId=" + speedDateId + ",honesty=" + honesty + ",temperament=" + temperament + 
			",talkative=" + talkative + ",seductive=" + seductive});
	}else{
		var speedDateQuery = new AV.Query(SpeedDate);
		speedDateQuery.get(speedDateId).then(function(speedDate){
			var evaluatedUserId = null;
			if(userId === speedDate.get('fromUser')){
				if(speedDate.get('fromUserEvaStatus')){
					response.success({"code":200, "result":"用户已经评价"});
				}else{
					evaluatedUserId = speedDate.get('toUser');
					speedDate.set('fromUserEvaStatus', true);
					if(speedDate.get('toUserEvaStatus')){
						speedDate.set('status', 5);
					}
				}
			}else if(userId === speedDate.get('toUser')){
				if(speedDate.get('toUserEvaStatus')){
					response.success({"code":200, "result":"用户已经评价"});
				}else{
					evaluatedUserId = speedDate.get('fromUser');
					speedDate.set('toUserEvaStatus', true);
					if(speedDate.get('fromUserEvaStatus')){
						speedDate.set('status', 5);
					}
				}
			}

			var user = new User();
			user.id = userId;
			var evaluatedUser = new User();
			evaluatedUser.id = evaluatedUserId;
			//新增评价和修改用户状态
			var evaluation = new Evaluation();
			evaluation.set('evaluateUser',user);
			evaluation.set('evaluatedUser', evaluatedUser);
			evaluation.set('speedDate',speedDate);
			evaluation.set('honesty',honesty);
			evaluation.set('temperament',temperament);
			evaluation.set('talkative',talkative);
			evaluation.set('seductive',seductive);
			evaluation.save().then(function(evaluation){
				//更新speeddate状态
				speedDate.save().then(function(speedDate){
					//更新用户评价分数
					var userScoreQuery = new AV.Query(UserScore);
					userScoreQuery.equalTo('user', evaluatedUser.id);
					userScoreQuery.find().then(function(results){
						var userScore = null;
						if(results.length > 0){
							//计算评价分
							userScore = results[0];
							userScore.set('count', userScore.get('count') + 1);
							userScore.set('totalHonesty', userScore.get('totalHonesty') + honesty);
							userScore.set('totalTalkative', userScore.get('totalTalkative') + talkative);
							userScore.set('totalTemperament', userScore.get('totalTemperament') + temperament);
							userScore.set('totalSeductive', userScore.get('totalSeductive') + seductive);
							userScore.set('honesty', userScore.get('totalHonesty')/userScore.get('count'));
							userScore.set('talkative', userScore.get('totalTalkative')/userScore.get('count'));
							userScore.set('temperament', userScore.get('totalTemperament')/userScore.get('count'));
							userScore.set('seductive', userScore.get('totalSeductive')/userScore.get('count'));
							var score = userScore.get('honesty') * 0.35 + userScore.get('talkative') * 0.30 + userScore.get('temperament') * 0.20 + userScore.get('seductive') * 0.15;
							userScore.set('score', score);
							userScore.save(null,{
								fetchWhenSave:true
							}).then(function(userScore){
								//更新状态
				    	    	var userDynamicQuery  = new AV.Query(UserDynamicData);
		        				userDynamicQuery.equalTo('userId', user);
		        				userDynamicQuery.find().then(function(results){
		        					if(results.length > 0){
		    							results[0].set('datingStatus', 1);
										results[0].save().then(function(userDynamicData){
											response.success({"code":200, "results":"success"});
										},
										function(error){
											response.error({"code":500, "result":"更新用户状态异常(setep=7), userDynamicDataId=" + userDynamicData.id + " ,message=" + error.message});
										});
		    						}else{
		    							response.error({"code":500, "result":"UserDynamicData不存在(setep=6), userId=" + user.id});
		    						}
		        				},
		        				function(error){
		        					response.error({"code":500, "result":"查询用户DynamicData异常(setep=6), userId=" + user.id + " ,message=" + error.message});
		        				});
							},
							function(error){
								response.error({"code":500, "result":"保存用户评分异常(setep=5), userScoreId=" + userScore.id + " ,message=" + error.message});
							});
						}else{
							userScore = new UserScore();
							userScore.set('user',evaluatedUser.id);
							userScore.set('honesty',honesty);
							userScore.set('talkative',talkative);
							userScore.set('temperament',temperament);
							userScore.set('seductive',seductive);
							userScore.set('count',1);
							userScore.set('totalHonesty',honesty);
							userScore.set('totalTalkative',talkative);
							userScore.set('totalTemperament',temperament);
							userScore.set('totalSeductive',seductive);
							userScore.set('score',honesty * 0.35 + talkative * 0.30 + temperament * 0.20 + seductive * 0.15);
							userScore.save().then(function(userScore){
								//更新状态
				    	    	var userDynamicQuery  = new AV.Query(UserDynamicData);
		        				userDynamicQuery.equalTo('userId', user);
		        				userDynamicQuery.find().then(function(results){
		        					if(results.length > 0){
	        							results[0].set('datingStatus', 1);
										results[0].save().then(function(userDynamicData){
											response.success({"code":200,"results":"success"});
										},
										function(error){
											response.error({"code":500, "result":"更新用户状态异常(setep=11), userDynamicDataId=" + userDynamicData.id + " ,message=" + error.message});
										});
	        						}else{
	        							response.error({"code":500, "result":"UserDynamicData不存在(setep=10), userId=" + user.id});
	        						}
		        				},
		        				function(error){
		        					response.error({"code":500, "result":"查询用户DynamicData异常(setep=9), userId=" + user.id + " ,message=" + error.message});
		        				});
							},
							function(error){
								response.error({"code":500, "result":"保存用户评分异常(setep=8), userScoreId=" + userScore.id + " ,message=" + error.message});
							});
						}
					},
					function(error){
						response.error({"code":500, "result":"查询用户评分异常(setep=4), evaluatedUserId=" + evaluatedUserId + " ,message=" + error.message});
					});
				},
				function(error){
					response.error({"code":500, "result":"保存speedDate状态异常(setep=3), speedDateId=" + speedDateId + " ,message=" + error.message});
				});
			},
			function(error){
				response.error({"code":500, "result":"新增评价异常(setep=2) ,message=" + error.message});
			});
		},
		function(error){
			response.error({"code":500, "result":"查询SpeedDate异常(setep=1), speedDateId=" + speedDateId + " ,message=" + error.message});
		});
	}
});

/**
 * 检查用户邀约有效性
 */
AV.Cloud.define('checkAndUpdateSpeedDataValid', function(request, response) {
	var query = new AV.Query(SpeedDate);
	var time = new Date().getTime() - 24 * 60 * 60 * 1000;
	var date = new Date();    
	date.setTime(time);
	query.equalTo('status', 1);
	query.lessThan('createdAt',date);
	query.equalTo('isValid', true);
	query.find().then(function(results){
		for (var i = 0; i < results.length; i++) {
	        var object = results[i];
	        object.set('isValid', false);
	        object.save();
	    }
		response.success({"code":200,"results":results.length + "个SpeedDate记录无效"});
	},
	function(error){
		response.error({"code":500, "result":"查询SpeedDate异常(setep=1) ,message=" + error.message});
	});
});

/**
 * 保存用户走走路线坐标
 * sample: {"speedDateId":"569a01c400b00ef385062359","latitude":11.4, "longitude":11.4}
*/

AV.Cloud.define('datingRoute', function(request, response) {
	var speedDateId = request.params.speedDateId;
	var latitude = request.params.latitude;
	var longitude = request.params.longitude;
	var point = new AV.GeoPoint({"latitude": latitude, "longitude": longitude});
	var speedDateQuery = new AV.Query(SpeedDate);
	speedDateQuery.get(speedDateId).then(function(speedDate){
		if(speedDate){
			//新增用户走走坐标
			var speedDateRoute = new SpeedDateRoute();
			speedDateRoute.set('speedDate',speedDate);
			speedDateRoute.set('coordinate',point);
			speedDateRoute.save().then(function(speedDateRoute){
				response.success({"code":200, "results":"success"});
			},
			function(error){
				response.error({"code":500, "result":"保存数据异常, message=" + error.message});
			});
		}else{
			response.error({"code":500, "result":"SpeedDate不存在(setep=1), speedDateId=" + speedDateId});
		}
	},
	function(error){
		response.error({"code":500, "result":"查询SpeedDate异常(setep=1), speedDateId=" + speedDateId + " ,message=" + error.message});
	});
});

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
  response.success('Hello world!');
});

module.exports = AV.Cloud;
