var mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/redditClone");

module.exports.Post = require("./post");
module.exports.Comment = require("./comment");
module.exports.User = require("./user");
