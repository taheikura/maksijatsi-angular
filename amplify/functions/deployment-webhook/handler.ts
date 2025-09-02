export const handler = async (event: any) => {
  const { deploymentStatus, branchName, commitId } = event;
  
  if (branchName !== 'main') return;
  
  const githubToken = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_REPO_OWNER;
  const repoName = process.env.GITHUB_REPO_NAME;
  
  // Find PR by commit
  const prResponse = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=open&head=${repoOwner}:${branchName}`,
    {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );
  
  const prs = await prResponse.json();
  
  for (const pr of prs) {
    const label = deploymentStatus === 'SUCCEED' ? 'deployment:success' : 'deployment:failed';
    
    await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${pr.number}/labels`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ labels: [label] })
      }
    );
  }
  
  return { statusCode: 200 };
};