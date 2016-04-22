/**
 * Created by Administrator on 2016/4/22.
 * 生产环境配置
 */
module.exports = {
    log:{
        dir:"./info.log"
    },
    mysql:{
        host:               "172.28.1.11",
        port:               3306,
        user:               "root",
        password:           "mamahao",
        database:           "db_gd_dev",
        connectionLimit:    10
    },
    mongo:{
        host:               "mongodb://172.28.1.3:27017/mydb1"
    }
};