# Elusiv SDK
This is the SDK for interacting with the on-chain Elusiv Program

### Usage
The main idea of Elusiv is that you have a private balance on-chain, from which you can send money and receive money into while maintaining your privacy i.e. without anyone being able to see your associated public key. Therefore, the two core operations you can perform on your private balance is topping it up with funds and sending funds from your private balance. 

The most important part of the SDK is the Elusiv class, which provides all methods needed to easily and portably interact with the on-chain program. 

There, the main flow generally goes 

0. (Create the Elusiv Instance)
1. Create an Elusiv transaction
2. Send off the Elusiv transaction
3. Wait for it to confirm.

Doing these steps can be seen in the sample code below:

```js
// Create the elusiv instance
const cluster = 'devnet';
const elusiv = await Elusiv.getElusivInstance(seed, getUserPubKey(), connection, cluster);

// Top up our private balance with 1 SOL
const topupTxData = await elusiv.buildTopUpTx(LAMPORTS_PER_SOL, 'LAMPORTS');

// Since this the topup, the funds still come from our original wallet. This is just
// a regular Solana transaction in this case.
topupTxData.tx = signTx(topupTxData.tx);

const storeSig = await elusiv.sendElusivTx(topupTxData);

// Send half a SOL, privately 😎
const sendTx = await elusiv.buildSendTx(0.5 * LAMPORTS_PER_SOL, recipient, 'LAMPORTS');

const sendSig = await elusiv.sendElusivTx(sendTx);

console.log('Ta-da!');

```

More Info can be found on the other doc pages. That's all (for now) - Happy private sending!
