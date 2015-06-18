var bcrypt = require("bcrypt");
var SALT_WORK_FACTOR = 10;
var mongoose = require("mongoose");
var Post = require("./post");

var userSchema = new mongoose.Schema({
						email: {
							type: String,
							lowercase: true,
							required: true
						},
						password: {
							type: String,
							required: true
						},
						photo: String,
						posts: [{
							type: mongoose.Schema.Types.ObjectId,
							ref: "Post"
						}]
					});

userSchema.pre('save', function(next) { // <---- HOOK
  var user = this; // this refers to the user-instance that is created from the model
  if (!user.isModified('password')) {
    return next();
  }
  return bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if (err) {
      return next(err);
    }
    return bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) {
        return next(err);
      }
      user.password = hash;
      return next();
    });
  });
});

// don't want to call this first param "user"! We have another user defined!
userSchema.statics.authenticate = function (formData, callback) {
  this.findOne({
      email: formData.email
    },
    function (err, user) {
      if (user === null){
        callback("Invalid username or password",null);
      }
      else {
        user.checkPassword(formData.password, callback);
      }

    });
};

userSchema.methods.checkPassword = function(password, callback) {
  var user = this;
  bcrypt.compare(password, this.password, function (err, isMatch) {
    if (isMatch) {
      callback(null, user);
    } else {
      callback(err, null);
    }
  });
};

userSchema.pre('remove', function(callback){
	Post.remove({user_id: this._id}).exec();
	callback();
})

var User = mongoose.model("User", userSchema);

module.exports = User;
