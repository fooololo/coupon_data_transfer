var mongoose    =   require("mongoose");
var mysql       =   require("mysql");
var crcHash     =   require("crc-hash");
var async       =   require("async");
var fs          =   require("fs");
var Logger      =   require("log");
var config = require('./config');

var logger = new Logger("info",fs.createWriteStream(config.log.dir));

//创建连接池
var pool        =   mysql.createPool({
    host:               config.mysql.host,
    port:               config.mysql.port,
    user:               config.mysql.user,
    password:           config.mysql.password,
    database:           config.mysql.database,
    connectionLimit:    config.mysql.connectionLimit
});
var mongodbHost = config.mongo.host;
mongoose.connect(mongodbHost);
mongoose.connection.on("connected",function () {
    logger.info("Mongoose connected to %s",mongodbHost);
});
mongoose.connection.on("error",function (err) {
    logger.info("Mongoose connection %s: ",err);
});
mongoose.connection.on("disconnected",function () {
    logger.info("Mongoose disconnected from %s: ",mongodbHost);
});

process.on("SIGING",function () {
    mongoose.connection.close(function () {
        logger.info("Mongoose disconnected through app termination");
        process.exit(0);
    });
});
var CouponTemplateSchema = new mongoose.Schema({
    version         :   {type:Number,default:null},
    userType        :   {type:Number,default:0},
    type            :   {type:Number,default:0},
    scopeChannel    :   {type:Number,default:0},
    name            :   {type:String,default:''},
    publishTimeType :   {type:Number,default:0},
    publishStartTime:   {type:Number,default:0},
    publishEndTime  :   {type:Number,default:0},
    useWithGroupPro :   {type:Boolean,default:false},
    circulation     :   {type:Number,default:1},
    perLimit        :   {type:Number,default:1},
    costChargedType :   {type:Number,default:0},
    scopeShopList   :   [{type:Number,default:0}],
    applyType       :   [{type:Number,default:null}],
    applyValue       :   [{type:String,default:null}],
    groupUnits      :   [{
        denominationAmount      :   {type:Number,default:0},
        consumptionAmount       :   {type:Number,default:0},
        scope                   :   {type:Number,default:0},
        scopeDesc               :   {type:String,default:''},
        effectiveType           :   {type:Number,default:0},
        effectiveStartTime      :   {type:Number,default:0},
        effectiveEndTime        :   {type:Number,default:0},
        effectiveDelayDays      :   {type:Number,default:0},
        scopeList               :   [{type:Number,default:0}]
    }],
    voucherExt      :   [{
        amount                  :   {type:Number,default:0},
        money                   :   {type:Number,default:0}
    }]
},{
    collection : "voucherTemplate"
});

//创建CRC32实例
var crc32 = crcHash.createHash("crc32");

//创建优惠券原型
var CouponTemplateModel = mongoose.model("CouponTemplate",CouponTemplateSchema);

//绑定方法
CouponTemplateModel.prototype.findByParam = function (param,callback) {
    CouponTemplateModel.find(param,function (err, list) {
        if(err){
            return callback(err);
        }
        callback(null,list);
    });
}


//创建实例对象
var ct = new CouponTemplateModel({});
function queryVersion_0(callback) {
    logger.info("**************************开始执行version_0*************************");
    var param = {version : null};
    async.waterfall([
        //粗略查询出原始的列表
        function (callback) {
            ct.findByParam(param,function (err, list) {
                callback(err,list);
            })
        },
        //过滤掉不符合条件的列表
        function (list, callback) {
            var validList = new Array();
            logger.info("==========================version_0_符合条件的优惠券模板_start=========================");
            list.forEach(function (item) {
                var applyType = item.applyType;
                if(applyType && applyType > 0){
                    validList.push(item);
                    logger.info(item);
                }
            });
            logger.info("==========================version_0_符合条件的优惠券模板_end=========================");
            callback(null,validList);
        },
        //生成sql语句
        function (list, callback) {
            var sqls = new Array();
            list.forEach(function (item) {
                var tid = item._id.toString();
                var tidCrc32 = crc32.update(tid).value;
                var applyType = item.applyType;
                var applyValue = item.applyValue;
                var scopeList = applyValue.toString().split(",");
                var units = item.voucherExt;
                for (var i = 0;i < units.length;i++){
                    scopeList.forEach(function (sid) {
                        var sql = null;
                        var args = null;
                        //指定品牌
                        if(1 == applyType){
                            sql = "insert into t_coupon_unit_scope(template_id,template_id_crc32,index_of_group,brand_id,category_level) values(?,?,?,?,?)";
                            args = [tid,tidCrc32,i,sid,0];
                        }
                        //指定类目
                        else if(2 == applyType){
                            sql = "insert into t_coupon_unit_scope(template_id,template_id_crc32,index_of_group,category_id,category_level) values(?,?,?,?,?)";
                            args = [tid,tidCrc32,i,sid,1];
                        }
                        //指定商品
                        else if(3 == applyType){
                            sql = "insert into t_coupon_unit_scope(template_id,template_id_crc32,index_of_group,style_num_id,category_level) values(?,?,?,?,?)";
                            args = [tid,tidCrc32,i,sid,0];
                        }
                        if(sql != null && args != null){
                            var sqlModel = {
                                sql : sql,
                                args : args
                            };
                            sqls.push(sqlModel);
                        }
                    });
                }
            });
            callback(null,sqls);
        },
        //异步执行SQL
        function (list, callback) {
            logger.info("==========================version_0_待执行的SQL_start=========================");
            logger.info(list);
            logger.info("==========================version_0_待执行的SQL_end=========================");
            async.eachSeries(list,function (item, callback) {
                var sql = item.sql;
                var args = item.args;
                // console.log("sql->" + sql);
                // console.log("args->" + args);
                pool.getConnection(function (err, connection) {
                    if(err){
                        return callback(err);
                    }
                    connection.query(sql,args,function (err, results) {
                        if(err){
                            return callback(err);
                        }
                        pool.releaseConnection(connection);
                        callback(null,results);
                    });
                });
            },function (err) {
                callback(err);
            });
        }
    ],function (err,result) {
        console.log("=====================处理version_0_结果_start======================");
        console.log("error->" + err);
        console.log("result->" + result);
        console.log("=====================处理version_0_结果_end========================");
        if(err){
            callback(err,false);
        }else {
            callback(null,true);
        }
    });
}

