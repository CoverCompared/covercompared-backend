const utils = require("../../libs/utils");
const _ = require("lodash");
const { Parser } = require('json2csv');
const moment = require('moment');

const mongoose = require("mongoose");
const constant = require("../../libs/constants");
const { constants } = require("./admin");
const Policies = mongoose.model('Policies');
const Users = mongoose.model('Users');
const Payments = mongoose.model('Payments');
const Reviews = mongoose.model('Reviews');

exports.index = async (req, res) => {
    try {
        let range = JSON.parse(_.get(req.query, "range", "[0, 10]"));
        const skip = parseInt(range[0]);
        const limit = parseInt(range[1]) - skip;

        let findObj = {};
        const search = JSON.parse(_.get(req.query, "filter", "{}"));

        if (
            req.query.export == "csv" &&
            (!search.from_date || !search.to_date)
        ) {
            delete req.query.export;
        }

        if (search) {
            findObj["$and"] = [];
            if (search.txn_hash) {
                findObj["$and"].push({ txn_hash: { $regex: search.txn_hash, $options: "i" } });
            }
            if (search.status) {
                findObj["$and"].push({ status: search.status });
            }
            if (search.product_type) {
                findObj["$and"].push({ product_type: { $regex: search.product_type, $options: "i" } });
            }
            if (search.from_date || search.to_date) {
                let createdAt = {};
                if (search.from_date) {
                    createdAt["$gte"] = new Date(`${moment(search.from_date).format('YYYY-MM-DD')}T00:00:00.000Z`)
                }
                if (search.to_date) {
                    createdAt["$lte"] = new Date(`${moment(search.to_date).format('YYYY-MM-DD')}T23:59:59.000Z`)
                }
                findObj["$and"].push({ createdAt: createdAt });
            }
            if (search.q) {
                findObj["$or"] = [
                    { "txn_hash": { $regex: search.q, $options: "i" } },
                    { "user.email": { $regex: search.q, $options: "i" } }
                ];
            }
        }

        if (findObj["$and"] && !findObj["$and"].length) { delete findObj["$and"]; }

        let aggregate = [];
        aggregate.push({
            $lookup: {
                from: Users.collection.collectionName,
                localField: "user_id",
                foreignField: "_id",
                as: 'user'
            }
        });
        aggregate.push({ $unwind: { path: "$user" } });
        aggregate.push({
            $project: {
                "txn_hash": 1, "product_type": 1, "status": 1, "payment_status": 1,
                "total_amount": 1, "user_id": 1,
                "currency": 1,
                "createdAt": 1,
                "crypto_currency": 1,
                "crypto_amount": 1,
                "user.first_name": 1, "user.last_name": 1, "user.email": 1,
                "MSOPolicy.MSOMembers.first_name" : 1,
                "MSOPolicy.MSOMembers.last_name" : 1,
                "MSOPolicy.MSOMembers.user_type" : 1,
                "DeviceInsurance.first_name" : 1,
                "DeviceInsurance.last_name" : 1
            }
        });
        aggregate.push({ $match: findObj })


        let total = await Policies.aggregate([...aggregate, { $count: "total" }]);

        aggregate.push({ $sort: { _id: -1 } })
        if (!req.query.export) {
            aggregate.push({ $skip: skip })
            aggregate.push({ $limit: limit })
        }

        let policy = await Policies.aggregate(aggregate);

        if(Array.isArray(policy)){
            policy = policy.map(value => {
                if(value.product_type == constant.ProductTypes.mso_policy){
                    let members = _.get(value.MSOPolicy, "MSOMembers", []);
                    member = Array.isArray(members) ? members.find(m => m.user_type == "Main Member") : null;
                    member = member ? member : _.get(members, 0, null);
                    value.user.first_name = member ? _.get(member, "first_name", "") : _.get(value, "user.first_name", "") ;
                    value.user.last_name = member ? _.get(member, "last_name", "") : _.get(value, "user.last_name", "") ;
                }else if(value.product_type == constant.ProductTypes.device_insurance){
                    value.user.first_name = value.DeviceInsurance ? _.get(value, "DeviceInsurance.first_name", "") : _.get(value, "user.first_name", "") ;
                    value.user.last_name = value.DeviceInsurance ? _.get(value, "DeviceInsurance.last_name", "") : _.get(value, "user.last_name", "") ;
                }
                delete value.DeviceInsurance;
                delete value.MSOPolicy;
                return value;
            })
        }

        let data = {
            range: `${range[0]}-${range[1]}/${_.get(total, "0.total", 0)}`,
            data: policy
        }

        if (req.query.export == "csv") {
            let data = [];
            if (Array.isArray(policy) && policy.length) {
                data = policy.map(value => {
                    let val = {
                        product_type: value.product_type ? _.get(constant.ProductTypesName, value.product_type, "") : "",
                        txn_hash: value.txn_hash ? value.txn_hash : "",
                        name: `${_.get(value, "user.first_name", false) ? value.user.first_name : ""} ${_.get(value, "user.last_name", false) ? value.user.last_name : ""}`,
                        email: _.get(value, "user.email", false) ? value.user.email : "",
                        status: _.capitalize(value.status),
                        payment_status: _.capitalize(value.payment_status),
                        date: utils.getFormattedDate(value.createdAt)
                    };

                    if ([constant.ProductTypes.device_insurance, constant.ProductTypes.mso_policy].includes(value.product_type)) {
                        val.total_amount = `${value.total_amount ? value.total_amount : ""} ${value.currency ? value.currency : ""}`
                    }
                    if ([constant.ProductTypes.smart_contract, constant.ProductTypes.crypto_exchange].includes(value.product_type)) {
                        val.total_amount = `${value.crypto_amount ? value.crypto_amount : ""} ${value.crypto_currency ? value.crypto_currency : ""}`
                    }
                    return val;
                });
            }

            const fields = [
                { label: "Product Type", value: "product_type" },
                { label: "Txn Hash", value: "txn_hash" },
                { label: "Name", value: "name" },
                { label: "Email", value: "email" },
                { label: "Status", value: "status" },
                { label: "Payment Status", value: "payment_status" },
                { label: "Total Amount", value: "total_amount" },
                { label: "Date", value: "date" },
            ];
            const json2csv = new Parser({ fields });
            const csv = json2csv.parse(data);
            res.header('Content-Type', 'text/csv');

            let product_type_name = search.product_type ? constant.ProductTypes[search.product_type] : "";
            let from_date = search.from_date ? `-${utils.getFormattedDate(search.from_date)}` : "";
            let to_date = search.to_date ? `-${utils.getFormattedDate(search.to_date)}` : "";
            res.attachment(`Cover Compared Policies${from_date}${to_date}${product_type_name}.csv`);

            return res.send(csv);
        } else {
            return res.status(200).send(utils.apiResponseData(true, data));
        }

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.show = async (req, res, next) => {
    try {

        let policy = await Policies.findOne({ _id: req.params.id })
            .populate({
                path: "user_id",
                select: ["first_name", "last_name", "email"],
                model: Users
            }).populate({
                path: "payment_id",
                model: Payments
            })
            .lean();

        if (!policy) {
            /**
             * TODO:
             * Error Report
             * If policy or device_insurance record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        }

        let reviews = await Reviews.findOne({ policy_id: req.params.id })
            .select(["rating", "review", "updatedAt"])
            .lean();

        let user = policy.user_id;
        let payment = policy.payment_id;
        policy = await Policies.getPolicies(policy.product_type, { _id: utils.getObjectID(req.params.id) });
        policy = policy[0];
        if(policy.product_type == constant.ProductTypes.mso_policy){
            let members = _.get(policy.details, "MSOMembers", []);
            member = Array.isArray(members) ? members.find(m => m.user_type == "Main Member") : null;
            member = member ? member : _.get(members, 0, null);
            user.first_name = member ? _.get(member, "first_name", "") : _.get(user, "first_name", "") ;
            user.last_name = member ? _.get(member, "last_name", "") : _.get(user, "last_name", "") ;
        }else if(policy.product_type == constant.ProductTypes.device_insurance){
            user.first_name = policy.details ? _.get(policy, "details.first_name", "") : _.get(user, "first_name", "") ;
            user.last_name = policy.details ? _.get(policy, "details.last_name", "") : _.get(user, "last_name", "") ;
        }

        return res.status(200).send(utils.apiResponseData(true, { ...policy, reviews, user, payment }));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.destroy = async (req, res, next) => {
    try {

        let policy = await Policies.findOne({ _id: req.params.id })
            .populate({
                path: "user_id",
                select: ["first_name", "last_name", "email"],
                model: Users
            }).populate({
                path: "payment_id",
                model: Payments
            })
            .lean();

        if (!policy) {
            /**
             * TODO:
             * Error Report
             * If policy or device_insurance record not found in database
             */
            return res.status(200).send(utils.apiResponseMessage(false, "Policy not found."));
        }

        await Policies.findOneAndDelete({ _id: req.params.id });
        return res.status(200).send(utils.apiResponseMessage(true, "Policy deleted successfully."));
    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}

exports.msoPolicies = async (req, res) => {
    try {
        let range = JSON.parse(_.get(req.query, "range", "[0, 10]"));
        const skip = parseInt(range[0]);
        const limit = parseInt(range[1]) - skip;

        let findObj = {};
        const search = JSON.parse(_.get(req.query, "filter", "{}"));

        if (
            req.query.export == "csv" &&
            (!search.from_date || !search.to_date)
        ) {
            delete req.query.export;
        }

        findObj["$and"] = [];
        findObj["$and"].push({ product_type: constant.ProductTypes.mso_policy });

        if (search) {
            if (search.txn_hash) {
                findObj["$and"].push({ txn_hash: { $regex: search.txn_hash, $options: "i" } });
            }
            if (search.status) {
                findObj["$and"].push({ status: search.status });
            }
            if (search.from_date || search.to_date) {
                let createdAt = {};
                if (search.from_date) {
                    createdAt["$gte"] = new Date(`${moment(search.from_date).format('YYYY-MM-DD')}T00:00:00.000Z`)
                }
                if (search.to_date) {
                    createdAt["$lte"] = new Date(`${moment(search.to_date).format('YYYY-MM-DD')}T23:59:59.000Z`)
                }
                findObj["$and"].push({ createdAt: createdAt });
            }
            if (search.q) {
                findObj["$or"] = [
                    { "txn_hash": { $regex: search.q, $options: "i" } },
                    { "user.email": { $regex: search.q, $options: "i" } }
                ];
            }
        }

        if (findObj["$and"] && !findObj["$and"].length) { delete findObj["$and"]; }

        let aggregate = [];
        aggregate.push({
            $lookup: {
                from: Users.collection.collectionName,
                localField: "user_id",
                foreignField: "_id",
                as: 'user'
            }
        });
        aggregate.push({ $unwind: { path: "$user" } });
        aggregate.push({
            $project: {
                "txn_hash": 1, "product_type": 1, "status": 1, "payment_status": 1,
                "total_amount": 1, "user_id": 1,
                "currency": 1,
                "createdAt": 1,
                "crypto_currency": 1,
                "crypto_amount": 1,
                "user.first_name": 1, "user.last_name": 1, "user.email": 1,
                "MSOPolicy": 1
            }
        });
        aggregate.push({ $match: findObj })


        let total = await Policies.aggregate([...aggregate, { $count: "total" }]);

        aggregate.push({ $sort: { _id: -1 } })
        if (!req.query.export) {
            aggregate.push({ $skip: skip })
            aggregate.push({ $limit: limit })
        }

        let policy = await Policies.aggregate(aggregate);

        let data = {
            range: `${range[0]}-${range[1]}/${_.get(total, "0.total", 0)}`,
            data: policy
        }

        if (req.query.export == "csv") {
            let data = [];
            let all_data = [];
            if (Array.isArray(policy) && policy.length) {

                

                data = policy.map(value => {
                    let val = {
                        product_type: value.product_type ? _.get(constant.ProductTypesName, value.product_type, "") : "",
                        txn_hash: value.txn_hash ? value.txn_hash : "",
                        name: `${_.get(value, "user.first_name", false) ? value.user.first_name : ""} ${_.get(value, "user.last_name", false) ? value.user.last_name : ""}`,
                        email: _.get(value, "user.email", false) ? value.user.email : "",
                        plan_type: _.get(value, "MSOPolicy.name", false) ? value.MSOPolicy.name : "",
                        status: _.capitalize(value.status),
                        payment_status: _.capitalize(value.payment_status),
                        date: utils.getFormattedDate(value.createdAt)
                    };

                    if(_.get(value, "MSOPolicy.MSOMembers", false) && Array.isArray(value.MSOPolicy.MSOMembers) && value.MSOPolicy.MSOMembers.length){
                        val.cover_user_count = value.MSOPolicy.MSOMembers.length;
                        
                        
                        val.cover_user_details = value.MSOPolicy.MSOMembers.map((val, ind) => {
                            all_data.push({
                                member_id: utils.getMsoPolicyMembershipId(value.createdAt, value.txn_hash),
                                email: _.get(value, "user.email", false) ? value.user.email : "",
                                date_of_membership: utils.getFormattedDate(value.createdAt, "MM/DD/YYYY"),
                                first_name: _.get(val, "first_name", ""),
                                last_name: _.get(val, "last_name", ""),
                                dob: utils.getFormattedDate(_.get(val, "dob", ""), "MM/DD/YYYY"),
                                user_type: _.get(val, "user_type", ""),
                                identity: _.get(val, "identity", ""),
                                country: _.get(val, "country", "")
                            })
                            let v = [];
                            v.push(`No : ${ind + 1}`)
                            v.push(`User Type : ${_.get(val, "user_type", "")}`)
                            v.push(`First Name : ${_.get(val, "first_name", "")}`)
                            v.push(`Last Name : ${_.get(val, "last_name", "")}`)
                            v.push(`Country : ${_.get(val, "country", "")}`)
                            v.push(`Date Of Birth : ${utils.getFormattedDate(_.get(val, "dob", ""))}`)
                            v.push(`Identity : ${_.get(val, "identity", "")}`)
                            return v.join("\n");
                        })
                        val.cover_user_details = val.cover_user_details.join("\n");
                    }else{
                        val.cover_user_count = 0;
                    }

                    if ([constant.ProductTypes.device_insurance, constant.ProductTypes.mso_policy].includes(value.product_type)) {
                        val.total_amount = `${value.total_amount ? value.total_amount : ""} ${value.currency ? value.currency : ""}`
                    }
                    if ([constant.ProductTypes.smart_contract, constant.ProductTypes.crypto_exchange].includes(value.product_type)) {
                        val.total_amount = `${value.crypto_amount ? value.crypto_amount : ""} ${value.crypto_currency ? value.crypto_currency : ""}`
                    }
                    return val;
                });
            }

            const fields = [
                { label: "MemberID", value: "member_id" },
                { label: "Email", value: "email" },
                { label: "Date of Membership", value: "date_of_membership" },
                { label: "Fname_Mem", value: "first_name" },
                { label: "Lname_Mem", value: "last_name" },
                { label: "Date of Birth", value: "dob" },
                { label: "UserType", value: "user_type" },
                { label: "Identification Passport/local Id Number", value: "identity" },
                { label: "Country", value: "country" },
            ];
            const json2csv = new Parser({ fields });
            const csv = json2csv.parse(all_data);
            res.header('Content-Type', 'text/csv');

            let from_date = search.from_date ? `-${utils.getFormattedDate(search.from_date)}` : "";
            let to_date = search.to_date ? `-${utils.getFormattedDate(search.to_date)}` : "";
            res.attachment(`MSO Policies(${from_date} - ${to_date}).csv`);

            return res.send(csv);
        } else {
            return res.status(200).send(utils.apiResponseData(true, data));
        }

    } catch (error) {
        console.log("ERR", error);
        return res.status(500).send(utils.apiResponseMessage(false, "Something went wrong."));
    }
}
