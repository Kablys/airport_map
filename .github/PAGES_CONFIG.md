# GitHub Pages Configuration

This repository is configured for automatic deployment to GitHub Pages using GitHub Actions.

## Configuration Details

### Repository Settings
- **Source Branch**: `gh-pages`
- **Source Path**: `/` (root)
- **HTTPS Enforcement**: Enabled
- **Custom Domain**: Configurable via CNAME file

### Automatic Configuration
The GitHub Actions workflow automatically:
1. Enables GitHub Pages on the repository
2. Sets the source to the `gh-pages` branch
3. Enforces HTTPS for security
4. Configures custom domains if a CNAME file is present

### Custom Domain Setup
To use a custom domain:
1. Copy `CNAME.example` to `CNAME`
2. Replace the example domain with your actual domain
3. Commit and push the changes
4. The workflow will automatically configure the custom domain

### Manual Configuration
If you need to manually configure GitHub Pages:
1. Go to repository Settings → Pages
2. Set Source to "Deploy from a branch"
3. Select `gh-pages` branch and `/` (root) folder
4. Enable "Enforce HTTPS"

## Troubleshooting

### Pages Not Deploying
- Check the Actions tab for workflow errors
- Ensure the `gh-pages` branch exists after first deployment
- Verify repository permissions allow GitHub Actions to write

### Custom Domain Issues
- Ensure DNS is properly configured for your domain
- Check that the CNAME file contains only the domain name
- Allow time for DNS propagation (up to 24 hours)