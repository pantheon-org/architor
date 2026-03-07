# Deep-Dive Architecture Review for an E-Commerce Order Platform

## Problem Description

An e-commerce company is expanding their order management platform to support a new same-day delivery service. The engineering team has produced a detailed architecture document following an initial design phase. The document has been through one round of review and the team believes the core decisions are solid.

You are being brought in to conduct a thorough second-pass review of the architecture before the team commits to implementation. This is the detailed, deep-dive review — not a quick pass.

## Output Specification

Write your review to `review.md`.

## Input Files

The following files are provided as inputs. Extract them before beginning.

=============== FILE: architecture.md ===============
# Same-Day Delivery Platform — Architecture Document

## Overview
The platform orchestrates same-day delivery for orders placed before a daily cutoff time. It coordinates with warehouse pick-and-pack teams, dispatches to a third-party courier API (FastShip), and provides real-time tracking to customers.

## Architecture Pattern
Event-driven microservices. Services communicate via an internal event bus (Amazon SQS). Each service is independently deployed on ECS Fargate.

## Services

### Order Intake Service
Receives orders from the existing e-commerce platform via webhook. Validates the order, confirms same-day eligibility based on cutoff time and postcode, and publishes an `OrderReceived` event.

### Fulfilment Service
Subscribes to `OrderReceived`. Assigns the order to a warehouse team and creates a pick list. Publishes `OrderPicked` when complete. Expected throughput: 500 orders/hour at peak.

### Dispatch Service
Subscribes to `OrderPicked`. Calls the FastShip API to book a courier slot and get a tracking ID. Publishes `OrderDispatched`.

### Tracking Service
Subscribes to `OrderDispatched`. Polls FastShip every 5 minutes to retrieve status updates and stores them in a DynamoDB table. Exposes a REST endpoint for the customer-facing app to query tracking status.

### Notification Service
Subscribes to all events. Sends customer SMS/email updates at each stage.

## Scalability
The team has assessed that 500 orders/hour is the peak load. The architecture should handle this comfortably on ECS Fargate.

## Data
Each service owns its own database. The Order Intake Service uses RDS PostgreSQL. All other services use DynamoDB.

## FastShip Dependency
FastShip is the sole courier provider. Their API has an SLA of 99.5% availability. Integration is via synchronous REST calls from the Dispatch Service.
