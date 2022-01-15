const _ = require("lodash");

const mongoose = require('mongoose');
const config = require("../config");
const Blogs = mongoose.model('Blogs');


exports.image = async (req, res, next) => {
    const criteria = { slug: req.params.slug };
    try {
        req.blog = await Blogs.load({ criteria });
        if (!req.blog) {
            res.status(404).send({
                status: false,
                message: "Not found"
            })
            return;
        }
    } catch (err) {
        return next(err);
    }
    if (req.blog.image_file && req.blog.image_file_type) {
        res.setHeader('content-type', req.blog.image_file_type);
        res.send(req.blog.image_file);
    } else {
        res.redirect(`${config.baseUrl}images/default.jpg`);
    }
}

exports.show = async (req, res, next) => {

    const criteria = { slug: req.params.slug, status: "published" };
    try {
        req.blog = await Blogs.load({ criteria });
        if (!req.blog) {
            res.status(404).send({
                status: false,
                message: "Not found"
            })
            return;
        }
    } catch (err) {
        return next(err);
    }

    res.send({
        status: true,
        message: "",
        data: {
            slug: req.blog.slug,
            title: req.blog.title,
            description: req.blog.description,
            content: req.blog.content,
            status: req.blog.status,
            created_at: req.blog.createdAt,
            image: Blogs.getImage(req.blog.slug)
        }
    })

}

exports.latest = async (req, res, next) => {


    let blogs = await Blogs.findOne({ status: 'published' })
        .select(["slug", "title", "image", "description", "createdAt"].join(" "))
        .sort({ 'createdAt': -1 });


    res.send({
        status: true,
        message: "",
        data: {
            slug: blogs.slug,
            title: blogs.title,
            description: blogs.description,
            created_at: blogs.createdAt,
            image: Blogs.getImage(blogs.slug)
        }
    })

}


exports.table = async (req, res, next) => {

    let range = JSON.parse(_.get(req.query, "range", "[0, 10]"));
    const skip = parseInt(range[0]);
    const limit = parseInt(range[1]) - skip;

    let total = await Blogs.countDocuments({status: "published"})
    
    let blogs = await Blogs.find({status: "published"})
        .select(["slug", "title", "description", "status", "createdAt", "image"].join(" "))
        .sort({ _id: "DESC" })
        .limit(limit)
        .skip(skip).lean();

    if (blogs.length) {
        blogs = blogs.map((blog) => {
            blog.image = Blogs.getImage(blog.slug);
            return blog;
        })
    }

    res.send({
        range: `${range[0]}-${range[1]}/${total}`,
        data: blogs
    })

}