var AV = require('leanengine');
var UserDynamicData = AV.Object.extend('UserDynamicData');
var SpeedDate = AV.Object.extend('SpeedDate');
var User = AV.Object.extend('_User');
var Evaluation = AV.Object.extend('Evaluation');
var UserScore = AV.Object.extend('UserScore');
var SpeedDateRoute = AV.Object.extend('SpeedDateRoute');

/**
 * 查询用户动态数据
 * param: {"userDynamicDataId":"567e966e00b0adf744f09b09"}
 */
AV.Cloud.define('queryUserDynamicData', function(request, response) {
	var userDynamicDataId = request.params.userDynamicDataId;
	if(!userDynamicDataId || userDynamicDataId === ''){
		response.error({"code":500, "result":"userDynamicDataId不为空"});
	}else{
		var userDynamicQuery  = new AV.Query(UserDynamicData);
		userDynamicQuery.get(userDynamicDataId).then(function(userDynamicData) {
			if(userDynamicData){
				response.success({'code':200,'result': userDynamicData});
			}
		}, function(error) {
		  	response.error({"code":500, "result":"false", "msg":error.message});
		});
	}
});

/**
 * 定时检测用户在线状态方法
 */
AV.Cloud.define('checkAndUpdateUserOnlineStatus', function(request, response) {
	var query = new AV.Query(UserDynamicData);

	var time = new Date().getTime() - 20 * 2 * 1000;
	var date = new Date();    
	date.setTime(time);
	query.lessThan('updatedAt',date);

	query.find({
		success: function(results) {
		    for (var i = 0; i < results.length; i++) {
		        var object = results[i];
		        object.set('onlineStatus', false);
		        object.save();
		    }
			response.success(results.length + "个用户在线状态更新");
		},
		error: function(error) {
		    response.error("Error " + error.code + " : " + error.message + " when query guys getRelationCountByStatus.");
		}
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
					response.error({"code":500, "result":"服务端异常，请稍后再试"});
				});
			}else{
				response.error({"code":500, "result":"找不到对应的userdynamicdata，userId=" + userDynamicDataId});
			}
		},
		function(error){
			response.error({"code":500, "result":"查询用户信息失败，userId=" + userId});
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
				user.id = toUserId;
			    userDynamicQuery.equalTo('userId',user);
			    userDynamicQuery.find().then(function(results){
					if(results.length > 0){
						var toUserDynamic = results[0];
						var speedDatingQuery = new AV.Query(SpeedDate);
	    				speedDatingQuery.equalTo('fromUser',toUserId);
	    				speedDatingQuery.equalTo('toUser',fromUserId);
	    				speedDatingQuery.equalTo('status',1);
	    				speedDatingQuery.equalTo('isValid',true);
	    				speedDatingQuery.find().then(function(results){
							if(results.length > 0){
    				    		//存在记录，则修改状态
    				    		//results[0].fetchWhenSave(true);
    				    		results[0].set('status', 2);
    				    		results[0].save();

    				    		fromUserDynamic.set('datingStatus',2);
    				    		fromUserDynamic.save();
    				    		toUserDynamic.set("datingStatus", 2);
    				    		toUserDynamic.save();
    				    		response.success({'code':200,'results':results[0]});
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
										response.success({'code':200,'results':results[0]});
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
							    			response.success({'code':200,'results':speedDate});
							    		},
							    		function(error){
											response.error("服务端异常(setep=5) ,message=" + error.message);
							    		});
									}
    							},
    							function(error){
									response.error("服务端异常(setep=4) ,message=" + error.message);
    							});
    				    	}
	    				},
	    				function(error){
							response.error("服务端异常(setep=3) ,message=" + error.message);
	    				})
					}else{
						response.error("用户动态数据不存在(setep=2), toUserId=" + toUserId);
					}
			    },
			    function(error){
			    	response.error("服务端异常(setep=2)，toUserId=" + toUserId + " ,message=" + error.message);
			    })
			}else{
				response.error("用户动态数据不存在(setep=1), fromUserId=" + fromUserId);
			}
		},
		function(error){
			response.error("服务端异常(setep=1)，fromUserId=" + fromUserId + " ,message=" + error.message);
		});
	}
});

/**
 * 走起接口
 * param example: {"speedDateId":"569a01c400b00ef385062359"}
 */
