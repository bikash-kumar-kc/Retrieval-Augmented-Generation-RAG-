import express from "express";
import { and, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { stat } from "node:fs/promises";
import path from "node:path";
import * as schema from "../clients/db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { AuthService } from "../services/AuthService.js";
import { log } from "../utils/logger.js";

const documentFileRoute = ({
  databaseInstance,
  auth,
}: {
  databaseInstance: LibSQLDatabase<typeof schema>;
  auth: AuthService;
}) => {
  const router = express.Router();

  router.get(
    "/:documentId/file",
    requireAuth(auth, { allowQueryToken: false }),
    async (req, res) => {
      const userId = res.locals["userId"] as string;
      console.log("Call is happening.")
      try {
        const [doc] = await databaseInstance
          .select({
            name: schema.documents.name,
            filePath: schema.documents.filePath,
          })
          .from(schema.documents)
          .where(
            and(
              eq(schema.documents.documentId, String(req.params["documentId"])),
              eq(schema.documents.ownerId, userId),
            ),
          );

        if (!doc?.filePath)
          return res
            .status(404)
            .json({ isSuccess: false, errorMsg: "Document not found." });

        const absolute = path.resolve(doc.filePath);
        
        try {
          await stat(absolute);
        } catch {
          return res
            .status(404)
            .json({
              isSuccess: false,
              errorMsg: "The file is no longer available.",
            });
        }

        const asDownload =
          req.query["download"] === "1" || req.query["download"] === "true";
        const fileName =
          path.basename(doc.name).replace(/[\r\n"]/g, "_") || "document.pdf";

        res.setHeader("X-Content-Type-Options", "nosniff");
        res.type("application/pdf");

        if (asDownload)
          return res.download(absolute, fileName, { dotfiles: "allow" });

        res.setHeader(
          "Content-Disposition",
          `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        );

        return res.sendFile(absolute, { dotfiles: "allow" });

      } catch (error) {
        log.error("[document file route] ", { error });
        return res
          .status(500)
          .json({ isSuccess: false, errorMsg: "Could not read the file." });
      }
    },
  );

  return router;
};

export default documentFileRoute;
