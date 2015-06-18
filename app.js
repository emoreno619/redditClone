//TODO

// 1) edit of post title works...but not edit of post body
// 2) display post body on show page
// 3) post delete doesn't work...
// 4) only owner of post can edit comments...but owner of comments should be able to edit even if they don't own post
// 5) nav for comment edit very specific...fix...


var express = require("express"),
app = express(),
bodyParser = require("body-parser"),
methodOverride = require("method-override"),
morgan = require("morgan"),
db = require('./models'),
session = require("cookie-session"),
loginMiddleware = require("./middleware/loginHelper"),
routeMiddleware = require("./middleware/routeHelper");

app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(morgan('tiny'));

app.use(session({
  maxAge : 3600000,
  secret: 'illnevertell',
  name: 'chocolate chip'
}));

app.use(loginMiddleware);

//Login Routes

app.get('/signup', routeMiddleware.preventLoginSignup, function(req, res){
  res.render('users/signup');
})

app.post("/signup", routeMiddleware.preventLoginSignup, function(req,res){
  var newUser = req.body.user;
  db.User.create(newUser, function(err, user){
      if(user){
        req.login(user);
        res.redirect("/users/" + user._id)
      } else {
        console.log(err);
        res.render("users/signup")
      }
    }
  )
})

app.get("/login", routeMiddleware.preventLoginSignup, function(req,res){
  res.render("users/login");
})

app.post("/login", function(req,res){
  db.User.authenticate(req.body.user, function (err, user){
    if(!err && user !== null){
      req.login(user)
      res.redirect("/users/" + user._id)
    } else {
      res.render("users/login")
    }
  })
})

app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/");
})

//Post Routes

// Root

app.get('/', function(req,res){
	res.redirect('/posts');
});

// Index
app.get('/posts', function(req,res){
	db.Post.find({}, function(err, posts){
		res.render("posts/index", {posts:posts});
	});
});

// New
// TODO: auth!
app.get('/posts/new', routeMiddleware.ensureLoggedIn, function(req, res){
	res.render('posts/new');
});

// Create

// TODO: need to include creator in object parameter to create

app.post('/posts', function(req,res){
	db.Post.create({title: req.body.title, body: req.body.body}, function(err, post){
		if(err){
			console.log(err);
			res.render('posts/new')
		}
		else {
			console.log(post);
			console.log(req.session._id);
			
			post.creator = req.session.id;
			post.save(function(err){
				if (err) throw err;
				res.redirect('/posts');
			});
		}
	});
});

// Show

app.get('/posts/:id', function(req,res){
	db.Post.findById(req.params.id, function(err, post){
		db.Comment.find(
		{
			_id: {$in: post.comments}
		},
		function(err,comments){
			res.render('posts/show', {post:post, comments:comments})
		});
	});
});

// Edit
// TODO: auth!	
app.get('/posts/:post_id/edit', routeMiddleware.ensureCorrectPoster, function(req,res){
	db.Post.findById(req.params.post_id, function(err, post){
		res.render('posts/edit', {post:post});
	});
});

// Update
// TODO: need to include creator in object parameter to findbyidandupdate
// maybe not? since the user id will not have changed
app.put('/posts/:id', function(req,res){
	db.Post.findByIdAndUpdate(req.params.id, {title: req.body.title, body: req.body.body}, function(err, post){
		if(err){
			res.render("posts/edit")
		} else {
			res.redirect('/posts')
		}
	})
})

// Destroy
// TODO: auth! or at least for whichever view will display this form
app.delete('posts/:id', function(req,res){
	db.Post.findById(req.params.id, function(err,post){
		if(err){
			console.log(err);
			res.render("posts/show")
		} else {
			post.remove();
			res.redirect("/posts")
		}
	})
})

// Comments routes

// Index
app.get('/posts/:post_id/comments', function(req,res){
	db.Post.findById(req.params.post_id).populate('comments').exec(function(err,post){
		res.render("comments/index", {post:post});
	});
});

// New

//TODO: auth!!
app.get('/posts/:post_id/comments/new', routeMiddleware.ensureLoggedIn, function(req,res){
	db.Post.findById(req.params.post_id, function(err,post){
		res.render('comments/new', {post:post});
	});
});

