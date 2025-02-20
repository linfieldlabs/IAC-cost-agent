# Building a Cost-Aware Infrastructure

As infrastructure costs continue to be a critical concern for organizations, we've been exploring an innovative approach to cost estimation using Large Language Models. Here's our story of building an IaC Cost Estimator and what we've learned along the way.

## The Initial Challenge

When we first started, we took what seemed like the straightforward approach: feed the entire infrastructure plan to GPT-4 and ask for a complete cost analysis. The model would parse the JSON, analyze the changes, and generate a comprehensive cost estimation report. Simple.

## Early Hurdles and Pivots

Our first implementation revealed some interesting challenges. While GPT-4 was remarkably good at understanding infrastructure components, we noticed two major issues:

-   Inconsistent Output Format: Despite our best efforts to provide a clear prompt, the model would occasionally deviate from the expected JSON format, making it difficult to reliably parse and present the results.
-   Calculation Accuracy: When we asked the model to handle both analysis AND calculations, we saw a significant number of mathematical errors in the final reports. This wasn't entirely surprising - LLMs aren't good at calculations after all.

## Improvement Iterations

One of the main challenges was the inconsistency of the model's output format. The issue was resolved by using a system prompt that enforces the output format.

Another challenge was the accuracy of the calculations. This was resolved by moving the calculations to the application code. Instead of asking the model to do everything, we split the process into two distinct parts:

-   Base Value Generation: We let the model focus on what it does best - reasoning about infrastructure and providing base values, assumptions, and cost breakdowns.
-   Application-Side Calculations: We moved all mathematical calculations to our application code, where we could ensure accuracy and consistency.

This separation of concerns led to significantly more accurate results. The model could focus on understanding the infrastructure, making reasonable assumptions, and providing detailed notes about its reasoning, while our application handled the precise calculations.

## What's Working Well

-   More accurate cost estimations
-   Consistent output format
-   Better reasoning about infrastructure changes
-   Detailed assumptions and notes for each resource

## Current Challenges

While we've made significant progress, we're still facing some interesting challenges:

Cost Efficiency: We're currently using state-of-the-art models, which can be expensive for frequent estimations. We're exploring ways to use smaller, more focused models without sacrificing accuracy.
Edge Cases: Some complex infrastructure patterns still require additional context or handling to generate accurate estimates.