AV.Cloud.define('goTogther', function(request, response) {
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
						results[0].save();
						//修改to用户状态
						user.id=speedDate.get('toUser');
						userDynamicQuery.equalTo('userId', user);
				        userDynamicQuery.find().then(function(results){
				        	if(results.length >0){
    							results[0].set('datingStatus', 3);
    							results[0].save();
    							//返回当前快约记录
    							response.success({'code':200,'results': speedDate});
    						}else{
    							response.error("用户dynamicData不存在，toUser=" + speedDate.get('toUser'));
    						}
				        },
				        function(error){
				        	response.error("服务端异常(setep=3), toUser=" + speedDate.get('toUser') + " ,message=" + error.message);
				        });
					}else{
						response.error("用户dynamicData不存在, fromUser=" + speedDate.get('fromUser'));
					}
				},
				function(error){
					response.error("服务端异常(setep=2), fromUser=" + speedDate.get('fromUser') + " ,message=" + error.message);
				});
			}else{
				response.error("邀约记录不存在, speedDateId=" + speedDateId);
			}
		},
		function(error){
			response.error("服务端异常(setep=1), speedDateId=" + speedDateId + " ,message=" + error.message);
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
						results[0].save();
						//修改to用户状态
						user.id=speedDate.get('toUser');
						userDynamicQuery.equalTo('userId', user);
				        userDynamicQuery.find().then(function(results){
				        	if(results.length >0){
    							results[0].set('datingStatus', 4);
    							results[0].save();
    							//返回当前快约记录
    							response.success({'code':200,'results': speedDate});
    						}else{
    							response.error("用户dynamicData不存在，toUser=" + speedDate.get('toUser'));
    						}
				        },
				        function(error){
				        	response.error("服务端异常(setep=3), toUser=" + speedDate.get('toUser') + " ,message=" + error.message);
				        });
					}else{
						response.error("用户dynamicData不存在, fromUser=" + speedDate.get('fromUser'));
					}
				},
				function(error){
					response.error("服务端异常(setep=2), fromUser=" + speedDate.get('fromUser') + " ,message=" + error.message);
				});
			}else{
				response.error("邀约记录不存在, speedDateId=" + speedDateId);
			}
		},
		function(error){
			response.error("服务端异常(setep=1), speedDateId=" + speedDateId + " ,message=" + error.message);
		});
	}
});

/**
 * 相互评价
 * param sample: {"userId":"567e95ec60b2e1871e04a8ae","honesty":4,"talkative":4,"temperament":4,"seductive":4,"speedDateId":"569a01c400b00ef385062359"}
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
											response.success({'code':200,'results':"success"});
										},
										function(error){
											response.error({"code":"500", "result":"更新用户状态异常(setep=7), userDynamicDataId=" + userDynamicData.id + " ,message=" + error.message});
										});
		    						}else{
		    							response.error({"code":"500", "result":"UserDynamicData不存在(setep=6), userId=" + user.id});
		    						}
		        				},
		        				function(error){
		        					response.error({"code":"500", "result":"查询用户DynamicData异常(setep=6), userId=" + user.id + " ,message=" + error.message});
		        				});
							},
							function(error){
								response.error({"code":"500", "result":"保存用户评分异常(setep=5), userScoreId=" + userScore.id + " ,message=" + error.message});
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
											response.success({'code':200,'results':"success"});
										},
										function(error){
											response.error({"code":"500", "result":"更新用户状态异常(setep=11), userDynamicDataId=" + userDynamicData.id + " ,message=" + error.message});
										});
	        						}else{
	        							response.error({"code":"500", "result":"UserDynamicData不存在(setep=10), userId=" + user.id});
	        						}
		        				},
		        				function(error){
		        					response.error({"code":"500", "result":"查询用户DynamicData异常(setep=9), userId=" + user.id + " ,message=" + error.message});
		        				});
							},
							function(error){
								response.error({"code":"500", "result":"保存用户评分异常(setep=8), userScoreId=" + userScore.id + " ,message=" + error.message});
							});
						}
					},
					function(error){
						response.error({"code":"500", "result":"查询用户评分异常(setep=4), evaluatedUserId=" + evaluatedUserId + " ,message=" + error.message});
					});
				},
				function(error){
					response.error({"code":"500", "result":"保存speedDate状态异常(setep=3), speedDateId=" + speedDateId + " ,message=" + error.message});
				});
			},
			function(error){
				response.error({"code":"500", "result":"新增评价异常(setep=2) ,message=" + error.message});
			});
		},
		function(error){
			response.error({"code":"500", "result":"查询SpeedDate异常(setep=1), speedDateId=" + speedDateId + " ,message=" + error.message});
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
		response.success(results.length + "个SpeedDate记录无效");
	},
	function(error){
		response.error({"code":"500", "result":"查询SpeedDate异常(setep=1) ,message=" + error.message});
	});
});

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
				response.success({'code':200,'results':"success"});
			},
			function(error){
				response.error({"code":"500", "result":"保存数据异常, message=" + error.message});
			});
		}else{
			response.error({"code":"500", "result":"SpeedDate不存在(setep=1), speedDateId=" + speedDateId});
		}
	},
	function(error){
		response.error({"code":"500", "result":"查询SpeedDate异常(setep=1), speedDateId=" + speedDateId + " ,message=" + error.message});
	});
});

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
  response.success('Hello world!');
});

module.exports = AV.Cloud;
