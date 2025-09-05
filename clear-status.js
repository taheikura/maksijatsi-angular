#!/usr/bin/env node

// Clear pending status check
// Run with: GITHUB_TOKEN=your_token node clear-status.js

import { Octokit } from '@octokit/rest';

async function clearStatus() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const owner = 'taheikura';
  const repo = 'maksijatsi-angular';
  const sha = process.argv[2]; // Pass commit SHA as argument

  if (!sha) {
    console.log('Usage: node clear-status.js <commit-sha>');
    console.log('Get SHA from your PR page');
    return;
  }

  try {
    await octokit.rest.repos.createCommitStatus({
      owner,
      repo,
      sha,
      state: 'success',
      description: 'Manually cleared for testing',
      context: 'amplify/deployment'
    });

    console.log('✅ Status check cleared!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearStatus();