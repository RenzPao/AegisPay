import { Keypair, Horizon, TransactionBuilder, Networks, Operation, Asset } from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new Horizon.Server(HORIZON_URL);
const TARGET_SUCCESSES = 61;
const OUTPUT_FILE = path.join(process.cwd(), 'test_scripts', 'activity.csv');

// Generate a dummy valid address for testing trustline operation
const USDC_ISSUER = Keypair.random().publicKey();
const USDC_ASSET = new Asset('USDC', USDC_ISSUER);

const OPERATIONS = ['PAYMENT', 'TRUSTLINE', 'MANAGE_DATA'];

function getRandomOperation(sourceAccount) {
    const opType = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];
    
    switch (opType) {
        case 'PAYMENT':
            return {
                type: 'PAYMENT',
                op: Operation.payment({
                    destination: Keypair.random().publicKey(),
                    asset: Asset.native(),
                    amount: (Math.random() * 10 + 1).toFixed(2) // Send 1-10 XLM
                })
            };
        case 'TRUSTLINE':
            return {
                type: 'TRUSTLINE',
                op: Operation.changeTrust({
                    asset: USDC_ASSET
                })
            };
        case 'MANAGE_DATA':
            return {
                type: 'MANAGE_DATA',
                op: Operation.manageData({
                    name: `test_${Math.floor(Math.random() * 1000)}`,
                    value: `value_${Math.floor(Math.random() * 1000)}`
                })
            };
    }
}

async function run() {
    // Ensure output directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write CSV Header
    if (!fs.existsSync(OUTPUT_FILE)) {
        fs.writeFileSync(OUTPUT_FILE, 'Wallet Address,Transaction ID,Stellar Expert Link,Transaction Type,Status\n');
    }

    console.log(`Starting activity generation for ${TARGET_SUCCESSES} accounts...`);
    let successes = 0;

    while (successes < TARGET_SUCCESSES) {
        try {
            const pair = Keypair.random();
            const publicKey = pair.publicKey();
            console.log(`\n[${successes + 1}/${TARGET_SUCCESSES}] Creating account: ${publicKey}`);
            
            // Fund with friendbot
            const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
            if (!res.ok) {
                console.log(`Friendbot failed, retrying...`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            await res.json();
            
            const account = await server.loadAccount(publicKey);
            
            // Generate random transaction
            const randOp = getRandomOperation(account);
            console.log(`Executing ${randOp.type}...`);
            
            const tx = new TransactionBuilder(account, {
                fee: "1000",
                networkPassphrase: Networks.TESTNET
            })
            .addOperation(randOp.op)
            .setTimeout(30)
            .build();
            
            tx.sign(pair);
            const submitRes = await server.submitTransaction(tx);
            
            const txHash = submitRes.hash;
            const expertLink = `https://stellar.expert/explorer/testnet/tx/${txHash}`;
            
            // Append to CSV
            const csvLine = `${publicKey},${txHash},${expertLink},${randOp.type},SUCCESS\n`;
            fs.appendFileSync(OUTPUT_FILE, csvLine);
            
            console.log(`Success! Transaction: ${expertLink}`);
            successes++;
            
            // Avoid rate limits
            await new Promise(r => setTimeout(r, 1500));
            
        } catch (err) {
            console.error(`Transaction failed: ${err?.response?.data?.extras?.result_codes?.transaction || err.message}`);
            // We do not increment `successes`, loop will retry with a new account
        }
    }
    
    console.log(`\nFinished successfully! All ${TARGET_SUCCESSES} interactions recorded in ${OUTPUT_FILE}`);
}

run().catch(console.error);