function queryVersion_1(callback) {
    logger.info("**************************开始执行version_1*************************");
    var param = {version : 1};
    async.waterfall([
        //粗略查询出原始的列表
        function (callback) {
            ct.findByParam(param,function (err, list) {
                callback(err,list);
            })
        },
        //生成需要入库的列表数据
        function (list, callback) {
            var validList = new Array();
            logger.info("==========================version_1_满足条件的优惠券模板_start=========================");
            list.forEach(function (item) {
                var tid = item._id.toString();
                var tidCrc32 = crc32.update(tid).value;
                var units = item.groupUnits;
                for (var i= 0;i < units.length;i++){
                    var unit = units[i];
                    var scope = unit.scope;
                    if(scope > 0){
                        var scopeList = unit.scopeList;
                        var unitModel = {
                            tid             :   tid,
                            tidCrc32        :   tidCrc32,
                            indexOfGroup    :   i,
                            scope           :   scope,
                            scopeList       :   scopeList
                        };
                        validList.push(unitModel);
                        logger.info(item);
                    }
                }
            });
            logger.info("==========================version_1_满足条件的优惠券模板_end=========================");
            callback(null,validList);
        },
        //生成sql语句
        function (list, callback) {
            // console.log(list);
            logger.info("==========================version_1_待执行的SQL_start=========================");
            logger.info(list);
            logger.info("==========================version_1_待执行的SQL_end=========================");
            var sqls = new Array();
            list.forEach(function (item) {
                var tid = item.tid;
                var tidCrc32 = item.tidCrc32;
                var indexOfGroup = item.indexOfGroup;
                var scope = item.scope;
                var scopeList = item.scopeList;
                scopeList.forEach(function (scopeId) {
                    var sql = null;
                    var args = null;
                    //指定品牌
                    if(1 == scope){
                        sql = "insert into t_coupon_unit_scope(template_id,template_id_crc32,index_of_group,brand_id,category_level) values(?,?,?,?,?)";
                        args = [tid,tidCrc32,indexOfGroup,scopeId,0];
                    }
                    //指定类目
                    else if(2 == scope){
                        sql = "insert into t_coupon_unit_scope(template_id,template_id_crc32,index_of_group,category_id,category_level) values(?,?,?,?,?)";
                        args = [tid,tidCrc32,indexOfGroup,scopeId,1];
                    }
                    //指定商品
                    else if(3 == scope){
                        sql = "insert into t_coupon_unit_scope(template_id,template_id_crc32,index_of_group,style_num_id,category_level) values(?,?,?,?,?)";
                        args = [tid,tidCrc32,indexOfGroup,scopeId,0];
                    }
                    if(sql != null && args != null){
                        var sqlModel = {
                            sql : sql,
                            args : args
                        };
                        sqls.push(sqlModel);
                    }
                });
            });
            callback(null,sqls);
        },
        //异步插入数据库
        function (list, callback) {
            async.eachSeries(list,function (item, callback) {
                var sql = item.sql;
                var args = item.args;
                // console.log("sql->" + sql);
                // console.log("args->" + args);
                pool.getConnection(function (err, connection) {
                    if(err){
                        return callback(err);
                    }
                    connection.query(sql,args,function (err, results) {
                        if(err){
                            return callback(err);
                        }
                        pool.releaseConnection(connection);
                        callback(null,results);
                    });
                });
            },function (err) {
                callback(err);
            });
        }
    ],function (err, result) {
        console.log("=====================处理version_1_结果_start======================");
        console.log("error->" + err);
        console.log("result->" + result);
        console.log("=====================处理version_1_结果_end========================");
        if(err){
            callback(err,false);
        }else {
            callback(null,true);
        }
    });
}

function run() {
    async.series([
        queryVersion_0,
        queryVersion_1
    ],function (err,value) {
        console.log("=====================最终处理结果_start======================");
        console.log("error->" + err);
        console.log("result->" + value);
        console.log("=====================最终处理结果_end========================");
        console.log("***************等待3秒结束进程********************")
        sleep(3000);
        process.exit(0);
    });
}

function sleep(milliSeconds) {
    var startTime = new Date().getTime();
    while (new Date().getTime() < startTime + milliSeconds);
};

//开始执行
run();

