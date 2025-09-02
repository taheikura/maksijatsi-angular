#!/bin/bash

echo "=== GitHub Secrets Values ==="
echo ""

echo "AMPLIFY_APP_ID:"
aws amplify list-apps --query 'apps[].{Name:name,AppId:appId}' --output table
echo ""

echo "AWS_DEFAULT_REGION:"
aws configure get region
echo ""

echo "Your AWS Account ID:"
aws sts get-caller-identity --query Account --output text
echo ""

echo "Current AWS credentials (use these for GitHub secrets):"
echo "AWS_ACCESS_KEY_ID: $(aws configure get aws_access_key_id)"
echo "AWS_SECRET_ACCESS_KEY: $(aws configure get aws_secret_access_key)"
echo ""

echo "Add these values to GitHub → Settings → Secrets and variables → Actions"