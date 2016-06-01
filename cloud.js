var AV = require('leanengine');
var UserDynamicData = AV.Object.extend('UserDynamicData');
var SpeedDate = AV.Object.extend('SpeedDate');
var User = AV.Object.extend('_User');
var Evaluation = AV.Object.extend('Evaluation');
var UserScore = AV.Object.extend('UserScore');
var SpeedDateRoute = AV.Object.extend('SpeedDateRoute');

/**
 * 查询用户动态数据
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
 */
AV.Cloud.define('queryNearlyUsers', function(request, response) {
	var userDynamicDataId = request.params.userDynamicDataId;
	if(!userDynamicDataId || userDynamicDataId === ''){
		response.error({"code":500, "result":"userDynamicDataId不为空"});
	}else{
		var userDynamicQuery  = new AV.Query(UserDynamicData);
		userDynamicQuery.get(userDynamicDataId,{
			success: function(userDynamicData){
				if(userDynamicData){
					var location = userDynamicData.get('location');
					var userListQuery = new AV.Query(UserDynamicData);
					userListQuery.near('location', location);
					userListQuery.notContainedIn('datingStatus',[2,3,4]);
					userListQuery.notContainedIn('objectId',[userDynamicData.id]);
					userListQuery.equalTo('onlineStatus',true);
					userListQuery.limit(10);
					userListQuery.include("userId");
					userListQuery.find({
						success : function(resultList){
						    var userArray = [];
						    var x=0;
						    for(var i=0;i<resultList.length;i++){
						        var distance = location.kilometersTo(resultList[i].get("location"));
						        if(resultList[i].get("userId")){
		    				        resultList[i]=resultList[i].get("userId");
		    				        resultList[i].add("distance",distance);
		    				        userArray[x]=resultList[i];
		    				        x=x+1;
						        }
						    }
						    var finalResult = {'code':200,'results':userArray};
							response.success(finalResult);
						},
						error : function(){
							response.error({"code":500, "result":"服务端异常，请稍后再试"});
						}
					});
				}else{
					response.error({"code":500, "result":"找不到对应的userdynamicdata，userId=" + userDynamicDataId});
				}
			},
			error: function(){
				response.error({"code":500, "result":"查询用户信息失败，userId=" + userId});
			}
		})
	}
});

/**
 * 喜欢接口
 */
AV.Cloud.define('likeSomeone', function(request, response) {
	var fromUserId = request.params.fromUserId;
	var toUserId = request.params.toUserId;
	if(!fromUserId || fromUserId === '' || !toUserId || toUserId === ''){
		response.error("参数不正确，fromUserId=" + fromUserId + ", toUserId=" + fromUserId);
	}else{
		var fromUserDynamic = null;
		var toUserDynamic = null;
		var fromUserDynamic = new UserDynamicData();
		fromUserDynamic.id = fromUserId;
		var userDynamicQuery  = new AV.Query(UserDynamicData);
		userDynamicQuery.equalTo('userId',fromUserDynamic);
		userDynamicQuery.find({
			success : function(results){
				if(results.length > 0){
					fromUserDynamic = results[0];
					var toUserDynamic = new UserDynamicData();
					toUserDynamic.id = toUserId;
				    userDynamicQuery.equalTo('userId',toUserDynamic);
					userDynamicQuery.find({
						success : function(results){
							if(results.length > 0){
								toUserDynamic = results[0];
	    						var speedDatingQuery = new AV.Query(SpeedDate);
	            				speedDatingQuery.equalTo('fromUser',toUserId);
	            				speedDatingQuery.equalTo('toUser',fromUserId);
	            				speedDatingQuery.equalTo('status',1);
	            				speedDatingQuery.equalTo('isValid',true);
	            				speedDatingQuery.find({
	            				  	success : function(results) {
	            				    	if(results.length > 0){
	            				    		//存在记录，则修改状态
	            				    		results[0].fetchWhenSave(true);
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
	            							speedDatingQuery.find({
	            								success : function(dateresult) {
	            									if(dateresult.length > 0){
	            									    //返回当前记录
	            										response.success({'code':200,'results':dateresult[0]});
	            									}else{
	            									    //不存在，则创建记录
	            							    		var speedDate = new SpeedDate();
	            							    		speedDate.save({
	            							    			'fromUser' : fromUserId,
	            						    				'toUser' : toUserId,
	            						    				'fromUserEvaStatus' : false,
	            						    				'toUserEvaStatus' : false,
	            							    			'status' : 1,
	            							    			'isValid' : true
	            							    		},{
	            								    	    success : function(speedDate){
	            								    			response.success({'code':200,'results':speedDate});
	            								    		},
	            								    		error : function(){
	            								    			response.error("服务端异常，请稍后再试, step=5");
	            								    		}
	            							    		});
	            									}
	            								},
	            								error : function(){
	            								    response.error("服务端异常，请稍后再试, step=4");
	            								}
	            							})
	            				    	}
	            				    },
	            				  	error: function(error) {
	            				    	response.error("服务端异常，请稍后再试, step=3");
	            				  	}
	            				});
							}else{
								response.error("用户动态数据不存在,toUserId=" + toUserId);
							}
						},
						error : function(){
							response.error("服务端异常，请稍后再试, step=2");
						}
					});
				}else{
					response.error("用户动态数据不存在,fromUserId=" + fromUserId);
				}
			},
			error : function(){
				response.error("服务端异常，请稍后再试, step=1");
			}
		});
	}
});

