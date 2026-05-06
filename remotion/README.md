# Remotion Video Template — PawPrint Song

This folder contains the Remotion video template that renders a customer's song into a shareable MP4 (spinning vinyl + synced lyrics).

## What this is

When a customer finishes their song, the backend triggers a render via Remotion Lambda on AWS. The Lambda function pulls this code (deployed as a "site") and renders the MP4 with the customer's audio + title + lyrics.

## One-time deployment (AWS CloudShell)

You only need to do this **once** (and again whenever you change the video design).

### Prerequisites
- AWS account with the `remotion-user` IAM user already created (see Remotion docs)
- Your AWS Access Key ID + Secret Access Key

### Steps

1. Open **https://console.aws.amazon.com/cloudshell** and pick region `us-east-1`.

2. Install Node.js 20:
   ```bash
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo dnf install -y nodejs
   ```

3. Configure AWS credentials (only if CloudShell prompts — usually it's auto):
   ```bash
   aws configure
   ```

4. Clone this repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO/remotion
   npm install
   ```

5. Deploy the Lambda function:
   ```bash
   npx remotion lambda functions deploy
   ```
   👉 Copy the printed function name → save as `REMOTION_LAMBDA_FUNCTION_NAME`.

6. Deploy the video site:
   ```bash
   npx remotion lambda sites create src/index.ts --site-name=ribbonsong-video
   ```
   👉 Copy the printed Serve URL → save as `REMOTION_SERVE_URL`.

7. Paste those 2 values into Lovable as secrets, plus:
   - `REMOTION_AWS_ACCESS_KEY_ID`
   - `REMOTION_AWS_SECRET_ACCESS_KEY`
   - `REMOTION_AWS_REGION` = `us-east-1`

## Updating the video design later

If you (or Lovable) change anything in `remotion/src/`, redeploy just the site:
```bash
cd YOUR_REPO/remotion
git pull
npm install
npx remotion lambda sites create src/index.ts --site-name=ribbonsong-video
```
The function itself only needs to be deployed once.

## Local preview (optional, requires Mac)

```bash
cd remotion
npm install
npm run dev
```
Opens Remotion Studio at http://localhost:3000.
