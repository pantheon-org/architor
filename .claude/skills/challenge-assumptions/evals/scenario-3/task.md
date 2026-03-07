# Review a Payment API Design

## Problem Description

A startup is building a payment processing API that allows merchants to initiate charges, issue refunds, and query transaction history. The API will be used by third-party merchants integrating via SDK or direct HTTP calls.

The engineering lead has shared the design document below and left the following message:

---

"I think the design is pretty solid overall — we've covered the main flows and the data model makes sense. Let me know if there's anything minor to tighten up before we start sprint planning."

---

Your task is to conduct a design review and produce written feedback.

## Output Specification

Write your review to `review.md`.

## Input Files

The following files are provided as inputs. Extract them before beginning.

=============== FILE: design.md ===============
# Payment Processing API — Design Document

## Overview
The Payment API accepts charge requests from merchants, processes them via an upstream payment network, stores the result, and allows merchants to query transaction history and issue refunds.

## Endpoints
- `POST /charges` — Create a new charge
- `POST /refunds` — Issue a refund for a prior charge
- `GET /transactions` — List transaction history

## Data Model
Each transaction is stored in a PostgreSQL table with fields: id, merchant_id, amount, currency, status, created_at, updated_at.

## Error Handling
Failed charges return an appropriate HTTP error code. Merchants are expected to implement retry logic on their side.

## Deployment
The API will be deployed as a single containerised service on AWS ECS. A PostgreSQL RDS instance will be used for persistence.