/**
 * 走起接口
 */
AV.Cloud.define('goTogther', function(request, response) {
	var speedDateId = request.params.speedDateId;
	if(!speedDateId || speedDateId === ''){
		response.error('param speedDateId is blank');
	}else{
		var speedDate = null;
		var speedDateQuery = new AV.Query(SpeedDate);
		speedDateQuery.get(speedDateId, {
			success : function(result){
				if(result){
					speedDate = result;
					speedDate.fetchWhenSave(true);
					speedDate.set('status', 3);
					speedDate.save();
					//同步更新用户状态
					var fromUser = null;
					var toUser = null;
					var userQuery = new AV.Query(User);
					userQuery.get(speedDate.get('fromUser'),{
					    success : function(result){
					    	if(result){
								fromUser = result;
						        //修改from用户状态
		        				var userDynamicQuery  = new AV.Query(UserDynamicData);
		        				userDynamicQuery.equalTo('userId', fromUser);
		        				userDynamicQuery.find({
		        					success : function(result){
		        						if(result.length >0){
		        							result[0].set('datingStatus', 3);
		        							result[0].save();
		        							//修改to用户状态
		        							userQuery.get(speedDate.get('toUser'),{
		        							    success : function(result){
		        							    	if(result){
		        							    		toUser = result;
			        							        userDynamicQuery.equalTo('userId', toUser);
			                	        				userDynamicQuery.find({
			                	        					success : function(result){
			                	        						if(result.length >0){
			                	        							result[0].set('datingStatus', 3);
			                	        							result[0].save();
			                	        							//返回当前快约记录
			                	        							response.success({'code':200,'results': speedDate});
			                	        						}else{
			                	        							response.error("用户对应的dynamicData不存在，toUser=" + speedDate.get('toUser'));
			                	        						}
			                	        					},
			                	        					error : function(){
			                	        						response.error("服务端异常，请稍后再试");
			                	        					}
			                	        				});
		        							    	}else{
		        							    		response.error("用户不存在，toUser=" + speedDate.get('toUser'));
		        							    	}
		        							    },
		        							    error : function(){
		        							        response.error("服务端异常，请稍后再试");
		        							    }
		        							});
		        						}else{
		        							response.error("用户对应的dynamicData不存在，fromUser=" + speedDate.get('fromUser'));
		        						}
		        					},
		        					error : function(){
		        						response.error("服务端异常，请稍后再试");
		        					}
		        				});
					    	}else{
					    		response.error("用户不存在，fromUser=" + speedDate.get('fromUser'));
					    	}
					    },
					    error : function(){
					        response.error("服务端异常，请稍后再试");
					    }
					});
				}else{
					response.error("找不到对应的邀约记录,speedDateId=" + speedDateId);
				}
			},
			error : function(){
				response.error("服务端异常，请稍后再试");
			}
		});
	}
});

/**
 * 结束走走接口
 */
