<div align="center">
  <h1>🛡️ AegisPay</h1>
  
  <p><i>Privacy-Preserving Payroll on Stellar Soroban</i></p>
  
  <p>
    <img src="https://img.shields.io/badge/Stellar-Soroban-black?style=for-the-badge&logo=stellar" alt="Stellar Soroban" />
    <img src="https://img.shields.io/badge/React-Vite-blue?style=for-the-badge&logo=react" alt="React Vite" />
    <img src="https://img.shields.io/badge/Rust-Smart%20Contract-orange?style=for-the-badge&logo=rust" alt="Rust" />
    <img src="https://img.shields.io/badge/zk--SNARKs-Groth16-purple?style=for-the-badge" alt="zk-SNARKs" />
  </p>
</div>

![Main UI](./public/main.png)

<br />

## Problem & Solution

**The Problem:** Global payroll on public blockchains exposes sensitive salary data to the entire world. Employers want the efficiency and borderless nature of crypto payroll, but they cannot afford to leak individual employee compensations or identities on-chain. Conversely, employees want cryptographic guarantees that their wages are locked in escrow and claimable without friction.

**The Solution:** AegisPay leverages **Zero-Knowledge Proofs (zk-SNARKs)** and the **Stellar Soroban** smart contract platform to create a completely private payroll system. Employers fund a single, opaque escrow pool. Employees generate a cryptographic proof in their browser and claim their exact wage from the pool, entirely shielding their identity and salary amount from the public ledger.

---

## Purpose

To bridge the gap between enterprise privacy requirements and public blockchain efficiency, providing a secure, trustless, and zero-knowledge payroll distribution system for the modern remote workforce.

---

## Value Proposition

### Why This is Revolutionary / Key Advantages
* **Absolute Privacy:** Wage amounts and worker identities remain entirely off-chain and hidden via zk-SNARKs.
* **Gasless for Workers:** Utilizing a relayer architecture, workers do not need to hold XLM to pay for transaction fees to claim their wages.
* **Cryptographic Guarantees:** Once the employer funds the contract and updates the Merkle Root, the funds are mathematically guaranteed to be claimable by the authorized workers.

### Competitive Advantage / Comparison
Unlike traditional crypto payroll solutions (like Sablier or standard multisig distributions) that broadcast every recipient address and amount to the blockchain, AegisPay consolidates all funds into a single contract. Only the cryptographic footprint (a Nullifier) is recorded on-chain when a worker is paid.

### Ecosystem / Technology Advantage
* **Stellar Network:** Offers lightning-fast settlement times (3-5 seconds) and fractions of a cent in transaction fees, making micro-payroll feasible.
* **Soroban Smart Contracts:** Built in Rust, offering a safe, predictable, and highly performant execution environment for complex cryptographic verification.
* **SEP-31 Anchors:** Seamlessly integrates with Stellar's global network of fiat anchors, allowing workers to receive local fiat directly into their bank accounts.

---

## Product Mechanics

### How The System Works (Step-by-Step)
1. **Upload:** The Employer uploads a standard CSV file containing Worker IDs and their USD wage amounts to the Employer Dashboard.
2. **Convert & Commit:** The system fetches the live XLM/USD price, converts the wages, builds a Merkle Tree, and generates individual `.json` claim files for each worker.
3. **Fund Escrow:** The Employer deposits the total required XLM into the Soroban Smart Contract and sets the active Merkle Root.
4. **Distribute:** The Employer securely sends the individual `.json` claim files to their respective employees off-chain (e.g., via email).
5. **Generate Proof:** The Employee uploads their claim file to the AegisPay Worker UI. The UI generates a Groth16 zk-SNARK proof **locally in the browser** (no sensitive data leaves the device).
6. **Redeem & Route:** The Employee submits the proof (via a relayer) to the Soroban contract. The contract verifies the proof, checks that the nullifier hasn't been used, and routes the XLM to the worker's specified SEP-31 Anchor address for fiat conversion.

### Target Users
* **Global Enterprises & DAOs:** Organizations that need to pay contractors globally with crypto without doxxing their payroll sheet.
* **Remote Workers & Freelancers:** Individuals who want fast, guaranteed payouts routed directly to their local bank accounts.

### Features
* 🔄 **Live USD to XLM Conversion:** Real-time pricing oracle integration via CoinGecko.
* 🌳 **Merkle Tree Generation:** Efficiently compresses thousands of payroll records into a single 32-byte root.
* 🛡️ **In-Browser ZK Proving:** WASM-compiled Circom circuits run entirely client-side.
* 🚫 **Idempotency (Double-Spend Protection):** Cryptographic nullifiers ensure a claim file can only be redeemed once.

---

## Screenshots

* **Wallet Connected State:**
![Wallet Connected State](public/walletconnected.png)

* **Balance Displayed:**
![Balance Displayed](public/balancedisplay.png)

* **Successful Transaction Result:**
![Successful Transaction Result](public/transac.png)

* **Wallet Options:**
![Wallet Options](public/walletconnect.png)

* **Mobile View:**
![Mobile View](public/mobile.png)

* **Analytics:**
![Analytics](public/analytics.png)

* **CI/CD Pipeline:**
![CI/CD Pipeline](public/cicd.png)

* **Test Output:**
![Test Output](public/test.png)

---

## Engineering & Architecture

### Tech Stack
* **Frontend:** React, TypeScript, Vite, Framer Motion
* **Cryptography:** SnarkJS, Circom (BN254 Groth16)
* **Smart Contract:** Rust (Soroban SDK)
* **Blockchain Integration:** `@stellar/stellar-sdk`, `@stellar/freighter-api`

