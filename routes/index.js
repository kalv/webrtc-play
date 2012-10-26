
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'WebRTC Play' });
};

/* Talk page */
exports.talk = function(req, res) {
  if (req.session.username) {
    res.render('talk', {username: req.session.username});
  } else {
    res.redirect('/')
  }
};
