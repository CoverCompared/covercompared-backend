'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


/**
 * Reviews Schema
    user_id     - Users._id
    policy_id   - Policies._id
 */
const ReviewsSchema = new Schema({
   
    user_id: { type: Schema.ObjectId, default: null, ref: "Users" },
    policy_id: { type: Schema.ObjectId, default: null, ref: "Policies" },
    rating: { type: Number, default: null },
    review: { type: String, default: null },
},
    {
        timestamps: true
    });

mongoose.model('Reviews', ReviewsSchema, "reviews");
