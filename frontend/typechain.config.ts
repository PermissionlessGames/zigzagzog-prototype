import { Config } from '@typechain/core';

const config: Config = {
  outDir: 'src/contracts/types',
  target: 'ethers-v6',
  alwaysGenerateOverloads: false,
  discriminateTypes: false,
};

export default config; 