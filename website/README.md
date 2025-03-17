# Whispher Pro Distribution Website

This directory contains the website for distributing the Whispher Pro desktop application.

## Directory Structure

- `index.html` - The main landing page
- `downloads/` - Contains the application distribution files
- `images/` - Contains images used on the website

## Hosting Options

### 1. GitHub Pages

You can host this website for free using GitHub Pages:

1. Create a new GitHub repository
2. Push this website directory to the repository
3. Go to repository Settings > Pages
4. Select the branch containing your website files
5. Your website will be available at `https://yourusername.github.io/repository-name`

### 2. Netlify

Netlify offers free hosting with a simple drag-and-drop interface:

1. Sign up for a free account at [netlify.com](https://www.netlify.com/)
2. Drag and drop this website directory to Netlify's upload area
3. Your website will be deployed with a Netlify subdomain
4. You can configure a custom domain if desired

### 3. Vercel

Vercel is another excellent option for static website hosting:

1. Sign up for a free account at [vercel.com](https://vercel.com/)
2. Install the Vercel CLI: `npm install -g vercel`
3. Navigate to this website directory and run `vercel`
4. Follow the prompts to deploy your site

### 4. Amazon S3 + CloudFront

For a more professional setup with a CDN:

1. Create an S3 bucket and upload the website files
2. Configure the bucket for static website hosting
3. Set up CloudFront to serve the website with HTTPS
4. Point your domain to CloudFront

## Building New Versions

When you release a new version of the application:

1. Build the new version using `npm run build` in the main application directory
2. Copy the new distribution files to the `downloads/` directory
3. Update the website to reflect the new version number and features
4. Redeploy the website

## Customizing the Website

Feel free to customize the website to match your branding:

- Update the colors in the CSS
- Add more sections or features
- Include screenshots of the application
- Add user testimonials or reviews 