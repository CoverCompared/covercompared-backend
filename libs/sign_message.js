const BigNumber = require('bignumber.js');
const { ethers } = require("ethers");
const config = require('../config');

const getHexStrFromStr = (str) => {
    const strBytes = ethers.utils.toUtf8Bytes(str);
    return ethers.utils.hexlify(strBytes);
};

const getPaddedHexStrFromBN = (bn) => {
    return ethers.utils.hexZeroPad(`0x${bn.toString(16)}`, 32);
};

const getPaddedHexStrFromINT = (bn) => {
    const hexStr = ethers.utils.hexlify(bn);
    return ethers.utils.hexZeroPad(hexStr, 32);
};

exports.getSignMessage = (param, isUseCrv = false) => {
    const value = new BigNumber(param.total_amount).multipliedBy(10 ** config.is_mainnet ? 6 : 18); // should be the decimals of USDC token

    const policyId = param.id === undefined ? 'first-test' : param.id;
    const durPlan = param.durPlan;
    const hexDeviceStr = getHexStrFromStr(policyId);
    const paddedValueHexStr = getPaddedHexStrFromBN(value);
    const paddedDurPlanHexStr = getPaddedHexStrFromINT(durPlan);

    return hexDeviceStr + paddedValueHexStr.slice(2) + paddedDurPlanHexStr.slice(2);
};

exports.getSignMessageForMSO = (param, isUseCrv = false) => {
    const { policyId, value, period, conciergePrice } = param;

    const hexProductName = getHexStrFromStr(policyId);
    const paddedValueHexStr = getPaddedHexStrFromBN(new BigNumber(value));
    const paddedPeriod = getPaddedHexStrFromINT(period);
    const paddedAddonServicePrice = getPaddedHexStrFromBN(new BigNumber(conciergePrice));

    return (
        hexProductName +
        paddedValueHexStr.slice(2) +
        paddedPeriod.slice(2) +
        paddedAddonServicePrice.slice(2)
    );
};