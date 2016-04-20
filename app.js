var mongoose    =   require("mongoose");
var mysql       =   require("mysql");
var pool        =   mysql.createPool({
    host:               "172.28.1.6",
    user:               "root",
    password:           "mamahao",
    database:           "db_gd_dev",
    connectionLimit:    10
});
var mongodbHost = "mongodb://172.28.1.3:27017/mydb";
mongoose.connect(mongodbHost);
// mongoose.connect.on("connected",function () {
//     console.log("Mongoose connected to " + mongodbHost);
// });
// mongoose.connect.on("error",function (err) {
//     console.log("Mongoose connection error: " + err);
// });
// mongoose.connect.on("disconnected",function () {
//     console.log("Mongoose disconnected from " + mongodbHost);
// });

process.on("SIGING",function () {
    mongoose.connection.close(function () {
        console.log("Mongoose disconnected through app termination");
        process.exit(0);
    });
});
exports.mongoose = mongoose;
var CouponTemplateSchema = new mongoose.Schema({
    version         :   {type:Number,default:0},
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
    }]
},{
    collection : "voucherTemplate"
});

var CouponTemplateModel = mongoose.model("CouponTemplate",CouponTemplateSchema);


CouponTemplateModel.prototype.findByVersion = function (version,callback) {
    CouponTemplateModel.find({version : version},function (err, list) {
        if(err){
            return callback(err);
        }
        callback(null,list);
    });
};

var ct = new CouponTemplateModel({});
ct.findByVersion(1,function (error,result) {
    if(error){
        console.log(error);
    }else{
        for (var i = 0;i < result.length;i++){
            console.log('===================' + i + '===================');
            var item = result[i];

        }
        process.exit(0);
    }
});

