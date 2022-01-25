const contracts = {
  coverCompared: {
    1: '',
    4: '0x1E9093090D91452631e8eFAc1A66401ffa4B8775',
    42: '0x0000000000000000000000000000000000000000',
  },
  p4l: {
    1: '0x674b88c77b9fa787fe30b5cae9d7654f0cdda1aa',
    4: '0x51956B95f63894Ef378BFEb6e9AaEe837393e266',
    42: '0x0000000000000000000000000000000000000000',
  },
  mso: {
    1: '0x80e15e4592b2130131067f02407a74f7ef50d3b5',
    4: '0x49d7Ed485b90aDc96e8e24240e96bc0c7bf5BD13',
    42: '0x0000000000000000000000000000000000000000',
  },
  exchangeAgent: {
    1: '',
    4: '0x3320c193109265fac179cc3ef0a466cca01651df',
    42: '0x51FCc54e9c7D8606cD16ea54e91Ed4D09F831e64',
  },
  priceFeed: {
    eth: {
      decimal: 8,
      1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      4: '0xc86718f161412Ace9c0dC6F81B26EfD4D3A8F5e0',
      42: '0xb3dEcC8bAAd6226835BdB92C19f082Fba443Ad3a',
    },
    bnb: {
      decimal: 8,
      1: '0x14e613AC84a31f709eadbdF89C6CC390fDc9540A',
      4: '0xcf0f51ca2cDAecb464eeE4227f5295F2384F84ED',
      42: '0x8993ED705cdf5e84D0a3B754b5Ee0e1783fcdF16',
    },
    btc: {
      decimal: 8,
      1: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
      4: '0xECe365B379E1dD183B20fc5f022230C044d51404',
      42: '0x6135b13325bfC4B00278B4abC5e20bbce2D6580e',
    },
    comp: {
      decimal: 8,
      1: '0xdbd020CAeF83eFd542f4De03e3cF0C28A4428bd5',
      4: '',
      42: '0xECF93D14d25E02bA2C13698eeDca9aA98348EFb6',
    },
    dai: {
      decimal: 8,
      1: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
      4: '0xBC33008AF81A03aA24dc0A0F112E29C979e317fB',
      42: '0x777A68032a88E5A84678A77Af2CD65A7b3c0775a',
    },
    link: {
      decimal: 8,
      1: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
      4: '0xd8bD0a1cB028a31AA859A21A3758685a95dE4623',
      42: '0x396c5E36DD0a0F5a5D33dae44368D4193f69a1F0',
    },
    ltc: {
      decimal: 8,
      1: '0x6AF09DF7563C363B5763b9102712EbeD3b9e859B',
      4: '0x4d38a35C2D87976F334c2d2379b535F1D461D9B4',
      42: '0xCeE03CF92C7fFC1Bad8EAA572d69a4b61b6D4640',
    },
    trx: {
      decimal: 8,
      1: '0xacD0D1A29759CC01E8D925371B72cb2b5610EA25',
      4: '0xb29f616a0d54FF292e997922fFf46012a63E2FAe',
      42: '0x9477f0E5bfABaf253eacEE3beE3ccF08b46cc79c',
    },
    tsla: {
      decimal: 8,
      1: '0x1ceDaaB50936881B3e449e47e40A2cDAF5576A4a',
      4: '',
      42: '0xb31357d152638fd1ae0853d24b9Ea81dF29E3EF2',
    },
    uni: {
      decimal: 8,
      1: '0x553303d460EE0afB37EdFf9bE42922D8FF63220e',
      4: '',
      42: '0xDA5904BdBfB4EF12a3955aEcA103F51dc87c7C39',
    },
    usdc: {
      decimal: 8,
      1: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
      4: '0xa24de01df22b63d23Ebc1882a5E3d4ec0d907bFB',
      42: '0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60',
    },
    usdt: {
      decimal: 8,
      1: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
      4: '',
      42: '0x2ca5A90D34cA333661083F89D831f757A9A50148',
    },
    '1inch': {
      decimal: 8,
      1: '0xc929ad75B72593967DE83E7F7Cda0493458261D9',
      4: '',
      42: '',
    },
    aave: {
      decimal: 8,
      1: '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',
      4: '',
      42: '',
    },
    lusd: {
      decimal: 8,
      1: '0x3D7aE7E594f2f2091Ad8798313450130d0Aba3a0',
      4: '',
      42: '',
    },
    alusd: {
      decimal: 8,
      1: '0xC3a8033Dc5f2FFc8AD9bE10f39063886055E22B7',
      4: '',
      42: '',
    },
    busd: {
      decimal: 8,
      1: '0x833D8Eb16D306ed1FbB5D7A2E019e106B960965A',
      4: '',
      42: '',
    },
    cover: {
      decimal: 8,
      1: '0x0ad50393F11FfAc4dd0fe5F1056448ecb75226Cf',
      4: '',
      42: '',
    },
    cvr: {
      decimal: 8,
      1: '0xCd627aA160A6fA45Eb793D19Ef54f5062F20f33f',
      4: '0x8d6D6eeA128a40EFbC0d0a04D7aaC36689F12A46',
      42: '0x1962ab2E748D202BEEf87a71b1E26dCDeD9456Ac',
    },
    doge: {
      decimal: 8,
      1: '0x2465CefD3b488BE410b941b1d4b2767088e2A028',
      4: '',
      42: '',
    },
    etc: {
      decimal: 8,
      1: '0xaEA2808407B7319A31A383B6F8B60f04BCa23cE2',
      4: '',
      42: '',
    },
    matic: {
      decimal: 8,
      1: '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676',
      4: '',
      42: '',
    },
    mkr: {
      decimal: 8,
      1: '0xec1D1B3b0443256cc3860e24a46F108e699484Aa',
      4: '',
      42: '',
    },
    sushi: {
      decimal: 8,
      1: '0xCc70F09A6CC17553b2E31954cD36E4A2d89501f7',
      4: '',
      42: '',
    },
  },
  tokens: {
    usdc: {
      decimal: { 1: 6, 4: 18, 42: 18 }
    }
  },
  nexusMutual: {
    1: '0x61002ee838244684c71cfc912f4404fa088cb596',
    4: '0x0000000000000000000000000000000000000000',
    42: '0x600cd52172f78d3Cc3593972d8Cf3BD4BBAcC4bB',
  },
  insureAce: {
    1: '0x3fc3c73001967fa8202ce119fbf484f4623f884b',
    4: '0x2Bf563Fff6e951724136d069D6D5e885742942B6',
    42: '0x0000000000000000000000000000000000000000',
  },
  distributor: {
    1: '0xEf45cB6d804551EE965766edcFA82A5D33F689F8',
    4: '0x0000000000000000000000000000000000000000',
    42: '0xe77250450FC9f682EdEfF9f0d252836189C01b53',
  },
  claims: {
    1: '',
    4: '0x0000000000000000000000000000000000000000',
    42: '0xD9F691640F058617D16758708D0B31bcFe44b90B',
  },
  claimsData: {
    1: '',
    4: '0x0000000000000000000000000000000000000000',
    42: '0xee778feA0CEBa8D4bAdE5565506B44F8F270c04D',
  },
  claimsReward: {
    1: '',
    4: '0x0000000000000000000000000000000000000000',
    42: '0x53e3b0cf9A1fF1bb0B267fd2988D76D9f9a6ba0a',
  },
};

module.exports = contracts;