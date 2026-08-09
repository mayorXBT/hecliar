import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("HecliarGameModule", (module) => {
  const game = module.contract("HecliarGame");
  return { game };
});
