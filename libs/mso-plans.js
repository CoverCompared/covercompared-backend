const config = require("../config");
const constant = require("./constants");

const msoPlans = [
    // {
    //     InsurancePlanType: "Medical Second Opinion (MSO)",
    //     unique_id: "BASIC_PLAN",
    //     name: "BASIC PLAN",
    //     quote: "50",
    //     MSOAddOnService: "15",
    //     type: "Single cover",
    //     MSOPlanDuration: "Annual Plan",
    //     MSOCoverUser: "User - 1",
    //     MSOCoverUserLimit: "1",
    //     EHR: "EHR & PORTAL",
    //     userTypeOptions: ["Main Member"],
    //     noOfSpouse: 0,
    //     noOfDependent: 0,
    //     mainMemberParents: 0,
    //     spouseParents: 0,
    //     totalUsers: 1,
    //     "logo": `${config.api_url}images/mso.png`
    // },
    {
        InsurancePlanType: "Medical Second Opinion (MSO)",
        unique_id: "SILVER_PLAN",
        period: constant.MSO_PLAN_TYPE.SILVER_PLAN,
        name: "SILVER PLAN",
        quote: "60",
        MSOAddOnService: "24",
        type: "Single cover",
        MSOPlanDuration: "Annual Plan",
        MSOCoverUser: "Single cover",
        MSOCoverUserLimit: "1",
        EHR: "EHR & PORTAL",
        userTypeOptions: ["Main Member"],
        totalUsers: 1,
        "logo": `${config.api_url}images/mso.png`
    },
    {
        InsurancePlanType: "Medical Second Opinion (MSO)",
        unique_id: "GOLD_PLAN",
        period: constant.MSO_PLAN_TYPE.GOLD_PLAN,
        name: "GOLD PLAN",
        quote: "108",
        MSOAddOnService: "14",
        type: "Family cover",
        MSOPlanDuration: "Annual Plan",
        MSOCoverUser: "3 plus 3: Husband, wives, and children",
        MSOCoverUserLimit: "6",
        EHR: "EHR & PORTAL",
        userTypeOptions: ["Main Member", "Spouse", "Dependent"],
        totalUsers: 6,
        "logo": `${config.api_url}images/mso.png`
    },
    {
        InsurancePlanType: "Medical Second Opinion (MSO)",
        unique_id: "PLATINUM_PLAN",
        period: constant.MSO_PLAN_TYPE.PLATINUM_PLAN,
        name: "PLATINUM PLAN",
        quote: "168",
        MSOAddOnService: "48",
        type: "Family cover",
        MSOPlanDuration: "Annual Plan",
        MSOCoverUser:
            "unlimited: Husband, wives, children, parents on husband& wives’ side",
        MSOCoverUserLimit: "unlimited",
        EHR: "EHR & PORTAL",
        userTypeOptions: [
            "Main Member",
            "Spouse",
            "Dependent",
            "Main Member Parent",
            "Spouse Parent",
        ],
        totalUsers: -1,        // -1 is for unlimited
        "logo": `${config.api_url}images/mso.png`
    },
];

module.exports = msoPlans;