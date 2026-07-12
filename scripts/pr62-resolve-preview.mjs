import { appendFile } from "node:fs/promises";

const repository = process.env.GITHUB_REPOSITORY;
const sha = process.env.GEOAI_TESTED_SHA ?? process.env.GITHUB_SHA;
const token = process.env.GITHUB_TOKEN;
const output = process.env.GITHUB_OUTPUT;

if (!repository || !sha || !token || !output) {
  throw new Error("Missing GitHub repository, SHA, token or output path.");
}

const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28"
};

async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, { headers });
  if (!response.ok) throw new Error(`GitHub API ${path} returned ${response.status}`);
  return response.json();
}

for (let attempt = 1; attempt <= 60; attempt += 1) {
  const deployments = await github(`/deployments?sha=${sha}&environment=Preview&per_page=10`);
  const commitStatus = await github(`/commits/${sha}/status`);
  const vercelStatus = commitStatus.statuses?.find((status) => (
    status.context === "Vercel" && status.state === "success"
  ));

  for (const deployment of deployments) {
    const statuses = await github(`/deployments/${deployment.id}/statuses?per_page=10`);
    const ready = statuses.find((status) => status.state === "success" && status.environment_url);
    if (!ready || !vercelStatus?.target_url) continue;

    const providerId = new URL(vercelStatus.target_url).pathname.split("/").filter(Boolean).at(-1);
    if (!providerId) continue;
    await appendFile(output, [
      `preview_url=${ready.environment_url}`,
      `preview_deployment_id=dpl_${providerId}`,
      `github_deployment_id=${deployment.id}`
    ].join("\n") + "\n");
    process.exit(0);
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));
}

throw new Error(`No READY Vercel Preview found for ${sha} within five minutes.`);
