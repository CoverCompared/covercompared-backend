'use strict';

const _ = require('lodash');
const fs = require('fs');
var mime = require('mime-types')

const mongoose = require('mongoose');
const config = require('../config');
const mailer = require('../libs/mailer');
const Schema = mongoose.Schema;

/**
 * Blogs Schema
 */


const BlogsSchema = new Schema({
    slug: { type: String, default: null },
    title: { type: String, default: null },
    image: { type: String, default: null },
    image_file_type: { type: String, default: null },
    image_file: { type: Buffer, default: null },
    image_aws_key: { type: String, default: null },
    status: { type: String, default: null },
    description: { type: String, default: null },
    content: { type: String, default: null },
    send_publish_mail: { type: Boolean, default: null }
}, {
    timestamps: true
});


BlogsSchema.methods = {


    /**
     * Upload Document
     *
     * @param {String} plainText
     * @return {Boolean}
     * @api public
     */

    uploadImage: async function (files) {
        if (files.image) {
            let folder = mongoose.model('Blogs').imageFolder;

            // Delete Existing File
            if (!_.isEmpty(this.image)) {
                let filePath = `${__dirname}/../uploads/${folder}/${this.image}`
                if (this.image && this.image.length && fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath)
                }
            }


            // Upload File
            var oldPath = files.image.path;
            let fileName = Date.now() + "-front" + `.${mime.extension(files.image.type)}`
            var newPath = `${__dirname}/../uploads/${folder}/${fileName}`;
            try {
                this.image_file_type = files.image.type;
                this.image_file = fs.readFileSync(oldPath)
                // await fs.promises.rename(oldPath, newPath)
            } catch (error) {
                console.log("error")
                // await fs.promises.copyFile(oldPath, newPath)
            }
            this.image = fileName;
            await this.save();
        }

        return true;
    },

    /**
     * Delete Document
     *
     * @param {String} plainText
     * @return {Boolean}
     * @api public
     */

    removeImage: async function () {
        let folder = mongoose.model('Blogs').imageFolder;
        // Delete Existing File
        if (!_.isEmpty(this.image)) {
            let filePath = `${__dirname}/../uploads/${folder}/${this.image}`
            if (this.image && this.image.length && fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath)
            }
        }

        return true;
    },

    sendMail: async function (name, email, unsubscribe_token) {
        const Blogs = mongoose.model('Blogs');
        let to = [{ name: name, address: email }];
        await mailer.newArtical(
            to,
            {
                link: Blogs.getBlogUrl(this.slug),
                title: this.title,
                description: this.description,
                image_file: Blogs.getImage(this.slug),
                unsubscribe_token
            });
    },

    getResponse: function () {

        return {
            _id: this._id,
            slug: this.slug,
            title: this.title,
            description: this.description,
            content: this.content,
            status: this.status,
            image: this.constructor.getImage(this.slug)
        };
    }
}

BlogsSchema.statics = {
    STATUS: {
        PUBLISHED: "published",
        DRAFT: "draft"
    },
    imageFolder: "blog-images",
    urlFolder: "upload-blog-image",
    load: async function (options, cb) {
        return await this.findOne(options.criteria);
    },

    getProfile: async function (image = false, cb) {

        let folder = this.imageFolder;
        // Delete Existing File
        if (!_.isEmpty(image)) {
            let filePath = `${__dirname}/../uploads/${folder}/${image}`
            if (image && image.length && fs.existsSync(filePath)) {
                return `${config.api_url}${this.urlFolder}/${image}`;
            } else {
                return "default.png"
            }
        }

    },

    getUsingSlug: async function (slug, id, cb) {
        const Blogs = mongoose.model('Blogs');
        id = mongoose.isValidObjectId(id) ? id : null;
        let findObj = { slug: slug, _id: { $ne: id } };
        let blog = await Blogs.load({ criteria: findObj })
        return blog;
    },

    getBlogUrl: slug => `${config.webUrl}blogs/${slug}`,
    getImage: slug => `${config.api_url}blogs/image/${slug}`
}

mongoose.model('Blogs', BlogsSchema, 'blogs');
