#!/usr/bin/env node

// Script to set up branch protection rules for the main branch
// Run with: node setup-branch-protection.js

import { Octokit } from '@octokit/rest';

async function setupBranchProtection() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN, // Set this environment variable
  });

  const owner = 'taheikura'; // Replace with your GitHub username
  const repo = 'maksijatsi-angular';

  try {
    await octokit.rest.repos.updateBranchProtection({
      owner,
      repo,
      branch: 'main',
      required_status_checks: {
        strict: true,
        contexts: ['amplify/deployment'],
      },
      enforce_admins: false,
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
      },
      restrictions: null,
      allow_force_pushes: false,
      allow_deletions: false,
    });

    console.log('✅ Branch protection rules set up successfully!');
    console.log('Main branch now requires:');
    console.log('- amplify/deployment status check to pass');
    console.log('- Pull request reviews');
    console.log('- Up-to-date branches before merging');
  } catch (error) {
    console.error('❌ Error setting up branch protection:', error.message);
    console.log('\n💡 You can set this up manually in GitHub:');
    console.log('Settings → Branches → Add rule → main');
    console.log('Then require "amplify/deployment" status check');
  }
}

setupBranchProtection();
