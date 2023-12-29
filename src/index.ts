import { ethers, Signer } from "ethers";
import dotenv from "dotenv";
import { Client, Presets } from "userop";
import { SimpleAccountAPI } from "@account-abstraction/sdk";

dotenv.config();

async function main() {
  const factoryAddress = process.env.FACTORY_ADDRESS || "";
  const entryPointAddress = process.env.ENTRYPOINT_ADDRESS || "";
  const bundler = process.env.BUNDLER_RPC || "";
  const funderPK = process.env.FUNDER_PK || "";

  const provider = new ethers.providers.JsonRpcProvider(bundler);
  const funder = new ethers.Wallet(funderPK, provider);

  const privateKey = ethers.Wallet.createRandom().privateKey;
  const owner = new ethers.Wallet(privateKey);

  console.log(privateKey);
  

  const smartAccount = await Presets.Builder.SimpleAccount.init(
    owner,
    bundler,
    { entryPoint: entryPointAddress, factory: factoryAddress }
  );

  console.log("getSender", smartAccount.getSender());

  const client = await Client.init(bundler, {
    entryPoint: entryPointAddress,
  });

  const userop = await client.buildUserOperation(
    smartAccount.execute(smartAccount.getSender(), 0, "0x")
  );

  console.log(userop);

  const walletAPI = new SimpleAccountAPI({
    provider,
    entryPointAddress,
    owner,
    factoryAddress,
  });

  const estimateCreationGas = await walletAPI.estimateCreationGas(
    userop.initCode.toString()
  );

  const gasPrice = await provider.getGasPrice();

  const calculateGas = ethers.BigNumber.from(estimateCreationGas)
    .mul(gasPrice)
    .add(ethers.utils.parseEther("0.01"));

  const sendFundTx = await funder.sendTransaction({
    to: smartAccount.getSender(),
    value: calculateGas,
  });

  await sendFundTx.wait();

  const result = await client.sendUserOperation(
    smartAccount.execute(smartAccount.getSender(), 0, "0x")
    // contact.getBalance()
  );

  await result.wait();

  await new Promise((resolve, reject) => {
    try {
      setTimeout(() => {
        resolve;
      }, 1500);
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });

  console.log({ result });
}

main();
