const niv = require("./../../libs/nivValidations");
const _ = require("lodash");

const mongoose = require('mongoose');
const utils = require("../../libs/utils");
const Blogs = mongoose.model('Blogs');
const Subscriptions = mongoose.model('Subscriptions');

exports.load = async (req, res, next, _id) => {
    const criteria = { _id };
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
    next();
}

/**
 * 
 * @param {"store"|"update"}  validateFor 
 * @returns 
 */
exports.validate = (validateFor) => {
    return (req, res, next) => {

        niv.extend("blog-title", async ({ value }) => {
            let _id = _.get(req, "blog._id", false);
            let blog = await mongoose.model("Blogs").getUsingSlug(_.kebabCase(value), _id)
            return blog ? false : true;
        });

        niv.extendMessages({
            "blog-title": "The Blog Title already in use."
        })


        let rules = {
            'title': ['required', "blog-title"],
            'image': ["required", `mime:jpg,png,pdf,jpeg`],
            'status': ['required'],
            'description': ['required'],
            'content': ['required']
        };

        if (validateFor === "update") {
            if (!_.has(req.fields, "title")) { delete rules.title }
            if (!_.has(req.fields, "image")) { delete rules.image }
            if (!_.has(req.fields, "status")) { delete rules.status }
            if (!_.has(req.fields, "description")) { delete rules.description }
            if (!_.has(req.fields, "content")) { delete rules.content }
        }

        let v = new niv.Validator(req.fields, rules); v.check().then((matched) => {
            if (!matched) {
                res.status(200).send(utils.apiResponseData(false, v.errors));
            } else { next(); }
        });
    }
}

exports.index = async (req, res, next) => {

    let range = JSON.parse(_.get(req.query, "range", "[0, 10]"));
    const sort = JSON.parse(_.get(req.query, "sort", '["_id", "desc"]'));
    const skip = parseInt(range[0]);
    const limit = parseInt(range[1]) - skip;
    let findObj = {};
    const search = JSON.parse(_.get(req.query, "filter", "{}"));

    if (search) {
        findObj["$and"] = [];
        if (search.title) {
            findObj["$and"].push({ title: { $regex: search.title, $options: "i" } });
        }
        if (search.status) {
            findObj["$and"].push({ status: search.status });
        }
        if (search.q) {
            findObj["$or"] = [
                { "title": { $regex: search.q, $options: "i" } }
            ];
        }
    }

    // let total = await Blogs.countDocuments()
    if (findObj["$and"] && !findObj["$and"].length) { delete findObj["$and"]; }

    if (sort[0] == "id") { sort[0] = "_id" }

    let total = await Blogs.aggregate([ {$match: findObj}, {$count: "total"} ]);

    let blogs = await Blogs.find(findObj)
        .select(["_id", "title", "status", "createdAt"].join(" "))
        .sort({ [sort[0]]: sort[1] })
        .limit(limit)
        .skip(skip).lean();

    res.send(utils.apiResponseData(true, {
        range: `${range[0]}-${range[1]}/${_.get(total, "0.total", 0)}`,
        data: blogs
    }))

}


exports.show = async (req, res, next) => {

    res.send(utils.apiResponseData(true, req.blog.getResponse()));

}


exports.store = async (req, res, next) => {

    // Create new Blogs
    let blogs = new Blogs;
    blogs.title = req.body.title;
    blogs.slug = _.kebabCase(req.body.title);
    blogs.status = req.body.status;
    blogs.description = req.body.description;
    blogs.content = req.body.content;

    blogs = await blogs.save();

    // Upload Document
    await blogs.uploadImage(req.files)

    res.send(utils.apiResponse(true, "Blog created successfully.", blogs.getResponse()))

}

exports.update = async (req, res, next) => {

    let blog = req.blog;

    blog.title = _.has(req.body, "title") ? req.body.title : blog.title;
    blog.slug = _.has(req.body, "title") ? _.kebabCase(req.body.title) : blog.slug;
    blog.status = _.has(req.body, "status") ? req.body.status : blog.status;
    blog.description = _.has(req.body, "description") ? req.body.description : blog.description;
    blog.content = _.has(req.body, "content") ? req.body.content : blog.content;
    blog = await blog.save();

    // Upload Document
    await blog.uploadImage(req.files)

    // if (blog.status == Blogs.STATUS.PUBLISHED) {

    //     if (blog.send_publish_mail != true) {
    //         let subscriptions = await Subscriptions.find({ status: Subscriptions.STATUS.SUBSCRIBED }).lean();
    //         if (subscriptions) {
    //             let blogPublishMailJobs = subscriptions.map(subscription => ({ blog_id: blog._id, subscription_id: subscription._id, status: 1 }))
    //             await BlogPublishMailJobs.create(blogPublishMailJobs);
    //         }
    //         blog.send_publish_mail = true;
    //         await blog.save();
    //     } else {
    //         await BlogPublishMailJobs.updateMany(
    //             { blog_id: blog._id },
    //             { status: 1 }
    //         )
    //     }
    // } else {
    //     if (blog.send_publish_mail == true) {
    //         await BlogPublishMailJobs.updateMany(
    //             { blog_id: blog._id },
    //             { status: 0 }
    //         )
    //     }
    // }

    res.send(utils.apiResponse(true, "Blog updated successfully.", blog.getResponse()))

}

exports.destroy = async (req, res, next) => {

    let blogs = req.blog;

    // Remove Blog 
    await blogs.removeImage();
    await Blogs.findOneAndDelete({ _id: mongoose.Types.ObjectId(req.blog._id) })

    res.send(utils.apiResponseMessage(true, "Blog deleted successfully."))

}