### Live Demo & Testnet Details
* **Live Demo:** [https://renzpao.github.io/AegisPay/](https://renzpao.github.io/AegisPay/)
  

https://github.com/user-attachments/assets/5cd00b9c-4455-4207-9798-9bcb03e2cf1d


- **Live Pitch Deck**: [https://renzpao.github.io/AegisPay/pitchdeck](https://renzpao.github.io/AegisPay/pitchdeck)
- **Demo Video (YouTube)**: [https://youtu.be/kC6y8D8Y65s](https://youtu.be/kC6y8D8Y65s)
* **Contract Address:** [`CC6QLF4DI7C6LKURR2V7XQOZ72BNG5BOKURQ2SYQHPTAZEHO7PLRMR5K`](https://stellar.expert/explorer/testnet/contract/CC6QLF4DI7C6LKURR2V7XQOZ72BNG5BOKURQ2SYQHPTAZEHO7PLRMR5K)
* **Transaction Hash:** [`e2105673626ac4aade91e70f6fad328b9ff57b053c07b2f1a55c059724dbbe0d`](https://stellar.expert/explorer/testnet/tx/e2105673626ac4aade91e70f6fad328b9ff57b053c07b2f1a55c059724dbbe0d)
![Testnet Contract](public/testnetv2.png)

### Architecture

```mermaid
graph TD
    A[Employer CSV] --> B[AegisPay UI: Merkle Tree Builder]
    B --> C[Soroban Escrow Contract: Fund & Set Root]
    B --> D[Worker Claim File .json]
    D --> E[Worker UI: SnarkJS Prover]
    E --> F[In-Browser Proof Generation]
    F --> G[Submit Tx with Proof]
    G --> C
    C -->|Verify ZK Proof| H{Valid?}
    H -->|Yes| I[Disburse XLM to Anchor]
    H -->|No| J[Reject]
```

### Advanced Technical Implementation (Deep Dive)
**Zero-Knowledge Smart Contract Verification:** 
AegisPay utilizes the Groth16 proving system. The BN254 elliptic curve cryptography is evaluated on-chain inside the Soroban Rust contract. We had to implement a custom XDR struct encoder in the frontend (`createStructScVal`) to correctly alphabetize and format the `Proof` and `PublicInputs` structs into Soroban `scvSymbol` mapped arrays to allow the contract's host environment to safely unpack and verify the SNARK.

---

## Project Lifecycle & Usage

### Prerequisites & Local Installation

| Dependency | Version | Notes |
| :--- | :--- | :--- |
| Node.js | v18+ | Required for the frontend |
| Rust | 1.80+ | Required for Soroban contracts |
| Stellar CLI | latest | For local network deployment |

```bash
# 1. Clone the repository
git clone https://github.com/RenzPao/AegisPay.git
cd AegisPay

# 2. Start the Frontend
cd frontend
npm install
npm run dev

# 3. Build the Smart Contract (Optional)
cd ../contracts/verifier
soroban contract build
```

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Proof of 50+ Users / Wallet Activity

| Wallet Address | Transaction Hash | Stellar Expert Link |
|---|---|---|
| GCKBPMSXVZCUW5XPJSSOLHRRXHSC4KZ4YAFLRXTZEFWC4METX4C7YG55 | 3c77e52f0c691f3... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCKBPMSXVZCUW5XPJSSOLHRRXHSC4KZ4YAFLRXTZEFWC4METX4C7YG55) |
| GBIBGWKYVDPFWYOE4K7AWNLBYZWYLKVAQAKARINBZUEPW2WSNGNJBVZD | dc5f0b95efc9d9f... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBIBGWKYVDPFWYOE4K7AWNLBYZWYLKVAQAKARINBZUEPW2WSNGNJBVZD) |
| GBFUHVGBZ53WR7UPSZABOTE427LRMBIHG4BK23ANZEIXC7XIK74WMYUK | 9f823a92dd49302... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBFUHVGBZ53WR7UPSZABOTE427LRMBIHG4BK23ANZEIXC7XIK74WMYUK) |
| GB5YCQ3JDW2BPKXLTAA2UYWEIWUE7NUSRP5NVKOBWJ7AFVWFQALNBBSE | 551a171f0759fc3... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GB5YCQ3JDW2BPKXLTAA2UYWEIWUE7NUSRP5NVKOBWJ7AFVWFQALNBBSE) |
| GBJLG2VYKC5TKKQHGO5ZDH6LQ2BD64533J4MPCMJDISKWRFTLZRMAXN3 | 4f25bc855f24085... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBJLG2VYKC5TKKQHGO5ZDH6LQ2BD64533J4MPCMJDISKWRFTLZRMAXN3) |
| GDIAD2A5KVIQDZUH6XC7CCJZ7WUSKCREHVMMEBUF4SWDBRF2SXNKSKVD | 3fd3f164094177c... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GDIAD2A5KVIQDZUH6XC7CCJZ7WUSKCREHVMMEBUF4SWDBRF2SXNKSKVD) |
| GCNZP7MXVVQJHODEAS4AJXFHUPJT7C2QDL6DFFH6EMIQOWVAIXEOPWRT | f898be377b2f7a8... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCNZP7MXVVQJHODEAS4AJXFHUPJT7C2QDL6DFFH6EMIQOWVAIXEOPWRT) |
| GC645UYSXJP6EHZSJ7G6B7GO5R4W7QD44DK5RKUTRYCFHLWVQKMJL2EH | c1825f31238f042... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GC645UYSXJP6EHZSJ7G6B7GO5R4W7QD44DK5RKUTRYCFHLWVQKMJL2EH) |
| GC4JWJNTQ37CJ3VI3FTJ5S55VBYI73KCSJI3UHL5NDHWBW6FURKIJPJW | f2002f94db373ba... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GC4JWJNTQ37CJ3VI3FTJ5S55VBYI73KCSJI3UHL5NDHWBW6FURKIJPJW) |
| GCA67WTEAAYHXKIDASLNCLWHVDNF74VKEWRPJXGD5N23PCMQBQLNFBFH | 75d0ebbc809de4e... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCA67WTEAAYHXKIDASLNCLWHVDNF74VKEWRPJXGD5N23PCMQBQLNFBFH) |
| GDXQ3KMSQ2XAFPLCCXRUQZUJ2WY5DG7HZL2MBAQRI5FEASFH6DNLE54G | d708475add263d2... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GDXQ3KMSQ2XAFPLCCXRUQZUJ2WY5DG7HZL2MBAQRI5FEASFH6DNLE54G) |
| GCX3ZI6PBRJXEULQUQO4CUWJ7GB3EJZGHKC2UQQST2KSGNI64MVOPSG3 | 8c5d191b61854f5... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCX3ZI6PBRJXEULQUQO4CUWJ7GB3EJZGHKC2UQQST2KSGNI64MVOPSG3) |
| GA5K4G7AGONRRRMZNFBN5GVMZDQMBJCHMBDSBUP53NY3SEG67XCXYN76 | 19bef36efffb3c3... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GA5K4G7AGONRRRMZNFBN5GVMZDQMBJCHMBDSBUP53NY3SEG67XCXYN76) |
| GCDUPLIIKFXCBRDPYR56UDT2FCYJWNK3DZ4MQ2Z5QXUWQF4HYO2CH3TM | 8ba20fa782bc1bd... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCDUPLIIKFXCBRDPYR56UDT2FCYJWNK3DZ4MQ2Z5QXUWQF4HYO2CH3TM) |
| GBHIGREB5OZYBEO4KXZ5V7T275PZ6GXD5CMV7DFMW4VVSDVDYCZYQNIQ | 40b0370b09f9054... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBHIGREB5OZYBEO4KXZ5V7T275PZ6GXD5CMV7DFMW4VVSDVDYCZYQNIQ) |
| GARX77WOWPP4P4KAJVI7D4CZDVNZFTW7DA7NYU47W6IKNQKE77URVKZS | a66bc858c8c89e7... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GARX77WOWPP4P4KAJVI7D4CZDVNZFTW7DA7NYU47W6IKNQKE77URVKZS) |
| GD6KS3PN7BWPICFZORGACL3473T3372UASRBMMBIKUIWCGPTQ3MEA6HW | cf35dc5dc92adc8... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GD6KS3PN7BWPICFZORGACL3473T3372UASRBMMBIKUIWCGPTQ3MEA6HW) |
| GCVZ6RBOZG33J46FSPBREDR3CTPQMZ7VNJMNKRLMYTWEYIILZCEMXG6B | 783b29873b996cc... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCVZ6RBOZG33J46FSPBREDR3CTPQMZ7VNJMNKRLMYTWEYIILZCEMXG6B) |
| GBBRIUIVZSM54ZL6XDUYCAKX54JQPWM7D2GYGAETJAEEWYLQVZOZYGCB | 5234969fb704798... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBBRIUIVZSM54ZL6XDUYCAKX54JQPWM7D2GYGAETJAEEWYLQVZOZYGCB) |
| GDFV4S7CEPVUZERFAC4SGB7FAYOHUXDAQ4TIY372ZYZPHHMEPXYBORYV | 7c70d14c84754aa... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GDFV4S7CEPVUZERFAC4SGB7FAYOHUXDAQ4TIY372ZYZPHHMEPXYBORYV) |
| GANESVMNUQCQPQV7LSPGUCGOR2CDZISWX6UIVH6RMQ2S4BKHMKLEQLDA | 67a93f9e997ba69... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GANESVMNUQCQPQV7LSPGUCGOR2CDZISWX6UIVH6RMQ2S4BKHMKLEQLDA) |
| GA6POXPWGCI4WGXUPFYKCUIU2QOMRGMUJ63C5VK33WM63EZEDQDTHSEZ | c52f18a79a39e71... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GA6POXPWGCI4WGXUPFYKCUIU2QOMRGMUJ63C5VK33WM63EZEDQDTHSEZ) |
| GBO4XAZ2EBJDXUOXGWSYEB6EAOAVAYD5OKQTRTURFIBCRGHOBRM3CAEY | 62aa58b681effa4... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBO4XAZ2EBJDXUOXGWSYEB6EAOAVAYD5OKQTRTURFIBCRGHOBRM3CAEY) |
| GBPLR7A55MZQTCUS3WI3BQY654JG7N6YJB6DK423PO2JEL7ZEBZMNJCS | 1a85a95638ceaf3... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBPLR7A55MZQTCUS3WI3BQY654JG7N6YJB6DK423PO2JEL7ZEBZMNJCS) |
| GAHZZTLXSOHXEIOJAHGGEZRN4AEQAMZPE523DBNITEDVGELFVV5CAQBQ | 3e7b500fbe9869a... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GAHZZTLXSOHXEIOJAHGGEZRN4AEQAMZPE523DBNITEDVGELFVV5CAQBQ) |
| GD5A6DGRUEXGBNC4PVSFDU6L77S3C44Z555WH6YTKFSLXGWJ3ZJE3UOT | 173a7f7d3f4bc7a... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GD5A6DGRUEXGBNC4PVSFDU6L77S3C44Z555WH6YTKFSLXGWJ3ZJE3UOT) |
| GAT5KQRGYSDAKRPNQUJIHIDUN7G34EM7JHTV32ZOFOZ44YI3V3YXNRPL | 34db27c2bcb1dd3... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GAT5KQRGYSDAKRPNQUJIHIDUN7G34EM7JHTV32ZOFOZ44YI3V3YXNRPL) |
| GC24XDXYWIACLKMBKBJR4JPDDEYI3KVTZCS6BMS4HWLOZDJPHNWRMMY6 | 0fc4a8dcde371f1... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GC24XDXYWIACLKMBKBJR4JPDDEYI3KVTZCS6BMS4HWLOZDJPHNWRMMY6) |
| GCO6ZMZTGGTTL5LBREQDUW6YJX2Y23AWMI2RVBO4WTOXGFZAJLX65SLX | 07233348d5503ab... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCO6ZMZTGGTTL5LBREQDUW6YJX2Y23AWMI2RVBO4WTOXGFZAJLX65SLX) |
| GCS5GUCKP3CMIIEBU3U6AV3ATXFE6I7RE65VQB547SRFZCN4N62C6PXV | a91884f7f9f9831... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCS5GUCKP3CMIIEBU3U6AV3ATXFE6I7RE65VQB547SRFZCN4N62C6PXV) |
| GCHTES4A26325RZBDWXPPNCM44OACO22DEV3DFA3R7SEQIDJ53OELMAA | ff941410e8eaaf5... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCHTES4A26325RZBDWXPPNCM44OACO22DEV3DFA3R7SEQIDJ53OELMAA) |
| GCUKW7HTQY7WHZ4JS34NMJRMPLBLPAYITPH7XFMBYGX6TI76QKM4EYQ6 | 822be2c7bcc13b8... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCUKW7HTQY7WHZ4JS34NMJRMPLBLPAYITPH7XFMBYGX6TI76QKM4EYQ6) |
| GBCKVV6SGF2JG5RINPTSZGSHOP5SOZXE7F56KPMUDVW25MIN3B4X52WF | 67b961ce0a4426b... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBCKVV6SGF2JG5RINPTSZGSHOP5SOZXE7F56KPMUDVW25MIN3B4X52WF) |
| GAXC36KHXPRDE72SBDFBUJR4WOV37HE2EDYLCFN74OVZM7CPNZNUVL54 | 190d1ed347dcd4e... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GAXC36KHXPRDE72SBDFBUJR4WOV37HE2EDYLCFN74OVZM7CPNZNUVL54) |
| GABZIOHF7WFZWT57FMSDZFVKRVBPZLHU7K6AY2KSIXD7U76Y75SNF7HV | 938fa6e196671fe... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GABZIOHF7WFZWT57FMSDZFVKRVBPZLHU7K6AY2KSIXD7U76Y75SNF7HV) |
| GATWLYZWB2ZBTDJFP3B3NB2HJF54J7ONDLULGPJVA34OCMVGD45JXQ4O | 1673e601f977a68... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GATWLYZWB2ZBTDJFP3B3NB2HJF54J7ONDLULGPJVA34OCMVGD45JXQ4O) |
| GDKQZ4TSVGVIFJVOORHIYAMGIMWOZL624Y4GLUIVRNRYA7UWHNEVKMY5 | afb1a98940a518a... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GDKQZ4TSVGVIFJVOORHIYAMGIMWOZL624Y4GLUIVRNRYA7UWHNEVKMY5) |
| GCCBPDKY3JKCJQWY44KFOMRDNWV6C32ELBQSCQB2CWZNUZIO3DXAGWOL | a1ca14ab1d080ad... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCCBPDKY3JKCJQWY44KFOMRDNWV6C32ELBQSCQB2CWZNUZIO3DXAGWOL) |
| GBMZBQ7MYN6I3VSWVZDTH6F2ZO6JZZXL3CWKOD4JG36F4S7VXK5PCNCN | e763cf8101349af... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBMZBQ7MYN6I3VSWVZDTH6F2ZO6JZZXL3CWKOD4JG36F4S7VXK5PCNCN) |
| GBLKU2A4Z6J43V2VZ6ZOTJROOH2CVKCF7VC6O4HU275GCNMXIVHS3TCE | 6c2432d66dcd1f1... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBLKU2A4Z6J43V2VZ6ZOTJROOH2CVKCF7VC6O4HU275GCNMXIVHS3TCE) |
| GA4I4RXW5HK2RXZZ3POVXPFOKCPCZWD6M5TEO2GAOBYFGBARJCZ2SMT5 | 46387152f7d7bde... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GA4I4RXW5HK2RXZZ3POVXPFOKCPCZWD6M5TEO2GAOBYFGBARJCZ2SMT5) |
| GBSAKWKXPM2A3YL2MB3FYF7CMR23UISNO5UWTGZDWU5PMDE7D4OEIT3Q | bab9d64fe1e1181... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBSAKWKXPM2A3YL2MB3FYF7CMR23UISNO5UWTGZDWU5PMDE7D4OEIT3Q) |
| GAIUE66U3F3POH35OXQTJEQH7RRGRNYPGF73KOFWLFFPJ5KFGVUSHMOO | a47658bd83a00da... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GAIUE66U3F3POH35OXQTJEQH7RRGRNYPGF73KOFWLFFPJ5KFGVUSHMOO) |
| GD3P6V32MQ3HG73QWV3SOEOVBVKIYI6QWVNIHNYXRYJJ3XEQETI72TUE | c4e4a027cccc369... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GD3P6V32MQ3HG73QWV3SOEOVBVKIYI6QWVNIHNYXRYJJ3XEQETI72TUE) |
| GDY5F7WBVQ6VNSRQUWGOZ6PBD6OTAW53UYCD47SE6XBSFPFKE2X6HC4T | e800d944983d5c8... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GDY5F7WBVQ6VNSRQUWGOZ6PBD6OTAW53UYCD47SE6XBSFPFKE2X6HC4T) |
| GAJYEUBBFYSZY2PNAVKFOH7ERMF2DBWAMF74LXEEEC4ZFQZEBYEJUWFC | 2cd29b2864ffadf... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GAJYEUBBFYSZY2PNAVKFOH7ERMF2DBWAMF74LXEEEC4ZFQZEBYEJUWFC) |
| GCAWTQW67INI6STOFD6PCT76BLG7TH3ITQO7TCUM3BTDBQVJQAWJDAEA | 2f28dabb6e89adb... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCAWTQW67INI6STOFD6PCT76BLG7TH3ITQO7TCUM3BTDBQVJQAWJDAEA) |
| GDXCBPRKLMTXHCRECESGR36LDFO4JV6GFCE7BSWRYOJMXNTAHOWH5V7H | 58fc0b0319ac65b... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GDXCBPRKLMTXHCRECESGR36LDFO4JV6GFCE7BSWRYOJMXNTAHOWH5V7H) |
| GANCQMH5WAJDOXFJHNIILFMKZDC2KY6X2EEP7YELAWFXPD2POVAAW5DO | f17fdded4d4b08a... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GANCQMH5WAJDOXFJHNIILFMKZDC2KY6X2EEP7YELAWFXPD2POVAAW5DO) |
| GBIA2ANAEQCWCBWERL2BQIQZCSSPZC3TEVQWCCUQHX2VKZTC54UQOMGI | 7bb863cbf86936f... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBIA2ANAEQCWCBWERL2BQIQZCSSPZC3TEVQWCCUQHX2VKZTC54UQOMGI) |
| GCIOYBJVTSAH5HOP6VH2TS2LJL3E7DSANFR5G3IM6B5XQHB54GQPUNDQ | d5b65a4c5671266... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCIOYBJVTSAH5HOP6VH2TS2LJL3E7DSANFR5G3IM6B5XQHB54GQPUNDQ) |
| GCYRTXWICYH4646YROHXLTT4NEEPRUBAA6JBGHHYETCIR2KTK3CNARDV | 6dcbbf869d85941... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCYRTXWICYH4646YROHXLTT4NEEPRUBAA6JBGHHYETCIR2KTK3CNARDV) |
| GCXZDCS6V7OTUYLOL6GIC5VBJXRBOPNTCZP2UYXSY2Q4THZMM5OWTQEM | c4cdf266fd096ba... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCXZDCS6V7OTUYLOL6GIC5VBJXRBOPNTCZP2UYXSY2Q4THZMM5OWTQEM) |
| GBCA5W4NVXMQG2PTAL4OH3H3I6LNWBAWH75OAXH3AMAQZZ3MTKSU3RJ5 | 8e4c1c2d90f1cd7... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBCA5W4NVXMQG2PTAL4OH3H3I6LNWBAWH75OAXH3AMAQZZ3MTKSU3RJ5) |
| GCBTTURJUALC7YSSOSTSR5AEZJZUIPSC27WNWPDK32B6LKOAE4HB22J4 | 8559524fd9dae20... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCBTTURJUALC7YSSOSTSR5AEZJZUIPSC27WNWPDK32B6LKOAE4HB22J4) |
| GBRXA5BY5FT52WZKCXEUHIHZO4JFYKMQ4ZZIXPFUPHBZFWBWKB23UGUB | 624c0895f930914... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GBRXA5BY5FT52WZKCXEUHIHZO4JFYKMQ4ZZIXPFUPHBZFWBWKB23UGUB) |
| GA64LF2X2QQIOVSMGKLJEWUHOXC4732CI2UYN7WTXP3O2QBN4UAEW7JX | f866365e8ce5037... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GA64LF2X2QQIOVSMGKLJEWUHOXC4732CI2UYN7WTXP3O2QBN4UAEW7JX) |
| GB24VAOZSVUHG4GUKCFHSNZMSZNLPDN6VBBGWWSMTNRS6M2DISHRY6B5 | 2cfee54c6b8ddb5... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GB24VAOZSVUHG4GUKCFHSNZMSZNLPDN6VBBGWWSMTNRS6M2DISHRY6B5) |
| GD67ZTHZC7NM3EY46MY4HU4UHXYARJDGYP2QCFOH2MBFKOHPS6FKCPRX | 439e50395799f92... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GD67ZTHZC7NM3EY46MY4HU4UHXYARJDGYP2QCFOH2MBFKOHPS6FKCPRX) |
| GDTE73O75ZBSD6LVJP2RGOYGBEBFVXQN7L4NL5J7TU5BBVQGHZE5NBYW | 452c3b12ced298e... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GDTE73O75ZBSD6LVJP2RGOYGBEBFVXQN7L4NL5J7TU5BBVQGHZE5NBYW) |
| GASPZO4YEQO5IS4EY5GBVJE4OFJ3LLXZGPEDVPNM3N4CA5AELT5LDOEZ | faf5220679a35e4... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GASPZO4YEQO5IS4EY5GBVJE4OFJ3LLXZGPEDVPNM3N4CA5AELT5LDOEZ) |
| GCYHOGALMQ7XZFXOFCFHV5TIN4HR4435VTWH7C3JPJKBIBYQI2DAFI3T | c2a9140e3b559c9... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCYHOGALMQ7XZFXOFCFHV5TIN4HR4435VTWH7C3JPJKBIBYQI2DAFI3T) |
| GDSQBG2KMSEXSFYTNNTID756QJDD2QJUVLFYMPL4XWCIOE3QSC4ZQFFL | c8c81adea97a30d... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GDSQBG2KMSEXSFYTNNTID756QJDD2QJUVLFYMPL4XWCIOE3QSC4ZQFFL) |
| GCLM5OFKTIU2LDU6YMDAHJYM4UV3FDXA6LZV75EA233GHB5AEPL6WIRA | 4846e8a5a7e0117... | [View on Stellar Expert](https://stellar.expert/explorer/testnet/account/GCLM5OFKTIU2LDU6YMDAHJYM4UV3FDXA6LZV75EA233GHB5AEPL6WIRA) |

## User Feedback

| Timestamp | Email Address |  Name | Wallet Address | Connecting my wallet and navigating the initial setup was fast, clear, and seamless. | Uploading payroll CSV data and initiating batch payments was intuitive and straightforward. | Generating the zero-knowledge proof and submitting the withdrawal request was smooth and completed in an acceptable amount of time. | I feel confident that my salary details and wallet identity remain private and protected when processing transactions on this app. | The application executed my transactions reliably without encountering confusing errors or unexpected failures. | Please rate the following aspects of your experience: [Value for Money] |
|---|---|---|---|---|---|---|---|---|---|
| 46226.03358926224 | gullesalthea00@gmail.com | Gulles, Althea Shane S. | GCS5GUCKP3CMIIEBU3U6AV3ATXFE6I7RE65VQB547SRFZCN4N62C6PXV | 5 | 5 | 4 | 5 | 5 |  |
| 46226.073176509526 | fernettepearl.franco55@gmail.com | Franco, Fernette Pearl M. | GD5A6DGRUEXGBNC4PVSFDU6L77S3C44Z555WH6YTKFSLXGWJ3ZJE3UOT | 5 | 5 | 5 | 5 | 5 | some of the crypto jargon is kinda confusing. A simple tooltip explaining how the encryption works would be great. |
| 46226.09135234531 | luizaaa.hebrez@gmail.com | Hebrez, Maria Luiza | GCUKW7HTQY7WHZ4JS34NMJRMPLBLPAYITPH7XFMBYGX6TI76QKM4EYQ6 | 5 | 5 | 5 | 4 | 5 |  |
| 46226.101438160236 | paulbenidictr@gmail.com | Reduta, Paul Benidict L. | GDXCBPRKLMTXHCRECESGR36LDFO4JV6GFCE7BSWRYOJMXNTAHOWH5V7H | 5 | 5 | 5 | 4 | 5 |  |
| 46226.14813291479 | kristofferan22@gmail.com | Anipan, Sigmund Kristoffer S. | GBIBGWKYVDPFWYOE4K7AWNLBYZWYLKVAQAKARINBZUEPW2WSNGNJBVZD | 5 | 5 | 5 | 5 | 5 |  |
| 46226.31887582384 | gutierrez.kingandrei21@gmail.com | Gutierrez, King Andrei B. | GCHTES4A26325RZBDWXPPNCM44OACO22DEV3DFA3R7SEQIDJ53OELMAA | 5 | 5 | 4 | 5 | 5 |  |
| 46226.36153143662 | aronstephenscordova@gmail.com | Cordova, Aron Stephen S. | GDFV4S7CEPVUZERFAC4SGB7FAYOHUXDAQ4TIY372ZYZPHHMEPXYBORYV | 5 | 4 | 5 | 5 | 5 |  |
| 46226.36746894304 | althea.mae.aragon12@gmail.com | Aragon, Althea Mae C. | GBFUHVGBZ53WR7UPSZABOTE427LRMBIHG4BK23ANZEIXC7XIK74WMYUK | 5 | 5 | 5 | 5 | 4 |  |
| 46226.38069378236 | dimayuga.adrieljoseph03@gmail.com | Dimayuga, Adriel Joseph I. | GBO4XAZ2EBJDXUOXGWSYEB6EAOAVAYD5OKQTRTURFIBCRGHOBRM3CAEY | 5 | 5 | 5 | 5 | 4 |  |
| 46226.413375049604 | ciaramariecondino0901@gmail.com | Condino, Ciara Marie M. | GBBRIUIVZSM54ZL6XDUYCAKX54JQPWM7D2GYGAETJAEEWYLQVZOZYGCB | 5 | 4 | 5 | 4 | 5 |  |
| 46226.510232871544 | arguelles.norlan1@gmail.com | Arguelles, Norlan C. | GB5YCQ3JDW2BPKXLTAA2UYWEIWUE7NUSRP5NVKOBWJ7AFVWFQALNBBSE | 5 | 5 | 5 | 5 | 5 |  |
| 46226.55703276863 | karlcaya0704@gmail.com | Caya, Karl Christian M. | GCVZ6RBOZG33J46FSPBREDR3CTPQMZ7VNJMNKRLMYTWEYIILZCEMXG6B | 5 | 4 | 5 | 5 | 4 |  |
| 46226.59443512881 | jundamdannkyle@gmail.com | Jundam, Dann Kyle O. | GBCKVV6SGF2JG5RINPTSZGSHOP5SOZXE7F56KPMUDVW25MIN3B4X52WF | 5 | 5 | 5 | 5 | 5 |  |
| 46226.61501432358 | gianrafaelroldan13@gmail.com | Roldan, Gian Rafael B. | GBIA2ANAEQCWCBWERL2BQIQZCSSPZC3TEVQWCCUQHX2VKZTC54UQOMGI | 5 | 5 | 5 | 5 | 5 |  |
| 46226.72805268077 | thonbernas1134@gmail.com | Bernas, Ernesto P. | GCA67WTEAAYHXKIDASLNCLWHVDNF74VKEWRPJXGD5N23PCMQBQLNFBFH | 5 | 5 | 5 | 4 | 4 |  |
| 46226.82237884574 | olandazo37@gmail.com | Dazo, Rollan D. | GA6POXPWGCI4WGXUPFYKCUIU2QOMRGMUJ63C5VK33WM63EZEDQDTHSEZ | 5 | 5 | 5 | 5 | 5 | i want something that would tell me exactly which row in my CSV is messed up before uploading. A template file would be a lifesaver |
| 46226.89742734137 | lopezhosheashania710@gmail.com | Lopez, Hoshea Shania C. | GABZIOHF7WFZWT57FMSDZFVKRVBPZLHU7K6AY2KSIXD7U76Y75SNF7HV | 4 | 5 | 5 | 5 | 5 |  |
| 46227.0466530884 | tstapxdl@gmail.com | Serohijos, Joshua L. | GBCA5W4NVXMQG2PTAL4OH3H3I6LNWBAWH75OAXH3AMAQZZ3MTKSU3RJ5 | 5 | 5 | 4 | 4 | 5 |  |
| 46227.18494468872 | bernadette14@gmail.com | Villanueva, Bernadette C. | GDTE73O75ZBSD6LVJP2RGOYGBEBFVXQN7L4NL5J7TU5BBVQGHZE5NBYW | 5 | 5 | 5 | 5 | 5 |  |
| 46227.2034269817 | kalelleee@gmail.com | Victorio, Kalelle Mae B. | GD67ZTHZC7NM3EY46MY4HU4UHXYARJDGYP2QCFOH2MBFKOHPS6FKCPRX | 5 | 5 | 3 | 5 | 5 |  |
| 46227.451254115775 | vinceadrianbesa@gmail.com | Besa, Vince Adrian A. | GDXQ3KMSQ2XAFPLCCXRUQZUJ2WY5DG7HZL2MBAQRI5FEASFH6DNLE54G | 5 | 5 | 4 | 5 | 5 |  |
| 46227.517045082044 | zcintillaserquina@gmail.com | Serquiña, Zcintilla R. | GCBTTURJUALC7YSSOSTSR5AEZJZUIPSC27WNWPDK32B6LKOAE4HB22J4 | 5 | 5 | 4 | 5 | 5 |  |
| 46227.56323831127 | corpus.precioushannah1@gmail.com | Corpus, Precious Hannah A. | GANESVMNUQCQPQV7LSPGUCGOR2CDZISWX6UIVH6RMQ2S4BKHMKLEQLDA | 5 | 4 | 5 | 5 | 5 |  |
| 46227.60107612251 | aefondo124@gmail.com | Efondo, Aaron Kyle D. | GBPLR7A55MZQTCUS3WI3BQY654JG7N6YJB6DK423PO2JEL7ZEBZMNJCS | 5 | 4 | 4 | 4 | 5 |  |
| 46227.683073045184 | annaydmaypineda15@gmail.com | Pineda, Dyanna May D. | GDY5F7WBVQ6VNSRQUWGOZ6PBD6OTAW53UYCD47SE6XBSFPFKE2X6HC4T | 5 | 5 | 5 | 4 | 5 |  |
| 46227.78291786543 | maestremichaelrua@gmail.com | Maestre, Michael Rua S. | GDKQZ4TSVGVIFJVOORHIYAMGIMWOZL624Y4GLUIVRNRYA7UWHNEVKMY5 | 5 | 5 | 5 | 5 | 5 |  |
| 46227.828478872405 | kenjicanpos829@gmail.com | Campos, Kenji Enishi R. | GBHIGREB5OZYBEO4KXZ5V7T275PZ6GXD5CMV7DFMW4VVSDVDYCZYQNIQ | 5 | 5 | 5 | 5 | 5 |  |
| 46227.860288322365 | johncriscaculitan01@gmail.com | Caculitan, John Cris C. | GCDUPLIIKFXCBRDPYR56UDT2FCYJWNK3DZ4MQ2Z5QXUWQF4HYO2CH3TM | 5 | 5 | 4 | 5 | 5 |  |
| 46227.86193037449 | mikee.capilitan@gmail.com | Capilitan, Mikee C. | GARX77WOWPP4P4KAJVI7D4CZDVNZFTW7DA7NYU47W6IKNQKE77URVKZS | 5 | 5 | 4 | 5 | 5 |  |
| 46227.865981999515 | johnmatthewbautista01@gmail.com | Bautista, John Matthew B. | GC645UYSXJP6EHZSJ7G6B7GO5R4W7QD44DK5RKUTRYCFHLWVQKMJL2EH | 5 | 5 | 5 | 5 | 4 |  |
| 46227.89275161005 | nioneszyra@gmail.com | Niones, Zyra Joy O. | GBSAKWKXPM2A3YL2MB3FYF7CMR23UISNO5UWTGZDWU5PMDE7D4OEIT3Q | 5 | 5 | 5 | 4 | 5 |  |
| 46227.99499491804 | abriannebuenacifra@gmail.com | Buenacifra, Abrianne V. | GA5K4G7AGONRRRMZNFBN5GVMZDQMBJCHMBDSBUP53NY3SEG67XCXYN76 | 5 | 5 | 5 | 5 | 5 |  |
| 46228.07493142978 | alexagonato@gmail.com | Gonato, Jan Alexa Louisse P. | GC24XDXYWIACLKMBKBJR4JPDDEYI3KVTZCS6BMS4HWLOZDJPHNWRMMY6 | 5 | 5 | 5 | 5 | 4 |  |
| 46228.113418707064 | jakimlopez28@gmail.com | Lopez, Jakim D. | GATWLYZWB2ZBTDJFP3B3NB2HJF54J7ONDLULGPJVA34OCMVGD45JXQ4O | 5 | 5 | 5 | 5 | 5 |  |
| 46228.12196413877 | causonmikolorenz@gmail.com | Causon, Miko Lorenz O. | GD6KS3PN7BWPICFZORGACL3473T3372UASRBMMBIKUIWCGPTQ3MEA6HW | 5 | 5 | 4 | 4 | 5 |  |
| 46228.16129112787 | maroselacetolentino@gmail.com | Tolentino, Ma. Rose L. | GB24VAOZSVUHG4GUKCFHSNZMSZNLPDN6VBBGWWSMTNRS6M2DISHRY6B5 | 5 | 5 | 3 | 5 | 5 |  |
| 46228.28001674321 | dionkylo123@gmail.com | Manicio, Dion Kylo C. | GBMZBQ7MYN6I3VSWVZDTH6F2ZO6JZZXL3CWKOD4JG36F4S7VXK5PCNCN | 5 | 4 | 5 | 5 | 4 |  |
| 46228.303621665254 | althenoteroo@gmail.com | Tero, Altheno Mari L. | GBRXA5BY5FT52WZKCXEUHIHZO4JFYKMQ4ZZIXPFUPHBZFWBWKB23UGUB | 5 | 5 | 4 | 5 | 5 |  |
| 46228.47916241006 | agultorazehl@gmail.com | Agulto, Jermaine Razeh S. | GCKBPMSXVZCUW5XPJSSOLHRRXHSC4KZ4YAFLRXTZEFWC4METX4C7YG55 | 5 | 5 | 5 | 4 | 5 |  |
| 46228.59393836684 | hanzmatthewgagtan0920@gmail.com | Gagtan, Hanz Matthew A. | GAT5KQRGYSDAKRPNQUJIHIDUN7G34EM7JHTV32ZOFOZ44YI3V3YXNRPL | 5 | 5 | 5 | 5 | 5 |  |
| 46228.598654491725 | rainey231@gmail.com | Romero, Dianna Rain M. | GCIOYBJVTSAH5HOP6VH2TS2LJL3E7DSANFR5G3IM6B5XQHB54GQPUNDQ | 5 | 5 | 4 | 5 | 5 |  |
| 46228.73329885192 | jairaocariza@gmail.com | Ocariza, Jaira Isabel F. | GAIUE66U3F3POH35OXQTJEQH7RRGRNYPGF73KOFWLFFPJ5KFGVUSHMOO | 5 | 5 | 5 | 5 | 5 |  |
| 46228.78649053259 | johnkeithvillarta3@gmail.com | Villarta, John Keith B. | GASPZO4YEQO5IS4EY5GBVJE4OFJ3LLXZGPEDVPNM3N4CA5AELT5LDOEZ | 5 | 5 | 5 | 5 | 5 |  |
| 46228.82789444143 | euriellebayos0052@gmail.com | Bayos, Eurielle T. | GC4JWJNTQ37CJ3VI3FTJ5S55VBYI73KCSJI3UHL5NDHWBW6FURKIJPJW | 4 | 5 | 5 | 5 | 5 |  |
| 46228.874431498174 | rgslspr14@gmail.com | Salespara, Rica Genevive B. | GCYRTXWICYH4646YROHXLTT4NEEPRUBAA6JBGHHYETCIR2KTK3CNARDV | 5 | 4 | 4 | 4 | 5 |  |
| 46228.90135671653 | mikaela.bartolome13@gmail.com | Bartolome, Mikaela Joy T. | GDIAD2A5KVIQDZUH6XC7CCJZ7WUSKCREHVMMEBUF4SWDBRF2SXNKSKVD | 5 | 5 | 5 | 4 | 4 |  |
| 46229.035343717165 | gracegabrielle17@gmail.com | Banzali, Grace Gabrielle P. | GBJLG2VYKC5TKKQHGO5ZDH6LQ2BD64533J4MPCMJDISKWRFTLZRMAXN3 | 5 | 4 | 5 | 5 | 5 |  |
| 46229.23718393678 | angellajaneraymundo05@gmail.com | Raymundo, Angella Jane C. | GCAWTQW67INI6STOFD6PCT76BLG7TH3ITQO7TCUM3BTDBQVJQAWJDAEA | 4 | 4 | 5 | 5 | 5 |  |
| 46229.31749930201 | sariogrld02@gmail.com | Sario, Gerald B. | GCXZDCS6V7OTUYLOL6GIC5VBJXRBOPNTCZP2UYXSY2Q4THZMM5OWTQEM | 4 | 5 | 5 | 4 | 5 |  |
| 46229.38902110753 | joshmespinola@gmail.com | Espinola, Frankie Josh M. | GAHZZTLXSOHXEIOJAHGGEZRN4AEQAMZPE523DBNITEDVGELFVV5CAQBQ | 5 | 4 | 5 | 5 | 5 |  |
| 46229.42717938416 | christianbataller788@gmail.com | Bataller, Christian R. | GCNZP7MXVVQJHODEAS4AJXFHUPJT7C2QDL6DFFH6EMIQOWVAIXEOPWRT | 5 | 5 | 5 | 5 | 5 |  |
| 46229.55963793694 | johnpaul7519@gmail.com | Rodriguez, John Paul Olores | GANCQMH5WAJDOXFJHNIILFMKZDC2KY6X2EEP7YELAWFXPD2POVAAW5DO | 4 | 5 | 5 | 5 | 4 |  |
| 46229.696842686004 | jmmanagbanag123@gmail.com | Managbanag, John Mark E. | GCCBPDKY3JKCJQWY44KFOMRDNWV6C32ELBQSCQB2CWZNUZIO3DXAGWOL | 4 | 5 | 5 | 5 | 5 |  |
| 46229.71641705357 | jaolazo4@gmail.com | Olazo, John Albert F. | GD3P6V32MQ3HG73QWV3SOEOVBVKIYI6QWVNIHNYXRYJJ3XEQETI72TUE | 5 | 5 | 5 | 5 | 5 |  |
| 46229.79327487116 | bualatbenchbrian@gmail.com | Bualat, Bench Brian B. | GCX3ZI6PBRJXEULQUQO4CUWJ7GB3EJZGHKC2UQQST2KSGNI64MVOPSG3 | 5 | 5 | 5 | 4 | 5 |  |
| 46229.829059427604 | moraleswomandaphne@gmail.com | Morales, Woman Daphne P. | GA4I4RXW5HK2RXZZ3POVXPFOKCPCZWD6M5TEO2GAOBYFGBARJCZ2SMT5 | 5 | 4 | 5 | 5 | 5 |  |
| 46229.832677026585 | duncan222@gmail.com | Gonot, Jedi Duncan S. | GCO6ZMZTGGTTL5LBREQDUW6YJX2Y23AWMI2RVBO4WTOXGFZAJLX65SLX | 4 | 5 | 5 | 5 | 5 | Please add a button to export my payout history as a PDF or CSV! I really need simple receipts for tax season instead of just relying on the blockchain |
| 46229.86802986687 | tevesgwenn.sch@gmail.com | Teves, Gwen L. | GA64LF2X2QQIOVSMGKLJEWUHOXC4732CI2UYN7WTXP3O2QBN4UAEW7JX | 5 | 5 | 3 | 5 | 5 |  |
| 46229.90549155418 | kianbenedict7@gmail.com | Miguel, Kian Benedict U. | GBLKU2A4Z6J43V2VZ6ZOTJROOH2CVKCF7VC6O4HU275GCNMXIVHS3TCE | 5 | 5 | 5 | 5 | 5 |  |
| 46229.93073740131 | limgraceannef@gmail.com | Lim, Grace Anne F. | GAXC36KHXPRDE72SBDFBUJR4WOV37HE2EDYLCFN74OVZM7CPNZNUVL54 | 4 | 5 | 5 | 5 | 5 |  |
| 46229.94432338665 | raquemannierose36@gmail.com | Raquem, Annie Rose S. | GAJYEUBBFYSZY2PNAVKFOH7ERMF2DBWAMF74LXEEEC4ZFQZEBYEJUWFC | 5 | 5 | 4 | 5 | 5 |  |
