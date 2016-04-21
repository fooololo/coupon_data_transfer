var mongoose    =   require("mongoose");
var mysql       =   require("mysql");
var crcHash     =   require("crc-hash");
var async       =   require("async");

//创建连接池
var pool        =   mysql.createPool({
    host:               "172.28.1.6",
    user:               "root",
    password:           "mamahao",
    database:           "db_gd_dev"
    // connectionLimit:    10
});
var mongodbHost = "mongodb://172.28.1.3:27017/mydb";
mongoose.connect(mongodbHost);
mongoose.connection.on("connected",function () {
    console.log("Mongoose connected to " + mongodbHost);
});
mongoose.connection.on("error",function (err) {
    console.log("Mongoose connection error: " + err);
});
mongoose.connection.on("disconnected",function () {
    console.log("Mongoose disconnected from " + mongodbHost);
});

process.on("SIGING",function () {
    mongoose.connection.close(function () {
        console.log("Mongoose disconnected through app termination");
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
function queryVersion_0() {
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
            // console.log(list);
            var validList = new Array();
            list.forEach(function (item) {
                var applyType = item.applyType;
                if(applyType && applyType > 0){
                    validList.push(item);
                }
            });
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
        }
    ],function (err,result) {
        console.log("=====================result======================");
        console.log("error->" + err);
        console.log("result->" + result);
        var c = 0;
        async.forEach(result,function (item,callback) {
            console.log("c->" + c);
            var sql = item.sql;
            var args = item.args;
            console.log("sql->" + sql);
            console.log("args->" + args);
            pool.getConnection(function (err, connection) {
                if(err){
                    console.log(err);
                    throw err;
                }
                connection.query(sql,args,function (err, results) {
                    if(err){
                        console.log(err);
                        throw err;
                    }
                    pool.releaseConnection(connection);
                });
            });
            c++;
        },function (err) {
            console.log(err);
        });
        process.exit(0);
    });
}
queryVersion_0();
