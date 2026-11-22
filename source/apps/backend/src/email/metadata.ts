import { createRequire } from "node:module";
import { Worker } from "worker_threads";

import { z } from "../boundary.js";

const metadataResult = z.object({
  subject: z.string(),
  text: z.string(),
  headers: z.string(),
  attachments: z.array(
    z.object({
      filename: z.string(),
      contentType: z.string(),
      size: z.number(),
    })
  ),
});

/** MIME parsing stays off the monitoring event loop. Attachment bytes are never returned. */
const require = createRequire(import.meta.url);

export function metadata(content: Buffer): Promise<{
  subject: string;
  text: string;
  headers: string;
  attachments: { filename: string; contentType: string; size: number }[];
}> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
      const {parentPort,workerData}=require('worker_threads');
      require(workerData.parser).simpleParser(Buffer.from(workerData.content), {
        skipHtmlToText: false, skipTextToHtml: true, skipImageLinks: true,
      }).then(mail => parentPort.postMessage({
        subject: String(mail.subject||'').slice(0,2000),
        text: String(mail.text||'').slice(0,65536),
        headers: mail.headerLines.filter(h=>!/^auth/i.test(h.key)).map(h=>h.line).join('\\r\\n').slice(0,65536),
        attachments: mail.attachments.map(a=>({filename:String(a.filename||'').slice(0,1000),contentType:a.contentType,size:a.size}))
      }),()=>process.exit(1));
    `,
      {
        eval: true,
        workerData: { parser: require.resolve("mailparser"), content },
      }
    );
    const timer = setTimeout(() => {
      void worker.terminate();
      reject(new Error("Čtení obsahu zprávy překročilo časový limit."));
    }, 15_000);
    worker.once("message", (value: unknown) => {
      clearTimeout(timer);
      void worker.terminate();
      const result = metadataResult.safeParse(value);
      if (result.success) resolve(result.data);
      else reject(new Error("Obsah zprávy nelze načíst."));
    });
    worker.once("error", () => {
      clearTimeout(timer);
      reject(new Error("Obsah zprávy nelze načíst."));
    });
    worker.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Čtení obsahu zprávy skončilo bez výsledku (${code}).`));
    });
  });
}
