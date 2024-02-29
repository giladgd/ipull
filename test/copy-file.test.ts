import {describe, test} from "vitest";
import fs from "fs-extra";
import DownloadEngineWriteStreamBrowser
    from "../src/download/download-engine/streams/download-engine-write-stream/download-engine-write-stream-browser.js";
import {createDownloadFile, ensureLocalFile, TEXT_FILE_EXAMPLE} from "./utils/download.js";
import {fileHash} from "./utils/hash.js";
import {copyFileInfo} from "./utils/copy.js";
import {downloadFile} from "../src/index.js";
import DownloadEngineFetchStreamLocalFile
    from "../src/download/download-engine/streams/download-engine-fetch-stream/download-engine-fetch-stream-local-file.js";
import DownloadEngineFile from "../src/download/download-engine/download-engine-file.js";

describe("File Copy", async () => {

    test.concurrent("copy text parallel streams", async (context) => {
        const {originalFileHash, fileToCopy, copyFileToName} = await copyFileInfo(TEXT_FILE_EXAMPLE);

        const engine = await downloadFile({
            url: fileToCopy,
            directory: ".",
            fileName: copyFileToName,
            chunkSize: 4,
            parallelStreams: 1,
            fetchStrategy: "localFile",
            cliProgress: false
        });
        await engine.download();

        const copiedFileHash = await fileHash(copyFileToName);
        await fs.remove(copyFileToName);

        context.expect(copiedFileHash)
            .toBe(originalFileHash);
    });

    test.concurrent("copy image one stream", async (context) => {
        const imagePath = await ensureLocalFile();
        const {originalFileHash, fileToCopy, copyFileToName} = await copyFileInfo(imagePath);

        const engine = await downloadFile({
            url: fileToCopy,
            directory: ".",
            fileName: copyFileToName,
            fetchStrategy: "localFile",
            cliProgress: false,
            parallelStreams: 1
        });
        await engine.download();

        const copiedFileHash = await fileHash(copyFileToName);
        await fs.remove(copyFileToName);

        context.expect(copiedFileHash)
            .toBe(originalFileHash);
    });


    test.concurrent("Total bytes written", async (context) => {
        let totalBytesWritten = 0;
        const fetchStream = new DownloadEngineFetchStreamLocalFile();
        const writeStream = new DownloadEngineWriteStreamBrowser((cursor, data) => {
            totalBytesWritten += data.byteLength;
        });

        const file = await createDownloadFile(TEXT_FILE_EXAMPLE, fetchStream);
        const downloader = new DownloadEngineFile(file, {
            chunkSize: 4,
            parallelStreams: 8,
            fetchStream,
            writeStream
        });

        await downloader.download();
        context.expect(totalBytesWritten)
            .toBe(file.totalSize);
    });
});