AV.Cloud.define('endSpeedDate', function(request, response) {
	var speedDateId = request.params.speedDateId;
	if(!speedDateId || speedDateId === ''){
		response.error({"code":500, "result":"参数不正确, speedDateId=" + speedDateId});
	}else{
		var speedDate = null;
		var speedDateQuery = new AV.Query(SpeedDate);
		speedDateQuery.get(speedDateId, {
			success : function(result){
				if(result){
					speedDate = result;
					speedDate.fetchWhenSave(true);
					speedDate.set('status', 4);
					speedDate.save();
					//同步更新用户状态
					var fromUser = null;
					var toUser = null;
					var userQuery = new AV.Query(User);
					userQuery.get(speedDate.get('fromUser'),{
					    success : function(result){
					    	if(result){
								fromUser = result;
						        //修改from用户状态
		        				var userDynamicQuery  = new AV.Query(UserDynamicData);
		        				userDynamicQuery.equalTo('userId', fromUser);
		        				userDynamicQuery.find({
		        					success : function(result){
		        						if(result.length >0){
		        							result[0].set('datingStatus', 4);
		        							result[0].save();
		        							//修改to用户状态
		        							userQuery.get(speedDate.get('toUser'),{
		        							    success : function(result){
		        							    	if(result){
		        							    		toUser = result;
			        							        userDynamicQuery.equalTo('userId', toUser);
			                	        				userDynamicQuery.find({
			                	        					success : function(result){
			                	        						if(result.length >0){
			                	        							result[0].set('datingStatus', 4);
			                	        							result[0].save();
			                	        							//返回当前快约记录
			                	        							response.success({'code':200,'results': speedDate});
			                	        						}else{
			                	        							response.error({"code":500, "result":"用户对应的dynamicData不存在，toUser=" + speedDate.get('toUser')});
			                	        						}
			                	        					},
			                	        					error : function(){
			                	        						response.error({"code":500, "result":"服务端异常，请稍后再试"});
			                	        					}
			                	        				});
		        							    	}else{
		        							    		response.error({"code":500, "result":"用户不存在，toUser=" + speedDate.get('toUser')});
		        							    	}
		        							    },
		        							    error : function(){
		        							        response.error({"code":500, "result":"服务端异常，请稍后再试"});
		        							    }
		        							});
		        						}else{
		        							response.error({"code":500, "result":"用户对应的dynamicData不存在，fromUser=" + speedDate.get('fromUser')});
		        						}
		        					},
		        					error : function(){
		        						response.error({"code":500, "result":"服务端异常，请稍后再试"});
		        					}
		        				});
					    	}else{
					    		response.error({"code":500, "result":"用户不存在，fromUser=" + speedDate.get('fromUser')});
					    	}
					    },
					    error : function(){
					        response.error({"code":500, "result":"服务端异常，请稍后再试"});
					    }
					});
				}else{
					response.error({"code":500, "result":"找不到对应的邀约记录, speedDateId=" + speedDateId});
				}
			},
			error : function(){
				response.error({"code":500, "result":"服务端异常，请稍后再试"});
			}
		});
	}
});

