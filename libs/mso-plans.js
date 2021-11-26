const config = require("../config");

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
        name: "SILVER PLAN",
        quote: "60",
        MSOAddOnService: "24",
        type: "Family cover",
        MSOPlanDuration: "Annual Plan",
        MSOCoverUser: "2 plus 2: Husband, wife and 2 children",
        MSOCoverUserLimit: "2",
        EHR: "EHR & PORTAL",
        userTypeOptions: ["Main Member", "Spouse", "Dependent"],
        noOfSpouse: 1,
        noOfDependent: 2,
        mainMemberParents: 0,
        spouseParents: 0,
        totalUsers: 4,
        "logo": `${config.api_url}images/mso.png`
    },
    {
        InsurancePlanType: "Medical Second Opinion (MSO)",
        unique_id: "GOLD_PLAN",
        name: "GOLD PLAN",
        quote: "108",
        MSOAddOnService: "14",
        type: "Family cover",
        MSOPlanDuration: "Annual Plan",
        MSOCoverUser: "3 plus 3: Husband, two wives, and 3 children",
        MSOCoverUserLimit: "3",
        EHR: "EHR & PORTAL",
        userTypeOptions: ["Main Member", "Spouse", "Dependent"],
        noOfSpouse: 2,
        noOfDependent: 3,
        mainMemberParents: 0,
        spouseParents: 0,
        totalUsers: 6,
        "logo": `${config.api_url}images/mso.png`
    },
    {
        InsurancePlanType: "Medical Second Opinion (MSO)",
        unique_id: "PLATINUM_PLAN",
        name: "PLATINUM PLAN",
        quote: "168",
        MSOAddOnService: "48",
        type: "Family cover",
        MSOPlanDuration: "Annual Plan",
        MSOCoverUser:
            "unlimited: Husband, all wives, all children, parents on husband& wives’ side",
        MSOCoverUserLimit: "unlimited",
        EHR: "EHR & PORTAL",
        userTypeOptions: [
            "Main Member",
            "Spouse",
            "Dependent",
            "Main Member Parent",
            "Spouse Parent",
        ],
        noOfSpouse: -1,        // -1 is for unlimited
        noOfDependent: -1,     // -1 is for unlimited
        mainMemberParents: -1, // -1 is for unlimited
        spouseParents: -1,     // -1 is for unlimited
        totalUsers: -1,        // -1 is for unlimited
        "logo": `${config.api_url}images/mso.png`
    },
];

module.exports = msoPlans;