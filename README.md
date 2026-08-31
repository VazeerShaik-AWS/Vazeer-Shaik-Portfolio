# Vazeer Shaik — AWS Cloud Portfolio

Personal AWS Cloud & DevOps portfolio showcasing production-style cloud architectures, serverless systems, Infrastructure as Code, security patterns, containerized workloads, and real-world AWS implementations.

The portfolio is deployed to AWS through a secure automated CI/CD pipeline using GitHub Actions, GitHub OIDC, AWS IAM, Amazon S3, and Amazon CloudFront.

---

## Live Deployments

**Production — AWS CloudFront**  
https://www.vazeershaik.in/

**Backup — GitHub Pages**  
https://vazeershaik-aws.github.io/Vazeer-Shaik-Portfolio/

---

## Overview

The production environment uses a secure and cost-efficient AWS architecture for static content delivery.

- **Amazon S3** — Private origin for portfolio assets
- **Amazon CloudFront** — CDN and global content delivery
- **CloudFront Origin Access Control (OAC)** — Secure access to the private S3 origin
- **AWS IAM** — Least-privilege deployment authorization
- **AWS STS** — Short-lived temporary credentials
- **GitHub OIDC** — Federated authentication between GitHub Actions and AWS
- **GitHub Actions** — Automated CI/CD

The GitHub repository serves as the single source of truth for both AWS production deployment and GitHub Pages backup deployment.

---

## Deployment Flow

Code Change
    |
    v
Git Commit
    |
    v
GitHub Push
    |
    v
GitHub Actions
    |
    v
GitHub OIDC
    |
    v
AWS IAM Role
    |
    v
AWS STS Temporary Credentials
    |
    +----------------------+
    |                      |
    v                      v
Amazon S3          CloudFront Invalidation
    |                      |
    +----------+-----------+
               |
               v
        Amazon CloudFront
               |
               v
     https://www.vazeershaik.in/

---

## Contact

Email: vazeershaik.aws@gmail.com

GitHub: https://github.com/VazeerShaik-AWS

LinkedIn: https://www.linkedin.com/in/vazeer-shaik

---

## Focus

Building scalable, resilient, secure, and cost-optimized cloud systems using AWS, Infrastructure as Code, containers, Kubernetes, DevOps automation, CI/CD, and production-oriented architecture patterns.
