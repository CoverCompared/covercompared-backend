
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
    p4l_from_block: { type: String, default: null },
    insurace_from_block: { type: String, default: null },
    mso_from_block: { type: String, default: null },
    cover_details: [{type: Schema.Types.Mixed, default: null}]
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
