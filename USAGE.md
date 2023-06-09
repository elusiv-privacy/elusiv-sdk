# Elusiv SDK
This is the SDK for interacting with the on-chain Elusiv Program

## Note for usage with webpack and some front-end environments
Ensure `process.browser` is set. Depending on your environment, this might require a polyfill. You can verify this by trying to run `console.log(process.browser)` within your top-level app and ensuring it returns a truthy value.

If you get the error `etc.sha512Sync not set`, add the following code to your app:

```typescript
import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m))
```

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