// Create

//TODO: auth!!
app.post('/posts/:post_id/comments', routeMiddleware.ensureLoggedIn, function(req,res){
	db.Comment.create({body:req.body.body}, function (err, comment){
		console.log(comment)
		if(err){
			console.log(err)
			res.render("comments/new");
		} else {
			db.Post.findById(req.params.post_id,function(err,post){
				post.comments.push(comment);
				comment.post = post.id;
				// ^^^^ need a similar line for user._id to be assigned to comment.creator
				comment.save(function(err){
					post.save(function(err){
						res.redirect("/posts/"+ req.params.post_id)
					});
				});
			});
		}
	});
});

// SHOW
app.get('/posts/:post_id/comments/:id', function(req,res){
  db.Comment.findById(req.params.id)
    .populate('post')
    .exec(function(err,comment){
      console.log(comment.post)
      res.render("comments/show", {comment:comment});
    });
});

// Edit
//TODO: auth!!
app.get("/posts/:post_id/comments/:id/edit", routeMiddleware.ensureCorrectPoster, function(req,res){
	db.Comment.findById(req.params.id)
	.populate('post')
	.exec(function(err,comment){
		res.render("comments/edit", {comment:comment});
	});
});

// Update

app.put('/posts/:post_id/comments/:id', function(req,res){
	db.Comment.findByIdAndUpdate(req.params.id, {body:req.body.body}, function(err,comment){
		if(err){
			res.render("comments/edit");
		} else {
			res.redirect('/posts/' + req.params.post_id + '/comments');
		}
	});
});

// Destroy

app.delete('/posts/:post_id/comments/:id', function(req,res){
	db.Comment.findByIdAndRemove(req.params.id, {body:req.body.body}, function (err, comment){
		if(err){
			console.log(err);
			res.render('comments/edit')
		} else {
			res.redirect("/posts/" + req.params.post_id + "/comments");
		}
	})
})

// User Routes

// Index

// TODO: auth only for admin!
app.get('/users', function(req,res){
	db.Post.find({}, function(err, users){
		res.render("users/index", {users:users});
	});
});

// New
// TODO: auth that not logged in
// app.get('/users/new',  function(req, res){
// 	res.render('users/new');
// });

// Create
// TODO: auth that not logged in
// app.post('/users', function(req,res){
// 	db.User.create({email: req.body.email, password: req.body.password, photo: req.body.photo}, function(err, user){
// 		if(err){
// 			console.log(err);
// 			res.render('users/new')
// 		}
// 		else {
// 			console.log(post);
// 			res.redirect('/users/' + user._id);
// 		}
// 	});
// });

// Show
// TODO: auth!
app.get('/users/:id', routeMiddleware.ensureCorrectUser, function(req,res){
	db.User.findById(req.params.id, function(err, user){
		db.Post.find(
		{
			_id: {$in: user.posts}
		},
		function(err,posts){
			res.render('users/show', {user:user, posts:posts}) //include comments on user show page?
		});
	});
});

// Edit
// TODO: auth! users can only edit themselves (except for admin?)	
app.get('/users/:id/edit', routeMiddleware.ensureCorrectUser, function(req,res){
	db.User.findById(req.params.id, function(err, user){
		res.render('users/edit', {user:user});
	});
});

// Update
// TODO: need to include creator in object parameter to findbyidandupdate
// maybe not? since the user id will not have changed
app.put('/users/:id', function(req,res){
	db.User.findByIdAndUpdate(req.params.id, {email: req.body.email, photo: req.body.photo}, function(err, user){
		if(err){
			res.render("users/edit")
		} else {
			res.redirect('/users/' + user._id)
		}
	})
})

// Destroy
// TODO: auth! or at least for whichever view will display this form
app.delete('users/:id', function(req,res){
	db.User.findById(req.params.id, function(err,user){
		if(err){
			console.log(err);
			res.render("users/show")
		} else {
			post.remove();
			res.redirect("/login")
		}
	})
})

// Catch All

app.get('*', function(req,res){
	res.render('404');
})

// Start Server

app.listen(3000, function(){
	"Server is listening on port 3000"
})