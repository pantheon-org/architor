# Review an Architecture Proposal for a Small Internal Tool

## Problem Description

A 3-person engineering team at a media company is building an internal content scheduling tool. The tool allows editors to plan, draft, and schedule social media posts across a handful of company accounts. Expected users: approximately 15 internal editors. No public-facing traffic.

The team has produced an architecture proposal and wants a design review before they start building.

## Output Specification

Write your review to `review.md`.

## Input Files

The following files are provided as inputs. Extract them before beginning.

=============== FILE: proposal.md ===============
# Content Scheduler — Architecture Proposal

## Overview
An internal tool for scheduling social media content. 15 editor users. Posts are queued and published automatically at scheduled times.

## Architecture

We will build a microservices system with the following services:
- Content Service (stores draft posts)
- Scheduling Service (manages publication timers)
- Publishing Service (calls social media APIs)
- User Service (manages editor accounts)
- Audit Service (logs all editor actions)
- Notification Service (sends email confirmations to editors)
- Config Service (manages per-environment configuration)
- Analytics Service (tracks post performance metrics)

Each service will be independently deployed on Kubernetes (GKE). We will use Istio as the service mesh to handle inter-service communication, mTLS, and traffic management.

We will instrument all services with distributed tracing using Jaeger to make debugging easier across the service graph.

## Rationale
This approach gives us flexibility to scale individual services independently as usage grows, and follows modern microservices best practices.