/**
 * 相互评价
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
		var speedDate = null;
		var speedDateQuery = new AV.Query(SpeedDate);
		speedDateQuery.get(speedDateId, {
			success : function(result){
				if(result){
					speedDate = result;
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

					var user = null;
					var evaluatedUser = null;
					var userQuery = new AV.Query(User);
					userQuery.get(userId,{
						success : function(result){
							if(result){
								user = result;
								userQuery.get(evaluatedUserId, {
									success : function(result){
										if(result){
											evaluatedUser = result;
											//新增评价和修改用户状态
											var evaluation = new Evaluation();
											evaluation.save({
								    			'evaluateUser' : user,
							    				'evaluatedUser' : evaluatedUser,
							    				'speedDate' : speedDate,
								    			'honesty' : honesty,
								    			'temperament' : temperament,
								    			'talkative' : talkative,
								    			'seductive' : seductive
								    		},{
									    	    success : function(evaluation){
									    	    	//更新speeddate状态
													speedDate.save();
													//更新用户评价分数
													var userScoreQuery = new AV.Query(UserScore);
													userScoreQuery.equalTo('user', evaluatedUser.id);
													userScoreQuery.find({
														success : function(results){
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
																userScore.fetchWhenSave(true);
																userScore.save();																
																//更新状态
												    	    	var userDynamicQuery  = new AV.Query(UserDynamicData);
										        				userDynamicQuery.equalTo('userId', user);
										        				userDynamicQuery.find({
										        					success : function(results){
										        						if(results.length > 0){
										        							results[0].set('datingStatus', 1);
					        												results[0].save();
					        												response.success({'code':200,'results':"success"});
										        						}else{
										        							response.error({"code":500, "result":"服务端异常，请稍后再试(step=4),userid=" + user.id});
										        						}
										        					},
										        					error :function(){
										        						response.error({"code":500, "result":"服务端异常，请稍后再试(step=4),userid=" + user.id});
										        					}
										        				});
															}else{
																userScore = new UserScore();
																userScore.save({
															    	'user' : evaluatedUser.id,
															    	'honesty' : honesty,
															    	'talkative' : talkative,
															    	'temperament' : temperament,
															    	'seductive' : seductive,
															    	'count' : 1,
															    	'totalHonesty' : honesty,
															    	'totalTalkative' : talkative,
															    	'totalTemperament' : temperament,
															    	'totalSeductive' : seductive,
															    	'score' : honesty * 0.35 + talkative * 0.30 + temperament * 0.20 + seductive * 0.15
															    },{
															        success : function(userScore){
															            //更新状态
														    	    	var userDynamicQuery  = new AV.Query(UserDynamicData);
												        				userDynamicQuery.equalTo('userId', user);
												        				userDynamicQuery.find({
												        					success : function(results){
												        						if(results.length > 0){
												        							results[0].set('datingStatus', 1);
							        												results[0].save();
							        												response.success({'code':200,'results':"success"});
												        						}else{
												        							response.error({"code":500, "result":"服务端异常，请稍后再试(step=4),userid=" + user.id});
												        						}
												        					},
												        					error :function(){
												        						response.error({"code":500, "result":"服务端异常，请稍后再试(step=4),userid=" + user.id});
												        					}
												        				});
															        },
															        error : function(){
															            response.error(userScore);
															        }
															    });
															}
														}
													});
									    		},
									    		error : function(){
									    			response.error({"code":500, "result":"新增评价失败"});
									    		}
								    		});
										}else{
											response.error({"code":500, "result":"找不到被评价用户，userId=" + evaluatedUserId});
										}
									}
								});
							}else{
								response.error({"code":500, "result":"找不到用户，userId=" + userId});
							}
						},
						error : function(){
							response.error({"code":500, "result":"服务端异常，请稍后再试，step=2"});
						}
					});
				}else{
					response.error({"code":500, "result":"找不到对应的SpeedDate记录，speedDateId=" + speedDateId});
				}
			},
			error : function(){
				response.error({"code":500, "result":"服务端异常，请稍后再试，step=1"});
			}
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
	query.find({
		success: function(results) {
		    for (var i = 0; i < results.length; i++) {
		        var object = results[i];
		        object.set('isValid', false);
		        object.save();
		    }
			response.success(results.length + "个SpeedDate记录无效");
		},
		error: function(error) {
		    response.error({"code":500, "result":"服务端异常，请稍后再试"});
		}
	});
});

AV.Cloud.define('datingRoute', function(request, response) {
	var speedDateId = request.params.speedDateId;
	var latitude = request.params.latitude;
	var longitude = request.params.longitude;
	var point = new AV.GeoPoint({"latitude": latitude, "longitude": longitude});
	var speedDate = null;
	var speedDateQuery = new AV.Query(SpeedDate);
	speedDateQuery.get(speedDateId, {
		success : function(result){
			if(result){
				speedDate = result;
				//新增评价和修改用户状态
				var speedDateRoute = new SpeedDateRoute();
				speedDateRoute.save({
	    			'speedDate' : speedDate,
					'coordinate' : point
	    		},{
	    			success : function(speedDateRoute){
	    				response.success({'code':200,'results':"success"});
	    			},
	    			error : function(){
	    			    response.error({"code":500, "result":"服务端异常，请稍后再试，step=2"});
	    			}
	    		});
			}else{
				response.error({"code":500, "result":"快约记录不存在,id=" + speedDateId});
			}
		},
		error : function(){
		    response.error({"code":500, "result":"服务端异常，请稍后再试，step=1"});
		}
	});
});

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
  response.success('Hello world!');
});

module.exports = AV.Cloud;
