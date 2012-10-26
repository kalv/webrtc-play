
/*
 * POST create
 * Creat a new session
 */

exports.create = function(req, res){
  req.session.username = req.param("username");
  res.redirect("/talk");
};

