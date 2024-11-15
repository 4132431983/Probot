const { ethers } = require("ethers");
const axios = require("axios");

// Configuration
const providerUrl = "https://eth-mainnet.alchemyapi.io/v2/qA9FV5BMTFx6p7638jhqx-JDFDByAZAn"; // Replace with your Infura/Alchemy provider URL
const privateKey = "ee9cec01ff03c0adea731d7c5a84f7b412bfd062b9ff35126520b3eb3d5ff258"; // Your wallet's private key
const destinationWallet = "0x08f695b8669b648897ed5399b9b5d951b72881a0"; // Safe wallet address to transfer USDT
const usdtContractAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7"; // USDT contract address (e.g., 0xdAC17F958D2ee523a2206206994597C13D831ec7)
const telegramBotToken = "7673283097:AAFpBQTArL6bEIe04ITxAfvrWPbrcgfvtVg"; // Telegram bot token
const telegramChatId = "7474852341"; // Telegram chat ID

// Connect to Ethereum provider
const provider = new ethers.JsonRpcProvider(providerUrl);
const wallet = new ethers.Wallet(privateKey, provider);

// USDT Contract ABI (ERC20 standard)
const usdtAbi = [
  "function transfer(address recipient, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)"
];
const usdtContract = new ethers.Contract(usdtContractAddress, usdtAbi, wallet);

// Amount of USDT to transfer (in smallest units, 6 decimals for USDT)

const usdtAmount = ethers.parseUnits("2100", 6); // Converts 2100 to 6 decimal places
// Function to send a Telegram notification
async function sendTelegramNotification(message) {
  const url = "https://api.telegram.org/bot${7673283097:AAFpBQTArL6bEIe04ITxAfvrWPbrcgfvtVg}/sendMessage";
  const params = { chat_id: 7474852341, text: message };
  try {
    await axios.post(url, params);
    console.log("Telegram notification sent:", message);
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
  }
}

// Function to transfer 2100 USDT to the safe wallet
async function transferUSDT() {
  try {
    // Check USDT balance
    const usdtBalance = await usdtContract.balanceOf(wallet.address);
    if (usdtBalance.lt(usdtAmount)) {
      console.log(`Insufficient USDT balance. Available: ${ethers.utils.formatUnits(usdtBalance, 6)} USDT`);
      return;
    }

    console.log("USDT Balance:", ethers.utils.formatUnits(usdtBalance, 6));

    // Estimate gas cost
    const gasPrice = await provider.getGasPrice();
    const gasLimit = 100000; // Estimated gas limit for ERC20 transfer
    const estimatedGasFee = gasPrice.mul(gasLimit);

    // Check ETH balance
    const ethBalance = await provider.getBalance(wallet.address);
    if (ethBalance.lt(estimatedGasFee)) {
      console.log("Not enough ETH to cover gas fee. Waiting for more ETH...");
      return;
    }

    console.log("Sufficient ETH for gas. Proceeding with USDT transfer...");

    // Prepare USDT transfer transaction
    const tx = await usdtContract.transfer(destinationWallet, usdtAmount);
    console.log("USDT Transfer Transaction Sent. Hash:", tx.hash);

    await tx.wait(); // Wait for confirmation
    console.log("USDT Transfer Successful. Transaction Hash:", tx.hash);
    await sendTelegramNotification(`2100 USDT transfer successful! Hash: ${tx.hash}`);
  } catch (error) {
    console.error("Error during USDT transfer:", error);
    await sendTelegramNotification(`Error during USDT transfer: ${error.message}`);
  }
}

// Function to monitor ETH balance and block unauthorized transactions
async function monitorWallet() {
  let lastEthBalance = await provider.getBalance(wallet.address);

  setInterval(async () => {
    try {
      const currentEthBalance = ethers.BigNumber.from(await provider.getBalance(senderWalletAddress));

      // Notify and attempt USDT transfer when ETH is received
      if (currentEthBalance.gt(lastEthBalance)) {
        if (currentEthBalance.gt(ethers.utils.parseEther("0.01"))) {
    console.log("Sufficient ETH balance detected!");
}
        await sendTelegramNotification(
          `ETH received: ${ethers.utils.formatEther(receivedAmount)} ETH. Total Balance: ${ethers.utils.formatEther(currentEthBalance)} ETH`
        );

        // Attempt USDT transfer after ETH is received
        await transferUSDT();

        lastEthBalance = currentEthBalance;
      }
    } catch (error) {
      console.

error("Error monitoring wallet:", error);
    }
  }, 5000); // Check every 5 seconds
}

// Function to monitor pending transactions and block unauthorized ones
async function monitorPendingTransactions() {
  provider.on("pending", async (txHash) => {
    try {
      const tx = await provider.getTransaction(txHash);
      if (tx && tx.from.toLowerCase() === wallet.address.toLowerCase()) {
        console.log("Outgoing transaction detected:", txHash);

        // Block unauthorized transactions
        console.log("Blocking unauthorized transaction...");
        const cancelTx = {
          to: wallet.address, // Self-send to cancel the transaction
          value: ethers.utils.parseEther("0"), // No ETH transfer
          gasPrice: tx.gasPrice.add(ethers.utils.parseUnits("10", "gwei")), // Higher gas price
          gasLimit: tx.gasLimit,
          nonce: tx.nonce // Use the same nonce as the detected transaction
        };

        const signedCancelTx = await wallet.signTransaction(cancelTx);
        const txResponse = await provider.sendTransaction(signedCancelTx);
        console.log("Cancel transaction sent. Hash:", txResponse.hash);
        await sendTelegramNotification(`Blocked unauthorized transaction: ${txHash}. Replaced with cancel transaction: ${txResponse.hash}`);
      }
    } catch (error) {
      console.error("Error monitoring pending transactions:", error);
    }
  });
}

// Main function to start the process
(async () => {
  console.log("Starting wallet monitor and protection...");
  await sendTelegramNotification("Wallet monitor and protection started.");
  monitorWallet(); // Monitor ETH balance and attempt USDT transfer
  monitorPendingTransactions(); // Block unauthorized transactions
})();