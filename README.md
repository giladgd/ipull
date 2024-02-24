<div align="center">
    <h1>iPull</h1>
    <img src="assets/ipull-logo-rounded.png" height="200px" />
</div>

<div align="center">
<br/>

[![Build](https://github.com/ido-pluto/ipull/actions/workflows/build.yml/badge.svg)](https://github.com/ido-pluto/ipull/actions/workflows/build.yml)
[![License](https://badgen.net/badge/color/MIT/green?label=license)](https://www.npmjs.com/package/ipull)
[![Types](https://badgen.net/badge/color/TypeScript/blue?label=types)](https://www.npmjs.com/package/ipull)
[![npm downloads](https://img.shields.io/npm/dt/ipull.svg)](https://www.npmjs.com/package/ipull)
[![Version](https://badgen.net/npm/v/ipull)](https://www.npmjs.com/package/ipull)

</div>

> Super fast file downloader with multiple connections

```bash
npx ipull http://example.com/file.large
```

![pull-example](https://github.com/ido-pluto/ipull/blob/main/assets/pull-file.gif)

## Features

- Download using parallels connections
- Pausing and resuming downloads
- Node.js and browser support
- Smart retry on fail
- CLI Progress bar
- Download statistics (speed, time left, etc.)

## NodeJS API

```ts
import {downloadFile} from 'ipull';

const downloader = downloadFile('https://example.com/file.large', {
    directory: './this/path',
    fileName: 'file.large', // optional
    cliProgress: true // Show progress bar in the CLI (default: true)
});

await downloader.download();
```

### Events

```ts
import {downloadFile} from 'ipull';

const downloader = downloadFile('https://example.com/file.large', {
    onInit(engine) {
    }, // retrive the file size and other details
    onStart(engine) {
    }, // download has started
    onProgress(engine) {
        console.log(`Time left: ${engine.timeLeft}, download speed: ${engine.speed}`)
    },
    onFinished(engine) {
    }, // download has finished (file is still open)
    onClosed(engine) {
    } // download has finished and the file is closed
});
```

## Browser support

Download a file in the browser using multiple connections

```ts
import {downloadFileBrowserMemory} from "ipull/dist/browser.js";

const {downloader, memory} = await downloadFileBrowserMemory(DOWNLOAD_URL, {
    acceptRangeAlwaysTrue: true // cors origin request will not return the range header, but we can force it to be true (multipart download)
});

await downloader.download();
image.src = memory.createBlobURL();
```

### Custom stream

```ts
import {downloadFileBrowser} from "ipull/dist/browser.js";

const downloader = await downloadFileBrowser(DOWNLOAD_URL, {
    onWrite: (cursor: number, buffer: Uint8Array, options) => {
        console.log(`Writing ${buffer.length} bytes at cursor ${cursor}, with options: ${JSON.stringify(options)}`);
    }
});

await downloader.download();
```

## CLI

```
Usage: ipull [options] [files...]

Pull/copy files from remote server/local directory

Arguments:
  files                         Files to pull/copy

Options:
  -V, --version                 output the version number
  -s --save [path]              Save location (directory/file)
  -f --full-name                Show full name of the file while downloading, even if it long
  -h, --help                    display help for command

Commands:
  set [options] [path] <value>  Set download locations
```

### Set custom save directory

You can set a custom save directory by using the `set` command.

```bash
ipull set .zip ~/Downloads/zips
```

(use `default` to set the default save directory)

## Advanced usage

### Download file from parts

Download a file from multiple parts, and merge them into a single file.

Beneficial for downloading large files from servers that limit file size. (e.g. HuggingFace models)

```ts
import {downloadFile} from 'ipull';

const downloadParts = [
    "https://example.com/file.large1",
    "https://example.com/file.large2",
    "https://example.com/file.large3",
];

const downloader = downloadFile(downloadParts, {
    directory: './this/path',
    filename: 'file.large'
});

await downloader.download();
```

** The split must be binary and not a zip-split

### Custom headers

You can set custom headers for the download request

```ts
import {downloadFile} from 'ipull';

const downloader = downloadFile('https://example.com/file.large', {
    directory: './this/path',
    headers: {
        'Authorization': 'Bearer token'
    }
});

await downloader.download();
```

### Copy file

Copy file from local directory to another directory with CLI progress bar

```ts
import {copyFile} from 'ipull';

const downloader = await copyFile('path/to/file', {
    directory: './this/path'
});
await downloader.download();

```

### Abort download

You can cancel the download by calling the `abort` method

```ts
import {downloadFile} from 'ipull';

const downloader = downloadFile('https://example.com/file.large', {
    directory: './this/path'
});

setTimeout(() => {
    downloader.abort();
}, 5_000);

await downloader.download();
```

### Pause & Resume download

```ts
import {downloadFile} from 'ipull';

const downloader = downloadFile('https://example.com/file.large', {
    directory: './this/path'
});

setInterval(() => {
    downloader.pause();
    setTimeout(() => {
        downloader.resume();
    }, 5_000);
}, 10_000);

await downloader.download();
```

** The pause may take a few seconds to actually pause the download, because it waits for the current connections to
finish

### Error handling

If a network/file-system error occurs, the download will automatically retry
with [async-retry](https://www.npmjs.com/package/async-retry)

```ts
import {downloadFile} from 'ipull';

const downloader = downloadFile('https://example.com/file.large', {
    directory: './this/path',
    retry: {
        retries: 20 // default: 10
    }
});

try {
    await downloader.download();
} catch (error) {
    console.error(`Download failed: ${error.message}`);
}
```

<details>
<summary>
<h3>Custom Downloader (click to expand)
</h3>
</summary>
In this example, there will be one progress bar for all the files

```ts
import {TransferCli, DownloadEngineNodejs, TransferStatistics} from "ipull";

const cli = new TransferCli();
const statistics = new TransferStatistics();

const filesToDownload = ["https://example.com/file1.large", "https://example.com/file2.large", "https://example.com/file3.large"];
let totalSize = 0;
let bytesDownloaded = 0;

const downloadsPromise = filesToDownload.map((url, index) => {
    return DownloadEngineNodejs.fromParts(url, {
        onInit(engine) {
            totalSize += engine.file.totalSize;
        },
        onProgress(progress) {
            const status = statistics.updateProgress(bytesDownloaded + progress.bytesDownloaded, totalSize);

            cli.updateProgress({
                ...status,
                ...progress,
                objectType: `${index}/${filesToDownload.length}`
            });
        },
        onClosed(engine) {
            bytesDownloaded += engine.file.totalSize
        }
    });
});

for (const downloader of await Promise.all(downloadsPromise)) {
    await downloader.download();
}
```

![custom-progress-bar](assets/custom-progress.png)

</details>

<br />

<div align="center" width="360">
    <img alt="Star please" src="assets/star-please.png" width="360" margin="auto" />
    <br/>
    <p align="right">
        <i>If you like this repo, star it ✨</i>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    </p>
</div>
