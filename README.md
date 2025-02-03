# Sync Book Highlights to ReadWise

A Cloudflare Worker that automatically syncs your book highlights from Notion to ReadWise, with special support for Dedao (得到) ebook highlights.

## Features

- Automatically syncs highlights from Notion to ReadWise
- Special support for Dedao (得到) ebook highlights, including book metadata retrieval
- Runs on Cloudflare Workers platform
- Uses KV storage to track sync state
- Scheduled to run every hour via cron trigger

## Prerequisites

To use this worker, you'll need:

1. A Cloudflare account
2. A Notion API token
3. A ReadWise API token
4. A Notion database containing your book highlights
5. (Optional) Dedao account if syncing Dedao ebook highlights

## Environment Variables

The following environment variables need to be set:

- `NOTION_TOKEN`: Your Notion API integration token
- `FLOMO_DB_ID`: The ID of your Notion database containing highlights
- `READWISE_TOKEN`: Your ReadWise API token

## Development

### Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.dev.vars` file with your environment variables:
   ```
   NOTION_TOKEN=your_notion_token
   FLOMO_DB_ID=your_notion_database_id
   READWISE_TOKEN=your_readwise_token
   ```

### Local Development

Run the worker locally using:

```bash
npm run start
```

For development with persistent data:

```bash
npm run start-persist
```

### Testing

Run tests with:

```bash
npm test
```

## Deployment

### 1. Configure Cloudflare Credentials

First, add your Cloudflare credentials as described below:

#### Add Cloudflare API Token

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **My Profile** > **API Tokens**
3. Create a new token using the "Edit Cloudflare Workers" template
4. Add the token to your environment as `CLOUDFLARE_API_TOKEN`

#### Add Cloudflare Account ID

1. Find your Account ID in the Cloudflare dashboard
2. Add it to your environment as `CLOUDFLARE_ACCOUNT_ID`

### 2. Deploy

Deploy to Cloudflare Workers with:

```bash
npm run deploy
```

## Architecture

The worker consists of several main components:

- `NotionClient`: Handles interaction with Notion API to fetch highlights
- `ReadWiseClient`: Manages communication with ReadWise API
- `DedaoClient`: Retrieves metadata for Dedao ebooks
- `HighlightManager`: Orchestrates the sync process between services

The worker runs on a schedule (every hour) to check for new highlights and sync them to ReadWise.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT license.
