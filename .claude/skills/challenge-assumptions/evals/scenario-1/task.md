# Review an RFC for a Healthcare Appointment Booking System

## Problem Description

A digital health startup is building an appointment booking platform for GP surgeries. The engineering team has produced an RFC for the initial system design and wants a review before the proposal goes to the engineering all-hands for approval.

Your task is to review the RFC and provide written feedback.

## Output Specification

Write your review to `review.md`.

## Input Files

The following files are provided as inputs. Extract them before beginning.

=============== FILE: rfc.md ===============
# RFC-007: Appointment Booking System — Initial Design

## Overview
The system allows patients to book, reschedule, and cancel appointments with their registered GP. Surgeries can manage their availability calendars and view their upcoming schedule.

## Non-Functional Requirements
- The system must be highly available — appointment booking is time-sensitive and patients should always be able to access the platform.
- The system must be fast enough that patients do not experience frustrating delays when browsing available slots.
- The system must be secure.
- The system should scale to support more surgeries as the business grows.

## Architecture
We will use a serverless architecture on AWS with API Gateway, Lambda, and DynamoDB. This gives us automatic scaling and we only pay for what we use.

## Open Questions
- None identified at this time. The team is comfortable with the proposed approach.
