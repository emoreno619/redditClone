var mongoose = require("mongoose");

var commentSchema = new mongoose.Schema({
						body: String,
						creator: String,
						
						post: {
							type: mongoose.Schema.Types.ObjectId,
							ref: "Post"
						}
					});

var Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;