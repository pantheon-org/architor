# Review a Technology Decision for a Financial Transactions System

## Problem Description

A backend team at a lending platform has finalized their technology stack for a new transaction ledger service and is asking for a design review before development begins. The team has landed on MongoDB as their primary data store for recording loan disbursements, repayments, and transaction history.

The technical lead has written up the decision in a short design doc. Your task is to conduct a design review of this technology decision.

## Output Specification

Write your review to `review.md`.

## Input Files

The following files are provided as inputs. Extract them before beginning.

=============== FILE: design-doc.md ===============
# Transaction Ledger Service — Technology Decision

## Context
The transaction ledger records every financial event in the loan lifecycle: disbursements, repayments, partial payments, reversals, and fee accruals. Each loan can have hundreds of transactions over its lifetime.

## Decision
We will use MongoDB as the primary data store.

MongoDB's flexible document model makes it easy to represent varied transaction types without rigid schema migrations. The team has experience with it from a previous project.

## Schema
Each transaction will be stored as a document in a `transactions` collection. Loan-level summaries will be computed by aggregating across documents at query time.

## Deployment
MongoDB Atlas, M10 cluster, single region.
