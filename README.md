README for Best-Tweet-Backend
=============================
Note: I gave ChatGPT the source files in this repo and it wrote this README for me.

If you’re looking for the web app, it’s over [here](https://github.com/samhenrigold/best-tweet).

Introduction
------------

Best-Tweet-Backend is a Node.js backend service developed for handling tweet matchups and voting. It uses Express.js for server operations, Supabase as the database, and several middleware for security and validation.

Setup and Installation
----------------------

### Prerequisites

-   Node.js installed
-   Supabase account and database setup
-   Environment variables set for `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Installation Steps

1.  Clone the repository.
2.  Install the dependencies using `npm install`.
3.  Set up your `.env` file with the required Supabase credentials (`SUPABASE_URL` and `SUPABASE_ANON_KEY`).
4.  Start the server using `npm start`.

API Endpoints
-------------

### 1\. Get Matchups

-   **Endpoint:** `/get-matchups`
-   **Method:** `GET`
-   **Description:** Retrieves matchups from the database.
-   **Query Parameters:**
    -   `debug`: Set to `1` for debug mode. Optional.
-   **Response:** Returns an array of matchups.

### 2\. Cast Ballot

-   **Endpoint:** `/cast-ballot`
-   **Method:** `POST`
-   **Description:** Casts a vote for a selected tweet in a specific matchup.
-   **Body Parameters:**
    -   `selected_tweet_id` (string): The ID of the selected tweet.
    -   `matchup_id` (string): The ID of the matchup.
-   **Response:** Returns the result of the vote.

Utilities
---------

The `utils.ts` file includes helper functions for retrieving matchups and casting votes, ensuring efficient and error-free database transactions.

Database Structure
------------------

The `database.ts` auto-generated file outlines the structure of the database tables and their relationships. It includes definitions for `matchups`, `tweet_media`, `tweets`, `users`, and `votes` tables.

Security, Rate Limiting and Error Handling
--------------------------

The backend uses `helmet` for security headers and `express-rate-limit` for basic rate limiting to protect against abuse. 

Errors are managed using the `celebrate` middleware for request validation and a global error handler for catching any unhandled errors.
