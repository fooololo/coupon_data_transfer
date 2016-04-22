/**
 * Created by Administrator on 2016/4/22.
 */
var path = require("path");
var env = process.env.NODE_ENV || 'development';
env = env.toLowerCase();

//载入配置文件
var configFile = path.resolve(__dirname, env);
try {
    var config = module.exports = require(configFile);
    console.log('Load config: [%s] %s', env, configFile);
} catch (err) {
    console.error('Cannot load config: [%s] %s', env, configFile);
    throw err;
}