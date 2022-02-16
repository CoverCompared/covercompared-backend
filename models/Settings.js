
'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const config = require('../config');
const Schema = mongoose.Schema;


/**
 * Settings Schema
 * cover_details types {
 *    unique_id
 *    type
 *    product_id
 *    address
 *    name
 *    company_code
 * }
 */

const SettingsSchema = new Schema({
    p4l_smart_contract_address: { type: String, default: null },
    p4l_smart_contract_abi: { type: Schema.Types.Mixed, default: null },
    p4l_from_block: { type: String, default: null },
    insurace_smart_contract_address: { type: String, default: null },
    insurace_smart_contract_abi: { type: Schema.Types.Mixed, default: null },
    insurace_from_block: { type: String, default: null },
    nexus_smart_contract_address: { type: String, default: null },
    nexus_smart_contract_abi: { type: Schema.Types.Mixed, default: null },
    nexus_from_block: { type: String, default: null },
    mso_smart_contract_address: { type: String, default: null },
    mso_smart_contract_abi: { type: Schema.Types.Mixed, default: null },
    mso_from_block: { type: String, default: null },
    cover_details: [{type: Schema.Types.Mixed, default: null}],
    mso_last_sync_transaction: { type: String, default: null },
    p4l_last_sync_transaction: { type: String, default: null },
    nexus_last_sync_transaction: { type: String, default: null },
    insurace_last_sync_transaction: { type: String, default: null },
}, {
    timestamps: true
});

SettingsSchema.statics = {
    getKey: async function (key) {
        const Settings = mongoose.model('Settings');

        // Get Token
        let setting = await Settings.findOne({});

        if (!setting) {
            setting = new Settings;
        }
        setting.p4l_from_block = setting.p4l_from_block ? setting.p4l_from_block : 0;
        setting.mso_from_block = setting.mso_from_block ? setting.mso_from_block : 0;
        setting.insurace_from_block = setting.insurace_from_block ? setting.insurace_from_block : 0;
        setting.nexus_from_block = setting.nexus_from_block ? setting.nexus_from_block : 0;
        setting.p4l_smart_contract_address = setting.p4l_smart_contract_address ? setting.p4l_smart_contract_address : 0;
        setting.insurace_smart_contract_address = setting.insurace_smart_contract_address ? setting.insurace_smart_contract_address : 0;
        setting.nexus_smart_contract_address = setting.nexus_smart_contract_address ? setting.nexus_smart_contract_address : 0;
        setting.mso_smart_contract_address = setting.mso_smart_contract_address ? setting.mso_smart_contract_address : 0;
        setting.p4l_smart_contract_abi = setting.p4l_smart_contract_abi ? setting.p4l_smart_contract_abi : null;
        setting.insurace_smart_contract_abi = setting.insurace_smart_contract_abi ? setting.insurace_smart_contract_abi : null;
        setting.nexus_smart_contract_abi = setting.nexus_smart_contract_abi ? setting.nexus_smart_contract_abi : null;
        setting.mso_smart_contract_abi = setting.mso_smart_contract_abi ? setting.mso_smart_contract_abi : null;
        setting.mso_last_sync_transaction = setting.mso_last_sync_transaction ? setting.mso_last_sync_transaction : null;
        setting.p4l_last_sync_transaction = setting.p4l_last_sync_transaction ? setting.p4l_last_sync_transaction : null;
        setting.nexus_last_sync_transaction = setting.nexus_last_sync_transaction ? setting.nexus_last_sync_transaction : null;
        setting.insurace_last_sync_transaction = setting.insurace_last_sync_transaction ? setting.insurace_last_sync_transaction : null;
        setting.cover_details = setting.cover_details ? setting.cover_details : [];
        return key ? setting[key] : setting;
    },

    setKey: async function (key, value) {
        const Settings = mongoose.model('Settings');
        let setting = await Settings.getKey();
        setting[key] = value;
        await setting.save();
        return true;
    }

}

mongoose.model('Settings', SettingsSchema, "settings");
