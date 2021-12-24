'use strict';

const _ = require('lodash');
const mongoose = require('mongoose');
const config = require('../config');
const Schema = mongoose.Schema;


/**
 * Settings Schema
 * 
 */

const SettingsSchema = new Schema({
    p4l_from_block: { type: String, default: null },
    mso_from_block: { type: String, default: null }
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
