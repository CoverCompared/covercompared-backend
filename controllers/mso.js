const utils = require("../libs/utils");
const companies = require("./../libs/companies")
const _ = require("lodash");
const config = require("../config");
const msoPlans = require("../libs/mso-plans");

exports.defaultList = msoPlans;

exports.list = async (req, res, next) => {

    let search = _.get(req.query, "search", false);
    let amount_min = _.get(req.query, "amount_min", false);
    let amount_max = _.get(req.query, "amount_max", false);
    let plan_types = _.filter(_.get(req.query, "plan_type", "").split(","));
    let add_on_service = _.get(req.query, "add_on_service", false);
    let user_limit = _.get(req.query, "user_limit", false);
    let ehr = _.get(req.query, "ehr", false);
    let current_page = +_.get(req.query, "page", 1);

    let list = [...this.defaultList];

    if (Array.isArray(plan_types) && plan_types.length) {
        list = await list.filter((object) => {
            return plan_types.includes(object.type);
        })
    }

    if (search !== false) {
        list = await list.filter((object) => {
            return new RegExp(search, "gi").test(object.name) || new RegExp(search, "gi").test(object.InsurancePlanType)
        })
    }

    if (amount_min) {
        list = await list.filter((object) => {
            return parseInt(object.quote) >= amount_min
        })
    }
    if (amount_max) {
        list = await list.filter((object) => {
            return parseInt(object.quote) <= amount_max
        })
    }
    if (user_limit) {
        list = await list.filter((object) => {
            return object.MSOCoverUserLimit == "unlimited" || object.MSOCoverUserLimit >= user_limit ? true : false;
        })
    }
    
    let total = list.length;
    let per_page = 10;
    let total_page = Math.ceil(total / per_page)
    list = list.splice(((current_page - 1) * per_page), per_page)

    res.send(utils.apiResponseData(true, {
        total: total,
        total_page,
        current_page,
        list: list
    }));
}