import { Keypair, Horizon, TransactionBuilder, Networks, Operation, Asset } from '@stellar/stellar-sdk';
import fs from 'fs';

const TARGET_ADDRESS = 'GBHKME6CS3OJXGF4IU75OQTY7ORW4MDYPZIWRIVUXA3D5TQUTXSDY6T3';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const TARGET_AMOUNT = 2_000_000;
const BATCH_SIZE = 1;

const server = new Horizon.Server(HORIZON_URL);

async function fundAndMerge() {
    try {
        // 1. Generate new keypair
        const pair = Keypair.random();
        console.log(`Created account: ${pair.publicKey()}`);

        // 2. Fund with friendbot
        console.log(`Funding with friendbot...`);
        const res = await fetch(`https://friendbot.stellar.org?addr=${pair.publicKey()}`);
        if (!res.ok) {
            throw new Error(`Friendbot failed: ${res.statusText}`);
        }
        await res.json();
        console.log(`Funded! Loading account...`);

        // 3. Load account
        const account = await server.loadAccount(pair.publicKey());

        // 4. Build AccountMerge transaction
        // AccountMerge transfers all XLM to destination and deletes the source account
        const tx = new TransactionBuilder(account, {
            fee: "1000", // 1000 stroops to ensure it passes
            networkPassphrase: Networks.TESTNET
        })
        .addOperation(Operation.accountMerge({
            destination: TARGET_ADDRESS
        }))
        .setTimeout(30)
        .build();

        // 5. Sign and submit
        tx.sign(pair);
        console.log(`Submitting merge transaction for ${pair.publicKey()}...`);
        const submitRes = await server.submitTransaction(tx);
        console.log(`Successfully merged! Hash: ${submitRes.hash}`);
        return 10000; // Friendbot gives 10k XLM
    } catch (err) {
        console.error(`Error processing account:`, err.message);
        return 0; // Failed
    }
}

async function main() {
    console.log(`Targeting 2,000,000 XLM to ${TARGET_ADDRESS}`);
    let totalCollected = 0;

    // We need 2,000,000 / 10,000 = 200 successful merges
    while (totalCollected < TARGET_AMOUNT) {
        console.log(`\n--- Progress: ${totalCollected} / ${TARGET_AMOUNT} XLM ---`);
        
        const tasks = [];
        for (let i = 0; i < BATCH_SIZE; i++) {
            if (totalCollected + (i * 10000) < TARGET_AMOUNT) {
                tasks.push(fundAndMerge());
            }
        }
        
        if (tasks.length === 0) break;

        const results = await Promise.all(tasks);
        for (const amount of results) {
            totalCollected += amount;
        }
        
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\nFinished! Collected approximately ${totalCollected} XLM.`);
}

main().catch(console.error);
