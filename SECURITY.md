# Security Policy

## Supported Versions

We currently support the following versions of AegisPay with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Security is a top priority for AegisPay, especially regarding zero-knowledge circuits and smart contract logic handling payroll funds. 

If you discover a security vulnerability in AegisPay, please **DO NOT** publicly disclose it or open a public GitHub issue. 

Instead, please send an email to **security@aegispay.example.com**. 

When reporting a vulnerability, please include the following information:

* A detailed description of the vulnerability.
* Step-by-step instructions to reproduce the issue.
* Proof-of-concept (PoC) code or scripts, if applicable.
* The impact of the vulnerability (e.g., unauthorized access to funds, proof forgery).

We aim to acknowledge all reports within 48 hours and will keep you informed of our progress as we investigate and develop a patch.

## Security Audits

We are committed to continuous security analysis. Any formal security audit reports will be published in the `docs/audits/` directory of this repository once completed. We encourage the community and independent researchers to run static analysis tools against both our frontend and our Soroban smart contracts.
